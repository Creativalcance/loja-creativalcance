const ESCAPES: Record<string, string> = {
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
};

export function escapeNewsletterHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

export type NewsletterPreview = {
  subject: string;
  preview_text: string;
  body_text: string;
  locale: string;
};

const WEBSITE = "https://360-merchandising.com";

export function renderNewsletterPreview(campaign: NewsletterPreview): string {
  const lang = ["pt", "en", "fr", "es", "de", "it"].includes(campaign.locale) ? campaign.locale : "pt";
  const subject = escapeNewsletterHtml(campaign.subject);
  const preview = escapeNewsletterHtml(campaign.preview_text);
  const paragraphs = campaign.body_text.split(/\n\s*\n/).filter(Boolean).map((part) =>
    "<p style=\"font-size:16px;line-height:1.7;margin:0 0 20px;white-space:pre-line\">" +
    escapeNewsletterHtml(part) + "</p>"
  ).join("");
  return `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${subject}</title></head>
<body style="margin:0;background:#f3f4f6;color:#162334;font-family:Arial,Helvetica,sans-serif">
<div style="display:none!important;max-height:0;overflow:hidden;opacity:0">${preview}</div>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse"><tr><td style="padding:26px 12px">
<table role="presentation" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;width:100%;background:#fff;border-collapse:collapse">
<tr><td style="background:#162334;padding:25px 30px;color:white;font-size:23px;font-weight:700"><img src="https://360-merchandising.com/brand/360-merchandising.png" alt="360 Merchandising" width="240" style="display:block;max-width:100%;height:auto;border:0"></td></tr>
<tr><td style="padding:34px 30px"><div style="font-size:12px;letter-spacing:2px;font-weight:700;color:#ff6a00;margin-bottom:22px">360 MERCHANDISING</div>
${paragraphs}
<a href="${WEBSITE}" style="display:inline-block;background:#ff6a00;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:15px 22px;border-radius:6px">Descobrir a 360 Merchandising</a>
</td></tr>
<tr><td style="background:#162334;color:#ffffff;padding:24px 30px;font-size:12px;line-height:1.7">
A tua marca em toda a parte.<br><a href="${WEBSITE}" style="color:#ff9a56">${WEBSITE}</a><br>
<span style="color:#cbd5e1">Pré-visualização interna. O envio final exigirá mecanismo de cancelamento de subscrição e validação de consentimentos.</span>
</td></tr></table></td></tr></table></body></html>`;
}

/** Email comercial; o marcador de unsubscribe é substituído pelo Resend no envio. */
export function renderNewsletterBroadcast(campaign: NewsletterPreview): string {
  const unsubscribe = '<p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#536071">Para deixar de receber estes emails, <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#162334;text-decoration:underline">cancela a subscrição</a>.</p>';
  return renderNewsletterPreview(campaign)
    .replace(
      '<span style="color:#cbd5e1">Pré-visualização interna. O envio final exigirá mecanismo de cancelamento de subscrição e validação de consentimentos.</span>',
      '',
    )
    .replace(
      '</td></tr>\n<tr><td style="background:#162334;color:#ffffff',
      unsubscribe + '</td></tr>\n<tr><td style="background:#162334;color:#ffffff',
    );
}
