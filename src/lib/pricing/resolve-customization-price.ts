import { findBestPricingRule } from "@/lib/pricing/apply-pricing-rule";
import { calculateProductSellingPrice } from "@/lib/pricing/calculate-product-price";
import type { PricingRule } from "@/lib/pricing/types";

export type CustomizationPriceTier = {
  id: string;
  table_code: string;
  table_code_option: string | null;
  technique_code: string | null;
  technique_name: string | null;
  quantity_min: number;
  quantity_max: number | null;
  supplier_price: number;
  final_price: number;
  handling_cost_code: string | null;
  handling_cost: number;
  supplier_handling_cost?: number | null;
  currency: string;
  price_by_color: boolean;
  price_by_area: boolean;
  max_colors: number | null;
  area_cm2: number | null;
  is_manual_override?: boolean | null;
  pricing_rule_id?: string | null;
  handling_is_manual_override?: boolean | null;
};

export type ResolvedCustomizationPrice = {
  priceTableId: string;
  personalizationUnitPrice: number;
  setupCost: number;
  supplierPersonalizationUnitPrice: number;
  supplierSetupCost: number;
  currency: string;
  quantityMin: number;
  quantityMax: number | null;
  tableCode: string;
  tableCodeOption: string | null;
  handlingCostCode: string | null;
  personalizationPricingRuleId: string | null;
  setupPricingRuleId: string | null;
};

function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

function getTableCodeOptionColorCount(value: string | null): number | null {
  const match = value?.trim().match(/-(\d+)$/);
  const count = match?.[1] ? Number(match[1]) : null;

  return count && Number.isInteger(count) && count > 0 ? count : null;
}

export function resolveCustomizationPrice(params: {
  tiers: CustomizationPriceTier[];
  rules?: PricingRule[];
  supplierId?: string | null;
  productId?: string | null;
  variantId?: string | null;
  tableCode?: string | null;
  tableCodeOption?: string | null;
  techniqueName?: string | null;
  quantity: number;
  colors?: number | null;
  areaCm2?: number | null;
}): ResolvedCustomizationPrice | null {
  const tableCode = normalize(params.tableCode);
  const tableCodeOption = normalize(params.tableCodeOption);
  const techniqueName = normalize(params.techniqueName);
  const hasSelectedSupplierTable = Boolean(tableCode || tableCodeOption);

  let candidates = params.tiers.filter((tier) => {
    const codeMatch =
      !tableCode ||
      normalize(tier.table_code) === tableCode ||
      normalize(tier.table_code_option) === tableCode;
    const optionMatch =
      !tableCodeOption || normalize(tier.table_code_option) === tableCodeOption;
    const techniqueMatch =
      !techniqueName ||
      normalize(tier.technique_name) === techniqueName ||
      normalize(tier.technique_code) === techniqueName;
    const quantityMatch =
      params.quantity >= tier.quantity_min &&
      (tier.quantity_max === null || params.quantity <= tier.quantity_max);
    const optionColorCount = getTableCodeOptionColorCount(
      tier.table_code_option,
    );
    const colorMatch =
      !params.colors ||
      (optionColorCount !== null
        ? optionColorCount === params.colors
        : !tier.price_by_color ||
          !tier.max_colors ||
          tier.max_colors === params.colors);

    /*
     * Segundo a estrutura Stricker, TableCode já identifica técnica + área e
     * TableCodeOption especializa essa combinação (incluindo cor quando
     * aplicável). Quando o editor envia uma tabela oficial já selecionada,
     * essa identidade deve ser preservada. A área geométrica recebida do
     * editor não pode voltar a invalidar a própria tabela do fornecedor — em
     * particular porque printingWidth/Height representam a área disponível,
     * enquanto a tabela selecionada corresponde à área tarifada do artwork.
     */
    const areaMatch =
      hasSelectedSupplierTable ||
      !tier.price_by_area ||
      !params.areaCm2 ||
      !tier.area_cm2 ||
      params.areaCm2 <= tier.area_cm2;

    return (
      codeMatch &&
      optionMatch &&
      techniqueMatch &&
      quantityMatch &&
      colorMatch &&
      areaMatch
    );
  });

  if (
    candidates.length === 0 &&
    !tableCodeOption &&
    !techniqueName &&
    !params.colors
  ) {
    candidates = params.tiers.filter((tier) => {
      const codeMatch =
        !tableCode ||
        normalize(tier.table_code) === tableCode ||
        normalize(tier.table_code_option) === tableCode;
      return codeMatch && params.quantity >= tier.quantity_min;
    });
  }

  const tier = [...candidates].sort(
    (a, b) =>
      b.quantity_min - a.quantity_min ||
      (a.area_cm2 ?? Number.MAX_SAFE_INTEGER) -
        (b.area_cm2 ?? Number.MAX_SAFE_INTEGER),
  )[0];
  if (!tier || tier.final_price <= 0) return null;

  const rules = params.rules ?? [];
  const setupRule = findBestPricingRule(rules, {
    supplierId: params.supplierId,
    productId: params.productId,
    variantId: params.variantId,
    priceType: "setup",
    quantity: params.quantity,
  });
  const setupPrice = calculateProductSellingPrice({
    supplierPrice: Number(
      tier.supplier_handling_cost ?? tier.handling_cost ?? 0,
    ),
    marginRate: setupRule?.margin_rate ?? 0.3,
    markupRate: setupRule?.markup_rate ?? null,
    fixedFee: setupRule?.fixed_fee ?? 0,
    minimumProfit: setupRule?.minimum_profit ?? 0,
    roundingMode: setupRule?.rounding_mode ?? "ceil_01",
  });

  return {
    priceTableId: tier.id,
    personalizationUnitPrice: Number(tier.final_price),
    setupCost: tier.handling_is_manual_override
      ? roundMoney(Number(tier.handling_cost ?? 0))
      : roundMoney(setupPrice.finalPrice),
    supplierPersonalizationUnitPrice: Number(tier.supplier_price),
    supplierSetupCost: Number(
      tier.supplier_handling_cost ?? tier.handling_cost ?? 0,
    ),
    currency: tier.currency || "EUR",
    quantityMin: tier.quantity_min,
    quantityMax: tier.quantity_max,
    tableCode: tier.table_code,
    tableCodeOption: tier.table_code_option,
    handlingCostCode: tier.handling_cost_code,
    personalizationPricingRuleId: tier.pricing_rule_id ?? null,
    setupPricingRuleId: setupRule?.id ?? null,
  };
}
