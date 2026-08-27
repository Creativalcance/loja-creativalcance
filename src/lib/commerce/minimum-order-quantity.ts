export const GLOBAL_MINIMUM_ORDER_QUANTITY = 10;

export function getEffectiveMinimumOrderQuantity(
  supplierMinimum: number | null | undefined,
): number {
  const normalizedSupplierMinimum =
    typeof supplierMinimum === "number" &&
    Number.isFinite(supplierMinimum) &&
    supplierMinimum > 0
      ? Math.floor(supplierMinimum)
      : 1;

  return Math.max(
    GLOBAL_MINIMUM_ORDER_QUANTITY,
    normalizedSupplierMinimum,
  );
}
