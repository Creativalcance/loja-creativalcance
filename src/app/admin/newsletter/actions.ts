"use server";

import { revalidatePath } from "next/cache";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function createNewsletterDraft(formData: FormData): Promise<void> {
  const admin = await assertAdminAccess("/admin/newsletter");
  const title = String(formData.get("title") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const preview = String(formData.get("preview") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const locale = String(formData.get("locale") ?? "pt");
  const audience = String(formData.get("audience") ?? "all");
  if (title.length < 3 || title.length > 160 || subject.length < 3 || subject.length > 200 ||
      preview.length > 250 || body.length > 30000 || !["pt","en","fr","es","de","it"].includes(locale) ||
      !["all","b2b","b2c"].includes(audience)) throw new Error("Dados da campanha inválidos.");
  const supabase = createSupabaseAdminClient();
  // Rascunho apenas; não chama Resend nem faz envios.
  const { error } = await supabase.from("newsletter_campaigns").insert({
    title, subject, preview_text: preview, body_html: body, locale, audience,
    status: "draft", created_by: admin.userId,
  });
  if (error) throw new Error("Não foi possível guardar o rascunho.");
  revalidatePath("/admin/newsletter");
}
