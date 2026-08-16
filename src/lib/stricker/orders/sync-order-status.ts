import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { notifySupplierOrderStatusChanged } from "@/lib/notifications/supplier-order-status-changed";
import { extractStrickerOrderStatus, extractStrickerShippingDate, extractStrickerTrackingNumber, extractStrickerTrackingUrl, getStrickerOrderDetails } from "@/lib/stricker/orders/client";

const MAX_ORDERS_PER_EXECUTION = 50;
const ORDER_DETAILS_TIMEOUT_MS = 20_000;
const CONCURRENCY = 5;

type SubmittedOrder = {
  id: string;
  order_number: string;
  supplier_order_stamp: string;
  supplier_test_mode: boolean;
  supplier_last_status: string | null;
  supplier_shipping_date: string | null;
  supplier_tracking_number: string | null;
  supplier_tracking_url: string | null;
  supplier_last_checked_at: string | null;
  status: string;
  fulfillment_status: string;
  shipped_at: string | null;
  cancelled_at: string | null;
};

function normalizeDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value.slice(0, 10) : date.toISOString().slice(0, 10);
}

function normalizeText(value: string | null): string | null {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

function hasOrderChanged(
  order: SubmittedOrder,
  next: {
    status: string | null;
    shippingDate: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
  },
): boolean {
  return (
    normalizeText(order.supplier_last_status)?.toUpperCase() !== next.status ||
    normalizeDate(order.supplier_shipping_date) !== next.shippingDate ||
    normalizeText(order.supplier_tracking_number) !== next.trackingNumber ||
    normalizeText(order.supplier_tracking_url) !== next.trackingUrl
  );
}

async function processInBatches<T>(
  items: T[],
  handler: (item: T) => Promise<void>,
): Promise<void> {
  for (let offset = 0; offset < items.length; offset += CONCURRENCY) {
    await Promise.all(items.slice(offset, offset + CONCURRENCY).map(handler));
  }
}

export async function syncSubmittedStrickerOrders() {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("orders")
    .select("id,order_number,supplier_order_stamp,supplier_test_mode,supplier_last_status,supplier_shipping_date,supplier_tracking_number,supplier_tracking_url,supplier_last_checked_at,status,fulfillment_status,shipped_at,cancelled_at")
    .not("supplier_order_stamp", "is", null).is("deleted_at", null)
    .or("supplier_last_status.is.null,supplier_last_status.not.in.(SENT,CANCELED),and(supplier_last_status.eq.SENT,supplier_tracking_number.is.null,supplier_tracking_url.is.null)")
    .order("supplier_last_checked_at", { ascending: true, nullsFirst: true })
    .limit(MAX_ORDERS_PER_EXECUTION)
    .returns<SubmittedOrder[]>();
  if (error) throw new Error(error.message);

  const orders = data ?? [];
  let updated = 0;
  let unchanged = 0;
  const failures: Array<{ orderId: string; message: string }> = [];
  const notificationFailures: Array<{ orderId: string; message: string }> = [];

  await processInBatches(orders, async (order) => {
    const checkedAt = new Date().toISOString();

    try {
      const result = await getStrickerOrderDetails(order.supplier_order_stamp, {
        testMode: order.supplier_test_mode,
        timeoutMs: ORDER_DETAILS_TIMEOUT_MS,
      });
      const status = normalizeText(
        extractStrickerOrderStatus(result.orderDetails),
      )?.toUpperCase() ?? null;
      const shippingDate = normalizeDate(
        extractStrickerShippingDate(result.orderDetails),
      );
      const trackingNumber = normalizeText(
        extractStrickerTrackingNumber(result.orderDetails),
      );
      const trackingUrl = normalizeText(
        extractStrickerTrackingUrl(result.orderDetails),
      );
      const changed = hasOrderChanged(order, {
        status,
        shippingDate,
        trackingNumber,
        trackingUrl,
      });
      const values: Record<string, unknown> = {
        supplier_last_response: result.response,
        supplier_last_checked_at: checkedAt,
      };

      if (changed) {
        Object.assign(values, {
          supplier_last_status: status,
          supplier_shipping_date: shippingDate,
          supplier_tracking_number: trackingNumber,
          supplier_tracking_url: trackingUrl,
        });
      }

      if (status === "SENT") {
        Object.assign(values, {
          status: "shipped",
          fulfillment_status: "shipped",
          shipped_at: order.shipped_at ?? checkedAt,
          tracking_number: trackingNumber,
          tracking_url: trackingUrl,
        });
      }

      if (status === "CANCELED") {
        Object.assign(values, {
          status: "cancelled",
          fulfillment_status: "cancelled",
          cancelled_at: order.cancelled_at ?? checkedAt,
        });
      }

      const { error: updateError } = await admin.from("orders").update(values).eq("id", order.id);
      if (updateError) throw new Error(updateError.message);

      if (changed) updated += 1;
      else unchanged += 1;

      if (changed) {
        try {
          await notifySupplierOrderStatusChanged({
            orderId: order.id,
            orderNumber: order.order_number,
            testMode: order.supplier_test_mode,
            previous: {
              status: normalizeText(order.supplier_last_status)?.toUpperCase() ?? null,
              shippingDate: normalizeDate(order.supplier_shipping_date),
              trackingNumber: normalizeText(order.supplier_tracking_number),
              trackingUrl: normalizeText(order.supplier_tracking_url),
            },
            next: {
              status,
              shippingDate,
              trackingNumber,
              trackingUrl,
            },
          });
        } catch (cause) {
          notificationFailures.push({
            orderId: order.id,
            message:
              cause instanceof Error
                ? cause.message
                : "Erro desconhecido na notificação.",
          });
        }
      }
    } catch (cause) {
      await admin
        .from("orders")
        .update({ supplier_last_checked_at: checkedAt })
        .eq("id", order.id);
      failures.push({ orderId: order.id, message: cause instanceof Error ? cause.message : "Erro desconhecido" });
    }
  });

  return {
    checked: orders.length,
    updated,
    unchanged,
    failed: failures.length,
    failures,
    notificationsFailed: notificationFailures.length,
    notificationFailures,
  };
}
