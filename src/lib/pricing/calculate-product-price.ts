import type {
  PricingRoundingMode,
  ProductSellingPriceInput,
  ProductSellingPriceResult,
} from "@/lib/pricing/types";
import { roundBusinessPrice } from "@/lib/pricing/round-price";

function sanitizeNullableRate(value: number | null | undefined): number | null {
  if (!Number.isFinite(Number(value))) {
    return null;
  }

  const numericValue = Number(value);

  return numericValue >= 0 ? numericValue : null;
}

function sanitizeMoney(value: number | null | undefined): number {
  if (!Number.isFinite(Number(value))) {
    return 0;
  }

  return Math.max(0, Number(value));
}

function resolveBasePrice(params: {
  supplierPrice: number;
  marginRate: number | null;
  markupRate: number | null;
  fixedFee: number;
}): number {
  const supplierPrice = sanitizeMoney(params.supplierPrice);
  const fixedFee = sanitizeMoney(params.fixedFee);

  if (params.marginRate !== null && params.marginRate > 0) {
    const safeMargin = Math.min(params.marginRate, 0.94);

    return supplierPrice / (1 - safeMargin) + fixedFee;
  }

  if (params.markupRate !== null && params.markupRate > 0) {
    return supplierPrice * (1 + params.markupRate) + fixedFee;
  }

  return supplierPrice + fixedFee;
}

export function calculateProductSellingPrice(
  input: ProductSellingPriceInput,
): ProductSellingPriceResult {
  const supplierPrice = sanitizeMoney(input.supplierPrice);
  const marginRate = sanitizeNullableRate(input.marginRate);
  const markupRate = sanitizeNullableRate(input.markupRate);
  const fixedFee = sanitizeMoney(input.fixedFee);
  const minimumProfit = sanitizeMoney(input.minimumProfit);
  const roundingMode: PricingRoundingMode =
    input.roundingMode ?? "commercial_05";

  const basePrice = resolveBasePrice({
    supplierPrice,
    marginRate,
    markupRate,
    fixedFee,
  });

  const minimumAllowedPrice = supplierPrice + minimumProfit;
  const priceBeforeRounding = Math.max(basePrice, minimumAllowedPrice);
  const finalPrice = roundBusinessPrice(priceBeforeRounding, roundingMode);

  const grossProfit = Math.max(0, finalPrice - supplierPrice);
  const grossMarginRate = finalPrice > 0 ? grossProfit / finalPrice : 0;

  return {
    supplierPrice,
    finalPrice,
    marginRate,
    markupRate,
    fixedFee,
    minimumProfit,
    roundingMode,
    grossProfit,
    grossMarginRate,
  };
}