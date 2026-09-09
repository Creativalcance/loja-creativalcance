import type { SiteLocale } from "@/lib/i18n/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const DEFAULT_FROM_EMAIL = "360 Merchandising <info@creativalcance.com>";

type ResendResponse = {
  id?: string;
  message?: string;
  name?: string;
};

type WelcomeEmailParams = {
  subscriberId: string;
  consentedAt: string;
  name: string;
  email: string;
  locale: SiteLocale;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://360-merchandising.com").replace(/\/$/, "");
}

function buildWelcomeEmail(params: WelcomeEmailParams) {
  const copy = params.locale === "en"
    ? {
        lang: "en",
        preview: "Welcome to 360 Merchandising",
        subject: "Welcome to the 360 Merchandising newsletter",
        eyebrow: "SUBSCRIPTION CONFIRMED",
        heading: `Welcome, ${params.name}!`,
        intro: "Thank you for joining 360 Merchandising.",
        body: "You will receive selected product launches, inspiration and useful opportunities to help your brand go further.",
        button: "Explore the catalogue",
        reason: "You received this email because you subscribed to the 360 Merchandising newsletter.",
        unsubscribe: "To stop receiving our emails, reply to this message and request to unsubscribe.",
      }
    : params.locale === "fr"
      ? {
          lang: "fr",
          preview: "Bienvenue chez 360 Merchandising",
          subject: "Bienvenue dans la newsletter 360 Merchandising",
          eyebrow: "INSCRIPTION CONFIRMÉE",
          heading: `Bienvenue, ${params.name} !`,
          intro: "Merci de rejoindre 360 Merchandising.",
          body: "Vous recevrez une sélection de nouveautés, d’inspiration et d’opportunités utiles pour faire rayonner votre marque.",
          button: "Découvrir le catalogue",
          reason: "Vous recevez cet e-mail parce que vous vous êtes inscrit à la newsletter 360 Merchandising.",
          unsubscribe: "Pour ne plus recevoir nos e-mails, répondez à ce message et demandez votre désinscription.",
        }
      : {
          lang: "pt",
          preview: "Bem-vindo à 360 Merchandising",
          subject: "Bem-vindo à newsletter 360 Merchandising",
          eyebrow: "SUBSCRIÇÃO CONFIRMADA",
          heading: `Bem-vindo, ${params.name}!`,
          intro: "Obrigado por se juntar à 360 Merchandising.",
          body: "Vai receber uma seleção de novidades, inspiração e oportunidades úteis para levar a sua marca mais longe.",
          button: "Explorar o catálogo",
          reason: "Recebeu este email porque subscreveu a newsletter da 360 Merchandising.",
          unsubscribe: "Para deixar de receber os nossos emails, responda a esta mensagem e peça a remoção da subscrição.",
        };
  const catalogueUrl = `${getSiteUrl()}${params.locale === "pt" ? "" : `/${params.locale}`}/categorias`;
  const safeName = escapeHtml(params.name);
  const safeUrl = escapeHtml(catalogueUrl);
  const html = `<!doctype html>
<html lang="${copy.lang}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeHtml(copy.subject)}</title>
  </head>
  <body style="margin:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#162334;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(copy.preview)}</div>
    <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
      <div style="background:#162334;border-radius:24px 24px 0 0;padding:30px 32px;">
        <div style="font-size:18px;font-weight:700;color:#ffffff;"><span style="color:#ff6a00;">360</span> Merchandising</div>
        <div style="margin-top:24px;font-size:12px;font-weight:700;letter-spacing:2px;color:#ff8a38;">${escapeHtml(copy.eyebrow)}</div>
        <h1 style="margin:10px 0 0;font-size:30px;line-height:1.2;color:#ffffff;">${safeName ? escapeHtml(copy.heading) : escapeHtml(copy.preview)}</h1>
      </div>
      <div style="background:#ffffff;border-radius:0 0 24px 24px;padding:32px;">
        <p style="margin:0;font-size:17px;line-height:1.7;color:#162334;">${escapeHtml(copy.intro)}</p>
        <p style="margin:16px 0 0;font-size:16px;line-height:1.7;color:#536071;">${escapeHtml(copy.body)}</p>
        <p style="margin:28px 0 0;">
          <a href="${safeUrl}" style="display:inline-block;background:#ff6a00;color:#ffffff;text-decoration:none;border-radius:999px;padding:14px 24px;font-size:15px;font-weight:700;">${escapeHtml(copy.button)}</a>
        </p>
        <div style="margin-top:32px;border-top:1px solid #e7eaee;padding-top:20px;font-size:12px;line-height:1.6;color:#7a8491;">
          <p style="margin:0;">${escapeHtml(copy.reason)}</p>
          <p style="margin:8px 0 0;">${escapeHtml(copy.unsubscribe)}</p>
        </div>
      </div>
    </div>
  </body>
</html>`;
  const text = [
    copy.heading,
    "",
    copy.intro,
    copy.body,
    "",
    `${copy.button}: ${catalogueUrl}`,
    "",
    copy.reason,
    copy.unsubscribe,
  ].join("\n");

  return { subject: copy.subject, html, text };
}

export async function sendNewsletterWelcomeEmail(params: WelcomeEmailParams): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const claim = await supabase
    .from("newsletter_subscribers")
    .update({
      welcome_email_status: "sending",
      welcome_email_attempted_at: new Date().toISOString(),
      welcome_email_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.subscriberId)
    .in("welcome_email_status", ["pending", "failed"])
    .select("id")
    .maybeSingle<{ id: string }>();

  if (claim.error) {
    throw new Error(`Não foi possível preparar o email de boas-vindas: ${claim.error.message}`);
  }

  if (!claim.data) {
    return;
  }

  try {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("RESEND_API_KEY não está configurada.");
    }

    const content = buildWelcomeEmail(params);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `newsletter-welcome-${params.subscriberId}-${params.consentedAt}`.slice(0, 256),
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM_EMAIL,
        to: [params.email],
        subject: content.subject,
        html: content.html,
        text: content.text,
        tags: [
          { name: "event", value: "newsletter_welcome" },
          { name: "locale", value: params.locale },
        ],
      }),
    });
    const result = (await response.json().catch(() => ({}))) as ResendResponse;

    if (!response.ok || !result.id) {
      throw new Error(result.message || result.name || `Resend respondeu com HTTP ${response.status}.`);
    }

    const saved = await supabase
      .from("newsletter_subscribers")
      .update({
        welcome_email_status: "sent",
        welcome_email_provider_id: result.id,
        welcome_email_sent_at: new Date().toISOString(),
        welcome_email_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.subscriberId);

    if (saved.error) {
      throw new Error(`Email enviado, mas o estado não foi guardado: ${saved.error.message}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido no envio do email de boas-vindas.";
    await supabase
      .from("newsletter_subscribers")
      .update({
        welcome_email_status: "failed",
        welcome_email_error: message.slice(0, 1000),
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.subscriberId);
    throw error;
  }
}
