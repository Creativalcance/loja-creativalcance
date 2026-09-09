"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSiteLocale } from "@/lib/i18n/config";

export type NewsletterActionState = { success: boolean; message: string };

export async function subscribeNewsletterAction(
  _previousState: NewsletterActionState,
  formData: FormData,
): Promise<NewsletterActionState> {
  if (String(formData.get("website") ?? "").trim()) {
    return { success: true, message: "Subscrição registada." };
  }

  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const consent = formData.get("consent") === "on";
  const locale = getSiteLocale(String(formData.get("locale") ?? "pt"));

  if (name.length < 2 || name.length > 120) {
    return { success: false, message: "Indique um nome válido." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return { success: false, message: "Indique um endereço de email válido." };
  }
  if (!consent) {
    return { success: false, message: "É necessário aceitar a subscrição da newsletter." };
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("newsletter_subscribers").upsert(
    {
      name,
      email,
      locale,
      status: "active",
      source: "website_footer",
      consented_at: new Date().toISOString(),
      unsubscribed_at: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "email" },
  );

  if (error) {
    console.error("Newsletter subscription error", { code: error.code });
    return { success: false, message: "Não foi possível concluir a subscrição. Tente novamente." };
  }

  revalidatePath("/admin/newsletter");
  return { success: true, message: "Subscrição confirmada. Obrigado." };
}
