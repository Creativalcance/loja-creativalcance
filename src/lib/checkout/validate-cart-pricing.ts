import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { calculateCartItemPricing } from "@/lib/pricing/calculate-cart-item";
import { resolveCustomizationPrice } from "@/lib/pricing/resolve-customization-price";
import { getCustomizationServiceCodeHints } from "@/lib/stricker/resolve-customization-service-code";
import { getEffectiveMinimumOrderQuantity } from "@/lib/commerce/minimum-order-quantity";

type Item = {
  product_id: string | null; variant_id: string | null; quantity: number;
  unit_price: number; subtotal: number; personalization_unit_price: number;
  personalization_total: number; setup_cost: number; extras_total: number; total: number;
  customization_draft_id: string | null; personalization_technique_id: string | null;
};
const cents = (amount: number) => Math.round(Number(amount) * 100);

// Refuse changed/tampered prices before creating an order or payment session.
// The customer must review a fresh cart; never silently charge another amount.
export async function validateCartPricing(items: Item[], currency: string, discount: number): Promise<void> {
  const admin = createSupabaseAdminClient();
  if (Number(discount) !== 0) throw new Error("O desconto do carrinho precisa de ser revisto antes do pagamento.");
  const changed = () => new Error("Os preços do carrinho precisam de ser atualizados. Remove e volta a adicionar os artigos antes de continuar.");
  for (const item of items) {
    const { data: product, error } = await admin.from("products")
      .select("id,supplier_id,min_order_quantity,product_prices(variant_id,quantity_min,quantity_max,final_price,currency)")
      .eq("id", item.product_id).single();
    if (error || !product) throw new Error("Não foi possível confirmar os preços atuais.");
    if (item.quantity < getEffectiveMinimumOrderQuantity(product.min_order_quantity)) throw changed();
    const allPrices = product.product_prices ?? [];
    const variantPrices = item.variant_id ? allPrices.filter(p => p.variant_id === item.variant_id) : [];
    const basePrices = allPrices.filter(p => !p.variant_id);
    const prices = variantPrices.length ? variantPrices : basePrices.length ? basePrices : allPrices;
    const pricing = calculateCartItemPricing({ quantity: item.quantity, prices });
    if (pricing.unitPrice <= 0 || pricing.currency !== currency) throw changed();
    let personalization = 0; let setup = 0; let extras = 0;
    if (item.customization_draft_id) {
      const { data: draft, error: draftError } = await admin.from("product_customization_drafts")
        .select("product_id,variant_id,table_code,table_code_option,technique_name,printing_area_mm2,personalization_data")
        .eq("id", item.customization_draft_id).single();
      if (draftError || !draft || draft.product_id !== item.product_id || draft.variant_id !== item.variant_id) throw changed();
      const code = String(draft.table_code ?? "").replace(/[(),]/g, "");
      if (!code) throw changed();
      const [tables, rules] = await Promise.all([
        admin.from("printing_price_tables").select("*").eq("supplier_id", product.supplier_id).eq("is_active", true)
          .or(`table_code.eq.${code},table_code_option.eq.${code}`),
        admin.from("pricing_rules").select("*").eq("is_active", true).in("price_type", ["personalization", "setup"]),
      ]);
      if (tables.error || rules.error) throw new Error("Não foi possível confirmar a personalização.");
      const data = (draft.personalization_data ?? {}) as Record<string, unknown>;
      const hints = getCustomizationServiceCodeHints(data);
      const result = resolveCustomizationPrice({ tiers: tables.data ?? [], rules: rules.data ?? [], supplierId: product.supplier_id,
        productId: product.id, variantId: item.variant_id, tableCode: draft.table_code, tableCodeOption: draft.table_code_option,
        techniqueName: draft.technique_name, quantity: item.quantity, colors: hints.selectedColorCount,
        areaCm2: draft.printing_area_mm2 ? Number(draft.printing_area_mm2) / 100 : null });
      if (!result) throw changed();
      personalization = result.personalizationUnitPrice; setup = result.setupCost;
      extras = (data.needsDesignHelp === true ? 21 : 0) + (data.extraProof === true ? 15 : 0) + (data.nominative === true ? 0.7 * item.quantity : 0);
    } else if (item.personalization_technique_id) {
      const { data: technique, error: techniqueError } = await admin.from("printing_techniques")
        .select("price_per_unit,setup_cost").eq("id", item.personalization_technique_id).single();
      if (techniqueError || !technique) throw changed();
      personalization = Number(technique.price_per_unit ?? 0); setup = Number(technique.setup_cost ?? 0);
    }
    const expected = [pricing.unitPrice, pricing.subtotal, personalization, personalization * item.quantity, setup, extras];
    const actual = [item.unit_price, item.subtotal, item.personalization_unit_price, item.personalization_total, item.setup_cost, item.extras_total];
    if (actual.some((value, index) => !Number.isFinite(Number(value)) || Number(value) < 0 || cents(value) !== cents(expected[index]))) throw changed();
    const total = cents(pricing.subtotal) + cents(personalization * item.quantity) + cents(setup) + cents(extras);
    if (cents(item.total) !== total) throw changed();
  }
}
