import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStrickerSupplierId } from "@/lib/stricker/auth";
import {
  authenticateStrickerClient,
  validateStrickerSession,
} from "./client";
import { type StrickerStoredSession } from "./types";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

function isValidSessionStatus(status: unknown): boolean {
  if (typeof status === "boolean") {
    return status;
  }

  if (typeof status === "number") {
    return status === 0 || status === 1;
  }

  if (typeof status === "string") {
    const normalized = status.trim().toLowerCase();

    return normalized === "0" || normalized === "1" || normalized === "true";
  }

  return false;
}

async function getLatestActiveSession(params: {
  supabaseAdmin: SupabaseAdminClient;
  supplierId: string;
}): Promise<StrickerStoredSession | null> {
  const { data, error } = await params.supabaseAdmin
    .from("supplier_sessions")
    .select(
      [
        "id",
        "supplier_id",
        "token",
        "status",
        "expires_at",
        "last_validated_at",
        "raw_payload",
        "created_at",
        "updated_at",
      ].join(","),
    )
    .eq("supplier_id", params.supplierId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<StrickerStoredSession>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
}

async function markSessionAsInvalid(params: {
  supabaseAdmin: SupabaseAdminClient;
  sessionId: string;
}): Promise<void> {
  const { error } = await params.supabaseAdmin
    .from("supplier_sessions")
    .update({
      status: "invalid",
      last_validated_at: new Date().toISOString(),
    })
    .eq("id", params.sessionId);

  if (error) {
    throw new Error(error.message);
  }
}

async function updateSessionValidation(params: {
  supabaseAdmin: SupabaseAdminClient;
  sessionId: string;
  rawPayload: Record<string, unknown>;
}): Promise<void> {
  const { error } = await params.supabaseAdmin
    .from("supplier_sessions")
    .update({
      status: "active",
      last_validated_at: new Date().toISOString(),
      raw_payload: params.rawPayload,
    })
    .eq("id", params.sessionId);

  if (error) {
    throw new Error(error.message);
  }
}

async function createStoredSession(params: {
  supabaseAdmin: SupabaseAdminClient;
  supplierId: string;
  token: string;
  rawPayload: Record<string, unknown>;
}): Promise<StrickerStoredSession> {
  const expiresAt = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString();

  const { data, error } = await params.supabaseAdmin
    .from("supplier_sessions")
    .insert({
      supplier_id: params.supplierId,
      token: params.token,
      status: "active",
      expires_at: expiresAt,
      last_validated_at: new Date().toISOString(),
      raw_payload: params.rawPayload,
    })
    .select(
      [
        "id",
        "supplier_id",
        "token",
        "status",
        "expires_at",
        "last_validated_at",
        "raw_payload",
        "created_at",
        "updated_at",
      ].join(","),
    )
    .single<StrickerStoredSession>();

  if (error || !data) {
    throw new Error(error?.message ?? "Não foi possível guardar a sessão Stricker.");
  }

  return data;
}

export async function getValidStrickerSessionToken(): Promise<string> {
  const supabaseAdmin = createSupabaseAdminClient();
  const supplierId = await getStrickerSupplierId();

  const existingSession = await getLatestActiveSession({
    supabaseAdmin,
    supplierId,
  });

  if (existingSession) {
    try {
      const validation = await validateStrickerSession(existingSession.token);

      if (isValidSessionStatus(validation.Status)) {
        await updateSessionValidation({
          supabaseAdmin,
          sessionId: existingSession.id,
          rawPayload: validation as Record<string, unknown>,
        });

        return existingSession.token;
      }

      await markSessionAsInvalid({
        supabaseAdmin,
        sessionId: existingSession.id,
      });
    } catch {
      await markSessionAsInvalid({
        supabaseAdmin,
        sessionId: existingSession.id,
      });
    }
  }

  const authentication = await authenticateStrickerClient();
  const token = authentication.Token?.trim();

  if (!token) {
    throw new Error("A Stricker não devolveu token de autenticação.");
  }

  await createStoredSession({
    supabaseAdmin,
    supplierId,
    token,
    rawPayload: authentication as Record<string, unknown>,
  });

  return token;
}