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
const SITE = "https://360-merchandising.com";
const BRAND_LOGO = SITE + "/brand/360-merchandising.png";

export function normalizeNewsletterText(value: string): string {
  // Antigos rascunhos armazenaram as sequências de escape como caracteres literais.
  return value.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n")
    .replace(/\r\n?/g, "\n").trim();
}

function contentHtml(value: string): string {
  const blocks = normalizeNewsletterText(value).split(/\n\s*\n/).map(v => v.trim()).filter(Boolean);
  return blocks.map((part, index) => {
    const safe = escapeNewsletterHtml(part).replace(/\n/g, "<br>");
    if (index === 0) {
      return '<h1 style="font-size:28px;line-height:1.22;font-weight:800;color:#162334;margin:0 0 24px">' + safe + '</h1>';
    }
    if (part.trim().toUpperCase() === "ESCOLHE. PERSONALIZA. ENCOMENDA.") {
      return '<p style="font-size:17px;line-height:1.5;font-weight:700;color:#ff6a00;margin:0 0 24px">' + safe + '</p>';
    }
    return '<p style="font-size:16px;line-height:1.7;color:#29384b;margin:0 0 20px">' + safe + '</p>';
  }).join("");
}

function renderEmail(campaign: NewsletterPreview, mode: "preview" | "broadcast"): string {
  const lang = ["pt","en","fr","es","de","it"].includes(campaign.locale) ? campaign.locale : "pt";
  const subject = escapeNewsletterHtml(campaign.subject);
  const preview = escapeNewsletterHtml(campaign.preview_text);
  const footer = mode === "broadcast"
    ? '<p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#cbd5e1">Para deixar de receber estas comunicações, <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#ffffff;text-decoration:underline">cancela a subscrição</a>.</p>'
    : '<p style="margin:16px 0 0;font-size:12px;color:#cbd5e1">Pré-visualização interna. Nenhuma mensagem foi enviada.</p>';
  return `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;color:#162334;font-family:Arial,Helvetica,sans-serif">
<div style="display:none!important;max-height:0;opacity:0;overflow:hidden">${preview}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f3f4f6"><tr><td align="center" style="padding:20px 10px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:600px;background:#ffffff">
<tr><td style="background:#ffffff;padding:26px 30px;border-bottom:3px solid #ff6a00">
<img src="${BRAND_LOGO}" alt="360 Merchandising" width="260" style="display:block;max-width:100%;height:auto;border:0;color:#162334;font-size:20px;font-weight:bold">
</td></tr>
<tr><td style="padding:34px 30px 38px">
<div style="font-size:11px;font-weight:bold;letter-spacing:2px;color:#ff6a00;margin-bottom:18px">LANÇAMENTO 360 MERCHANDISING</div>
${contentHtml(campaign.body_text)}
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#ff6a00" style="border-radius:5px">
<a href="${SITE}" style="display:inline-block;padding:16px 22px;background:#ff6a00;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;border-radius:5px">DESCOBRIR A 360 MERCHANDISING</a>
</td></tr></table>
</td></tr>
<tr><td style="background:#162334;padding:26px 30px;color:#ffffff;font-size:13px;line-height:1.7">
<strong>A tua marca em toda a parte.</strong><br>
<a href="${SITE}" style="color:#ff9a56">${SITE}</a>
${footer}
</td></tr>
</table></td></tr></table></body></html>`;
}

export function renderNewsletterPreview(campaign: NewsletterPreview): string {
  return renderEmail(campaign, "preview");
}
export function renderNewsletterBroadcast(campaign: NewsletterPreview): string {
  return renderEmail(campaign, "broadcast");
}
