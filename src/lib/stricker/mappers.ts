import type {
  StrickerRawImage,
  StrickerRawPrice,
  StrickerRawProduct,
  StrickerRawStock,
  StrickerRawVariant,
  StrickerRawPrintingTechnique,
} from "./types";
import {
  createSlug,
  toNullableNumber,
  toNullableString,
  toRequiredNumber,
  toRequiredString,
} from "../suppliers/normalizers";

export type NormalizedProduct = {
  externalId: string;
  sku: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  brand: string | null;
  material: string | null;
  dimensions: string | null;
  weight: number | null;
  minOrderQuantity: number;
  isCustomizable: boolean;
  supplierPayload: Record<string, unknown>;
};

export type NormalizedProductVariant = {
  externalVariantId: string;
  sku: string;
  colorName: string | null;
  colorHex: string | null;
  size: string | null;
  capacity: string | null;
  material: string | null;
  barcode: string | null;
  supplierPayload: Record<string, unknown>;
};

export type NormalizedProductImage = {
  externalUrl: string | null;
  storageUrl: string | null;
  altText: string | null;
  sortOrder: number;
  imageType: "main" | "gallery" | "variant" | "technical" | "personalization";
  isPrimary: boolean;
};

export type NormalizedProductPrice = {
  currency: string;
  quantityMin: number;
  quantityMax: number | null;
  supplierPrice: number;
  basePrice: number;
  marginPercentage: number;
  finalPrice: number;
};

export type NormalizedProductStock = {
  warehouseCode: string | null;
  availableQuantity: number;
  reservedQuantity: number;
  incomingQuantity: number;
  expectedRestockDate: string | null;
};

export type NormalizedPrintingTechnique = {
  externalId: string;
  name: string;
  slug: string;
  description: string | null;
  maxColors: number | null;
  supportsFullColor: boolean;
  setupCost: number | null;
  pricePerUnit: number | null;
};

export function mapStrickerProductToNormalizedProduct(
  rawProduct: StrickerRawProduct,
): NormalizedProduct {
  const externalId = toRequiredString(
    rawProduct.id ?? rawProduct.product_id ?? rawProduct.code ?? rawProduct.sku,
    crypto.randomUUID(),
  );

  const sku = toRequiredString(
    rawProduct.sku ?? rawProduct.code ?? rawProduct.reference ?? externalId,
    externalId,
  );

  const name = toRequiredString(
    rawProduct.name ?? rawProduct.title,
    `Produto ${sku}`,
  );

  return {
    externalId,
    sku,
    name,
    slug: createSlug(`${name}-${sku}`),
    shortDescription: toNullableString(rawProduct.short_description),
    description: toNullableString(rawProduct.description),
    brand: toNullableString(rawProduct.brand),
    material: toNullableString(rawProduct.material),
    dimensions: toNullableString(rawProduct.dimensions),
    weight: toNullableNumber(rawProduct.weight),
    minOrderQuantity: 1,
    isCustomizable: true,
    supplierPayload: rawProduct,
  };
}

export function mapStrickerVariantToNormalizedVariant(
  rawVariant: StrickerRawVariant,
  fallbackProductSku: string,
): NormalizedProductVariant {
  const externalVariantId = toRequiredString(
    rawVariant.id ??
      rawVariant.variant_id ??
      rawVariant.sku ??
      rawVariant.code ??
      rawVariant.reference,
    crypto.randomUUID(),
  );

  const sku = toRequiredString(
    rawVariant.sku ?? rawVariant.code ?? rawVariant.reference,
    `${fallbackProductSku}-${externalVariantId}`,
  );

  return {
    externalVariantId,
    sku,
    colorName: toNullableString(rawVariant.color_name ?? rawVariant.color),
    colorHex: toNullableString(rawVariant.color_hex),
    size: toNullableString(rawVariant.size),
    capacity: toNullableString(rawVariant.capacity),
    material: toNullableString(rawVariant.material),
    barcode: toNullableString(rawVariant.barcode),
    supplierPayload: rawVariant,
  };
}

export function mapStrickerImageToNormalizedImage(
  rawImage: StrickerRawImage,
  index: number,
): NormalizedProductImage {
  const externalUrl = toNullableString(
    rawImage.url ?? rawImage.image_url ?? rawImage.src,
  );

  const imageType =
    rawImage.type === "main" ||
    rawImage.type === "gallery" ||
    rawImage.type === "variant" ||
    rawImage.type === "technical" ||
    rawImage.type === "personalization"
      ? rawImage.type
      : index === 0
        ? "main"
        : "gallery";

  return {
    externalUrl,
    storageUrl: null,
    altText: toNullableString(rawImage.alt),
    sortOrder: index,
    imageType,
    isPrimary: Boolean(rawImage.is_primary ?? index === 0),
  };
}

export function mapStrickerPriceToNormalizedPrice(
  rawPrice: StrickerRawPrice,
): NormalizedProductPrice {
  const supplierPrice = toRequiredNumber(
    rawPrice.supplier_price ?? rawPrice.price,
    0,
  );

  const marginPercentage = 35;
  const finalPrice = Number(
    (supplierPrice * (1 + marginPercentage / 100)).toFixed(4),
  );

  return {
    currency: toRequiredString(rawPrice.currency, "EUR"),
    quantityMin: toRequiredNumber(rawPrice.quantity_min ?? rawPrice.min_qty, 1),
    quantityMax: toNullableNumber(rawPrice.quantity_max ?? rawPrice.max_qty),
    supplierPrice,
    basePrice: supplierPrice,
    marginPercentage,
    finalPrice,
  };
}

export function mapStrickerStockToNormalizedStock(
  rawStock: StrickerRawStock,
): NormalizedProductStock {
  return {
    warehouseCode: toNullableString(
      rawStock.warehouse_code ?? rawStock.warehouse,
    ),
    availableQuantity: toRequiredNumber(
      rawStock.available_quantity ?? rawStock.quantity ?? rawStock.stock,
      0,
    ),
    reservedQuantity: 0,
    incomingQuantity: toRequiredNumber(rawStock.incoming_quantity, 0),
    expectedRestockDate: toNullableString(rawStock.expected_restock_date),
  };
}

export function mapStrickerPrintingTechniqueToNormalizedTechnique(
  rawTechnique: StrickerRawPrintingTechnique,
): NormalizedPrintingTechnique {
  const externalId = toRequiredString(
    rawTechnique.id ?? rawTechnique.technique_id ?? rawTechnique.name,
    crypto.randomUUID(),
  );

  const name = toRequiredString(rawTechnique.name, `Técnica ${externalId}`);

  return {
    externalId,
    name,
    slug: createSlug(`${name}-${externalId}`),
    description: toNullableString(rawTechnique.description),
    maxColors: toNullableNumber(rawTechnique.max_colors),
    supportsFullColor: Boolean(rawTechnique.supports_full_color),
    setupCost: toNullableNumber(rawTechnique.setup_cost),
    pricePerUnit: toNullableNumber(rawTechnique.price_per_unit),
  };
}