import { getStrickerConfig } from "@/lib/stricker/config";
import {
  type JsonRecord,
  type StrickerAuthResponse,
  type StrickerValidateSessionResponse,
} from "@/lib/stricker/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Supplier = {
  id: string;
};

type SupplierSession = {
  id: string;
  token: string;
  status: string;
  expires_at: string | null;
  last_validated_at: string | null;
};

function getTokenFromAuthResponse(payload: StrickerAuthResponse): string | null {
  return payload.Token ?? payload.token ?? null;
}

function getErrorMessage(payload: JsonRecord): string | null {
  const errorMessage = payload.ErrorMessage ?? payload.errorMessage;

  return typeof errorMessage === "string" && errorMessage.length > 0
    ? errorMessage
    : null;
}

function getErrorCode(payload: JsonRecord): string | null {
  const errorCode = payload.ErrorCode ?? payload.errorCode;

  if (typeof errorCode === "number") {
    return String(errorCode);
  }

  if (typeof errorCode === "string" && errorCode.length > 0) {
    return errorCode;
  }

  return null;
}

function getValidateStatus(payload: StrickerValidateSessionResponse): number {
  const status = payload.Status ?? payload.status;

  if (typeof status === "number") {
    return status;
  }

  if (typeof status === "string") {
    const parsed = Number(status);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export async function getStrickerSupplierId(): Promise<string> {
  const supabaseAdmin = createSupabaseAdminClient();

  const { data: supplier, error } = await supabaseAdmin
    .from("suppliers")
    .select("id")
    .eq("slug", "stricker")
    .maybeSingle<Supplier>();

  if (error) {
    throw new Error(error.message);
  }

  if (!supplier) {
    throw new Error("Fornecedor Stricker não encontrado com slug 'stricker'.");
  }

  return supplier.id;
}

export async function authenticateStrickerClient(): Promise<string> {
  const config = getStrickerConfig();

  const url = new URL(`${config.apiBaseUrl}/AuthenticateClient`);
url.searchParams.set("accessKey", config.accessKey);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Erro HTTP Stricker AuthenticateClient: ${response.status}`);
  }

  const payload = (await response.json()) as StrickerAuthResponse;
  const token = getTokenFromAuthResponse(payload);

  if (!token) {
    const message =
      getErrorMessage(payload as JsonRecord) ??
      `Não foi devolvido token pela Stricker. ErrorCode: ${
        getErrorCode(payload as JsonRecord) ?? "n/d"
      }`;

    throw new Error(message);
  }

  const supplierId = await getStrickerSupplierId();
  const supabaseAdmin = createSupabaseAdminClient();

  await supabaseAdmin
    .from("supplier_sessions")
    .update({
      status: "closed",
    })
    .eq("supplier_id", supplierId)
    .eq("status", "active");

  const expiresAt = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString();

  const { error } = await supabaseAdmin.from("supplier_sessions").insert({
    supplier_id: supplierId,
    token,
    status: "active",
    expires_at: expiresAt,
    last_validated_at: new Date().toISOString(),
    raw_payload: payload as JsonRecord,
  });

  if (error) {
    throw new Error(error.message);
  }

  return token;
}

export async function validateStrickerSession(token: string): Promise<boolean> {
  const config = getStrickerConfig();

  const url = new URL(`${config.apiBaseUrl}/ValidateSession`);
  url.searchParams.set("token", token);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return false;
  }

  const payload = (await response.json()) as StrickerValidateSessionResponse;

  return getValidateStatus(payload) === 1;
}

export async function getValidStrickerSessionToken(): Promise<string> {
  const supplierId = await getStrickerSupplierId();
  const supabaseAdmin = createSupabaseAdminClient();

  const { data: session } = await supabaseAdmin
    .from("supplier_sessions")
    .select("id, token, status, expires_at, last_validated_at")
    .eq("supplier_id", supplierId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<SupplierSession>();

  if (!session) {
    return authenticateStrickerClient();
  }

  if (session.expires_at && new Date(session.expires_at).getTime() < Date.now()) {
    await supabaseAdmin
      .from("supplier_sessions")
      .update({
        status: "expired",
      })
      .eq("id", session.id);

    return authenticateStrickerClient();
  }

  const isValid = await validateStrickerSession(session.token);

  if (!isValid) {
    await supabaseAdmin
      .from("supplier_sessions")
      .update({
        status: "invalid",
      })
      .eq("id", session.id);

    return authenticateStrickerClient();
  }

  await supabaseAdmin
    .from("supplier_sessions")
    .update({
      last_validated_at: new Date().toISOString(),
    })
    .eq("id", session.id);

  return session.token;
}

export async function closeStrickerSession(): Promise<void> {
  const supplierId = await getStrickerSupplierId();
  const supabaseAdmin = createSupabaseAdminClient();

  const { data: session } = await supabaseAdmin
    .from("supplier_sessions")
    .select("id, token")
    .eq("supplier_id", supplierId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; token: string }>();

  if (!session) {
    return;
  }

  const config = getStrickerConfig();

  const url = new URL(`${config.apiBaseUrl}/CloseSession`);
  url.searchParams.set("token", session.token);

  await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  await supabaseAdmin
    .from("supplier_sessions")
    .update({
      status: "closed",
    })
    .eq("id", session.id);
}