export type PricingScope =
  | "global"
  | "supplier"
  | "category"
  | "product"
  | "variant";

export type PricingPriceType =
  | "product"
  | "personalization"
  | "setup"
  | "shipping";

export type PricingRoundingMode =
  | "none"
  | "ceil_01"
  | "ceil_05"
  | "ceil_10"
  | "commercial_05"
  | "commercial_09"
  | "commercial_49"
  | "commercial_90";

export type PricingRule = {
  id?: string | null;
  supplier_id?: string | null;
  scope: PricingScope;
  price_type?: PricingPriceType | null;
  category_name?: string | null;
  product_id?: string | null;
  variant_id?: string | null;
  customer_group?: string | null;
  min_quantity?: number | null;
  max_quantity?: number | null;
  margin_rate?: number | null;
  markup_rate?: number | null;
  fixed_fee?: number | null;
  minimum_profit?: number | null;
  rounding_mode?: PricingRoundingMode | null;
  priority?: number | null;
  is_active?: boolean | null;
};

export type PricingRuleContext = {
  supplierId?: string | null;
  categoryName?: string | null;
  productId?: string | null;
  variantId?: string | null;
  customerGroup?: string | null;
  priceType?: PricingPriceType | null;
  quantity: number;
};

export type ProductSellingPriceInput = {
  supplierPrice: number;
  marginRate?: number | null;
  markupRate?: number | null;
  fixedFee?: number | null;
  minimumProfit?: number | null;
  roundingMode?: PricingRoundingMode | null;
};

export type ProductSellingPriceResult = {
  supplierPrice: number;
  finalPrice: number;
  marginRate: number | null;
  markupRate: number | null;
  fixedFee: number;
  minimumProfit: number;
  roundingMode: PricingRoundingMode;
  grossProfit: number;
  grossMarginRate: number;
};