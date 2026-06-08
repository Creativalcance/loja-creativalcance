export type OrderStatus =
  | "pending"
  | "confirmed"
  | "awaiting_payment"
  | "paid"
  | "sent_to_supplier"
  | "in_production"
  | "shipped"
  | "delivered"
  | "cancelled";

export type PaymentStatus =
  | "pending"
  | "authorized"
  | "paid"
  | "failed"
  | "refunded"
  | "cancelled";

export type ProductionStatus =
  | "not_started"
  | "artwork_pending"
  | "artwork_approved"
  | "in_production"
  | "quality_control"
  | "ready_to_ship"
  | "completed";

export type Order = {
  id: string;
  companyId: string;
  userId: string | null;
  quoteRequestId: string | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  productionStatus: ProductionStatus;
  totalAmount: number;
  currency: string;
  supplierOrderReference: string | null;
  stripePaymentIntentId: string | null;
  createdAt: string;
  updatedAt: string;
};