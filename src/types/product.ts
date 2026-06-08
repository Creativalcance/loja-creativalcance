export type ProductStatus = "active" | "inactive" | "draft" | "archived";

export type ProductImageType =
  | "main"
  | "gallery"
  | "variant"
  | "technical"
  | "personalization";

export type Product = {
  id: string;
  supplierId: string | null;
  externalId: string | null;
  sku: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  brand: string | null;
  material: string | null;
  dimensions: string | null;
  weight: number | null;
  countryOfOrigin: string | null;
  status: ProductStatus;
  isFeatured: boolean;
  isCustomizable: boolean;
  minOrderQuantity: number;
  leadTimeDays: number | null;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductVariant = {
  id: string;
  productId: string;
  supplierId: string | null;
  externalVariantId: string | null;
  sku: string;
  colorName: string | null;
  colorHex: string | null;
  size: string | null;
  capacity: string | null;
  material: string | null;
  barcode: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductImage = {
  id: string;
  productId: string;
  variantId: string | null;
  supplierId: string | null;
  externalUrl: string | null;
  storageUrl: string | null;
  altText: string | null;
  sortOrder: number;
  imageType: ProductImageType;
  isPrimary: boolean;
  createdAt: string;
};