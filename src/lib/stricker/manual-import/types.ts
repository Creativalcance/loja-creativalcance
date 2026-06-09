export type StrickerManualDatasetName =
  | "products"
  | "productsTree"
  | "optionals"
  | "optionalsPrice"
  | "optionalsComplete"
  | "customizationOptions"
  | "customizationTables"
  | "stocks"
  | "colors"
  | "productTypes"
  | "catalogPrices"
  | "canceledProducts"
  | "restrictedProducts";

export type ManualImportPreview = {
  recordsDetected: number;
  previewPayload: Record<string, unknown>;
  errors: string[];
};

export type ParsedCsvRow = Record<string, string>;

export type ParsedXmlPreviewNode = {
  name: string;
  attributes: Record<string, string>;
  text: string | null;
  childrenCount: number;
};