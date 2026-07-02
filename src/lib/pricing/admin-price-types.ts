import type {
  PricingMode,
  PricingRoundingMode,
} from "@/lib/pricing/calculate-selling-price";

export type AdminPriceEntityType =
  | "product_price"
  | "printing_price";

export type AdminPriceOverrideInput = {
  entityType: AdminPriceEntityType;
  entityId: string;
  pricingMode: PricingMode;
  marginPercentage: number | null;
  markupPercentage: number | null;
  fixedMarkup: number | null;
  manualPrice: number | null;
  minimumProfit: number | null;
  roundingMode: PricingRoundingMode;
  reason: string | null;
};

export type AdminProductPriceRow = {
  id: string;
  product_id: string;
  variant_id: string | null;
  supplier_id: string;
  currency: string;
  quantity_min: number;
  quantity_max: number | null;
  supplier_price: number;
  base_price: number;
  margin_percentage: number;
  markup_percentage: number | null;
  fixed_markup: number | null;
  manual_price: number | null;
  final_price: number;
  pricing_mode: PricingMode;
  is_manual_override: boolean;
  override_reason: string | null;
  override_updated_at: string | null;
  product: {
    id: string;
    name: string;
    slug: string;
    sku: string;
    type_name: string | null;
  } | null;
  variant: {
    id: string;
    sku: string;
    color_name: string | null;
    size: string | null;
  } | null;
};

export type AdminPrintingPriceRow = {
  id: string;
  supplier_id: string;
  external_id: string;
  table_code: string;
  table_code_option: string | null;
  technique_code: string | null;
  technique_name: string | null;
  currency: string;
  quantity_min: number;
  quantity_max: number | null;
  supplier_price: number;
  handling_cost: number;
  base_price: number;
  margin_percentage: number;
  markup_percentage: number | null;
  fixed_markup: number | null;
  manual_price: number | null;
  final_price: number;
  pricing_mode: PricingMode;
  is_manual_override: boolean;
  override_reason: string | null;
  override_updated_at: string | null;
};