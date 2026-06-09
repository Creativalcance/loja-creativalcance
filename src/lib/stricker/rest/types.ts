export type StrickerLanguage =
  | "BG"
  | "CZ"
  | "DE"
  | "DK"
  | "EN"
  | "ES"
  | "FI"
  | "FR"
  | "GR"
  | "HR"
  | "HU"
  | "IT"
  | "NL"
  | "NO"
  | "PL"
  | "PT"
  | "RO"
  | "RS"
  | "RU"
  | "SE"
  | "SK"
  | "UA";

export type StrickerCountry = "PT" | "CZ";

export type StrickerDatasetName =
  | "productsTree"
  | "products"
  | "productTypes"
  | "optionals"
  | "optionalsPrice"
  | "optionalsComplete"
  | "customizationOptions"
  | "customizationTables"
  | "colors"
  | "stocks"
  | "stocksByCountry"
  | "canceledProducts"
  | "restrictedProducts"
  | "printingSlas";

export type StrickerApiError = {
  ErrorCode?: number | string | null;
  ErrorMessage?: string | null;
};

export type StrickerAuthenticateResponse = StrickerApiError & {
  Token?: string | null;
};

export type StrickerValidateSessionResponse = StrickerApiError & {
  Status?: number | string | boolean | null;
};

export type StrickerCloseSessionResponse = StrickerApiError & Record<string, unknown>;

export type StrickerDatasetResponse = StrickerApiError & {
  Count?: number | null;
  Currency?: string | null;
  Language?: string | null;
  ProductsTree?: unknown[];
  Products?: unknown[];
  Types?: unknown[];
  Optionals?: unknown[];
  OptionalsPrice?: unknown[];
  OptionalsComplete?: unknown[];
  CustomizationOptions?: unknown[];
  CustomizationTables?: unknown[];
  Colors?: unknown[];
  Stocks?: unknown[];
  CanceledProducts?: unknown[];
  RestrictedProducts?: unknown[];
  PrintingSlas?: unknown[];
};

export type StrickerStoredSession = {
  id: string;
  supplier_id: string;
  token: string;
  status: "active" | "invalid" | "closed" | "expired";
  expires_at: string | null;
  last_validated_at: string | null;
  raw_payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type StrickerFetchOptions = {
  timeoutMs?: number;
};

export type StrickerDatasetRequest = {
  dataset: StrickerDatasetName;
  token: string;
  lang?: StrickerLanguage;
  country?: StrickerCountry;
};