import "server-only";
import { getValidStrickerSessionToken } from "@/lib/stricker/auth";
import { getStrickerConfig } from "@/lib/stricker/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { safeMockupUrl } from "@/lib/orders/mockup";

type ApprovalMockup = { order_number: string; internal_reference: string; version: number; approval_url: string; supplier_created_at: string };

export function parseApprovalMockups(value: unknown): ApprovalMockup[] {
  const invalid = () => new Error("Resposta de maquetes inválida; o estado anterior foi preservado.");
  if (!value || typeof value !== "object") throw invalid();
  const body = value as Record<string, unknown>;
  if (body.ErrorCode != null && body.ErrorCode !== 0 && body.ErrorCode !== "0") {
    const code = /^\d{1,6}$/.test(String(body.ErrorCode)) ? String(body.ErrorCode) : "desconhecido";
    throw new Error(`Consulta de maquetes recusada (código ${code}); o estado anterior foi preservado.`);
  }
  if ((body.ErrorCode != null && body.ErrorCode !== 0 && body.ErrorCode !== "0") || body.ErrorMessage
    || !Array.isArray(body.ApprovalMockups) || body.Count !== body.ApprovalMockups.length) throw invalid();
  const latest = new Map<string, ApprovalMockup>();
  for (const entry of body.ApprovalMockups) {
    if (!entry || typeof entry !== "object") throw invalid();
    const row = entry as Record<string, unknown>;
    const link = safeMockupUrl(row.Link);
    if (!link || typeof row.OrderNumber !== "string" || !row.OrderNumber.trim()
      || (row.InternalReference != null && typeof row.InternalReference !== "string")
      || typeof row.Version !== "number" || !Number.isSafeInteger(row.Version) || row.Version < 1
      || typeof row.CreateDate !== "string" || !Number.isFinite(Date.parse(row.CreateDate))) throw invalid();
    const mockup = { order_number: row.OrderNumber.trim(), internal_reference: typeof row.InternalReference === "string" ? row.InternalReference.trim() : "",
      version: row.Version, approval_url: link, supplier_created_at: row.CreateDate };
    const previous = latest.get(mockup.order_number);
    if (previous && (previous.internal_reference !== mockup.internal_reference
      || (previous.version === mockup.version && previous.approval_url !== link))) throw invalid();
    if (!previous || previous.version < mockup.version) latest.set(mockup.order_number, mockup);
  }
  return [...latest.values()];
}

// One account-wide GET per scheduled run. Customer pages never call the provider.
export async function syncStrickerMockups() {
  let token: string;
  let baseUrl: string;
  try { token = await getValidStrickerSessionToken(); baseUrl = getStrickerConfig().apiBaseUrl; }
  catch { throw new Error("Falha na sessão da consulta de maquetes; o estado anterior foi preservado."); }
  const url = new URL(`${baseUrl}/ApprovalMockups`);
  url.searchParams.set("token", token);
  let response: Response;
  try {
    response = await fetch(url, { method: "GET", cache: "no-store", headers: { Accept: "application/json" }, signal: AbortSignal.timeout(60_000) });
  } catch (cause) { throw new Error(`Consulta de maquetes interrompida (${cause instanceof Error && cause.name === "TimeoutError" ? "tempo limite" : "ligação"}); o estado anterior foi preservado.`); }
  if (!response.ok) throw new Error(`Consulta de maquetes respondeu HTTP ${response.status}; o estado anterior foi preservado.`);
  let payload: unknown;
  try { payload = await response.json(); }
  catch { throw new Error("Formato da consulta de maquetes inválido; o estado anterior foi preservado."); }
  const mockups = parseApprovalMockups(payload);
  const result = await createSupabaseAdminClient().rpc("reconcile_order_mockups", { p_mockups: mockups });
  if (result.error) {
    const code = /^[A-Z0-9_]{1,12}$/.test(result.error.code ?? "") ? result.error.code : "desconhecido";
    throw new Error(`Não foi possível guardar a sincronização das maquetes (código ${code}).`);
  }
  return result.data;
}

export function effectiveMockupOrderStatus(raw: string | null, state: string | undefined): string | null {
  if (["SHIPPED", "SENT", "CANCELED", "CANCELLED"].includes(raw ?? "")) return raw;
  if (state === "pending") return "PENDING_MOCKUP_APPROVAL";
  // The pending list does not say whether the client approved or requested changes.
  if (state === "awaiting_confirmation" && ["WAITING_ART_WORK", "PENDING_MOCKUP_APPROVAL"].includes(raw ?? "")) return "PROCESSING";
  return raw;
}
