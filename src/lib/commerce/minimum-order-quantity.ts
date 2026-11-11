export const GLOBAL_MINIMUM_ORDER_QUANTITY = 10;

export function getEffectiveMinimumOrderQuantity(
  supplierMinimum: number | null | undefined,
  shippingProfile?: string | null,
): number {
  const normalizedSupplierMinimum =
    typeof supplierMinimum === "number" &&
    Number.isFinite(supplierMinimum) &&
    supplierMinimum > 0
      ? Math.floor(supplierMinimum)
      : 1;

  return Math.max(
    shippingProfile === "christmas_hamper_2026" ? 1 : GLOBAL_MINIMUM_ORDER_QUANTITY,
    normalizedSupplierMinimum,
  );
}
