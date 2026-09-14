"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSiteLocale } from "@/lib/i18n/config";
import { sendNewsletterWelcomeEmail } from "@/lib/newsletter/welcome-email";

export type NewsletterActionState = { success: boolean; message: string };

export async function subscribeNewsletterAction(
  _previousState: NewsletterActionState,
  formData: FormData,
): Promise<NewsletterActionState> {
  const locale = getSiteLocale(String(formData.get("locale") ?? "pt"));
  const copy = {
    pt: { name: "Indique um nome válido.", email: "Indique um endereço de email válido.", consent: "É necessário aceitar a subscrição da newsletter.", failed: "Não foi possível concluir a subscrição. Tente novamente.", success: "Subscrição confirmada. Obrigado." },
    en: { name: "Enter a valid name.", email: "Enter a valid email address.", consent: "Please agree to the newsletter subscription.", failed: "We could not complete your subscription. Please try again.", success: "Subscription confirmed. Thank you." },
    fr: { name: "Indiquez un nom valide.", email: "Indiquez une adresse e-mail valide.", consent: "Veuillez accepter l’abonnement à la newsletter.", failed: "Impossible de finaliser votre abonnement. Réessayez.", success: "Inscription confirmée. Merci." },
    es: { name: "Introduce un nombre válido.", email: "Introduce una dirección de correo electrónico válida.", consent: "Debes aceptar la suscripción a la newsletter.", failed: "No se ha podido completar la suscripción. Inténtalo de nuevo.", success: "Suscripción confirmada. Gracias." },
    de: { name: "Geben Sie einen gültigen Namen ein.", email: "Geben Sie eine gültige E-Mail-Adresse ein.", consent: "Bitte stimmen Sie dem Newsletter-Abonnement zu.", failed: "Ihre Anmeldung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.", success: "Anmeldung bestätigt. Vielen Dank." },
    it: { name: "Inserisci un nome valido.", email: "Inserisci un indirizzo e-mail valido.", consent: "Devi accettare l’iscrizione alla newsletter.", failed: "Impossibile completare l’iscrizione. Riprova.", success: "Iscrizione confermata. Grazie." },
  }[locale];
  if (String(formData.get("website") ?? "").trim()) {
    return { success: true, message: copy.success };
  }
  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const consent = formData.get("consent") === "on";

  if (name.length < 2 || name.length > 120) {
    return { success: false, message: copy.name };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return { success: false, message: copy.email };
  }
  if (!consent) {
    return { success: false, message: copy.consent };
  }

  const supabase = createSupabaseAdminClient();
  const consentedAt = new Date().toISOString();
  const { data: subscriber, error } = await supabase.from("newsletter_subscribers").upsert(
    {
      name,
      email,
      locale,
      status: "active",
      source: "website_footer",
      consented_at: consentedAt,
      unsubscribed_at: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "email" },
  ).select("id,welcome_email_status").single<{ id: string; welcome_email_status: string }>();

  if (error) {
    console.error("Newsletter subscription error", { code: error.code });
    return { success: false, message: copy.failed };
  }

  try {
    await sendNewsletterWelcomeEmail({
      subscriberId: subscriber.id,
      consentedAt,
      name,
      email,
      locale,
    });
  } catch (emailError) {
    console.error("Newsletter welcome email error", {
      subscriberId: subscriber.id,
      message: emailError instanceof Error ? emailError.message : "Unknown error",
    });
  }

  revalidatePath("/admin/newsletter");
  return { success: true, message: copy.success };
}
