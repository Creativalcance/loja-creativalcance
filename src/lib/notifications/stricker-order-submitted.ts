import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  JsonRecord,
  StrickerOrderDatabaseRecord,
} from "@/lib/stricker/orders/types";

type NotificationRecord = {
  id: string;
  email_status: "pending" | "sending" | "sent" | "failed";
};

type ResendResponse = {
  id?: string;
  message?: string;
  name?: string;
};

const DEFAULT_NOTIFICATION_EMAIL = "info@creativalcance.com";
const DEFAULT_FROM_EMAIL =
  "360 Merchandising <info@creativalcance.com>";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: currency || "EUR",
  }).format(value);
}

function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
    "https://360-merchandising.com"
  );
}

function buildEmailContent(params: {
  order: StrickerOrderDatabaseRecord;
  supplierOrderStamp: string;
}): { subject: string; html: string; text: string } {
  const { order, supplierOrderStamp } = params;
  const modeLabel = order.supplier_test_mode ? "TESTE" : "PRODUÇÃO";
  const subject = `${order.supplier_test_mode ? "[TESTE] " : ""}Encomenda ${order.order_number} submetida ao fornecedor`;
  const orderUrl = `${getSiteUrl()}/admin/encomendas/${encodeURIComponent(order.id)}`;
  const totalQuantity = order.order_items.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0,
  );
  const lines = order.order_items
    .map(
      (item) =>
        `${item.quantity} × ${item.product_name} (${item.supplier_sku || item.product_sku})${item.personalization_required ? " — com personalização" : ""}`,
    )
    .join("\n");
  const itemRows = order.order_items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;">${escapeHtml(item.product_name)}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e5e5e5;">${escapeHtml(item.supplier_sku || item.product_sku)}</td>
          <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;text-align:right;">${item.quantity}</td>
        </tr>`,
    )
    .join("");

  const text = [
    "Encomenda submetida ao fornecedor",
    `Modo: ${modeLabel}`,
    `Encomenda: ${order.order_number}`,
    `OrderStamp: ${supplierOrderStamp}`,
    `Cliente: ${order.customer_name}`,
    `Empresa: ${order.company_name || "—"}`,
    `Artigos: ${order.order_items.length}`,
    `Unidades: ${totalQuantity}`,
    `Total da encomenda: ${formatMoney(order.grand_total, order.currency)}`,
    "",
    lines,
    "",
    `Consultar: ${orderUrl}`,
  ].join("\n");

  const html = `<!doctype html>
<html lang="pt">
  <body style="margin:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#171717;">
    <div style="max-width:680px;margin:0 auto;padding:32px 16px;">
      <div style="background:#171717;color:#fff;border-radius:18px 18px 0 0;padding:24px 28px;">
        <div style="font-size:12px;letter-spacing:2px;color:#bdbdbd;">360 MERCHANDISING · ${modeLabel}</div>
        <h1 style="font-size:24px;margin:12px 0 0;">Encomenda submetida ao fornecedor</h1>
      </div>
      <div style="background:#fff;border-radius:0 0 18px 18px;padding:28px;">
        <p style="margin-top:0;">A encomenda <strong>${escapeHtml(order.order_number)}</strong> foi submetida com sucesso ao fornecedor.</p>
        <table style="width:100%;border-collapse:collapse;margin:22px 0;">
          <tr><td style="padding:5px 0;color:#666;">OrderStamp</td><td style="padding:5px 0;text-align:right;font-weight:bold;">${escapeHtml(supplierOrderStamp)}</td></tr>
          <tr><td style="padding:5px 0;color:#666;">Cliente</td><td style="padding:5px 0;text-align:right;">${escapeHtml(order.customer_name)}</td></tr>
          <tr><td style="padding:5px 0;color:#666;">Empresa</td><td style="padding:5px 0;text-align:right;">${escapeHtml(order.company_name || "—")}</td></tr>
          <tr><td style="padding:5px 0;color:#666;">Quantidade total</td><td style="padding:5px 0;text-align:right;">${totalQuantity}</td></tr>
          <tr><td style="padding:5px 0;color:#666;">Total da encomenda</td><td style="padding:5px 0;text-align:right;font-weight:bold;">${escapeHtml(formatMoney(order.grand_total, order.currency))}</td></tr>
        </table>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead><tr><th style="padding:10px 0;text-align:left;border-bottom:2px solid #171717;">Produto</th><th style="padding:10px 8px;text-align:left;border-bottom:2px solid #171717;">SKU</th><th style="padding:10px 0;text-align:right;border-bottom:2px solid #171717;">Qtd.</th></tr></thead>
          <tbody>${itemRows}</tbody>
        </table>
        <p style="margin:28px 0 0;"><a href="${escapeHtml(orderUrl)}" style="display:inline-block;background:#171717;color:#fff;text-decoration:none;border-radius:999px;padding:12px 20px;font-weight:bold;">Ver encomenda no backoffice</a></p>
      </div>
    </div>
  </body>
</html>`;

  return { subject, html, text };
}

async function ensureNotification(params: {
  order: StrickerOrderDatabaseRecord;
  supplierOrderStamp: string;
  emailTo: string;
}): Promise<NotificationRecord> {
  const supabase = createSupabaseAdminClient();
  const eventKey = `stricker-order-submitted:${params.order.id}:${params.supplierOrderStamp}`;
  const totalQuantity = params.order.order_items.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0,
  );
  const metadata: JsonRecord = {
    orderNumber: params.order.order_number,
    supplierOrderStamp: params.supplierOrderStamp,
    testMode: params.order.supplier_test_mode,
    customerName: params.order.customer_name,
    companyName: params.order.company_name,
    itemCount: params.order.order_items.length,
    totalQuantity,
    grandTotal: params.order.grand_total,
    currency: params.order.currency,
  };
  const { data, error } = await supabase
    .from("admin_notifications")
    .upsert(
      {
        event_key: eventKey,
        event_type: "stricker_order_submitted",
        order_id: params.order.id,
        title: `Encomenda ${params.order.order_number} submetida ao fornecedor`,
        message: `${totalQuantity} unidades · ${params.supplierOrderStamp}${params.order.supplier_test_mode ? " · modo teste" : ""}`,
        metadata,
        email_to: params.emailTo,
      },
      { onConflict: "event_key", ignoreDuplicates: true },
    )
    .select("id,email_status")
    .maybeSingle<NotificationRecord>();

  if (error) {
    throw new Error(`Não foi possível registar a notificação: ${error.message}`);
  }

  if (data) return data;

  const existing = await supabase
    .from("admin_notifications")
    .select("id,email_status")
    .eq("event_key", eventKey)
    .single<NotificationRecord>();

  if (existing.error || !existing.data) {
    throw new Error(
      `Não foi possível recuperar a notificação: ${existing.error?.message ?? "registo inexistente"}`,
    );
  }

  return existing.data;
}

export async function notifyStrickerOrderSubmitted(params: {
  order: StrickerOrderDatabaseRecord;
  supplierOrderStamp: string;
}): Promise<void> {
  const emailTo =
    process.env.ORDER_NOTIFICATION_EMAIL?.trim() ||
    DEFAULT_NOTIFICATION_EMAIL;
  const notification = await ensureNotification({
    ...params,
    emailTo,
  });

  if (notification.email_status === "sent") return;

  const supabase = createSupabaseAdminClient();
  const claim = await supabase
    .from("admin_notifications")
    .update({
      email_status: "sending",
      email_attempted_at: new Date().toISOString(),
      email_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", notification.id)
    .in("email_status", ["pending", "failed"])
    .select("id")
    .maybeSingle<{ id: string }>();

  if (claim.error) {
    throw new Error(`Não foi possível preparar o email: ${claim.error.message}`);
  }

  if (!claim.data) return;

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM_EMAIL;
  const content = buildEmailContent(params);

  try {
    if (!apiKey) {
      throw new Error("RESEND_API_KEY não está configurada.");
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `stricker-submitted-${params.order.id}-${params.supplierOrderStamp}`.slice(0, 256),
      },
      body: JSON.stringify({
        from,
        to: [emailTo],
        subject: content.subject,
        html: content.html,
        text: content.text,
        tags: [
          { name: "event", value: "stricker_order_submitted" },
          { name: "mode", value: params.order.supplier_test_mode ? "test" : "production" },
        ],
      }),
    });
    const result = (await response.json().catch(() => ({}))) as ResendResponse;

    if (!response.ok || !result.id) {
      throw new Error(
        result.message || result.name || `Resend respondeu com HTTP ${response.status}.`,
      );
    }

    const saved = await supabase
      .from("admin_notifications")
      .update({
        email_status: "sent",
        email_provider_id: result.id,
        email_sent_at: new Date().toISOString(),
        email_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", notification.id);

    if (saved.error) {
      throw new Error(`Email enviado, mas o estado não foi guardado: ${saved.error.message}`);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido no envio por email.";
    await supabase
      .from("admin_notifications")
      .update({
        email_status: "failed",
        email_error: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", notification.id);
    throw error;
  }
}
