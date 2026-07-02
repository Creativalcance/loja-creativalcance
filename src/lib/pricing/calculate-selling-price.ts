export type PricingMode =
  | "automatic"
  | "margin"
  | "markup"
  | "fixed_markup"
  | "manual";

export type PricingRoundingMode =
  | "none"
  | "nearest_cent"
  | "up_cent"
  | "commercial_09"
  | "commercial_90"
  | "commercial_99";

export type SellingPriceInput = {
  supplierPrice: number;
  handlingCost?: number | null;
  pricingMode: PricingMode;
  automaticMarginPercentage?: number | null;
  marginPercentage?: number | null;
  markupPercentage?: number | null;
  fixedMarkup?: number | null;
  manualPrice?: number | null;
  minimumProfit?: number | null;
  roundingMode?: PricingRoundingMode;
};

export type SellingPriceResult = {
  supplierPrice: number;
  handlingCost: number;
  costPrice: number;
  finalPrice: number;
  profitPerUnit: number;
  marginPercentage: number;
  markupPercentage: number;
  pricingMode: PricingMode;
  roundingMode: PricingRoundingMode;
};

function normaliseMoney(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, value);
}

function normalisePercentage(
  value: number | null | undefined,
  maximum?: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  const normalised = Math.max(0, value);

  if (typeof maximum === "number") {
    return Math.min(normalised, maximum);
  }

  return normalised;
}

function roundToCent(value: number): number {
  return Number(value.toFixed(2));
}

function roundUpToCent(value: number): number {
  return Math.ceil(value * 100) / 100;
}

function roundCommercialEnding(
  value: number,
  ending: 0.09 | 0.9 | 0.99,
): number {
  if (value <= 0) {
    return 0;
  }

  const integerPart = Math.floor(value);
  const candidate = integerPart + ending;

  if (candidate >= value) {
    return roundToCent(candidate);
  }

  return roundToCent(integerPart + 1 + ending);
}

function applyRounding(
  value: number,
  roundingMode: PricingRoundingMode,
): number {
  switch (roundingMode) {
    case "none":
      return value;

    case "up_cent":
      return roundUpToCent(value);

    case "commercial_09":
      return roundCommercialEnding(value, 0.09);

    case "commercial_90":
      return roundCommercialEnding(value, 0.9);

    case "commercial_99":
      return roundCommercialEnding(value, 0.99);

    case "nearest_cent":
    default:
      return roundToCent(value);
  }
}

function calculateByMargin(params: {
  costPrice: number;
  marginPercentage: number;
}): number {
  const marginRate = params.marginPercentage / 100;

  if (marginRate <= 0) {
    return params.costPrice;
  }

  if (marginRate >= 1) {
    throw new Error(
      "A margem deve ser inferior a 100%.",
    );
  }

  return params.costPrice / (1 - marginRate);
}

function calculateByMarkup(params: {
  costPrice: number;
  markupPercentage: number;
}): number {
  return (
    params.costPrice *
    (1 + params.markupPercentage / 100)
  );
}

function calculateRawFinalPrice(params: {
  costPrice: number;
  pricingMode: PricingMode;
  automaticMarginPercentage: number;
  marginPercentage: number;
  markupPercentage: number;
  fixedMarkup: number;
  manualPrice: number;
}): number {
  switch (params.pricingMode) {
    case "margin":
      return calculateByMargin({
        costPrice: params.costPrice,
        marginPercentage: params.marginPercentage,
      });

    case "markup":
      return calculateByMarkup({
        costPrice: params.costPrice,
        markupPercentage: params.markupPercentage,
      });

    case "fixed_markup":
      return params.costPrice + params.fixedMarkup;

    case "manual":
      return params.manualPrice;

    case "automatic":
    default:
      return calculateByMargin({
        costPrice: params.costPrice,
        marginPercentage: params.automaticMarginPercentage,
      });
  }
}

function calculateMarginPercentage(params: {
  costPrice: number;
  finalPrice: number;
}): number {
  if (params.finalPrice <= 0) {
    return 0;
  }

  return (
    ((params.finalPrice - params.costPrice) /
      params.finalPrice) *
    100
  );
}

function calculateMarkupPercentage(params: {
  costPrice: number;
  finalPrice: number;
}): number {
  if (params.costPrice <= 0) {
    return 0;
  }

  return (
    ((params.finalPrice - params.costPrice) /
      params.costPrice) *
    100
  );
}

export function calculateSellingPrice(
  input: SellingPriceInput,
): SellingPriceResult {
  const supplierPrice = normaliseMoney(input.supplierPrice);
  const handlingCost = normaliseMoney(input.handlingCost);
  const costPrice = roundToCent(supplierPrice + handlingCost);

  const automaticMarginPercentage = normalisePercentage(
    input.automaticMarginPercentage,
    99.9999,
  );

  const marginPercentage = normalisePercentage(
    input.marginPercentage,
    99.9999,
  );

  const markupPercentage = normalisePercentage(
    input.markupPercentage,
  );

  const fixedMarkup = normaliseMoney(input.fixedMarkup);
  const manualPrice = normaliseMoney(input.manualPrice);
  const minimumProfit = normaliseMoney(input.minimumProfit);

  const roundingMode =
    input.roundingMode ?? "nearest_cent";

  const rawFinalPrice = calculateRawFinalPrice({
    costPrice,
    pricingMode: input.pricingMode,
    automaticMarginPercentage,
    marginPercentage,
    markupPercentage,
    fixedMarkup,
    manualPrice,
  });

  const minimumAllowedPrice = costPrice + minimumProfit;

  const protectedFinalPrice = Math.max(
    rawFinalPrice,
    minimumAllowedPrice,
  );

  const finalPrice = applyRounding(
    protectedFinalPrice,
    roundingMode,
  );

  const profitPerUnit = roundToCent(
    finalPrice - costPrice,
  );

  const effectiveMarginPercentage = roundToCent(
    calculateMarginPercentage({
      costPrice,
      finalPrice,
    }),
  );

  const effectiveMarkupPercentage = roundToCent(
    calculateMarkupPercentage({
      costPrice,
      finalPrice,
    }),
  );

  return {
    supplierPrice,
    handlingCost,
    costPrice,
    finalPrice,
    profitPerUnit,
    marginPercentage: effectiveMarginPercentage,
    markupPercentage: effectiveMarkupPercentage,
    pricingMode: input.pricingMode,
    roundingMode,
  };
}