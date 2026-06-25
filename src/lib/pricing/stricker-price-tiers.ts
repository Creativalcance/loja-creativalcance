import type {
  PricingRule,
  PricingRuleContext,
} from "@/lib/pricing/types";
import { findBestPricingRule } from "@/lib/pricing/apply-pricing-rule";
import { calculateProductSellingPrice } from "@/lib/pricing/calculate-product-price";

export type StrickerOptionalPriceRecord = Record<string, unknown>;

export type StrickerPriceTier = {
  quantity_min: number;
  quantity_max: number | null;
  supplier_price: number;
  currency: string;
  source_price_field: string;
  source_min_quantity_field: string;
};

export type CalculatedProductPriceTier = StrickerPriceTier & {
  final_price: number;
  margin_rate: number | null;
  markup_rate: number | null;
  fixed_fee: number;
  minimum_profit: number;
  pricing_rule_id: string | null;
};

function getNumberField(
  record: StrickerOptionalPriceRecord,
  field: string,
): number | null {
  const value = record[field];

  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue = Number(
    typeof value === "string" ? value.replace(",", ".") : value,
  );

  return Number.isFinite(numericValue) ? numericValue : null;
}

function getStringField(
  record: StrickerOptionalPriceRecord,
  field: string,
): string | null {
  const value = record[field];

  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function buildQuantityMaxValues(
  tiers: Array<Omit<StrickerPriceTier, "quantity_max">>,
): StrickerPriceTier[] {
  return tiers.map((tier, index) => {
    const nextTier = tiers[index + 1] ?? null;

    return {
      ...tier,
      quantity_max: nextTier ? Math.max(tier.quantity_min, nextTier.quantity_min - 1) : null,
    };
  });
}

export function extractStrickerPriceTiers(
  record: StrickerOptionalPriceRecord,
  currency = "EUR",
): StrickerPriceTier[] {
  const tiers: Array<Omit<StrickerPriceTier, "quantity_max">> = [];

  for (let index = 1; index <= 10; index += 1) {
    const minQuantityField = `MinQt${index}`;
    const priceField = `Price${index}`;

    const quantityMin = getNumberField(record, minQuantityField);
    const supplierPrice = getNumberField(record, priceField);

    if (!quantityMin || !supplierPrice || supplierPrice <= 0) {
      continue;
    }

    tiers.push({
      quantity_min: Math.floor(quantityMin),
      supplier_price: supplierPrice,
      currency,
      source_price_field: priceField,
      source_min_quantity_field: minQuantityField,
    });
  }

  if (tiers.length === 0) {
    const yourPrice = getNumberField(record, "YourPrice");

    if (yourPrice && yourPrice > 0) {
      tiers.push({
        quantity_min: 1,
        supplier_price: yourPrice,
        currency,
        source_price_field: "YourPrice",
        source_min_quantity_field: "fallback",
      });
    }
  }

  return buildQuantityMaxValues(
    tiers.sort((a, b) => a.quantity_min - b.quantity_min),
  );
}

export function getStrickerSku(record: StrickerOptionalPriceRecord): string | null {
  return getStringField(record, "Sku") ?? getStringField(record, "SKU");
}

export function getStrickerWebSku(
  record: StrickerOptionalPriceRecord,
): string | null {
  return getStringField(record, "WebSku") ?? getStringField(record, "WebSKU");
}

export function calculateStrickerPriceTiers(params: {
  record: StrickerOptionalPriceRecord;
  rules: PricingRule[];
  context: Omit<PricingRuleContext, "quantity">;
  currency?: string;
}): CalculatedProductPriceTier[] {
  const currency = params.currency ?? "EUR";
  const tiers = extractStrickerPriceTiers(params.record, currency);

  return tiers.map((tier) => {
    const pricingRule = findBestPricingRule(params.rules, {
      ...params.context,
      quantity: tier.quantity_min,
    });

    const calculatedPrice = calculateProductSellingPrice({
      supplierPrice: tier.supplier_price,
      marginRate: pricingRule?.margin_rate ?? 0.35,
      markupRate: pricingRule?.markup_rate ?? null,
      fixedFee: pricingRule?.fixed_fee ?? 0,
      minimumProfit: pricingRule?.minimum_profit ?? 0,
      roundingMode: pricingRule?.rounding_mode ?? "commercial_05",
    });

    return {
      ...tier,
      final_price: calculatedPrice.finalPrice,
      margin_rate: calculatedPrice.marginRate,
      markup_rate: calculatedPrice.markupRate,
      fixed_fee: calculatedPrice.fixedFee,
      minimum_profit: calculatedPrice.minimumProfit,
      pricing_rule_id: pricingRule?.id ?? null,
    };
  });
}