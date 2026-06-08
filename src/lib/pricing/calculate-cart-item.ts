export type PriceTier = {
  quantity_min: number;
  quantity_max: number | null;
  final_price: number;
  currency: string;
};

export type PrintingTechniquePrice = {
  id: string;
  setup_cost: number | null;
  price_per_unit: number | null;
};

export type CartItemPricingInput = {
  quantity: number;
  prices: PriceTier[];
  selectedPrintingTechnique?: PrintingTechniquePrice | null;
};

export type CartItemPricingResult = {
  currency: string;
  unitPrice: number;
  personalizationUnitPrice: number;
  setupCost: number;
  subtotal: number;
  personalizationTotal: number;
  total: number;
};

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

function findPriceTier(quantity: number, prices: PriceTier[]): PriceTier | null {
  const sortedPrices = [...prices].sort(
    (a, b) => a.quantity_min - b.quantity_min,
  );

  const matchingTier = sortedPrices.find((price) => {
    const minMatches = quantity >= price.quantity_min;
    const maxMatches =
      price.quantity_max === null || quantity <= price.quantity_max;

    return minMatches && maxMatches;
  });

  if (matchingTier) {
    return matchingTier;
  }

  const fallbackPrice = sortedPrices
    .filter((price) => quantity >= price.quantity_min)
    .at(-1);

  return fallbackPrice ?? sortedPrices[0] ?? null;
}

export function calculateCartItemPricing({
  quantity,
  prices,
  selectedPrintingTechnique,
}: CartItemPricingInput): CartItemPricingResult {
  const priceTier = findPriceTier(quantity, prices);

  const currency = priceTier?.currency ?? "EUR";
  const unitPrice = priceTier?.final_price ?? 0;

  const personalizationUnitPrice =
    selectedPrintingTechnique?.price_per_unit ?? 0;

  const setupCost = selectedPrintingTechnique?.setup_cost ?? 0;

  const subtotal = roundMoney(unitPrice * quantity);
  const personalizationTotal = roundMoney(personalizationUnitPrice * quantity);
  const total = roundMoney(subtotal + personalizationTotal + setupCost);

  return {
    currency,
    unitPrice,
    personalizationUnitPrice,
    setupCost,
    subtotal,
    personalizationTotal,
    total,
  };
}