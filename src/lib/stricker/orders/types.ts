export type JsonRecord = Record<string, unknown>;

export type StrickerOrderLineType = "SIMPLE" | "PRINT";

export type StrickerSubmissionStatus =
  | "not_submitted"
  | "ready_for_review"
  | "approved_for_submission"
  | "submitting"
  | "submitted"
  | "partially_submitted"
  | "failed"
  | "cancelled";

export type StrickerOrderStatus =
  | "WAITING_ART_WORK"
  | "PROCESSING"
  | "WAITING_STOCK"
  | "PROCESSED"
  | "PENDING_MOCKUP_APPROVAL"
  | "INVOICED"
  | "SENT"
  | "CANCELED"
  | string;

export type StrickerDestinationPayload = {
  AddressLine1: string;
  AddressLine2: string;
  Postalcode: string;
  ExtentionPostalcode: string;
  City: string;
  Country: string;
  PhoneNumber: string;
};

export type StrickerServiceArtworkFile = {
  FileName: string;
  FileExtension: string;
  FileBytes: number[];
};

export type StrickerServiceOrderLinePayload = {
  OrderLineStamp: string;
  ServCode: string;

  Color1: string;
  Color2: string;
  Color3: string;
  Color4: string;
  Color5: string;

  LogoArea: number;
  LogoWidth: number;
  LogoHeight: number;

  Group: number;
  Appproved: boolean;

  Files: StrickerServiceArtworkFile[];
};

export type StrickerProductOrderLinePayload = {
  Sku: string;
  Quantity: number;
  LineType: StrickerOrderLineType;
  WaitArtWork: boolean;
  Sample: boolean;
};

export type StrickerPlaceOrderPayload = {
  destination: StrickerDestinationPayload;
  courier: string;
  internalReference: string;
  relatedOrderStamp: string | null;
  shippingDate: string | null;
  noShipping: boolean;
  observation: string;
  order: StrickerProductOrderLinePayload[];
};

export type StrickerServiceOrderPayload = {
  orderStamp: string;
  order: StrickerServiceOrderLinePayload[];
};

export type StrickerOrderResponseLine = {
  OrderLineStamp?: string | null;
  LineStamp?: string | null;
  Stamp?: string | null;
  Sku?: string | null;
  ProductReference?: string | null;
  Quantity?: number | string | null;
  Status?: string | null;
  [key: string]: unknown;
};

export type StrickerOrderDetails = {
  OrderStamp?: string | null;
  orderStamp?: string | null;

  RelatedOrderStamp?: string | null;
  relatedOrderStamp?: string | null;

  OrderLines?: StrickerOrderResponseLine[] | null;
  orderLines?: StrickerOrderResponseLine[] | null;

  Warehouse?: string | null;
  warehouse?: string | null;

  Carrier?: string | null;
  Courier?: string | null;
  courier?: string | null;

  CreateDate?: string | null;
  Date?: string | null;
  date?: string | null;

  ShippingDate?: string | null;
  shippingDate?: string | null;

  Status?: string | null;
  status?: string | null;

  TrackingID?: string | null;
  Tracking?: string | null;
  tracking?: string | null;

  TrackingLink?: string | null;
  trackingLink?: string | null;

  OrderTotal?: number | string | null;
  orderTotal?: number | string | null;

  ClientReference?: string | null;
  InternalReference?: string | null;
  internalReference?: string | null;

  [key: string]: unknown;
};

export type StrickerOrderApiResponse = {
  OrderDetails?: StrickerOrderDetails | StrickerOrderDetails[] | null;
  orderDetails?: StrickerOrderDetails | StrickerOrderDetails[] | null;

  Currency?: string | null;
  currency?: string | null;

  Language?: string | null;
  language?: string | null;

  ErrorCode?: number | string | null;
  errorCode?: number | string | null;

  ErrorMessage?: string | null;
  errorMessage?: string | null;

  [key: string]: unknown;
};

export type StrickerServiceOrderApiResponse = StrickerOrderApiResponse;

export type StrickerOrderDatabaseAddress = {
  id: string;

  company_name: string | null;
  tax_id: string | null;

  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;

  address_line_1: string;
  address_line_2: string | null;

  postal_code: string;
  city: string;
  district: string | null;
  country_code: string;
};

export type StrickerOrderDatabaseItem = {
  id: string;
  order_id: string;

  product_id: string | null;
  variant_id: string | null;
  supplier_id: string | null;

  product_sku: string;
  product_name: string;

  quantity: number;

  personalization_required: boolean;
  personalization_notes: string | null;
  personalization_data: JsonRecord;

  customization_draft_id: string | null;
  customization_location_id: string | null;

  customization_component_name: string | null;
  customization_location_name: string | null;
  customization_technique_name: string | null;

  supplier_product_reference: string | null;
  supplier_sku: string | null;

  service_code: string | null;
  table_code: string | null;
  table_code_option: string | null;
  handling_cost_code: string | null;

  printing_area_label: string | null;
  printing_width_mm: number | null;
  printing_height_mm: number | null;
  printing_area_mm2: number | null;

  logo_file_name: string | null;
  logo_storage_path: string | null;
  logo_url: string | null;

  mockup_storage_path: string | null;
  mockup_url: string | null;
  technical_preview_url: string | null;

  logo_width_mm: number | null;
  logo_height_mm: number | null;
  logo_area: number | null;

  artwork_status: string;
  artwork_approved: boolean;

  supplier_order_stamp: string | null;
  supplier_order_line_stamp: string | null;

  supplier_submission_status: StrickerSubmissionStatus;
  supplier_submission_error: string | null;
  supplier_submitted_at: string | null;
};

export type StrickerOrderDatabaseRecord = {
  id: string;
  user_id: string | null;

  order_number: string;

  customer_email: string;
  customer_name: string;
  customer_phone: string | null;

  company_name: string | null;
  company_tax_id: string | null;

  status: string;
  payment_status: string;
  fulfillment_status: string;

  currency: string;
  grand_total: number;

  shipping_address_id: string | null;

  shipping_method: string | null;
  shipping_carrier: string | null;
  requested_shipping_date: string | null;
  no_shipping: boolean;

  internal_reference: string | null;
  customer_notes: string | null;

  paid_at: string | null;

  supplier_submission_status: StrickerSubmissionStatus;
  supplier_order_stamp: string | null;
  supplier_order_number: string | null;

  supplier_last_status: string | null;
  supplier_last_response: JsonRecord;
  supplier_submission_payload: JsonRecord;
  supplier_submission_attempts: number;

  supplier_submission_error: string | null;
  supplier_submitted_at: string | null;

  supplier_test_mode: boolean;

  metadata: JsonRecord;

  shipping_address: StrickerOrderDatabaseAddress | null;
  order_items: StrickerOrderDatabaseItem[];
};

export type StrickerMappedOrder = {
  orderId: string;
  orderNumber: string;

  testMode: boolean;

  productPayload: StrickerPlaceOrderPayload;

  itemsBySku: Map<string, StrickerOrderDatabaseItem[]>;

  serviceItems: Array<{
    orderItemId: string;
    servicePayload: StrickerServiceOrderLinePayload;
  }>;
};

export type StrickerOrderValidationIssue = {
  field: string;
  message: string;
  orderItemId?: string;
};

export type StrickerOrderValidationResult = {
  valid: boolean;
  issues: StrickerOrderValidationIssue[];
};

export type SubmitOrderToStrickerResult = {
  success: boolean;

  orderId: string;
  orderNumber: string;

  alreadySubmitted: boolean;
  testMode: boolean;

  supplierOrderStamp: string | null;
  supplierStatus: string | null;

  productSubmitted: boolean;
  personalizationSubmitted: boolean;

  message: string;
  errors: string[];
};
