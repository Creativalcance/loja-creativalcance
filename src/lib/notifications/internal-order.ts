import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type InternalGroup = {
  id: string;
  order_id: string;
  status: string;
};

type InternalOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  company_name: string | null;
  company_tax_id: string | null;
  currency: string;
  grand_total: number;
  customer_notes: string | null;
  shipping_address: {
    contact_name: string;
    contact_email: string | null;
    contact_phone: string | null;
    address_line_1: string;
    address_line_2: string | null;
    postal_code: string;
    city: string;
    country_code: string;
  } | null;
  order_items: Array<{
    id: string;
    product_name: string;
    product_sku: string;
    quantity: number;
    total: number;
    personalization_required: boolean;
    personalization_notes: string | null;
    customization_technique_name: string | null;
    logo_file_name: string | null;
  }>;
};

type Notification = {
  id: string;
  email_status: "pending" | "sending" | "sent" | "failed";
};

type ResendResponse = { id?: string; message?: string; name?: string };

const DEFAULT_INTERNAL_EMAIL = "info@360-merchandising.com";
const DEFAULT_FROM_EMAIL = "360 Merchandising <info@360-merchandising.com>";

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://360-merchandising.com").replace(/\/$/, "");
}

function money(value: number, currency: string): string {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: currency || "EUR" }).format(value);
}

export async function notifyInternalOrder(groupId: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  const groupResult = await admin.from("fulfillment_groups")
    .select("id,order_id,status")
    .eq("id", groupId).eq("route", "internal_360")
    .maybeSingle<InternalGroup>();
  if (groupResult.error || !groupResult.data) {
    throw new Error(groupResult.error?.message || "Grupo interno não encontrado.");
  }

  const itemLinks = await admin.from("fulfillment_group_items")
    .select("order_item_id").eq("fulfillment_group_id", groupId);
  if (itemLinks.error) throw new Error(itemLinks.error.message);
  const itemIds = (itemLinks.data ?? []).map((row) => row.order_item_id);
  if (itemIds.length === 0) throw new Error("O grupo interno não contém artigos.");

  const orderResult = await admin.from("orders").select(`
    id, order_number, customer_name, customer_email, customer_phone,
    company_name, company_tax_id, currency, grand_total, customer_notes,
    shipping_address:customer_addresses!orders_shipping_address_id_fkey (
      contact_name, contact_email, contact_phone, address_line_1, address_line_2,
      postal_code, city, country_code
    ),
    order_items (
      id, product_name, product_sku, quantity, total, personalization_required,
      personalization_notes, customization_technique_name, logo_file_name
    )
  `).eq("id", groupResult.data.order_id).maybeSingle();
  if (orderResult.error || !orderResult.data) {
    throw new Error(orderResult.error?.message || "Encomenda interna não encontrada.");
  }

  const raw = orderResult.data as unknown as Omit<InternalOrder, "shipping_address"> & {
    shipping_address: InternalOrder["shipping_address"] | InternalOrder["shipping_address"][];
  };
  const order: InternalOrder = {
    ...raw,
    shipping_address: Array.isArray(raw.shipping_address)
      ? raw.shipping_address[0] ?? null
      : raw.shipping_address,
    order_items: (raw.order_items ?? []).filter((item) => itemIds.includes(item.id)),
  };
  const emailTo = process.env.INTERNAL_ORDER_EMAIL?.trim() || DEFAULT_INTERNAL_EMAIL;
  const eventKey = `internal-order:${groupId}`;
  const notificationResult = await admin.from("admin_notifications").upsert({
    event_key: eventKey,
    event_type: "internal_order_paid",
    order_id: order.id,
    title: `Nova encomenda interna ${order.order_number}`,
    message: `${order.order_items.length} artigo(s) para processamento pela 360`,
    metadata: { fulfillmentGroupId: groupId, orderNumber: order.order_number },
    email_to: emailTo,
  }, { onConflict: "event_key", ignoreDuplicates: true })
    .select("id,email_status").maybeSingle<Notification>();
  if (notificationResult.error) throw new Error(notificationResult.error.message);
  let notification = notificationResult.data;
  if (!notification) {
    const existing = await admin.from("admin_notifications")
      .select("id,email_status").eq("event_key", eventKey).single<Notification>();
    if (existing.error || !existing.data) throw new Error(existing.error?.message || "Notificação interna inexistente.");
    notification = existing.data;
  }
  if (notification.email_status === "sent") return;

  const claim = await admin.from("admin_notifications").update({
    email_status: "sending", email_attempted_at: new Date().toISOString(),
    email_error: null, updated_at: new Date().toISOString(),
  }).eq("id", notification.id).in("email_status", ["pending", "failed"])
    .select("id").maybeSingle<{ id: string }>();
  if (claim.error) throw new Error(claim.error.message);
  if (!claim.data) return;

  const address = order.shipping_address;
  const addressText = address
    ? [address.contact_name, address.address_line_1, address.address_line_2, `${address.postal_code} ${address.city}`, address.country_code].filter(Boolean).join(", ")
    : "Morada não disponível";
  const lines = order.order_items.map((item) =>
    `${item.quantity} × ${item.product_name} (${item.product_sku})${item.personalization_required ? ` — ${item.customization_technique_name || "com personalização"}` : ""}`,
  );
  const orderUrl = `${siteUrl()}/admin/encomendas/${encodeURIComponent(order.id)}`;
  const subject = `Nova encomenda para processamento interno — ${order.order_number}`;
  const text = [subject, "", `Cliente: ${order.customer_name}`, `Email: ${order.customer_email}`,
    `Telefone: ${order.customer_phone || "—"}`, `Empresa: ${order.company_name || "—"}`,
    `NIF: ${order.company_tax_id || "—"}`, `Entrega: ${addressText}`, "", ...lines,
    "", `Notas: ${order.customer_notes || "—"}`, `Total da encomenda: ${money(order.grand_total, order.currency)}`,
    `Consultar: ${orderUrl}`].join("\n");
  const rows = order.order_items.map((item) => `<tr><td style="padding:10px 0;border-bottom:1px solid #e5e5e5;">${escapeHtml(item.product_name)}</td><td style="padding:10px;border-bottom:1px solid #e5e5e5;">${escapeHtml(item.product_sku)}</td><td style="padding:10px 0;text-align:right;border-bottom:1px solid #e5e5e5;">${item.quantity}</td></tr>`).join("");
  const html = `<!doctype html><html lang="pt"><body style="margin:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#171717;"><div style="max-width:680px;margin:0 auto;padding:32px 16px;"><div style="background:#162334;color:#fff;border-radius:18px 18px 0 0;padding:24px 28px;"><div style="font-size:12px;letter-spacing:2px;color:#ff8a38;">360 MERCHANDISING</div><h1 style="font-size:24px;margin:12px 0 0;">Nova encomenda para processamento interno</h1></div><div style="background:#fff;border-radius:0 0 18px 18px;padding:28px;"><p><strong>${escapeHtml(order.order_number)}</strong> · pagamento confirmado</p><p>Cliente: ${escapeHtml(order.customer_name)}<br>Empresa: ${escapeHtml(order.company_name || "—")}<br>Entrega: ${escapeHtml(addressText)}</p><table style="width:100%;border-collapse:collapse;font-size:14px;"><tbody>${rows}</tbody></table><p>Notas: ${escapeHtml(order.customer_notes || "—")}</p><p><a href="${escapeHtml(orderUrl)}" style="display:inline-block;background:#ff6a00;color:#fff;text-decoration:none;border-radius:999px;padding:12px 20px;font-weight:bold;">Ver encomenda no backoffice</a></p></div></div></body></html>`;

  try {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) throw new Error("RESEND_API_KEY não está configurada.");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": eventKey },
      body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM_EMAIL, to: [emailTo], subject, html, text, tags: [{ name: "event", value: "internal_order_paid" }] }),
    });
    const result = (await response.json().catch(() => ({}))) as ResendResponse;
    if (!response.ok || !result.id) throw new Error(result.message || result.name || `Resend respondeu com HTTP ${response.status}.`);
    await Promise.all([
      admin.from("admin_notifications").update({ email_status: "sent", email_provider_id: result.id, email_sent_at: new Date().toISOString(), email_error: null, updated_at: new Date().toISOString() }).eq("id", notification.id),
      admin.from("fulfillment_groups").update({ status: "notified", notification_email: emailTo, notified_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() }).eq("id", groupId),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido no email interno.";
    await Promise.all([
      admin.from("admin_notifications").update({ email_status: "failed", email_error: message.slice(0, 1000), updated_at: new Date().toISOString() }).eq("id", notification.id),
      admin.from("fulfillment_groups").update({ status: "failed", last_error: message.slice(0, 1000), updated_at: new Date().toISOString() }).eq("id", groupId),
    ]);
    throw error;
  }
}
