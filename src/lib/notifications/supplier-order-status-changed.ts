import { createHash } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type NotificationRecord = {
  id: string;
  email_status: "pending" | "sending" | "sent" | "failed";
};

type ResendResponse = {
  id?: string;
  message?: string;
  name?: string;
};

type SupplierOrderSnapshot = {
  status: string | null;
  shippingDate: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
};

type SupplierOrderStatusChangedParams = {
  orderId: string;
  orderNumber: string;
  testMode: boolean;
  previous: SupplierOrderSnapshot;
  next: SupplierOrderSnapshot;
};

const DEFAULT_NOTIFICATION_EMAIL = "info@creativalcance.com";
const DEFAULT_FROM_EMAIL =
  "360 Merchandising <info@creativalcance.com>";

const STATUS_LABELS: Record<string, string> = {
  WAITING_ART_WORK: "A aguardar ficheiros de personalização",
  PROCESSING: "Em processamento",
  WAITING_STOCK: "A aguardar stock",
  PROCESSED: "Processada",
  PENDING_MOCKUP_APPROVAL: "Maquete pendente de aprovação",
  INVOICED: "Faturada",
  SENT: "Expedida",
  CANCELED: "Cancelada",
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
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
    "https://360-merchandising.com"
  );
}

function getStatusLabel(status: string | null): string {
  if (!status) return "Estado não indicado";
  return STATUS_LABELS[status] ?? status;
}

function buildChangeLines(
  previous: SupplierOrderSnapshot,
  next: SupplierOrderSnapshot,
): string[] {
  const lines: string[] = [];

  if (previous.status !== next.status) {
    lines.push(
      `Estado: ${getStatusLabel(previous.status)} → ${getStatusLabel(next.status)}`,
    );
  }
  if (previous.shippingDate !== next.shippingDate) {
    lines.push(`Data de expedição prevista: ${next.shippingDate ?? "não indicada"}`);
  }
  if (previous.trackingNumber !== next.trackingNumber && next.trackingNumber) {
    lines.push(`Tracking: ${next.trackingNumber}`);
  }
  if (previous.trackingUrl !== next.trackingUrl && next.trackingUrl) {
    lines.push(`Ligação de tracking: ${next.trackingUrl}`);
  }

  return lines;
}

function getEventKey(params: SupplierOrderStatusChangedParams): string {
  const fingerprint = createHash("sha256")
    .update(JSON.stringify(params.next))
    .digest("hex")
    .slice(0, 24);

  return `supplier-order-status:${params.orderId}:${fingerprint}`;
}

async function ensureNotification(
  params: SupplierOrderStatusChangedParams,
  emailTo: string,
): Promise<NotificationRecord> {
  const supabase = createSupabaseAdminClient();
  const changeLines = buildChangeLines(params.previous, params.next);
  const { data, error } = await supabase
    .from("admin_notifications")
    .upsert(
      {
        event_key: getEventKey(params),
        event_type: "supplier_order_status_changed",
        order_id: params.orderId,
        title: `Atualização da encomenda ${params.orderNumber}`,
        message: changeLines.join(" · "),
        metadata: {
          orderNumber: params.orderNumber,
          testMode: params.testMode,
          previous: params.previous,
          next: params.next,
        },
        email_to: emailTo,
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
    .eq("event_key", getEventKey(params))
    .single<NotificationRecord>();

  if (existing.error || !existing.data) {
    throw new Error(
      `Não foi possível recuperar a notificação: ${existing.error?.message ?? "registo inexistente"}`,
    );
  }

  return existing.data;
}

export async function notifySupplierOrderStatusChanged(
  params: SupplierOrderStatusChangedParams,
): Promise<void> {
  const emailTo =
    process.env.ORDER_NOTIFICATION_EMAIL?.trim() ||
    DEFAULT_NOTIFICATION_EMAIL;
  const notification = await ensureNotification(params, emailTo);

  if (notification.email_status === "sent") return;

  const supabase = createSupabaseAdminClient();
  const claimed = await supabase
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

  if (claimed.error) {
    throw new Error(`Não foi possível preparar o email: ${claimed.error.message}`);
  }
  if (!claimed.data) return;

  const changes = buildChangeLines(params.previous, params.next);
  const orderUrl = `${getSiteUrl()}/admin/encomendas/${encodeURIComponent(params.orderId)}`;
  const modePrefix = params.testMode ? "[TESTE] " : "";
  const subject = `${modePrefix}Atualização da encomenda ${params.orderNumber}`;
  const text = [
    subject,
    "",
    ...changes,
    "",
    `Consultar: ${orderUrl}`,
  ].join("\n");
  const htmlChanges = changes
    .map((change) => `<li style="margin:8px 0;">${escapeHtml(change)}</li>`)
    .join("");
  const html = `<!doctype html>
<html lang="pt">
  <body style="margin:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#171717;">
    <div style="max-width:680px;margin:0 auto;padding:32px 16px;">
      <div style="background:#171717;color:#fff;border-radius:18px 18px 0 0;padding:24px 28px;">
        <div style="font-size:12px;letter-spacing:2px;color:#bdbdbd;">360 MERCHANDISING${params.testMode ? " · TESTE" : ""}</div>
        <h1 style="font-size:24px;margin:12px 0 0;">Atualização da encomenda ${escapeHtml(params.orderNumber)}</h1>
      </div>
      <div style="background:#fff;border-radius:0 0 18px 18px;padding:28px;">
        <ul style="margin:0;padding-left:20px;">${htmlChanges}</ul>
        <p style="margin:28px 0 0;"><a href="${escapeHtml(orderUrl)}" style="display:inline-block;background:#171717;color:#fff;text-decoration:none;border-radius:999px;padding:12px 20px;font-weight:bold;">Ver encomenda no backoffice</a></p>
      </div>
    </div>
  </body>
</html>`;

  try {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) throw new Error("RESEND_API_KEY não está configurada.");

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": getEventKey(params).slice(0, 256),
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM_EMAIL,
        to: [emailTo],
        subject,
        html,
        text,
        tags: [
          { name: "event", value: "supplier_order_status_changed" },
          { name: "mode", value: params.testMode ? "test" : "production" },
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
