import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { extractStrickerOrderStatus, extractStrickerShippingDate, extractStrickerTrackingNumber, extractStrickerTrackingUrl, getStrickerOrderDetails } from "@/lib/stricker/orders/client";

function normalizeDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value.slice(0, 10) : date.toISOString().slice(0, 10);
}

export async function syncSubmittedStrickerOrders() {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("orders")
    .select("id,supplier_order_stamp,supplier_test_mode")
    .not("supplier_order_stamp", "is", null).is("deleted_at", null)
    .order("supplier_last_checked_at", { ascending: true, nullsFirst: true }).limit(50);
  if (error) throw new Error(error.message);
  let updated = 0;
  const failures: Array<{ orderId: string; message: string }> = [];
  for (const order of data ?? []) {
    try {
      const result = await getStrickerOrderDetails(order.supplier_order_stamp, { testMode: order.supplier_test_mode });
      const status = extractStrickerOrderStatus(result.orderDetails);
      const trackingNumber = extractStrickerTrackingNumber(result.orderDetails);
      const trackingUrl = extractStrickerTrackingUrl(result.orderDetails);
      const values: Record<string, unknown> = {
        supplier_last_status: status,
        supplier_shipping_date: normalizeDate(extractStrickerShippingDate(result.orderDetails)),
        supplier_tracking_number: trackingNumber,
        supplier_tracking_url: trackingUrl,
        supplier_last_response: result.response,
        supplier_last_checked_at: new Date().toISOString(),
      };
      if (status === "SENT") Object.assign(values, { status: "shipped", fulfillment_status: "shipped", shipped_at: new Date().toISOString(), tracking_number: trackingNumber, tracking_url: trackingUrl });
      if (status === "CANCELED") Object.assign(values, { status: "cancelled", fulfillment_status: "cancelled", cancelled_at: new Date().toISOString() });
      const { error: updateError } = await admin.from("orders").update(values).eq("id", order.id);
      if (updateError) throw new Error(updateError.message);
      updated += 1;
    } catch (cause) {
      failures.push({ orderId: order.id, message: cause instanceof Error ? cause.message : "Erro desconhecido" });
    }
  }
  return { checked: (data ?? []).length, updated, failed: failures.length, failures };
}
