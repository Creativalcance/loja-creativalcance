"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Reenvio significa criar uma nova campanha, nunca reabrir ou enviar o
 * Broadcast original. Preserva o histórico e obriga a novo rascunho/validação.
 */
export async function repeatNewsletterCampaign(form: FormData): Promise<void> {
  const admin = await assertAdminAccess("/admin/newsletter");
  const originalId = String(form.get("campaign_id") ?? "");
  if (!UUID.test(originalId) || form.get("confirm") !== "yes") {
    throw new Error("Confirma que pretendes criar uma nova campanha baseada na anterior.");
  }
  const db = createSupabaseAdminClient();
  const { data: original, error: readError } = await db.from("newsletter_campaigns")
    .select("id,title,subject,preview_text,body_text,locale,audience,status,hero_image_url,resend_broadcast_id")
    .eq("id", originalId).maybeSingle();
  if (readError || !original || original.status !== "sent" || !original.resend_broadcast_id) {
    throw new Error("Só é possível reutilizar campanhas já enviadas.");
  }
  const title = (`Reenvio — ${original.title}`).slice(0, 115) + " · " +
    new Date().toISOString().slice(0,16).replace("T"," ");
  const { data: copy, error } = await db.from("newsletter_campaigns").insert({
    title, subject: original.subject, preview_text: original.preview_text,
    body_text: original.body_text, locale: original.locale, audience: original.audience,
    hero_image_url: original.hero_image_url, status: "draft",
    created_by: admin.userId, resend_broadcast_id: null,
  }).select("id").single();
  if (error || !copy) throw new Error("Não foi possível criar o novo rascunho.");
  const { error: auditError } = await db.from("newsletter_campaign_events").insert({
    campaign_id: copy.id, event_type: "draft_reused_from_previous",
    details: { source_campaign_id: originalId, actor_id: admin.userId },
  });
  if (auditError) console.error("Newsletter repeat audit failed", { code: auditError.code });
  revalidatePath("/admin/newsletter");
  redirect(`/admin/newsletter?edit=${copy.id}`);
}
