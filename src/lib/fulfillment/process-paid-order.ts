import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { notifyInternalOrder } from "@/lib/notifications/internal-order";
import { submitPaidOrderToStricker } from "@/lib/stricker/orders/submit-order";

type Route = "supplier_api" | "internal_360";
type OrderItem = { id: string; supplier_id: string | null; fulfillment_route: Route };
type Group = { id: string; route: Route; supplier_id: string | null; status: string };

async function ensureGroup(orderId: string, route: Route, supplierId: string | null, itemIds: string[]): Promise<Group> {
  const admin = createSupabaseAdminClient();
  let query = admin.from("fulfillment_groups").select("id,route,supplier_id,status")
    .eq("order_id", orderId).eq("route", route);
  query = supplierId ? query.eq("supplier_id", supplierId) : query.is("supplier_id", null);
  const existing = await query.maybeSingle<Group>();
  if (existing.error) throw new Error(existing.error.message);
  let group = existing.data;
  if (!group) {
    const inserted = await admin.from("fulfillment_groups").insert({
      order_id: orderId, route, supplier_id: supplierId,
      notification_email: route === "internal_360"
        ? process.env.INTERNAL_ORDER_EMAIL?.trim() || "info@360-merchandising.com"
        : null,
    }).select("id,route,supplier_id,status").single<Group>();
    if (inserted.error || !inserted.data) {
      // A concurrent webhook may have created the unique group first.
      let retry = admin.from("fulfillment_groups").select("id,route,supplier_id,status")
        .eq("order_id", orderId).eq("route", route);
      retry = supplierId ? retry.eq("supplier_id", supplierId) : retry.is("supplier_id", null);
      const concurrent = await retry.single<Group>();
      if (concurrent.error || !concurrent.data) throw new Error(inserted.error?.message || concurrent.error?.message);
      group = concurrent.data;
    } else {
      group = inserted.data;
    }
  }
  if (!group) throw new Error("Não foi possível criar o grupo de processamento.");
  const links = itemIds.map((orderItemId) => ({ fulfillment_group_id: group.id, order_item_id: orderItemId }));
  const linked = await admin.from("fulfillment_group_items").upsert(links, { onConflict: "fulfillment_group_id,order_item_id", ignoreDuplicates: true });
  if (linked.error) throw new Error(linked.error.message);
  return group;
}

export async function processPaidOrderFulfillment(orderId: string) {
  const admin = createSupabaseAdminClient();
  const result = await admin.from("orders").select("id,payment_status,order_items(id,supplier_id,fulfillment_route)")
    .eq("id", orderId).maybeSingle<{ id: string; payment_status: string; order_items: OrderItem[] | null }>();
  if (result.error || !result.data) throw new Error(result.error?.message || "Encomenda não encontrada.");
  if (result.data.payment_status !== "paid") throw new Error("A encomenda ainda não está paga.");
  const items = result.data.order_items ?? [];
  if (items.length === 0) throw new Error("A encomenda não contém artigos.");

  const buckets = new Map<string, { route: Route; supplierId: string | null; ids: string[] }>();
  for (const item of items) {
    const route = item.fulfillment_route || "supplier_api";
    const supplierId = route === "supplier_api" ? item.supplier_id : null;
    const key = `${route}:${supplierId || "internal"}`;
    const bucket = buckets.get(key) || { route, supplierId, ids: [] };
    bucket.ids.push(item.id);
    buckets.set(key, bucket);
  }
  const groups = await Promise.all([...buckets.values()].map((bucket) =>
    ensureGroup(orderId, bucket.route, bucket.supplierId, bucket.ids),
  ));
  const internalGroups = groups.filter((group) => group.route === "internal_360");
  const supplierGroups = groups.filter((group) => group.route === "supplier_api");

  const internalResults = await Promise.allSettled(internalGroups.map((group) => notifyInternalOrder(group.id)));
  let supplierResult: Awaited<ReturnType<typeof submitPaidOrderToStricker>> | null = null;
  if (supplierGroups.length > 0) {
    supplierResult = await submitPaidOrderToStricker(orderId);
    await Promise.all(supplierGroups.map((group) => admin.from("fulfillment_groups").update({
      status: supplierResult?.success ? "submitted" : "failed",
      submitted_at: supplierResult?.success ? new Date().toISOString() : null,
      last_error: supplierResult?.success ? null : supplierResult?.message,
      updated_at: new Date().toISOString(),
    }).eq("id", group.id)));
  }
  const internalOk = internalResults.every((entry) => entry.status === "fulfilled");
  return {
    success: internalOk && (supplierResult?.success ?? true),
    hasInternal: internalGroups.length > 0,
    hasSupplier: supplierGroups.length > 0,
    supplierResult,
    internalErrors: internalResults.flatMap((entry) =>
      entry.status === "rejected" ? [entry.reason instanceof Error ? entry.reason.message : "Falha na notificação interna."] : []),
  };
}
