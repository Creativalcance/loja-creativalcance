"use server";

import { revalidatePath } from "next/cache";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { renderNewsletterBroadcast } from "@/lib/newsletter/campaign-template";

function readDraft(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const preview_text = String(formData.get("preview") ?? "").trim();
  const body_text = String(formData.get("body") ?? "").trim();
  const locale = String(formData.get("locale") ?? "pt");
  const audience = String(formData.get("audience") ?? "all");
  if (title.length < 3 || title.length > 160 || subject.length < 3 || subject.length > 200 ||
      preview_text.length > 250 || body_text.length < 5 || body_text.length > 30000 ||
      !["pt","en","fr","es","de","it"].includes(locale) ||
      !["all","b2b","b2c"].includes(audience)) throw new Error("Dados da campanha inválidos.");
  return { title, subject, preview_text, body_text, locale, audience };
}

export async function saveNewsletterDraft(formData: FormData): Promise<void> {
  const admin = await assertAdminAccess("/admin/newsletter");
  const draft = readDraft(formData);
  const id = String(formData.get("campaign_id") ?? "").trim();
  const supabase = createSupabaseAdminClient();

  if (id) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      throw new Error("Identificador de campanha inválido.");
    }
    const { data, error } = await supabase.from("newsletter_campaigns")
      .update({ ...draft, updated_at: new Date().toISOString() })
      .eq("id", id).eq("status", "draft")
      .select("id").maybeSingle();
    if (error || !data) throw new Error("Não foi possível atualizar o rascunho.");
  } else {
    const { error } = await supabase.from("newsletter_campaigns")
      .insert({ ...draft, status: "draft", created_by: admin.userId });
    if (error) throw new Error("Não foi possível guardar o rascunho.");
  }

  // Nenhuma chamada ao Resend: o envio e o agendamento continuam bloqueados.
  revalidatePath("/admin/newsletter");
}

/**
 * Cria APENAS um rascunho no Resend. Nunca agenda nem envia uma campanha.
 * O segmento de destino só pode ser configurado através de variável de ambiente no servidor.
 */
export async function prepareNewsletterBroadcastDraft(formData: FormData): Promise<void> {
  await assertAdminAccess("/admin/newsletter");
  const id = String(formData.get("campaign_id") ?? "");
  const acknowledgement = formData.get("confirm") === "yes";
  if (!acknowledgement || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error("Confirme a preparação do rascunho.");
  }
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const segment = process.env.RESEND_NEWSLETTER_SEGMENT_ID?.trim();
  const sender = process.env.RESEND_MARKETING_FROM_EMAIL?.trim();
  if (!apiKey || !segment || !sender || !/^[0-9a-f-]{36}$/i.test(segment)) {
    throw new Error("Configuração de marketing Resend incompleta.");
  }
  const db = createSupabaseAdminClient();
  const { data: campaign, error } = await db.from("newsletter_campaigns")
    .select("id,subject,preview_text,body_text,locale,status,resend_broadcast_id")
    .eq("id", id).maybeSingle();
  if (error || !campaign || campaign.status !== "draft" || campaign.resend_broadcast_id) {
    throw new Error("A campanha já foi preparada ou não está em rascunho.");
  }
  // Reserva a campanha no servidor para impedir preparações concorrentes.
  const { data: claimed, error: claimError } = await db.from("newsletter_campaigns")
    .update({ status: "ready", updated_at: new Date().toISOString() })
    .eq("id", id).eq("status", "draft").is("resend_broadcast_id", null).select("id").maybeSingle();
  if (claimError || !claimed) throw new Error("Esta campanha já está a ser preparada.");
  let published = false;
  try {
    const response = await fetch("https://api.resend.com/broadcasts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `360-newsletter-draft-${id}`,
      },
      body: JSON.stringify({
        segment_id: segment,
        from: sender,
        subject: campaign.subject,
        html: renderNewsletterBroadcast(campaign),
        send: false,
      }),
      cache: "no-store",
    });
    const body: unknown = await response.json();
    if (!response.ok || typeof body !== "object" || !body || !("id" in body) ||
        typeof body.id !== "string") {
      throw new Error(`Resend não confirmou o rascunho (HTTP ${response.status}).`);
    }
    // O ID único também permite detetar eventual duplicação e reconciliar erros.
    const saved = await db.from("newsletter_campaigns")
      .update({ resend_broadcast_id: body.id, updated_at: new Date().toISOString() })
      .eq("id", id).eq("status", "ready");
    if (saved.error) throw new Error("Rascunho preparado no Resend, mas o registo local exige reconciliação.");
    published = true;
  } finally {
    // Não libertar um rascunho para novo envio se a chamada externa teve resultado incerto.
    if (!published) {
      await db.from("newsletter_campaigns").update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", id).eq("status", "ready").is("resend_broadcast_id", null);
    }
  }
  revalidatePath("/admin/newsletter");
}
