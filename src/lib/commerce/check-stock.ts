import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { orderableStock } from "./stock-availability";

type RequestedItem = { product_id: string | null; variant_id: string | null; quantity: number };

// Aggregate all lines sharing a variant, including different customizations.
export async function assertStockAvailable(items: RequestedItem[]): Promise<void> {
  const admin = createSupabaseAdminClient();
  const ids = [...new Set(items.map(i => i.product_id).filter((id): id is string => Boolean(id)))];
  const [stocks, future] = await Promise.all([
    admin.from("product_stocks").select("product_id,variant_id,available_quantity").in("product_id", ids),
    admin.from("product_future_stocks").select("product_id,variant_id,expected_date,expected_quantity").in("product_id", ids),
  ]);
  if (stocks.error || future.error) throw new Error("Não foi possível confirmar o stock. Tenta novamente.");
  const totals = new Map<string, RequestedItem>();
  for (const item of items) {
    if (!item.product_id || !Number.isSafeInteger(item.quantity) || item.quantity <= 0) throw new Error("O carrinho contém uma quantidade inválida.");
    const key = `${item.product_id}:${item.variant_id ?? ""}`;
    const previous = totals.get(key);
    totals.set(key, { ...item, quantity: item.quantity + (previous?.quantity ?? 0) });
  }
  for (const item of totals.values()) {
    const available = orderableStock((stocks.data ?? []).filter(s => s.product_id === item.product_id), (future.data ?? []).filter(s => s.product_id === item.product_id), item.variant_id);
    if (item.quantity > available) throw new Error("A quantidade no carrinho ultrapassa o stock disponível ou previsto. Revê as quantidades antes de continuar.");
  }
}
