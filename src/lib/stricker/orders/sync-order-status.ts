import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { notifySupplierOrderStatusChanged } from "@/lib/notifications/supplier-order-status-changed";
import { notifyOrderStatusChanged, notifyOrderTrackingAvailable } from "@/lib/notifications/customer-email";
import { extractStrickerOrderStatus, extractStrickerShippingDate, extractStrickerTrackingNumber,
  extractStrickerTrackingUrl, getStrickerOrderDetails, getStrickerOrders, normalizeStrickerDate } from "@/lib/stricker/orders/client";
import { effectiveMockupOrderStatus, syncStrickerMockups } from "@/lib/stricker/orders/mockups";

type Snapshot = { status: string | null; shippingDate: string | null; trackingNumber: string | null; trackingUrl: string | null };
type NotificationIntent = { previous: Snapshot; next: Snapshot; previousLocalStatus: string; nextLocalStatus: string; hasNewTracking: boolean };
type SubmittedOrder = {
  id: string; order_number: string; supplier_order_stamp: string; supplier_test_mode: boolean;
  supplier_last_status: string | null; supplier_shipping_date: string | null;
  supplier_tracking_number: string | null; supplier_tracking_url: string | null;
  supplier_last_checked_at: string | null; status: string; fulfillment_status: string;
  shipped_at: string | null; delivered_at: string | null; cancelled_at: string | null;
  supplier_status_notification: NotificationIntent | null;
};
const TERMINAL = ["delivered", "cancelled", "refunded"];
const text = (value: string | null | undefined) => value?.trim() || null;
const terminal = (order: SubmittedOrder) => TERMINAL.includes(order.status) || TERMINAL.includes(order.fulfillment_status);

export function nextLocalOrderStatus(current: string, supplier: string | null): string {
  if (TERMINAL.includes(current)) return current;
  if (supplier === "DELIVERED") return "delivered";
  if (["SHIPPED", "SENT"].includes(supplier ?? "")) return "shipped";
  if (current === "shipped") return current;
  if (["CANCELLED", "CANCELED"].includes(supplier ?? "")) return "cancelled";
  if (supplier === "PRODUCTION") return "in_production";
  if (supplier === "PROCESSING" && current !== "in_production") return "processing";
  return current;
}

// dryRun performs provider reads only: no mockup reconciliation, writes or emails.
export async function syncSubmittedStrickerOrders(options: { dryRun?: boolean } = {}) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("orders")
    .select("id,order_number,supplier_order_stamp,supplier_test_mode,supplier_last_status,supplier_shipping_date,supplier_tracking_number,supplier_tracking_url,supplier_last_checked_at,status,fulfillment_status,shipped_at,delivered_at,cancelled_at,supplier_status_notification")
    .not("supplier_order_stamp", "is", null).is("deleted_at", null)
    .eq("supplier_test_mode", false).eq("payment_status", "paid")
    .or("and(status.not.in.(delivered,cancelled,refunded),fulfillment_status.not.in.(delivered,cancelled,refunded)),supplier_status_notification.not.is.null")
    .order("supplier_last_checked_at", { ascending: true, nullsFirst: true }).limit(50).returns<SubmittedOrder[]>();
  if (error) throw new Error(error.message);
  const orders = (data ?? []).filter(order => !order.supplier_test_mode && (!terminal(order) || order.supplier_status_notification));
  const failures: Array<{ orderId: string; message: string }> = [];
  const notificationFailures: Array<{ orderId: string; message: string }> = [];
  let updated = 0, unchanged = 0;
  let mockups: unknown = { skipped: true };
  if (!orders.length) return { checked: 0, updated, unchanged, failed: 0, failures, notificationsFailed: 0, notificationFailures, mockups };

  // One account-wide list. Do not silently fall back to stale details if it fails.
  const listed = await getStrickerOrders({ testMode: false, timeoutMs: 20_000 });
  if (!options.dryRun) {
    try { mockups = await syncStrickerMockups(); }
    catch { mockups = { failed: true }; console.error("Order mockup sync failed; previous proof state preserved"); }
  }
  const proofs = await admin.from("order_mockups").select("order_id,state")
    .in("order_id", orders.map(order => order.id)).in("state", ["pending", "awaiting_confirmation"]);
  if (proofs.error) throw new Error("Não foi possível consultar o estado das maquetes.");
  const proofStates = new Map<string, string>();
  for (const proof of proofs.data ?? []) if (proofStates.get(proof.order_id) !== "pending") proofStates.set(proof.order_id, proof.state);

  async function deliverIntent(order: SubmittedOrder, intent: NotificationIntent) {
    // Recheck manual completion/cancellation before touching either notification queue.
    const current = await admin.from("orders").select("status,fulfillment_status,deleted_at")
      .eq("id", order.id).single();
    if (current.error) throw new Error(current.error.message);
    if (current.data.deleted_at || current.data.status !== intent.nextLocalStatus
      || (TERMINAL.includes(current.data.fulfillment_status) && current.data.fulfillment_status !== intent.nextLocalStatus)) {
      await admin.from("orders").update({ supplier_status_notification: null }).eq("id", order.id);
      return;
    }
    if (intent.hasNewTracking && intent.nextLocalStatus === "shipped") {
      await notifyOrderTrackingAvailable(order.id, { enqueueOnly: true });
    } else if (intent.previousLocalStatus !== intent.nextLocalStatus) {
      await notifyOrderStatusChanged({ orderId: order.id, previousStatus: intent.previousLocalStatus,
        newStatus: intent.nextLocalStatus, eventId: `supplier:${order.supplier_order_stamp}:${intent.nextLocalStatus}`, enqueueOnly: true });
    }
    await notifySupplierOrderStatusChanged({ orderId: order.id, orderNumber: order.order_number,
      testMode: false, previous: intent.previous, next: intent.next });
    const cleared = await admin.from("orders").update({ supplier_status_notification: null }).eq("id", order.id);
    if (cleared.error) throw new Error(cleared.error.message);
  }

  for (let offset = 0; offset < orders.length; offset += 5) {
    await Promise.all(orders.slice(offset, offset + 5).map(async order => {
      const checkedAt = new Date().toISOString();
      try {
        if (order.supplier_status_notification && !options.dryRun) {
          try { await deliverIntent(order, order.supplier_status_notification); }
          catch (cause) {
            notificationFailures.push({ orderId: order.id, message: cause instanceof Error ? cause.message : "Falha na notificação" });
            return; // Preserve the intent; unchanged snapshots must retry it next cycle.
          }
        }
        if (terminal(order)) return;
        const listedOrder = listed.orders.get(order.supplier_order_stamp);
        const result = listedOrder
          ? { orderDetails: listedOrder, response: { source: "OrdersV1", OrderDetails: listedOrder } }
          : await getStrickerOrderDetails(order.supplier_order_stamp, { testMode: false, timeoutMs: 20_000 });
        const returnedStamp = result.orderDetails.OrderStamp ?? result.orderDetails.orderStamp;
        if (returnedStamp !== order.supplier_order_stamp) throw new Error("O fornecedor devolveu uma referência de encomenda diferente.");
        const rawStatus = text(extractStrickerOrderStatus(result.orderDetails))?.toUpperCase() ?? null;
        if (!rawStatus) throw new Error("O fornecedor não devolveu o estado da encomenda.");
        let status = effectiveMockupOrderStatus(rawStatus, proofStates.get(order.id));
        // Missing list entries can use details, but may never regress a known dispatch.
        if (order.status === "shipped" && !["SHIPPED", "SENT", "DELIVERED"].includes(status ?? "")) status = order.supplier_last_status || "SHIPPED";
        const previous: Snapshot = { status: text(order.supplier_last_status)?.toUpperCase() ?? null,
          shippingDate: normalizeStrickerDate(order.supplier_shipping_date),
          trackingNumber: text(order.supplier_tracking_number), trackingUrl: text(order.supplier_tracking_url) };
        const next: Snapshot = { status,
          shippingDate: extractStrickerShippingDate(result.orderDetails) ?? previous.shippingDate,
          trackingNumber: text(extractStrickerTrackingNumber(result.orderDetails)) ?? previous.trackingNumber,
          trackingUrl: text(extractStrickerTrackingUrl(result.orderDetails)) ?? previous.trackingUrl };
        // The old parser put URLs in tracking_number; keep only the URL in that case.
        if (next.trackingUrl && /^https?:\/\//i.test(next.trackingNumber ?? "")) next.trackingNumber = null;
        const newLocalStatus = nextLocalOrderStatus(order.status, status);
        const changed = JSON.stringify(previous) !== JSON.stringify(next) || newLocalStatus !== order.status;
        if (options.dryRun) { if (changed) updated++; else unchanged++; return; }
        const values: Record<string, unknown> = { supplier_last_response: result.response, supplier_last_checked_at: checkedAt };
        let intent: NotificationIntent | null = null;
        if (changed) {
          intent = { previous, next, previousLocalStatus: order.status, nextLocalStatus: newLocalStatus,
            hasNewTracking: Boolean((next.trackingNumber && next.trackingNumber !== previous.trackingNumber) || (next.trackingUrl && next.trackingUrl !== previous.trackingUrl)) };
          Object.assign(values, { supplier_last_status: next.status, supplier_shipping_date: next.shippingDate,
            supplier_tracking_number: next.trackingNumber, supplier_tracking_url: next.trackingUrl,
            supplier_status_notification: intent });
        }
        if (["shipped", "delivered"].includes(newLocalStatus)) {
          Object.assign(values, { tracking_number: next.trackingNumber, tracking_url: next.trackingUrl });
          const carrier = text(result.orderDetails.Courier ?? result.orderDetails.courier);
          if (carrier) values.shipping_carrier = carrier;
        }
        if (newLocalStatus !== order.status) {
          values.status = newLocalStatus;
          if (["shipped", "delivered", "cancelled"].includes(newLocalStatus)) values.fulfillment_status = newLocalStatus;
          if (["shipped", "delivered"].includes(newLocalStatus)) values.shipped_at = order.shipped_at ?? checkedAt;
          if (newLocalStatus === "delivered") values.delivered_at = order.delivered_at ?? checkedAt;
          if (newLocalStatus === "cancelled") values.cancelled_at = order.cancelled_at ?? checkedAt;
        }
        // Compare-and-set: a concurrent manual completion must win, without any email.
        const saved = await admin.from("orders").update(values).eq("id", order.id)
          .eq("status", order.status).eq("fulfillment_status", order.fulfillment_status)
          .is("deleted_at", null).select("id").maybeSingle();
        if (saved.error) throw new Error(saved.error.message);
        if (!saved.data) return;
        if (changed) updated++; else unchanged++;
        if (intent) {
          try { await deliverIntent(order, intent); }
          catch (cause) { notificationFailures.push({ orderId: order.id, message: cause instanceof Error ? cause.message : "Falha na notificação" }); }
        }
      } catch (cause) {
        if (!options.dryRun) await admin.from("orders").update({ supplier_last_checked_at: checkedAt }).eq("id", order.id)
          .eq("status", order.status).eq("fulfillment_status", order.fulfillment_status);
        failures.push({ orderId: order.id, message: cause instanceof Error ? cause.message : "Erro desconhecido" });
      }
    }));
  }
  return { mockups, checked: orders.length, updated, unchanged, failed: failures.length, failures,
    notificationsFailed: notificationFailures.length, notificationFailures, listAtCapacity: listed.truncated, dryRun: !!options.dryRun };
}
