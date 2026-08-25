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
  description: string | null;
  short_description: string | null;
  brand: string | null;
  material: string | null;
  dimensions: string | null;
  weight: number | null;
  country_of_origin: string | null;
  type_name: string | null;
  subtype_name: string | null;
  min_order_quantity: number;
  lead_time_days: number | null;
  is_customizable: boolean;
  is_active: boolean;
  status: string;
  supplier_payload: JsonRecord;
};
