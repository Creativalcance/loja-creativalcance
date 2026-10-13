"use server";

import { revalidatePath } from "next/cache";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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
