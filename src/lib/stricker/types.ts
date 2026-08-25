export type JsonRecord = Record<string, unknown>;

export type StrickerAuthResponse = {
  Token?: string;
  token?: string;
  ErrorCode?: number | string | null;
  errorCode?: number | string | null;
  ErrorMessage?: string | null;
  errorMessage?: string | null;
};

export type StrickerValidateSessionResponse = {
  Status?: number | string | null;
  status?: number | string | null;
  ErrorCode?: number | string | null;
  errorCode?: number | string | null;
  ErrorMessage?: string | null;
  errorMessage?: string | null;
};

export type StrickerDatasetName =
  | "productsTree"
  | "products"
  | "optionals"
  | "optionalsPrice"
  | "optionalscomplete"
  | "optionalscomplete_textil_products"
  | "optionalscomplete_without_textil"
  | "customizationOptions"
  | "customizationoptions_textil_products"
  | "customizationoptions_without_textil"
  | "customizationTables"
  | "colors"
  | "stocks"
  | "stocksPt"
  | "stocksCz"
  | "producttypes"
  | "canceledproducts"
  | "restrictedproducts";

export type StrickerDatasetDownloadParams = {
  datasetName: StrickerDatasetName;
  lang?: string;
  extension?: "json" | "xml" | "csv";
};

export type NormalizedStrickerColor = {
  external_id: string;
  code: string;
  name: string;
  hex_code: string | null;
  raw_payload: JsonRecord;
};

export type StrickerProductRaw = JsonRecord;
export type StrickerRawProduct = JsonRecord;
export type StrickerRawPrice = JsonRecord;
export type StrickerRawStock = JsonRecord;
export type StrickerRawImage = JsonRecord;
export type StrickerRawVariant = JsonRecord;
export type StrickerRawCustomization = JsonRecord;
export type StrickerRawPrintingTechnique = JsonRecord;
export type StrickerRawCustomizationOption = JsonRecord;
export type StrickerRawCustomizationTable = JsonRecord;
export type StrickerRawColor = JsonRecord;
export type StrickerRawCategory = JsonRecord;

export type StrickerSyncProductsParams = {
  page?: number;
  limit?: number;
  lang?: string;
};

export type StrickerProductsResponse = {
  products: StrickerProductRaw[];
  total?: number | null;
  page?: number | null;
  limit?: number | null;
};

export type NormalizedProduct = {
  external_id: string;
  sku: string;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  brand: string | null;
  material: string | null;
  dimensions: string | null;
  weight: number | null;
  country_of_origin: string | null;
  status: "active" | "inactive" | "draft" | "archived";
  is_active: boolean;
  is_featured: boolean;
  is_customizable: boolean;
  min_order_quantity: number;
  lead_time_days: number | null;
  seo_title: string | null;
  seo_description: string | null;
  supplier_payload: JsonRecord;
};

export type NormalizedVariant = {
  external_variant_id: string;
  sku: string;
  color_name: string | null;
  color_hex: string | null;
  size: string | null;
  capacity: string | null;
  material: string | null;
  barcode: string | null;
  is_active: boolean;
  supplier_payload: JsonRecord;
};

export type NormalizedPrice = {
  external_variant_id: string | null;
  currency: string;
  quantity_min: number;
  quantity_max: number | null;
  supplier_price: number;
  base_price: number;
  margin_percentage: number;
  final_price: number;
};

export type NormalizedStock = {
  external_variant_id: string | null;
  warehouse_code: string;
  available_quantity: number;
  reserved_quantity: number;
  incoming_quantity: number;
  expected_restock_date: string | null;
};

export type NormalizedImage = {
  external_variant_id: string | null;
  external_url: string;
  storage_url: string | null;
  alt_text: string | null;
  sort_order: number;
  image_type: string;
  is_primary: boolean;
};

export type NormalizedStrickerProductBundle = {
  product: NormalizedProduct;
  variants: NormalizedVariant[];
  prices: NormalizedPrice[];
  stocks: NormalizedStock[];
  images: NormalizedImage[];
};
