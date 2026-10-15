"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Envio comercial EXCLUSIVAMENTE após confirmação explícita no backoffice.
 * A transição atómica ready -> sending impede pedidos concorrentes.
 * Nunca repetimos um envio externo de resultado incerto.
 */
export async function confirmNewsletterBroadcastSend(formData: FormData): Promise<void> {
  const admin = await assertAdminAccess("/admin/newsletter");
  const id = String(formData.get("campaign_id") ?? "");
  if (!UUID.test(id) || formData.get("confirm") !== "yes" ||
      String(formData.get("confirmation_text") ?? "").trim() !== "ENVIAR") {
    throw new Error("É necessária confirmação expressa antes do envio.");
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const segment = process.env.RESEND_NEWSLETTER_SEGMENT_ID?.trim();
  const sender = process.env.RESEND_MARKETING_FROM_EMAIL?.trim();
  if (!apiKey || !segment || !sender || process.env.RESEND_NEWSLETTER_SYNC_ENABLED !== "true" ||
      !process.env.RESEND_WEBHOOK_SECRET) {
    throw new Error("Configuração de marketing incompleta ou sincronização suspensa.");
  }
  const db = createSupabaseAdminClient();
  const { data: campaign, error: readError } = await db.from("newsletter_campaigns")
    .select("id,title,subject,status,locale,audience,resend_broadcast_id")
    .eq("id", id).maybeSingle();
  if (readError || !campaign || campaign.status !== "ready" ||
      !campaign.resend_broadcast_id || !UUID.test(campaign.resend_broadcast_id) ||
      campaign.locale !== "pt" || campaign.audience !== "all") {
    throw new Error("A campanha não está pronta para envio ao segmento português.");
  }
  const { count: eligible, error: countError } = await db.from("newsletter_subscribers")
    .select("id", { count: "exact", head: true }).eq("status", "active")
    .eq("locale", "pt").is("unsubscribed_at", null)
    .not("resend_synced_at", "is", null);
  const { count: pending, error: pendingError } = await db.from("newsletter_subscribers")
    .select("id", { count: "exact", head: true }).eq("status", "active")
    .eq("locale", "pt").is("unsubscribed_at", null).is("resend_synced_at", null);
  const acknowledgedCount = Number(formData.get("expected_recipients"));
  if (countError || pendingError || !eligible || pending !== 0 ||
      eligible !== acknowledgedCount || !Number.isSafeInteger(acknowledgedCount)) {
    throw new Error("Destinatários alterados ou por sincronizar. Atualiza a confirmação antes de enviar.");
  }
  const remote = await fetch(`https://api.resend.com/broadcasts/${campaign.resend_broadcast_id}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  if (!remote.ok) throw new Error("Não foi possível confirmar o rascunho no Resend.");
  const info = await remote.json() as { status?: string; segment_id?: string; subject?: string; from?: string };
  if (info.status !== "draft" || info.segment_id !== segment ||
      info.subject !== campaign.subject || info.from !== sender) {
    throw new Error("O rascunho no Resend não corresponde à campanha aprovada. Envio bloqueado.");
  }
  const { data: claimed, error: claimError } = await db.from("newsletter_campaigns")
    .update({ status: "sending", updated_at: new Date().toISOString() })
    .eq("id", id).eq("status", "ready").eq("resend_broadcast_id", campaign.resend_broadcast_id)
    .select("id").maybeSingle();
  if (claimError || !claimed) throw new Error("A campanha já está a ser processada. O envio não foi repetido.");

  const { error: auditError } = await db.from("newsletter_campaign_events").insert({
    campaign_id: id,
    event_type: "broadcast_send_requested",
    details: { actor_id: admin.userId, confirmed_recipients: eligible },
  });
  if (auditError) console.error("Newsletter audit error", { code: auditError.code });

  let response: Response;
  try {
    response = await fetch(`https://api.resend.com/broadcasts/${campaign.resend_broadcast_id}/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `360-broadcast-send-${id}`,
      },
      body: JSON.stringify({}),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    // Resultado remoto desconhecido: reenvio é proibido até reconciliação.
    throw new Error("Resultado incerto na comunicação com o Resend. Não repitas o envio; verifica o estado no Resend.");
  }
  if (!response.ok) {
    // Um erro remoto também exige reconciliação; nunca libertar a campanha para novo envio.
    throw new Error(`O Resend devolveu HTTP ${response.status}. Consulta o estado no Resend antes de nova ação.`);
  }
  await db.from("newsletter_campaign_events").insert({
    campaign_id: id, event_type: "broadcast_send_accepted",
    details: { confirmed_recipients: eligible, resend_broadcast_id: campaign.resend_broadcast_id },
  });
  revalidatePath("/admin/newsletter");
  redirect("/admin/newsletter?send=accepted");
}

/**
 * Consulta o estado remoto sem lançar outro envio. Mantém o estado "sending"
 * quando o Resend ainda não confirma "sent" ou "scheduled".
 */
export async function refreshNewsletterBroadcastStatus(formData: FormData): Promise<void> {
  await assertAdminAccess("/admin/newsletter");
  const id = String(formData.get("campaign_id") ?? "");
  if (!UUID.test(id)) throw new Error("Identificador inválido.");
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) throw new Error("Resend não configurado.");
  const db = createSupabaseAdminClient();
  const { data: campaign } = await db.from("newsletter_campaigns")
    .select("status,resend_broadcast_id").eq("id", id).maybeSingle();
  if (!campaign?.resend_broadcast_id || !["ready","sending","sent","scheduled"].includes(campaign.status))
    throw new Error("Campanha indisponível para consulta.");
  const response = await fetch(`https://api.resend.com/broadcasts/${campaign.resend_broadcast_id}`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error("Falha na consulta do estado remoto.");
  const remote = await response.json() as { status?: string };
  const newStatus = remote.status === "sent" ? "sent" :
                    remote.status === "scheduled" ? "scheduled" : null;
  if (newStatus && campaign.status !== newStatus) {
    await db.from("newsletter_campaigns").update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", id).in("status", ["sending","scheduled"]);
    await db.from("newsletter_campaign_events").insert({
      campaign_id: id, event_type: "broadcast_status_checked",
      details: { provider_status: remote.status },
    });
  }
  revalidatePath("/admin/newsletter");
  redirect("/admin/newsletter");
}
