export type QuoteRequestStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "proposal_sent"
  | "accepted"
  | "rejected"
  | "expired"
  | "converted_to_order";

export type QuoteRequest = {
  id: string;
  companyId: string | null;
  userId: string | null;
  assignedSalesRepId: string | null;
  status: QuoteRequestStatus;
  totalEstimatedValue: number | null;
  customerNotes: string | null;
  internalNotes: string | null;
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
};

export type QuoteRequestItem = {
  id: string;
  quoteRequestId: string;
  productId: string;
  variantId: string | null;
  supplierId: string | null;
  quantity: number;
  unitPriceEstimate: number | null;
  personalizationSummary: Record<string, unknown> | null;
  notes: string | null;
  createdAt: string;
};