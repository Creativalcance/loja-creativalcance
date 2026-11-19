import { randomUUID } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStrickerSupplierId } from "@/lib/stricker/auth";
import {
  authenticateStrickerClient,
  validateStrickerSession,
} from "./client";
import { type StrickerStoredSession } from "./types";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

const SESSION_LOCK_TTL_SECONDS = 60;
const SESSION_LOCK_WAIT_MS = 200;
const SESSION_LOCK_MAX_ATTEMPTS = 30;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isValidSessionStatus(status: unknown): boolean {
  if (typeof status === "boolean") {
    return status;
  }

  if (typeof status === "number") {
    return status === 1;
  }

  if (typeof status === "string") {
    const normalized = status.trim().toLowerCase();

    return normalized === "1" || normalized === "true";
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
  rawPayload?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await params.supabaseAdmin
    .from("supplier_sessions")
    .update({
      status: "invalid",
      last_validated_at: new Date().toISOString(),
      raw_payload: params.rawPayload ?? {},
    })
    .eq("id", params.sessionId);

  if (error) {
    throw new Error(error.message);
  }
}

async function markActiveSessionsAsInvalid(params: {
  supabaseAdmin: SupabaseAdminClient;
  supplierId: string;
  reason: string;
}): Promise<void> {
  const { error } = await params.supabaseAdmin
    .from("supplier_sessions")
    .update({
      status: "invalid",
      last_validated_at: new Date().toISOString(),
      raw_payload: {
        reason: params.reason,
      },
    })
    .eq("supplier_id", params.supplierId)
    .eq("status", "active");

  if (error) {
    throw new Error(error.message);
  }
}

async function closeActiveSessions(params: {
  supabaseAdmin: SupabaseAdminClient;
  supplierId: string;
}): Promise<void> {
  const { error } = await params.supabaseAdmin
    .from("supplier_sessions")
    .update({
      status: "closed",
      last_validated_at: new Date().toISOString(),
    })
    .eq("supplier_id", params.supplierId)
    .eq("status", "active");

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

  await closeActiveSessions({
    supabaseAdmin: params.supabaseAdmin,
    supplierId: params.supplierId,
  });

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
    throw new Error(
      error?.message ?? "Não foi possível guardar a sessão do fornecedor.",
    );
  }

  return data;
}

function isExpiredSession(session: StrickerStoredSession): boolean {
  if (!session.expires_at) {
    return false;
  }

  return new Date(session.expires_at).getTime() <= Date.now();
}

function canReuseReplacementSession(params: {
  session: StrickerStoredSession | null;
  previousSessionId?: string | null;
}): params is {
  session: StrickerStoredSession;
  previousSessionId?: string | null;
} {
  if (!params.session || isExpiredSession(params.session)) {
    return false;
  }

  if (
    params.previousSessionId &&
    params.session.id === params.previousSessionId
  ) {
    return false;
  }

  return true;
}

async function acquireSessionLock(params: {
  supabaseAdmin: SupabaseAdminClient;
  supplierId: string;
  ownerToken: string;
}): Promise<boolean> {
  const { data, error } = await params.supabaseAdmin.rpc(
    "try_acquire_integration_sync_lock",
    {
      target_lock_key: `stricker:session-auth:${params.supplierId}`,
      target_owner_token: params.ownerToken,
      target_ttl_seconds: SESSION_LOCK_TTL_SECONDS,
    },
  );

  if (error) {
    throw new Error(
      `Não foi possível obter o bloqueio da sessão Stricker: ${error.message}`,
    );
  }

  return data === true;
}

async function releaseSessionLock(params: {
  supabaseAdmin: SupabaseAdminClient;
  supplierId: string;
  ownerToken: string;
}): Promise<void> {
  const { error } = await params.supabaseAdmin.rpc(
    "release_integration_sync_lock",
    {
      target_lock_key: `stricker:session-auth:${params.supplierId}`,
      target_owner_token: params.ownerToken,
    },
  );

  if (error) {
    console.error(
      "Falha ao libertar bloqueio da sessão Stricker:",
      error.message,
    );
  }
}

async function createNewValidSession(params: {
  supabaseAdmin: SupabaseAdminClient;
  supplierId: string;
  previousSessionId?: string | null;
}): Promise<string> {
  const ownerToken = randomUUID();
  let acquired = false;

  for (
    let attempt = 0;
    attempt < SESSION_LOCK_MAX_ATTEMPTS;
    attempt += 1
  ) {
    acquired = await acquireSessionLock({
      supabaseAdmin: params.supabaseAdmin,
      supplierId: params.supplierId,
      ownerToken,
    });

    if (acquired) {
      break;
    }

    await sleep(SESSION_LOCK_WAIT_MS);

    const replacement = await getLatestActiveSession({
      supabaseAdmin: params.supabaseAdmin,
      supplierId: params.supplierId,
    });

    if (
      canReuseReplacementSession({
        session: replacement,
        previousSessionId: params.previousSessionId,
      })
    ) {
      return replacement.token;
    }
  }

  if (!acquired) {
    throw new Error(
      "Não foi possível obter o bloqueio para renovar a sessão do fornecedor.",
    );
  }

  try {
    const replacement = await getLatestActiveSession({
      supabaseAdmin: params.supabaseAdmin,
      supplierId: params.supplierId,
    });

    if (
      canReuseReplacementSession({
        session: replacement,
        previousSessionId: params.previousSessionId,
      })
    ) {
      return replacement.token;
    }

    const authentication = await authenticateStrickerClient();
    const token = authentication.Token?.trim();

    if (!token) {
      throw new Error("O fornecedor não devolveu token de autenticação.");
    }

    await createStoredSession({
      supabaseAdmin: params.supabaseAdmin,
      supplierId: params.supplierId,
      token,
      rawPayload: authentication as Record<string, unknown>,
    });

    return token;
  } finally {
    await releaseSessionLock({
      supabaseAdmin: params.supabaseAdmin,
      supplierId: params.supplierId,
      ownerToken,
    });
  }
}

export async function refreshStrickerSessionToken(
  reason = "A sessão foi rejeitada pelo fornecedor durante uma operação autenticada.",
): Promise<string> {
  const supabaseAdmin = createSupabaseAdminClient();
  const supplierId = await getStrickerSupplierId();
  const previousSession = await getLatestActiveSession({
    supabaseAdmin,
    supplierId,
  });

  await markActiveSessionsAsInvalid({
    supabaseAdmin,
    supplierId,
    reason,
  });

  return createNewValidSession({
    supabaseAdmin,
    supplierId,
    previousSessionId: previousSession?.id ?? null,
  });
}

export async function getValidStrickerSessionToken(): Promise<string> {
  const supabaseAdmin = createSupabaseAdminClient();
  const supplierId = await getStrickerSupplierId();

  const existingSession = await getLatestActiveSession({
    supabaseAdmin,
    supplierId,
  });

  if (!existingSession) {
    return createNewValidSession({
      supabaseAdmin,
      supplierId,
    });
  }

  if (isExpiredSession(existingSession)) {
    await markSessionAsInvalid({
      supabaseAdmin,
      sessionId: existingSession.id,
      rawPayload: {
        reason: "Sessão expirada localmente.",
        expires_at: existingSession.expires_at,
      },
    });

    return createNewValidSession({
      supabaseAdmin,
      supplierId,
      previousSessionId: existingSession.id,
    });
  }

  try {
    const validation = await validateStrickerSession(existingSession.token);
    const rawPayload = validation as Record<string, unknown>;

    if (isValidSessionStatus(validation.Status)) {
      await updateSessionValidation({
        supabaseAdmin,
        sessionId: existingSession.id,
        rawPayload,
      });

      return existingSession.token;
    }

    await markSessionAsInvalid({
      supabaseAdmin,
      sessionId: existingSession.id,
      rawPayload,
    });

    return createNewValidSession({
      supabaseAdmin,
      supplierId,
      previousSessionId: existingSession.id,
    });
  } catch (error) {
    await markSessionAsInvalid({
      supabaseAdmin,
      sessionId: existingSession.id,
      rawPayload: {
        reason:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao validar a sessão do fornecedor.",
      },
    });

    return createNewValidSession({
      supabaseAdmin,
      supplierId,
      previousSessionId: existingSession.id,
    });
  }
}
