export const FREE_SHIPPING_THRESHOLD = 50;
export const STANDARD_SHIPPING_PRICE = 8.9;

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
