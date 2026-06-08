export type SupplierIntegrationType =
  | "stricker_rest"
  | "stricker_soap"
  | "manual"
  | "csv"
  | "xml"
  | "future_api";

export type SupplierStatus = "active" | "inactive" | "paused" | "error";

export type Supplier = {
  id: string;
  name: string;
  slug: string;
  type: SupplierIntegrationType;
  status: SupplierStatus;
  priority: number;
  apiBaseUrl: string | null;
  createdAt: string;
  updatedAt: string;
};