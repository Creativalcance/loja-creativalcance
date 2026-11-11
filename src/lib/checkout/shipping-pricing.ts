export const FREE_SHIPPING_THRESHOLD = 50;
export const STANDARD_SHIPPING_PRICE = 4.9;
export const HAMPER_SHIPPING_PROFILE = "christmas_hamper_2026";

export type ProductShippingPolicy = {
  shipping_profile: string;
  delivery_unit_price: number | null;
};
export type ShippingLine = {
  quantity: number;
  total: number;
  shipping_product: ProductShippingPolicy | null;
};
export type ShippingQuote = {
  total: number;
  hamperQuantity: number;
  hamperShipping: number;
  standardShipping: number;
  standardSubtotal: number;
  hasStandardItems: boolean;
};

// Prices exclude VAT. The checkout applies destination VAT once to the total.
// Only products explicitly assigned to this profile use the hamper tariff.
export function calculateCartShipping(eligibleTotal: number, items: ShippingLine[]): ShippingQuote {
  let hamperQuantity = 0;
  let hamperSubtotal = 0;
  let unitDeliveryTotal = 0;
  let hasStandardItems = false;
  for (const item of items) {
    if (item.shipping_product?.shipping_profile !== HAMPER_SHIPPING_PROFILE) {
      hasStandardItems = true;
      continue;
    }
    const rate = Number(item.shipping_product.delivery_unit_price);
    if (item.shipping_product.delivery_unit_price === null || !Number.isFinite(rate) || rate <= 0 ||
        !Number.isInteger(item.quantity) || item.quantity < 1)
      throw new Error("Confirma os portes deste cabaz com a 360 antes de encomendar.");
    hamperQuantity += item.quantity;
    hamperSubtotal += Number(item.total);
    unitDeliveryTotal += Math.round(rate * 100) * item.quantity;
  }
  const hamperShipping = hamperQuantity >= 25 ? 0 : hamperQuantity >= 10 ? 40 : unitDeliveryTotal / 100;
  const standardSubtotal = roundMoney(Math.max(0, eligibleTotal - hamperSubtotal));
  const standardShipping = hasStandardItems ? calculateShippingTotal(standardSubtotal) : 0;
  return { total: roundMoney(hamperShipping + standardShipping), hamperQuantity, hamperShipping,
    standardShipping, standardSubtotal, hasStandardItems };
}

export function hasConfirmedHamperAccess(metadata: Record<string, unknown> | null, addressId: string | null): boolean {
  const delivery = metadata?.hamperDelivery as Record<string, unknown> | undefined;
  return !!addressId && delivery?.groundFloorAccess === true && delivery?.addressId === addressId;
}

export function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

export function calculateEligibleOrderTotal(params: {
  productsTotal: number;
  personalizationTotal: number;
  setupAndExtrasTotal: number;
  discountTotal: number;
}): number {
  return roundMoney(
    Math.max(
      0,
      params.productsTotal +
        params.personalizationTotal +
        params.setupAndExtrasTotal -
        params.discountTotal,
    ),
  );
}

export function calculateShippingTotal(eligibleOrderTotal: number): number {
  return eligibleOrderTotal >= FREE_SHIPPING_THRESHOLD
    ? 0
    : STANDARD_SHIPPING_PRICE;
}

export function calculateAmountUntilFreeShipping(
  eligibleOrderTotal: number,
): number {
  return roundMoney(Math.max(0, FREE_SHIPPING_THRESHOLD - eligibleOrderTotal));
}
