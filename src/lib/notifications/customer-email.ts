import { createHash } from "node:crypto";
import type { SiteLocale } from "@/lib/i18n/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type CustomerEmailEvent =
  | "account_welcome"
  | "order_confirmation"
  | "order_status_changed"
  | "order_tracking_available";

type EmailNotification = {
  id: string;
  event_key: string;
  event_type: CustomerEmailEvent;
  email_to: string;
  locale: SiteLocale;
  payload: Record<string, unknown>;
  email_status: "pending" | "sending" | "sent" | "failed";
  email_attempts: number;
};

type OrderEmailRecord = {
  id: string;
  user_id: string | null;
  order_number: string;
  customer_email: string;
  customer_name: string;
  status: string;
  currency: string;
  subtotal: number;
  personalization_total: number;
  setup_total: number;
  shipping_total: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  tracking_number: string | null;
  tracking_url: string | null;
  shipping_carrier: string | null;
  requested_shipping_date: string | null;
  metadata: Record<string, unknown> | null;
  order_items: Array<{
    product_name: string;
    quantity: number;
    total: number;
    personalization_required: boolean;
  }> | null;
};

type ResendResponse = { id?: string; message?: string; name?: string };

const DEFAULT_FROM_EMAIL = "360 Merchandising <info@360-merchandising.com>";
const MAX_DELIVERY_ATTEMPTS = 5;

const STATUS_LABELS: Record<SiteLocale, Record<string, string>> = {
  pt: {
    pending_payment: "A aguardar pagamento", paid: "Pagamento confirmado",
    processing: "Em preparação", sent_to_supplier: "Em processamento",
    supplier_confirmed: "Confirmada", in_production: "Em produção",
    shipped: "Expedida", delivered: "Entregue", cancelled: "Cancelada",
    refunded: "Reembolsada", failed: "Necessita de atenção",
    unfulfilled: "Em preparação", partially_fulfilled: "Parcialmente preparada",
    fulfilled: "Preparada",
    WAITING_ART_WORK: "A aguardar elementos de personalização",
    PROCESSING: "Em processamento", PRODUCTION: "Em produção",
    WAITING_STOCK: "A aguardar disponibilidade", PROCESSED: "Preparada",
    PENDING_MOCKUP_APPROVAL: "Maquete pendente de aprovação",
    INVOICED: "Faturada", SENT: "Expedida", SHIPPED: "Expedida",
    CANCELED: "Cancelada", CANCELLED: "Cancelada",
  },
  en: {
    pending_payment: "Awaiting payment", paid: "Payment confirmed",
    processing: "Being prepared", sent_to_supplier: "Processing",
    supplier_confirmed: "Confirmed", in_production: "In production",
    shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled",
    refunded: "Refunded", failed: "Needs attention",
    unfulfilled: "Being prepared", partially_fulfilled: "Partially prepared",
    fulfilled: "Prepared",
    WAITING_ART_WORK: "Awaiting customisation files", PROCESSING: "Processing",
    PRODUCTION: "In production", WAITING_STOCK: "Awaiting availability",
    PROCESSED: "Prepared", PENDING_MOCKUP_APPROVAL: "Proof awaiting approval",
    INVOICED: "Invoiced", SENT: "Shipped", SHIPPED: "Shipped",
    CANCELED: "Cancelled", CANCELLED: "Cancelled",
  },
  fr: {
    pending_payment: "En attente de paiement", paid: "Paiement confirmé",
    processing: "En préparation", sent_to_supplier: "En cours de traitement",
    supplier_confirmed: "Confirmée", in_production: "En production",
    shipped: "Expédiée", delivered: "Livrée", cancelled: "Annulée",
    refunded: "Remboursée", failed: "Nécessite votre attention",
    unfulfilled: "En préparation", partially_fulfilled: "Partiellement préparée",
    fulfilled: "Préparée",
    WAITING_ART_WORK: "En attente des éléments de personnalisation",
    PROCESSING: "En cours de traitement", PRODUCTION: "En production",
    WAITING_STOCK: "En attente de disponibilité", PROCESSED: "Préparée",
    PENDING_MOCKUP_APPROVAL: "Maquette en attente d’approbation",
    INVOICED: "Facturée", SENT: "Expédiée", SHIPPED: "Expédiée",
    CANCELED: "Annulée", CANCELLED: "Annulée",
  },
};

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://360-merchandising.com").replace(/\/$/, "");
}

function normalizeLocale(value: unknown): SiteLocale {
  return value === "en" || value === "fr" ? value : "pt";
}

function localPath(locale: SiteLocale, path: string): string {
  return `${getSiteUrl()}${locale === "pt" ? "" : `/${locale}`}${path}`;
}

function brandedFromEmail(): string {
  const configured = process.env.RESEND_FROM_EMAIL?.trim();
  if (!configured) return DEFAULT_FROM_EMAIL;
  const bracketAddress = configured.match(/<([^>]+)>/)?.[1]?.trim();
  const address = bracketAddress || configured;
  return `360 Merchandising <${address}>`;
}

function money(value: unknown, currency: unknown, locale: SiteLocale): string {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat(locale === "pt" ? "pt-PT" : locale === "fr" ? "fr-FR" : "en-GB", {
    style: "currency", currency: typeof currency === "string" ? currency.toUpperCase() : "EUR",
  }).format(Number.isFinite(amount) ? amount : 0);
}

function statusLabel(status: unknown, locale: SiteLocale): string {
  const normalized = typeof status === "string" ? status : "";
  return STATUS_LABELS[locale][normalized] || normalized.replaceAll("_", " ");
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function smartMerch(locale: SiteLocale): { title: string; text: string; cta: string; url: string } {
  if (locale === "en") return {
    title: "Need help choosing?", text: "360 Smart Merch helps you discover suitable products for your brand and objective.",
    cta: "Try 360 Smart Merch", url: localPath(locale, "/smart-merch"),
  };
  if (locale === "fr") return {
    title: "Besoin d’aide pour choisir ?", text: "360 Smart Merch vous aide à trouver les produits adaptés à votre marque et à votre objectif.",
    cta: "Essayer 360 Smart Merch", url: localPath(locale, "/smart-merch"),
  };
  return {
    title: "Precisa de ajuda para escolher?", text: "O 360 Smart Merch ajuda a descobrir produtos adequados à sua marca e ao seu objetivo.",
    cta: "Experimentar o 360 Smart Merch", url: localPath(locale, "/smart-merch"),
  };
}

function renderLayout(params: {
  locale: SiteLocale; preview: string; eyebrow: string; heading: string;
  bodyHtml: string; bodyText: string; button?: { label: string; url: string };
}): { html: string; text: string } {
  const promo = smartMerch(params.locale);
  const buttonHtml = params.button ? `<p style="margin:28px 0 0;"><a href="${escapeHtml(params.button.url)}" style="display:inline-block;background:#ff6a00;color:#fff;text-decoration:none;border-radius:999px;padding:14px 24px;font-size:15px;font-weight:700;">${escapeHtml(params.button.label)}</a></p>` : "";
  const html = `<!doctype html><html lang="${params.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(params.preview)}</title></head><body style="margin:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#162334;"><div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(params.preview)}</div><div style="max-width:640px;margin:0 auto;padding:32px 16px;"><div style="background:#162334;border-radius:24px 24px 0 0;padding:30px 32px;"><div style="font-size:18px;font-weight:700;color:#fff;"><span style="color:#ff6a00;">360</span> MERCHANDISING</div><div style="margin-top:24px;font-size:12px;font-weight:700;letter-spacing:2px;color:#ff8a38;">${escapeHtml(params.eyebrow)}</div><h1 style="margin:10px 0 0;font-size:30px;line-height:1.2;color:#fff;">${escapeHtml(params.heading)}</h1></div><div style="background:#fff;border-radius:0 0 24px 24px;padding:32px;">${params.bodyHtml}${buttonHtml}<div style="margin-top:34px;border-top:1px solid #e7eaee;padding-top:22px;"><p style="margin:0;font-size:14px;font-weight:700;color:#162334;">${escapeHtml(promo.title)}</p><p style="margin:8px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">${escapeHtml(promo.text)} <a href="${escapeHtml(promo.url)}" style="color:#e85f00;text-decoration:none;font-weight:700;">${escapeHtml(promo.cta)} →</a></p></div><p style="margin:24px 0 0;font-size:11px;line-height:1.6;color:#9aa1aa;">360 Merchandising · ${escapeHtml(getSiteUrl().replace(/^https?:\/\//, ""))}</p></div></div></body></html>`;
  const text = [params.heading, "", params.bodyText, params.button ? `\n${params.button.label}: ${params.button.url}` : "", "", promo.title, promo.text, `${promo.cta}: ${promo.url}`, "", "360 Merchandising"].filter(Boolean).join("\n");
  return { html, text };
}

function renderEmail(notification: EmailNotification): { subject: string; html: string; text: string } {
  const p = notification.payload;
  const locale = notification.locale;
  const name = asString(p.customerName) || asString(p.name);
  const orderNumber = asString(p.orderNumber);
  const orderUrl = localPath(locale, "/area-cliente/encomendas");

  if (notification.event_type === "account_welcome") {
    const copy = locale === "en" ? { subject: "Welcome to 360 Merchandising", eyebrow: "ACCOUNT CONFIRMED", heading: `Welcome${name ? `, ${name}` : ""}!`, intro: "Your account has been confirmed successfully.", body: "You can now manage your details, follow orders and access your purchase history in your customer area.", button: "Go to my account" }
      : locale === "fr" ? { subject: "Bienvenue chez 360 Merchandising", eyebrow: "COMPTE CONFIRMÉ", heading: `Bienvenue${name ? `, ${name}` : ""} !`, intro: "Votre compte a été confirmé avec succès.", body: "Vous pouvez désormais gérer vos coordonnées, suivre vos commandes et consulter votre historique dans votre espace client.", button: "Accéder à mon compte" }
      : { subject: "Bem-vindo à 360 Merchandising", eyebrow: "CONTA CONFIRMADA", heading: `Bem-vindo${name ? `, ${name}` : ""}!`, intro: "A sua conta foi confirmada com sucesso.", body: "Já pode gerir os seus dados, acompanhar encomendas e consultar o histórico de compras na sua área de cliente.", button: "Aceder à minha conta" };
    const content = renderLayout({ locale, preview: copy.subject, eyebrow: copy.eyebrow, heading: copy.heading, bodyHtml: `<p style="margin:0;font-size:17px;line-height:1.7;">${escapeHtml(copy.intro)}</p><p style="margin:16px 0 0;font-size:15px;line-height:1.7;color:#536071;">${escapeHtml(copy.body)}</p>`, bodyText: `${copy.intro}\n${copy.body}`, button: { label: copy.button, url: localPath(locale, "/area-cliente") } });
    return { subject: copy.subject, ...content };
  }

  if (notification.event_type === "order_confirmation") {
    const copy = locale === "en" ? { subject: `Order ${orderNumber} confirmed`, eyebrow: "ORDER CONFIRMED", heading: "Thank you for your order!", intro: `We have successfully received payment for order ${orderNumber}.`, button: "View order" }
      : locale === "fr" ? { subject: `Commande ${orderNumber} confirmée`, eyebrow: "COMMANDE CONFIRMÉE", heading: "Merci pour votre commande !", intro: `Nous avons bien reçu le paiement de la commande ${orderNumber}.`, button: "Voir la commande" }
      : { subject: `Encomenda ${orderNumber} confirmada`, eyebrow: "ENCOMENDA CONFIRMADA", heading: "Obrigado pela sua encomenda!", intro: `Recebemos com sucesso o pagamento da encomenda ${orderNumber}.`, button: "Consultar encomenda" };
    const items = Array.isArray(p.items) ? p.items as Array<Record<string, unknown>> : [];
    const itemRows = items.map((item) => `<tr><td style="padding:10px 0;border-bottom:1px solid #edf0f2;font-size:14px;">${escapeHtml(asString(item.name))} × ${Number(item.quantity) || 0}</td><td style="padding:10px 0;border-bottom:1px solid #edf0f2;text-align:right;font-size:14px;font-weight:700;">${escapeHtml(money(item.total, p.currency, locale))}</td></tr>`).join("");
    const textItems = items.map((item) => `${asString(item.name)} × ${Number(item.quantity) || 0}: ${money(item.total, p.currency, locale)}`).join("\n");
    const totalLabel = locale === "en" ? "Total" : locale === "fr" ? "Total" : "Total";
    const content = renderLayout({ locale, preview: copy.subject, eyebrow: copy.eyebrow, heading: copy.heading, bodyHtml: `<p style="margin:0;font-size:17px;line-height:1.7;">${escapeHtml(copy.intro)}</p><table role="presentation" style="width:100%;border-collapse:collapse;margin-top:22px;">${itemRows}<tr><td style="padding-top:18px;font-size:16px;font-weight:700;">${totalLabel}</td><td style="padding-top:18px;text-align:right;font-size:18px;font-weight:700;color:#e85f00;">${escapeHtml(money(p.grandTotal, p.currency, locale))}</td></tr></table>`, bodyText: `${copy.intro}\n\n${textItems}\n${totalLabel}: ${money(p.grandTotal, p.currency, locale)}`, button: { label: copy.button, url: orderUrl } });
    return { subject: copy.subject, ...content };
  }

  if (notification.event_type === "order_tracking_available") {
    const trackingNumber = asString(p.trackingNumber);
    const trackingUrl = asString(p.trackingUrl);
    const copy = locale === "en" ? { subject: `Tracking available for order ${orderNumber}`, eyebrow: "ORDER SHIPPED", heading: "Your order is on its way", intro: `Tracking information is now available for order ${orderNumber}.`, tracking: "Tracking number", button: "Track order" }
      : locale === "fr" ? { subject: `Suivi disponible pour la commande ${orderNumber}`, eyebrow: "COMMANDE EXPÉDIÉE", heading: "Votre commande est en route", intro: `Les informations de suivi sont disponibles pour la commande ${orderNumber}.`, tracking: "Numéro de suivi", button: "Suivre la commande" }
      : { subject: `Tracking disponível para a encomenda ${orderNumber}`, eyebrow: "ENCOMENDA EXPEDIDA", heading: "A sua encomenda está a caminho", intro: `Já está disponível a informação de tracking da encomenda ${orderNumber}.`, tracking: "Código de tracking", button: "Acompanhar encomenda" };
    const destination = trackingUrl || orderUrl;
    const content = renderLayout({ locale, preview: copy.subject, eyebrow: copy.eyebrow, heading: copy.heading, bodyHtml: `<p style="margin:0;font-size:17px;line-height:1.7;">${escapeHtml(copy.intro)}</p>${trackingNumber ? `<div style="margin-top:22px;padding:16px 18px;border-radius:14px;background:#f4f6f8;"><div style="font-size:12px;color:#6b7280;">${escapeHtml(copy.tracking)}</div><div style="margin-top:5px;font-size:18px;font-weight:700;letter-spacing:.5px;">${escapeHtml(trackingNumber)}</div></div>` : ""}`, bodyText: `${copy.intro}${trackingNumber ? `\n${copy.tracking}: ${trackingNumber}` : ""}`, button: { label: copy.button, url: destination } });
    return { subject: copy.subject, ...content };
  }

  const newStatus = statusLabel(p.newStatus, locale);
  const copy = locale === "en" ? { subject: `Order ${orderNumber} update`, eyebrow: "ORDER UPDATE", heading: "Your order has been updated", intro: `The current status of order ${orderNumber} is:`, button: "View order" }
    : locale === "fr" ? { subject: `Mise à jour de la commande ${orderNumber}`, eyebrow: "MISE À JOUR", heading: "Votre commande a été mise à jour", intro: `Le statut actuel de la commande ${orderNumber} est :`, button: "Voir la commande" }
    : { subject: `Atualização da encomenda ${orderNumber}`, eyebrow: "ATUALIZAÇÃO DA ENCOMENDA", heading: "A sua encomenda foi atualizada", intro: `O estado atual da encomenda ${orderNumber} é:`, button: "Consultar encomenda" };
  const content = renderLayout({ locale, preview: copy.subject, eyebrow: copy.eyebrow, heading: copy.heading, bodyHtml: `<p style="margin:0;font-size:17px;line-height:1.7;">${escapeHtml(copy.intro)}</p><div style="margin-top:20px;padding:16px 18px;border-radius:14px;background:#fff4ec;color:#c94f00;font-size:18px;font-weight:700;">${escapeHtml(newStatus)}</div>`, bodyText: `${copy.intro}\n${newStatus}`, button: { label: copy.button, url: orderUrl } });
  return { subject: copy.subject, ...content };
}

async function ensureNotification(params: {
  eventKey: string; eventType: CustomerEmailEvent; emailTo: string; locale: SiteLocale;
  userId?: string | null; orderId?: string | null; payload: Record<string, unknown>;
}): Promise<EmailNotification> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("customer_email_notifications").upsert({
    event_key: params.eventKey, event_type: params.eventType, email_to: params.emailTo,
    locale: params.locale, user_id: params.userId ?? null, order_id: params.orderId ?? null,
    payload: params.payload,
  }, { onConflict: "event_key", ignoreDuplicates: true }).select("id,event_key,event_type,email_to,locale,payload,email_status,email_attempts").maybeSingle<EmailNotification>();
  if (error) throw new Error(`Não foi possível registar o email ao cliente: ${error.message}`);
  if (data) return data;
  const existing = await admin.from("customer_email_notifications").select("id,event_key,event_type,email_to,locale,payload,email_status,email_attempts").eq("event_key", params.eventKey).single<EmailNotification>();
  if (existing.error || !existing.data) throw new Error(`Não foi possível recuperar o email ao cliente: ${existing.error?.message ?? "registo inexistente"}`);
  return existing.data;
}

export async function deliverCustomerEmail(notification: EmailNotification): Promise<boolean> {
  if (notification.email_status === "sent" || notification.email_attempts >= MAX_DELIVERY_ATTEMPTS) return false;
  const admin = createSupabaseAdminClient();
  const claimed = await admin.from("customer_email_notifications").update({
    email_status: "sending", email_attempted_at: new Date().toISOString(),
    email_attempts: notification.email_attempts + 1, email_error: null, updated_at: new Date().toISOString(),
  }).eq("id", notification.id).in("email_status", ["pending", "failed"]).select("id").maybeSingle<{ id: string }>();
  if (claimed.error) throw new Error(`Não foi possível preparar o email ao cliente: ${claimed.error.message}`);
  if (!claimed.data) return false;
  try {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) throw new Error("RESEND_API_KEY não está configurada.");
    const content = renderEmail(notification);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": notification.event_key.slice(0, 256) },
      body: JSON.stringify({ from: brandedFromEmail(), to: [notification.email_to], subject: content.subject, html: content.html, text: content.text, tags: [{ name: "event", value: notification.event_type }, { name: "locale", value: notification.locale }] }),
    });
    const result = (await response.json().catch(() => ({}))) as ResendResponse;
    if (!response.ok || !result.id) throw new Error(result.message || result.name || `Resend respondeu com HTTP ${response.status}.`);
    const saved = await admin.from("customer_email_notifications").update({ email_status: "sent", email_provider_id: result.id, email_sent_at: new Date().toISOString(), email_error: null, updated_at: new Date().toISOString() }).eq("id", notification.id);
    if (saved.error) throw new Error(`Email enviado, mas o estado não foi guardado: ${saved.error.message}`);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido no envio do email.";
    await admin.from("customer_email_notifications").update({ email_status: "failed", email_error: message.slice(0, 1000), updated_at: new Date().toISOString() }).eq("id", notification.id);
    throw error;
  }
}

async function getOrder(orderId: string): Promise<OrderEmailRecord> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("orders").select("id,user_id,order_number,customer_email,customer_name,status,currency,subtotal,personalization_total,setup_total,shipping_total,discount_total,tax_total,grand_total,tracking_number,tracking_url,shipping_carrier,requested_shipping_date,metadata,order_items(product_name,quantity,total,personalization_required)").eq("id", orderId).single<OrderEmailRecord>();
  if (error || !data) throw new Error(`Não foi possível preparar o email da encomenda: ${error?.message ?? "encomenda inexistente"}`);
  return data;
}

function orderPayload(order: OrderEmailRecord): Record<string, unknown> {
  return { orderId: order.id, orderNumber: order.order_number, customerName: order.customer_name,
    currency: order.currency, grandTotal: order.grand_total, status: order.status,
    items: (order.order_items ?? []).map((item) => ({ name: item.product_name, quantity: item.quantity, total: item.total, personalized: item.personalization_required })),
  };
}

async function sendPrepared(notification: EmailNotification): Promise<void> {
  try { await deliverCustomerEmail(notification); }
  catch (error) { console.error("Customer transactional email failed", { eventKey: notification.event_key, eventType: notification.event_type, message: error instanceof Error ? error.message : "Unknown error" }); }
}

export async function notifyAccountWelcome(params: { userId: string; email: string; name: string; locale: SiteLocale }): Promise<void> {
  try {
    const notification = await ensureNotification({ eventKey: `account-welcome:${params.userId}`, eventType: "account_welcome", emailTo: params.email, locale: params.locale, userId: params.userId, payload: { name: params.name } });
    await sendPrepared(notification);
  } catch (error) {
    console.error("Could not enqueue account welcome email", { userId: params.userId, message: error instanceof Error ? error.message : "Unknown error" });
  }
}

export async function notifyOrderConfirmed(orderId: string): Promise<void> {
  try {
    const order = await getOrder(orderId);
    const locale = normalizeLocale(order.metadata?.locale);
    const notification = await ensureNotification({ eventKey: `order-confirmation:${order.id}`, eventType: "order_confirmation", emailTo: order.customer_email, locale, userId: order.user_id, orderId: order.id, payload: orderPayload(order) });
    await sendPrepared(notification);
  } catch (error) {
    console.error("Could not enqueue order confirmation email", { orderId, message: error instanceof Error ? error.message : "Unknown error" });
  }
}

export async function notifyOrderStatusChanged(params: { orderId: string; previousStatus: string | null; newStatus: string | null }): Promise<void> {
  if (!params.newStatus || params.previousStatus === params.newStatus || params.newStatus === "paid") return;
  try {
    const order = await getOrder(params.orderId);
    const locale = normalizeLocale(order.metadata?.locale);
    const fingerprint = createHash("sha256").update(`${params.previousStatus ?? "none"}:${params.newStatus}`).digest("hex").slice(0, 20);
    const notification = await ensureNotification({ eventKey: `order-status:${order.id}:${fingerprint}`, eventType: "order_status_changed", emailTo: order.customer_email, locale, userId: order.user_id, orderId: order.id, payload: { ...orderPayload(order), previousStatus: params.previousStatus, newStatus: params.newStatus } });
    await sendPrepared(notification);
  } catch (error) {
    console.error("Could not enqueue order status email", { orderId: params.orderId, message: error instanceof Error ? error.message : "Unknown error" });
  }
}

export async function notifyOrderTrackingAvailable(orderId: string): Promise<void> {
  try {
    const order = await getOrder(orderId);
    if (!order.tracking_number && !order.tracking_url) return;
    const locale = normalizeLocale(order.metadata?.locale);
    const fingerprint = createHash("sha256").update(`${order.tracking_number ?? ""}:${order.tracking_url ?? ""}`).digest("hex").slice(0, 20);
    const notification = await ensureNotification({ eventKey: `order-tracking:${order.id}:${fingerprint}`, eventType: "order_tracking_available", emailTo: order.customer_email, locale, userId: order.user_id, orderId: order.id, payload: { ...orderPayload(order), trackingNumber: order.tracking_number, trackingUrl: order.tracking_url } });
    await sendPrepared(notification);
  } catch (error) {
    console.error("Could not enqueue order tracking email", { orderId, message: error instanceof Error ? error.message : "Unknown error" });
  }
}

export async function retryPendingCustomerEmails(limit = 25): Promise<{ processed: number; sent: number; failed: number }> {
  const admin = createSupabaseAdminClient();
  const staleBefore = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  await admin.from("customer_email_notifications").update({ email_status: "failed", email_error: "Envio anterior interrompido; reagendado automaticamente.", updated_at: new Date().toISOString() }).eq("email_status", "sending").lt("email_attempted_at", staleBefore);
  const { data, error } = await admin.from("customer_email_notifications").select("id,event_key,event_type,email_to,locale,payload,email_status,email_attempts").in("email_status", ["pending", "failed"]).lt("email_attempts", MAX_DELIVERY_ATTEMPTS).order("created_at", { ascending: true }).limit(limit).returns<EmailNotification[]>();
  if (error) throw new Error(error.message);
  let sent = 0; let failed = 0;
  for (const notification of data ?? []) {
    try { if (await deliverCustomerEmail(notification)) sent += 1; }
    catch { failed += 1; }
  }
  return { processed: (data ?? []).length, sent, failed };
}
