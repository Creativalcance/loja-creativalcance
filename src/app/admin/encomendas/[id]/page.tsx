import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  Box,
  CheckCircle2,
  CircleAlert,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  FileImage,
  FileText,
  Hash,
  Mail,
  MapPin,
  Package,
  Palette,
  Phone,
  ReceiptText,
  RefreshCw,
  ShoppingBag,
  Truck,
  UserRound,
  XCircle,
} from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import AdminOrderCommercialForm from "@/components/admin/orders/AdminOrderCommercialForm";
import AdminDeleteOrderForm from "@/components/admin/orders/AdminDeleteOrderForm";

export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

type AdminOrderDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type OrderRecord = {
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
  supplier_submission_status: string;

  currency: string;
  subtotal: number;
  personalization_total: number;
  setup_total: number;
  shipping_total: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;

  billing_address_id: string | null;
  shipping_address_id: string | null;

  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;

  invoice_number: string | null;
  invoice_url: string | null;
  invoice_status: string | null;
  supplier_invoice_number: string | null;
  supplier_invoice_url: string | null;
  supplier_invoice_status: string | null;
  supplier_cost_total: number;

  customer_notes: string | null;
  internal_notes: string | null;
  internal_reference: string | null;

  source_cart_id: string | null;

  supplier_order_stamp: string | null;
  supplier_submission_error: string | null;

  shipping_method: string | null;
  shipping_carrier: string | null;
  requested_shipping_date: string | null;
  supplier_shipping_date: string | null;
  no_shipping: boolean;

  tracking_number: string | null;
  tracking_url: string | null;

  metadata: JsonRecord;

  paid_at: string | null;
  cancelled_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  fulfilled_at: string | null;
  supplier_submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

type OrderItemRecord = {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  supplier_id: string | null;

  product_sku: string;
  product_name: string;
  quantity: number;

  unit_price: number;
  personalization_unit_price: number;
  setup_cost: number;
  extras_total: number;

  subtotal: number;
  personalization_total: number;
  total: number;

  personalization_required: boolean;
  personalization_technique_id: string | null;
  personalization_notes: string | null;
  personalization_data: JsonRecord;
  supplier_payload: JsonRecord;

  source_cart_item_id: string | null;
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

  logo_position_x: number | null;
  logo_position_y: number | null;
  logo_scale: number | null;
  logo_rotation: number | null;
  logo_width_mm: number | null;
  logo_height_mm: number | null;
  logo_area: number | null;

  artwork_status: string;
  artwork_approved: boolean;

  supplier_order_stamp: string | null;
  supplier_order_line_stamp: string | null;
  supplier_submission_status: string;
  supplier_submission_error: string | null;
  supplier_submitted_at: string | null;

  created_at: string;
  updated_at: string;
};

type PaymentRecord = {
  id: string;
  order_id: string;
  provider: string;
  provider_payment_id: string | null;
  provider_checkout_session_id: string | null;
  provider_payment_intent_id: string | null;
  provider_charge_id: string | null;

  status: string;
  amount: number;
  amount_received: number;
  amount_refunded: number;
  currency: string;

  failure_code: string | null;
  failure_message: string | null;

  paid_at: string | null;
  failed_at: string | null;
  refunded_at: string | null;
  cancelled_at: string | null;

  metadata: JsonRecord;
  created_at: string;
  updated_at: string;
};

type CheckoutSessionRecord = {
  id: string;
  cart_id: string | null;
  order_id: string | null;
  user_id: string | null;
  provider: string;
  provider_session_id: string;
  provider_payment_intent_id: string | null;
  status: string;
  amount_total: number;
  currency: string;
  checkout_url: string | null;
  expires_at: string | null;
  completed_at: string | null;
  expired_at: string | null;
  cancelled_at: string | null;
  metadata: JsonRecord;
  created_at: string;
  updated_at: string;
};

type OrderStatusHistoryRecord = {
  id: string;
  order_id: string;
  previous_status: string | null;
  new_status: string;
  changed_by: string | null;
  notes: string | null;
  metadata: JsonRecord;
  created_at: string;
};

type StripeWebhookEventRecord = {
  id: string;
  stripe_event_id: string;
  event_type: string;
  livemode: boolean;
  api_version: string | null;
  status: string;
  processing_attempts: number;
  order_id: string | null;
  payment_id: string | null;
  provider_checkout_session_id: string | null;
  provider_payment_intent_id: string | null;
  error_message: string | null;
  received_at: string;
  processing_started_at: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
};

type AddressRecord = {
  id: string;
  user_id: string | null;
  address_type: string | null;
  company_name: string | null;
  tax_id: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address_line_1: string;
  address_line_2: string | null;
  postal_code: string;
  city: string;
  district: string | null;
  country_code: string;
};

type TimelineEvent = {
  id: string;
  date: string;
  title: string;
  description: string | null;
  category:
    | "order"
    | "payment"
    | "stripe"
    | "supplier"
    | "shipping"
    | "invoice"
    | "system";
  status: "success" | "warning" | "error" | "neutral";
};

type OrderItemView = OrderItemRecord & {
  logoPreviewUrl: string | null;
  mockupPreviewUrl: string | null;
};

const ARTWORK_BUCKET = "customization-artwork";

function formatPrice(
  value: number | null | undefined,
  currency = "EUR",
): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency,
  }).format(Number(value ?? 0));
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "long",
  }).format(new Date(value));
}

function formatNumber(value: number | null | undefined): string {
  return Number(value ?? 0).toLocaleString("pt-PT");
}

function getStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case "pending_payment":
      return "A aguardar pagamento";

    case "pending":
      return "Pendente";

    case "authorized":
      return "Autorizado";

    case "paid":
      return "Pago";

    case "processing":
      return "Em processamento";

    case "sent_to_supplier":
      return "Enviada à Stricker";

    case "supplier_confirmed":
      return "Confirmada pela Stricker";

    case "in_production":
      return "Em produção";

    case "shipped":
      return "Expedida";

    case "delivered":
      return "Entregue";

    case "cancelled":
      return "Cancelada";

    case "refunded":
      return "Reembolsada";

    case "partially_refunded":
      return "Parcialmente reembolsada";

    case "failed":
      return "Falhou";

    case "unfulfilled":
      return "Por preparar";

    case "partially_fulfilled":
      return "Parcialmente preparada";

    case "fulfilled":
      return "Preparada";

    case "not_submitted":
      return "Não submetida";

    case "ready_for_review":
      return "Pronta para validação";

    case "approved_for_submission":
      return "Aprovada para submissão";

    case "submitting":
      return "A submeter";

    case "submitted":
      return "Submetida";

    case "partially_submitted":
      return "Parcialmente submetida";

    case "open":
      return "Aberta";

    case "created":
      return "Criada";

    case "completed":
      return "Concluída";

    case "expired":
      return "Expirada";

    case "received":
      return "Recebido";

    case "processed":
      return "Processado";

    case "issued":
      return "Emitida";

    case "sent":
      return "Enviada";

    case "draft":
      return "Rascunho";

    case "uploaded":
      return "Ficheiro carregado";

    case "ready":
      return "Pronta";

    case "approved":
      return "Aprovada";

    default:
      return status
        ? status.replaceAll("_", " ")
        : "Sem estado";
  }
}

function getStatusClasses(
  status: string | null | undefined,
): string {
  const normalized = status ?? "";

  if (
    [
      "paid",
      "completed",
      "processed",
      "submitted",
      "supplier_confirmed",
      "fulfilled",
      "shipped",
      "delivered",
      "approved",
      "issued",
      "sent",
    ].includes(normalized)
  ) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (
    [
      "failed",
      "cancelled",
      "expired",
      "refunded",
    ].includes(normalized)
  ) {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  if (
    [
      "pending",
      "pending_payment",
      "ready_for_review",
      "approved_for_submission",
      "submitting",
      "partially_submitted",
      "partially_fulfilled",
      "in_production",
      "authorized",
      "open",
      "created",
      "uploaded",
      "ready",
    ].includes(normalized)
  ) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-neutral-100 text-neutral-700 ring-neutral-200";
}

function getTimelineIcon(
  category: TimelineEvent["category"],
) {
  switch (category) {
    case "payment":
      return CircleDollarSign;

    case "stripe":
      return Banknote;

    case "supplier":
      return RefreshCw;

    case "shipping":
      return Truck;

    case "invoice":
      return ReceiptText;

    case "order":
      return ShoppingBag;

    case "system":
    default:
      return Clock3;
  }
}

function getTimelineIconClasses(
  status: TimelineEvent["status"],
): string {
  switch (status) {
    case "success":
      return "bg-emerald-100 text-emerald-700";

    case "warning":
      return "bg-amber-100 text-amber-700";

    case "error":
      return "bg-red-100 text-red-700";

    case "neutral":
    default:
      return "bg-neutral-100 text-neutral-700";
  }
}

function getMetadataString(
  metadata: JsonRecord | null | undefined,
  key: string,
): string | null {
  const value = metadata?.[key];

  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function buildAddressLines(
  address: AddressRecord | null,
): string[] {
  if (!address) {
    return [];
  }

  return [
    address.company_name,
    address.contact_name,
    address.address_line_1,
    address.address_line_2,
    `${address.postal_code} ${address.city}`,
    address.district,
    address.country_code,
  ].filter((value): value is string => Boolean(value?.trim()));
}

function getPrintAreaLabel(item: OrderItemRecord): string {
  if (item.printing_area_label) {
    return item.printing_area_label;
  }

  if (
    item.printing_width_mm !== null &&
    item.printing_height_mm !== null
  ) {
    return `${item.printing_width_mm} × ${item.printing_height_mm} mm`;
  }

  return "—";
}

async function createSignedAssetUrl(
  storagePath: string | null,
): Promise<string | null> {
  if (!storagePath) {
    return null;
  }

  const supabaseAdmin = createSupabaseAdminClient();

  const { data, error } = await supabaseAdmin.storage
    .from(ARTWORK_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);

  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl;
}

async function getOrderItemViews(
  items: OrderItemRecord[],
): Promise<OrderItemView[]> {
  return Promise.all(
    items.map(async (item) => {
      const [signedLogoUrl, signedMockupUrl] = await Promise.all([
        createSignedAssetUrl(item.logo_storage_path),
        createSignedAssetUrl(item.mockup_storage_path),
      ]);

      return {
        ...item,
        logoPreviewUrl:
          signedLogoUrl ??
          item.logo_url ??
          null,
        mockupPreviewUrl:
          signedMockupUrl ??
          item.mockup_url ??
          item.technical_preview_url ??
          null,
      };
    }),
  );
}

function buildTimeline(params: {
  order: OrderRecord;
  payments: PaymentRecord[];
  checkoutSessions: CheckoutSessionRecord[];
  statusHistory: OrderStatusHistoryRecord[];
  stripeEvents: StripeWebhookEventRecord[];
}): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  events.push({
    id: `order-created-${params.order.id}`,
    date: params.order.created_at,
    title: "Encomenda criada",
    description: `Encomenda ${params.order.order_number} criada a partir do checkout.`,
    category: "order",
    status: "neutral",
  });

  for (const history of params.statusHistory) {
    events.push({
      id: `history-${history.id}`,
      date: history.created_at,
      title: `Estado alterado para ${getStatusLabel(
        history.new_status,
      )}`,
      description:
        history.notes ??
        (history.previous_status
          ? `Estado anterior: ${getStatusLabel(
              history.previous_status,
            )}.`
          : null),
      category: "order",
      status:
        ["failed", "cancelled", "refunded"].includes(
          history.new_status,
        )
          ? "error"
          : [
                "paid",
                "submitted",
                "shipped",
                "delivered",
              ].includes(history.new_status)
            ? "success"
            : "neutral",
    });
  }

  for (const session of params.checkoutSessions) {
    events.push({
      id: `checkout-${session.id}`,
      date: session.completed_at ?? session.created_at,
      title: `Sessão Stripe ${getStatusLabel(
        session.status,
      ).toLowerCase()}`,
      description: `Sessão ${session.provider_session_id}`,
      category: "stripe",
      status:
        session.status === "completed"
          ? "success"
          : ["failed", "expired", "cancelled"].includes(
                session.status,
              )
            ? "error"
            : "warning",
    });
  }

  for (const payment of params.payments) {
    events.push({
      id: `payment-${payment.id}`,
      date:
        payment.paid_at ??
        payment.failed_at ??
        payment.refunded_at ??
        payment.cancelled_at ??
        payment.created_at,
      title: `Pagamento ${getStatusLabel(
        payment.status,
      ).toLowerCase()}`,
      description:
        payment.failure_message ??
        `${formatPrice(
          payment.amount_received || payment.amount,
          payment.currency,
        )} através de ${payment.provider}.`,
      category: "payment",
      status:
        payment.status === "paid"
          ? "success"
          : [
                "failed",
                "cancelled",
                "refunded",
              ].includes(payment.status)
            ? "error"
            : "warning",
    });
  }

  for (const stripeEvent of params.stripeEvents) {
    events.push({
      id: `stripe-event-${stripeEvent.id}`,
      date:
        stripeEvent.processed_at ??
        stripeEvent.received_at ??
        stripeEvent.created_at,
      title: stripeEvent.event_type,
      description:
        stripeEvent.error_message ??
        `Evento Stripe ${
          stripeEvent.status === "processed"
            ? "processado"
            : getStatusLabel(
                stripeEvent.status,
              ).toLowerCase()
        }.`,
      category: "stripe",
      status:
        stripeEvent.error_message ||
        stripeEvent.status === "failed"
          ? "error"
          : stripeEvent.status === "processed"
            ? "success"
            : "neutral",
    });
  }

  if (params.order.paid_at) {
    events.push({
      id: `paid-${params.order.id}`,
      date: params.order.paid_at,
      title: "Pagamento confirmado",
      description:
        "A encomenda foi marcada como paga e ficou elegível para submissão automática à Stricker.",
      category: "payment",
      status: "success",
    });
  }

  if (params.order.supplier_submitted_at) {
    events.push({
      id: `supplier-${params.order.id}`,
      date: params.order.supplier_submitted_at,
      title: "Encomenda submetida à Stricker",
      description: params.order.supplier_order_stamp
        ? `Referência Stricker: ${params.order.supplier_order_stamp}.`
        : null,
      category: "supplier",
      status:
        params.order.supplier_submission_status === "failed"
          ? "error"
          : "success",
    });
  }

  if (params.order.shipped_at) {
    events.push({
      id: `shipped-${params.order.id}`,
      date: params.order.shipped_at,
      title: "Encomenda expedida",
      description: params.order.tracking_number
        ? `Tracking: ${params.order.tracking_number}.`
        : null,
      category: "shipping",
      status: "success",
    });
  }

  if (params.order.delivered_at) {
    events.push({
      id: `delivered-${params.order.id}`,
      date: params.order.delivered_at,
      title: "Encomenda entregue",
      description: "A entrega foi concluída.",
      category: "shipping",
      status: "success",
    });
  }

  if (params.order.invoice_number) {
    events.push({
      id: `invoice-${params.order.id}`,
      date: params.order.updated_at,
      title: `Fatura ${params.order.invoice_number}`,
      description: `Estado: ${getStatusLabel(
        params.order.invoice_status,
      )}.`,
      category: "invoice",
      status:
        params.order.invoice_status === "cancelled"
          ? "error"
          : "success",
    });
  }

  return events.sort(
    (a, b) =>
      new Date(b.date).getTime() -
      new Date(a.date).getTime(),
  );
}

function StatusBadge({
  status,
}: {
  status: string | null | undefined;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClasses(
        status,
      )}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}

function DataRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-5 border-b border-neutral-100 py-3 last:border-b-0">
      <dt className="text-sm text-neutral-500">
        {label}
      </dt>

      <dd className="max-w-[65%] text-right text-sm font-medium text-neutral-950">
        {value}
      </dd>
    </div>
  );
}

export default async function AdminOrderDetailPage({
  params,
}: AdminOrderDetailPageProps) {
  const { id } = await params;

  await assertAdminAccess(`/admin/encomendas/${id}`);

const supabaseAdmin = createSupabaseAdminClient();

  const [
    orderResult,
    itemsResult,
    paymentsResult,
    checkoutSessionsResult,
    historyResult,
    stripeEventsResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("orders")
      .select(
        `
          id,
          user_id,
          order_number,
          customer_email,
          customer_name,
          customer_phone,
          company_name,
          company_tax_id,
          status,
          payment_status,
          fulfillment_status,
          supplier_submission_status,
          currency,
          subtotal,
          personalization_total,
          setup_total,
          shipping_total,
          discount_total,
          tax_total,
          grand_total,
          billing_address_id,
          shipping_address_id,
          stripe_checkout_session_id,
          stripe_payment_intent_id,
          invoice_number,
          invoice_url,
          invoice_status,
          supplier_invoice_number,
          supplier_invoice_url,
          supplier_invoice_status,
          supplier_cost_total,
          customer_notes,
          internal_notes,
          internal_reference,
          source_cart_id,
          supplier_order_stamp,
          supplier_submission_error,
          shipping_method,
          shipping_carrier,
          requested_shipping_date,
          supplier_shipping_date,
          no_shipping,
          tracking_number,
          tracking_url,
          metadata,
          paid_at,
          cancelled_at,
          shipped_at,
          delivered_at,
          fulfilled_at,
          supplier_submitted_at,
          created_at,
          updated_at
        `,
      )
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle<OrderRecord>(),

    supabaseAdmin
      .from("order_items")
      .select(
        `
          id,
          order_id,
          product_id,
          variant_id,
          supplier_id,
          product_sku,
          product_name,
          quantity,
          unit_price,
          personalization_unit_price,
          setup_cost,
          extras_total,
          subtotal,
          personalization_total,
          total,
          personalization_required,
          personalization_technique_id,
          personalization_notes,
          personalization_data,
          supplier_payload,
          source_cart_item_id,
          customization_draft_id,
          customization_location_id,
          customization_component_name,
          customization_location_name,
          customization_technique_name,
          supplier_product_reference,
          supplier_sku,
          service_code,
          table_code,
          table_code_option,
          handling_cost_code,
          printing_area_label,
          printing_width_mm,
          printing_height_mm,
          printing_area_mm2,
          logo_file_name,
          logo_storage_path,
          logo_url,
          mockup_storage_path,
          mockup_url,
          technical_preview_url,
          logo_position_x,
          logo_position_y,
          logo_scale,
          logo_rotation,
          logo_width_mm,
          logo_height_mm,
          logo_area,
          artwork_status,
          artwork_approved,
          supplier_order_stamp,
          supplier_order_line_stamp,
          supplier_submission_status,
          supplier_submission_error,
          supplier_submitted_at,
          created_at,
          updated_at
        `,
      )
      .eq("order_id", id)
      .order("created_at", {
        ascending: true,
      })
      .returns<OrderItemRecord[]>(),

    supabaseAdmin
      .from("payments")
      .select(
        `
          id,
          order_id,
          provider,
          provider_payment_id,
          provider_checkout_session_id,
          provider_payment_intent_id,
          provider_charge_id,
          status,
          amount,
          amount_received,
          amount_refunded,
          currency,
          failure_code,
          failure_message,
          paid_at,
          failed_at,
          refunded_at,
          cancelled_at,
          metadata,
          created_at,
          updated_at
        `,
      )
      .eq("order_id", id)
      .order("created_at", {
        ascending: false,
      })
      .returns<PaymentRecord[]>(),

    supabaseAdmin
      .from("checkout_sessions")
      .select(
        `
          id,
          cart_id,
          order_id,
          user_id,
          provider,
          provider_session_id,
          provider_payment_intent_id,
          status,
          amount_total,
          currency,
          checkout_url,
          expires_at,
          completed_at,
          expired_at,
          cancelled_at,
          metadata,
          created_at,
          updated_at
        `,
      )
      .eq("order_id", id)
      .order("created_at", {
        ascending: false,
      })
      .returns<CheckoutSessionRecord[]>(),

    supabaseAdmin
      .from("order_status_history")
      .select(
        `
          id,
          order_id,
          previous_status,
          new_status,
          changed_by,
          notes,
          metadata,
          created_at
        `,
      )
      .eq("order_id", id)
      .order("created_at", {
        ascending: false,
      })
      .returns<OrderStatusHistoryRecord[]>(),

    supabaseAdmin
      .from("stripe_webhook_events")
      .select(
        `
          id,
          stripe_event_id,
          event_type,
          livemode,
          api_version,
          status,
          processing_attempts,
          order_id,
          payment_id,
          provider_checkout_session_id,
          provider_payment_intent_id,
          error_message,
          received_at,
          processing_started_at,
          processed_at,
          created_at,
          updated_at
        `,
      )
      .eq("order_id", id)
      .order("received_at", {
        ascending: false,
      })
      .returns<StripeWebhookEventRecord[]>(),
  ]);

  if (orderResult.error || !orderResult.data) {
    notFound();
  }

  if (itemsResult.error) {
    throw new Error(itemsResult.error.message);
  }

  if (paymentsResult.error) {
    throw new Error(paymentsResult.error.message);
  }

  if (checkoutSessionsResult.error) {
    throw new Error(checkoutSessionsResult.error.message);
  }

  if (historyResult.error) {
    throw new Error(historyResult.error.message);
  }

  if (stripeEventsResult.error) {
    throw new Error(stripeEventsResult.error.message);
  }

  const order = orderResult.data;
  const orderItems = await getOrderItemViews(
    itemsResult.data ?? [],
  );

  const payments = paymentsResult.data ?? [];
  const checkoutSessions =
    checkoutSessionsResult.data ?? [];
  const statusHistory = historyResult.data ?? [];
  const stripeEvents = stripeEventsResult.data ?? [];

  const addressIds = Array.from(
    new Set(
      [
        order.shipping_address_id,
        order.billing_address_id,
      ].filter(
        (value): value is string => Boolean(value),
      ),
    ),
  );

  let addresses: AddressRecord[] = [];

  if (addressIds.length > 0) {
    const { data, error } = await supabaseAdmin
      .from("customer_addresses")
      .select(
        `
          id,
          user_id,
          address_type,
          company_name,
          tax_id,
          contact_name,
          contact_email,
          contact_phone,
          address_line_1,
          address_line_2,
          postal_code,
          city,
          district,
          country_code
        `,
      )
      .in("id", addressIds)
      .returns<AddressRecord[]>();

    if (error) {
      throw new Error(error.message);
    }

    addresses = data ?? [];
  }

  const shippingAddress =
    addresses.find(
      (address) =>
        address.id === order.shipping_address_id,
    ) ?? null;

  const billingAddress =
    addresses.find(
      (address) =>
        address.id === order.billing_address_id,
    ) ?? null;

  const timeline = buildTimeline({
    order,
    payments,
    checkoutSessions,
    statusHistory,
    stripeEvents,
  });

  const latestPayment = payments[0] ?? null;
  const latestCheckoutSession =
    checkoutSessions[0] ?? null;

  const totalQuantity = orderItems.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  const personalizedItemsCount = orderItems.filter(
    (item) => item.personalization_required,
  ).length;

  const approvedArtworkCount = orderItems.filter(
    (item) => item.artwork_approved,
  ).length;

  const supplierError =
    order.supplier_submission_error ??
    orderItems.find(
      (item) => item.supplier_submission_error,
    )?.supplier_submission_error ??
    null;

  const stripeDashboardUrl =
    order.stripe_payment_intent_id
      ? `https://dashboard.stripe.com/payments/${encodeURIComponent(
          order.stripe_payment_intent_id,
        )}`
      : order.stripe_checkout_session_id
        ? `https://dashboard.stripe.com/test/payments`
        : null;

  return (
    <main className="min-h-screen bg-neutral-50 px-5 py-8 lg:px-8">
      <section className="mx-auto max-w-[1700px]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <Link
              href="/admin/encomendas"
              className="inline-flex items-center text-sm font-semibold text-neutral-500 transition hover:text-neutral-950"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar às encomendas
            </Link>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Encomenda
              </p>

              <StatusBadge status={order.status} />
            </div>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950 lg:text-4xl">
              {order.order_number}
            </h1>

            <p className="mt-3 text-sm text-neutral-500">
              Criada em {formatDateTime(order.created_at)}
              {" · "}
              Atualizada em {formatDateTime(order.updated_at)}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Pagamento
              </p>

              <div className="mt-2">
                <StatusBadge
                  status={order.payment_status}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Stricker
              </p>

              <div className="mt-2">
                <StatusBadge
                  status={
                    order.supplier_submission_status
                  }
                />
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Expedição
              </p>

              <div className="mt-2">
                <StatusBadge
                  status={order.fulfillment_status}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-950 bg-neutral-950 px-5 py-4 text-white shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
                Total
              </p>

              <p className="mt-2 text-xl font-semibold">
                {formatPrice(
                  order.grand_total,
                  order.currency,
                )}
              </p>
            </div>
          </div>
        </div>

        {supplierError ? (
          <div className="mt-6 flex items-start gap-3 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">
                Erro na submissão à Stricker
              </p>

              <p className="mt-1 leading-6">
                {supplierError}
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">
                    Resumo
                  </p>

                  <h2 className="mt-2 text-2xl font-semibold text-neutral-950">
                    Visão geral da encomenda
                  </h2>
                </div>

                <ShoppingBag className="h-7 w-7 text-neutral-400" />
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl bg-neutral-50 p-5">
                  <Package className="h-5 w-5 text-neutral-500" />

                  <p className="mt-4 text-sm text-neutral-500">
                    Produtos
                  </p>

                  <p className="mt-1 text-xl font-semibold text-neutral-950">
                    {orderItems.length}
                  </p>
                </div>

                <div className="rounded-2xl bg-neutral-50 p-5">
                  <Box className="h-5 w-5 text-neutral-500" />

                  <p className="mt-4 text-sm text-neutral-500">
                    Quantidade total
                  </p>

                  <p className="mt-1 text-xl font-semibold text-neutral-950">
                    {formatNumber(totalQuantity)}
                  </p>
                </div>

                <div className="rounded-2xl bg-neutral-50 p-5">
                  <Palette className="h-5 w-5 text-neutral-500" />

                  <p className="mt-4 text-sm text-neutral-500">
                    Personalizados
                  </p>

                  <p className="mt-1 text-xl font-semibold text-neutral-950">
                    {personalizedItemsCount}
                  </p>
                </div>

                <div className="rounded-2xl bg-neutral-50 p-5">
                  <BadgeCheck className="h-5 w-5 text-neutral-500" />

                  <p className="mt-4 text-sm text-neutral-500">
                    Artes aprovadas
                  </p>

                  <p className="mt-1 text-xl font-semibold text-neutral-950">
                    {approvedArtworkCount}/
                    {personalizedItemsCount}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <Package className="h-6 w-6 text-neutral-500" />

                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">
                    Produtos
                  </p>

                  <h2 className="mt-1 text-2xl font-semibold text-neutral-950">
                    Linhas da encomenda
                  </h2>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                {orderItems.map((item, index) => (
                  <article
                    key={item.id}
                    className="overflow-hidden rounded-3xl border border-neutral-200"
                  >
                    <div className="border-b border-neutral-200 bg-neutral-50 px-5 py-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                            Linha {index + 1}
                          </p>

                          <h3 className="mt-2 text-lg font-semibold text-neutral-950">
                            {item.product_name}
                          </h3>

                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-500">
                            <span>
                              SKU: {item.product_sku}
                            </span>

                            {item.supplier_sku ? (
                              <span>
                                SKU fornecedor:{" "}
                                {item.supplier_sku}
                              </span>
                            ) : null}

                            <span>
                              Quantidade:{" "}
                              {formatNumber(item.quantity)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <StatusBadge
                            status={item.artwork_status}
                          />

                          <StatusBadge
                            status={
                              item.supplier_submission_status
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-6 p-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
                      <div className="space-y-6">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="rounded-2xl bg-neutral-50 p-4">
                            <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">
                              Produto / un.
                            </p>

                            <p className="mt-2 font-semibold text-neutral-950">
                              {formatPrice(
                                item.unit_price,
                                order.currency,
                              )}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-neutral-50 p-4">
                            <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">
                              Personalização / un.
                            </p>

                            <p className="mt-2 font-semibold text-neutral-950">
                              {formatPrice(
                                item.personalization_unit_price,
                                order.currency,
                              )}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-neutral-50 p-4">
                            <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">
                              Setup + extras
                            </p>

                            <p className="mt-2 font-semibold text-neutral-950">
                              {formatPrice(
                                item.setup_cost +
                                  item.extras_total,
                                order.currency,
                              )}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-neutral-950 p-4 text-white">
                            <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                              Total da linha
                            </p>

                            <p className="mt-2 font-semibold">
                              {formatPrice(
                                item.total,
                                order.currency,
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="grid gap-5 lg:grid-cols-2">
                          <div className="rounded-2xl border border-neutral-200 p-5">
                            <div className="flex items-center gap-2">
                              <Palette className="h-4 w-4 text-neutral-500" />

                              <p className="font-semibold text-neutral-950">
                                Personalização
                              </p>
                            </div>

                            <dl className="mt-4">
                              <DataRow
                                label="Componente"
                                value={
                                  item.customization_component_name ??
                                  "—"
                                }
                              />

                              <DataRow
                                label="Localização"
                                value={
                                  item.customization_location_name ??
                                  "—"
                                }
                              />

                              <DataRow
                                label="Técnica"
                                value={
                                  item.customization_technique_name ??
                                  "—"
                                }
                              />

                              <DataRow
                                label="Área"
                                value={getPrintAreaLabel(item)}
                              />

                              <DataRow
                                label="Tabela"
                                value={
                                  item.table_code
                                    ? [
                                        item.table_code,
                                        item.table_code_option,
                                      ]
                                        .filter(Boolean)
                                        .join(" · ")
                                    : "—"
                                }
                              />

                              <DataRow
                                label="Serviço"
                                value={
                                  item.service_code ?? "—"
                                }
                              />
                            </dl>
                          </div>

                          <div className="rounded-2xl border border-neutral-200 p-5">
                            <div className="flex items-center gap-2">
                              <RefreshCw className="h-4 w-4 text-neutral-500" />

                              <p className="font-semibold text-neutral-950">
                                Stricker
                              </p>
                            </div>

                            <dl className="mt-4">
                              <DataRow
                                label="Estado"
                                value={
                                  <StatusBadge
                                    status={
                                      item.supplier_submission_status
                                    }
                                  />
                                }
                              />

                              <DataRow
                                label="Order stamp"
                                value={
                                  item.supplier_order_stamp ??
                                  order.supplier_order_stamp ??
                                  "—"
                                }
                              />

                              <DataRow
                                label="Line stamp"
                                value={
                                  item.supplier_order_line_stamp ??
                                  "—"
                                }
                              />

                              <DataRow
                                label="Submetida em"
                                value={formatDateTime(
                                  item.supplier_submitted_at,
                                )}
                              />

                              <DataRow
                                label="Referência"
                                value={
                                  item.supplier_product_reference ??
                                  "—"
                                }
                              />
                            </dl>
                          </div>
                        </div>

                        {item.personalization_notes ? (
                          <div className="rounded-2xl bg-neutral-50 p-5">
                            <p className="text-sm font-semibold text-neutral-950">
                              Observações da personalização
                            </p>

                            <p className="mt-2 text-sm leading-6 text-neutral-600">
                              {item.personalization_notes}
                            </p>
                          </div>
                        ) : null}

                        {item.supplier_submission_error ? (
                          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
                            {item.supplier_submission_error}
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-2xl border border-neutral-200 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <FileImage className="h-4 w-4 text-neutral-500" />

                              <p className="text-sm font-semibold text-neutral-950">
                                Ficheiro do logótipo
                              </p>
                            </div>

                            {item.logoPreviewUrl ? (
                              <a
                                href={item.logoPreviewUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center text-xs font-semibold text-neutral-600 transition hover:text-neutral-950"
                              >
                                Abrir
                                <ExternalLink className="ml-1 h-3.5 w-3.5" />
                              </a>
                            ) : null}
                          </div>

                          <div className="mt-4 flex min-h-44 items-center justify-center overflow-hidden rounded-2xl bg-neutral-50">
                            {item.logoPreviewUrl ? (
                              <img
                                src={item.logoPreviewUrl}
                                alt={
                                  item.logo_file_name ??
                                  "Logótipo"
                                }
                                className="max-h-48 w-full object-contain p-5"
                              />
                            ) : (
                              <p className="px-4 text-center text-sm text-neutral-400">
                                Nenhum ficheiro disponível
                              </p>
                            )}
                          </div>

                          <p className="mt-3 truncate text-xs text-neutral-500">
                            {item.logo_file_name ??
                              "Sem nome de ficheiro"}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-neutral-200 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <FileImage className="h-4 w-4 text-neutral-500" />

                              <p className="text-sm font-semibold text-neutral-950">
                                Mockup
                              </p>
                            </div>

                            {item.mockupPreviewUrl ? (
                              <a
                                href={item.mockupPreviewUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center text-xs font-semibold text-neutral-600 transition hover:text-neutral-950"
                              >
                                Abrir
                                <ExternalLink className="ml-1 h-3.5 w-3.5" />
                              </a>
                            ) : null}
                          </div>

                          <div className="mt-4 flex min-h-44 items-center justify-center overflow-hidden rounded-2xl bg-neutral-50">
                            {item.mockupPreviewUrl ? (
                              <img
                                src={item.mockupPreviewUrl}
                                alt={`Mockup de ${item.product_name}`}
                                className="max-h-56 w-full object-contain p-4"
                              />
                            ) : (
                              <p className="px-4 text-center text-sm text-neutral-400">
                                Mockup ainda não disponível
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-neutral-200 p-4">
                          <p className="text-sm font-semibold text-neutral-950">
                            Estado da arte
                          </p>

                          <div className="mt-3 flex items-center justify-between gap-3">
                            <StatusBadge
                              status={item.artwork_status}
                            />

                            <span
                              className={`inline-flex items-center text-sm font-semibold ${
                                item.artwork_approved
                                  ? "text-emerald-700"
                                  : "text-amber-700"
                              }`}
                            >
                              {item.artwork_approved ? (
                                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                              ) : (
                                <Clock3 className="mr-1.5 h-4 w-4" />
                              )}

                              {item.artwork_approved
                                ? "Aprovada"
                                : "Por aprovar"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}

                {orderItems.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center">
                    <Package className="mx-auto h-8 w-8 text-neutral-400" />

                    <p className="mt-4 font-semibold text-neutral-950">
                      Sem linhas de encomenda
                    </p>

                    <p className="mt-2 text-sm text-neutral-500">
                      Não foram encontrados produtos associados a esta encomenda.
                    </p>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <Clock3 className="h-6 w-6 text-neutral-500" />

                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">
                    Histórico
                  </p>

                  <h2 className="mt-1 text-2xl font-semibold text-neutral-950">
                    Linha temporal completa
                  </h2>
                </div>
              </div>

              <div className="mt-8 space-y-0">
                {timeline.map((event, index) => {
                  const Icon = getTimelineIcon(
                    event.category,
                  );

                  return (
                    <div
                      key={event.id}
                      className="relative flex gap-4 pb-8 last:pb-0"
                    >
                      {index < timeline.length - 1 ? (
                        <div className="absolute left-5 top-10 h-[calc(100%-24px)] w-px bg-neutral-200" />
                      ) : null}

                      <div
                        className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${getTimelineIconClasses(
                          event.status,
                        )}`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1 pt-1">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                          <p className="font-semibold text-neutral-950">
                            {event.title}
                          </p>

                          <time className="shrink-0 text-xs text-neutral-500">
                            {formatDateTime(event.date)}
                          </time>
                        </div>

                        {event.description ? (
                          <p className="mt-2 text-sm leading-6 text-neutral-600">
                            {event.description}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <aside className="space-y-6 xl:sticky xl:top-6">
            <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <UserRound className="h-5 w-5 text-neutral-500" />

                <h2 className="text-lg font-semibold text-neutral-950">
                  Dados do cliente
                </h2>
              </div>

              <dl className="mt-5">
                <DataRow
                  label="Nome"
                  value={order.customer_name}
                />

                <DataRow
                  label="Empresa"
                  value={order.company_name ?? "—"}
                />

                <DataRow
                  label="NIF"
                  value={order.company_tax_id ?? "—"}
                />

                <DataRow
                  label="E-mail"
                  value={
                    <a
                      href={`mailto:${order.customer_email}`}
                      className="inline-flex items-center hover:underline"
                    >
                      <Mail className="mr-1.5 h-3.5 w-3.5" />
                      {order.customer_email}
                    </a>
                  }
                />

                <DataRow
                  label="Telefone"
                  value={
                    order.customer_phone ? (
                      <a
                        href={`tel:${order.customer_phone}`}
                        className="inline-flex items-center hover:underline"
                      >
                        <Phone className="mr-1.5 h-3.5 w-3.5" />
                        {order.customer_phone}
                      </a>
                    ) : (
                      "—"
                    )
                  }
                />

                <DataRow
                  label="Referência interna"
                  value={
                    order.internal_reference ?? "—"
                  }
                />
              </dl>

              {order.customer_notes ? (
                <div className="mt-5 rounded-2xl bg-neutral-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                    Observações
                  </p>

                  <p className="mt-2 text-sm leading-6 text-neutral-700">
                    {order.customer_notes}
                  </p>
                </div>
              ) : null}
            </section>

            <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-neutral-500" />

                <h2 className="text-lg font-semibold text-neutral-950">
                  Entrega
                </h2>
              </div>

              <div className="mt-5 rounded-2xl bg-neutral-50 p-4">
                {shippingAddress ? (
                  <>
                    {buildAddressLines(
                      shippingAddress,
                    ).map((line, index) => (
                      <p
                        key={`${line}-${index}`}
                        className={`text-sm ${
                          index === 0
                            ? "font-semibold text-neutral-950"
                            : "mt-1 text-neutral-600"
                        }`}
                      >
                        {line}
                      </p>
                    ))}
                  </>
                ) : (
                  <p className="text-sm text-neutral-500">
                    Morada não disponível.
                  </p>
                )}
              </div>

              <dl className="mt-4">
                <DataRow
                  label="Método"
                  value={order.shipping_method ?? "—"}
                />

                <DataRow
                  label="Transportadora"
                  value={order.shipping_carrier ?? "—"}
                />

                <DataRow
                  label="Data pretendida"
                  value={formatDate(
                    order.requested_shipping_date,
                  )}
                />

                <DataRow
                  label="Data de expedição Stricker"
                  value={formatDate(order.supplier_shipping_date)}
                />

                <DataRow
                  label="Tracking"
                  value={order.tracking_number ?? "—"}
                />
              </dl>

              {order.tracking_url ? (
                <a
                  href={order.tracking_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
                >
                  Acompanhar expedição
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              ) : null}
            </section>

            <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <CircleDollarSign className="h-5 w-5 text-neutral-500" />

                <h2 className="text-lg font-semibold text-neutral-950">
                  Pagamento Stripe
                </h2>
              </div>

              <dl className="mt-5">
                <DataRow
                  label="Estado"
                  value={
                    <StatusBadge
                      status={order.payment_status}
                    />
                  }
                />

                <DataRow
                  label="Valor"
                  value={formatPrice(
                    latestPayment?.amount ??
                      order.grand_total,
                    latestPayment?.currency ??
                      order.currency,
                  )}
                />

                <DataRow
                  label="Recebido"
                  value={formatPrice(
                    latestPayment?.amount_received ??
                      0,
                    latestPayment?.currency ??
                      order.currency,
                  )}
                />

                <DataRow
                  label="Pago em"
                  value={formatDateTime(
                    latestPayment?.paid_at ??
                      order.paid_at,
                  )}
                />

                <DataRow
                  label="Payment Intent"
                  value={
                    order.stripe_payment_intent_id ? (
                      <span className="break-all font-mono text-xs">
                        {order.stripe_payment_intent_id}
                      </span>
                    ) : (
                      "—"
                    )
                  }
                />

                <DataRow
                  label="Checkout Session"
                  value={
                    order.stripe_checkout_session_id ? (
                      <span className="break-all font-mono text-xs">
                        {order.stripe_checkout_session_id}
                      </span>
                    ) : (
                      "—"
                    )
                  }
                />

                <DataRow
                  label="Sessão"
                  value={
                    <StatusBadge
                      status={
                        latestCheckoutSession?.status
                      }
                    />
                  }
                />
              </dl>

              {latestPayment?.failure_message ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
                  {latestPayment.failure_message}
                </div>
              ) : null}

              {stripeDashboardUrl ? (
                <a
                  href={stripeDashboardUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex w-full items-center justify-center rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-50"
                >
                  Abrir na Stripe
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              ) : null}
            </section>

            <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-5 w-5 text-neutral-500" />

                <h2 className="text-lg font-semibold text-neutral-950">
                  Estado Stricker
                </h2>
              </div>

              <dl className="mt-5">
                <DataRow
                  label="Submissão"
                  value={
                    <StatusBadge
                      status={
                        order.supplier_submission_status
                      }
                    />
                  }
                />

                <DataRow
                  label="Order stamp"
                  value={
                    order.supplier_order_stamp ?? "—"
                  }
                />

                <DataRow
                  label="Submetida em"
                  value={formatDateTime(
                    order.supplier_submitted_at,
                  )}
                />

                <DataRow
                  label="Linhas submetidas"
                  value={`${orderItems.filter(
                    (item) =>
                      item.supplier_submission_status ===
                      "submitted",
                  ).length}/${orderItems.length}`}
                />
              </dl>

              {order.supplier_submission_error ? (
                <div className="mt-4 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0" />

                  <p>
                    {order.supplier_submission_error}
                  </p>
                </div>
              ) : order.supplier_submission_status ===
                "submitted" ? (
                <div className="mt-4 flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />

                  <p>
                    A encomenda foi transmitida com sucesso ao fornecedor.
                  </p>
                </div>
              ) : (
                <div className="mt-4 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />

                  <p>
                    A encomenda aguarda o cumprimento dos requisitos necessários para submissão.
                  </p>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <ReceiptText className="h-5 w-5 text-neutral-500" />

                <h2 className="text-lg font-semibold text-neutral-950">
                  Faturação
                </h2>
              </div>

              <AdminOrderCommercialForm
                orderId={order.id}
                customerName={order.customer_name}
                customerEmail={order.customer_email}
                customerPhone={order.customer_phone}
                companyName={order.company_name}
                companyTaxId={order.company_tax_id}
                supplierInvoiceNumber={order.supplier_invoice_number}
                supplierInvoiceUrl={order.supplier_invoice_url}
                supplierInvoiceStatus={order.supplier_invoice_status}
                supplierCostTotal={Number(order.supplier_cost_total ?? 0)}
              />

              <div className="my-6 border-t border-neutral-200" />

              <dl className="mt-5">
                <DataRow
                  label="Estado"
                  value={
                    <StatusBadge
                      status={order.invoice_status}
                    />
                  }
                />

                <DataRow
                  label="Número"
                  value={order.invoice_number ?? "—"}
                />
              </dl>

              {billingAddress ? (
                <div className="mt-4 rounded-2xl bg-neutral-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                    Morada de faturação
                  </p>

                  <div className="mt-3">
                    {buildAddressLines(
                      billingAddress,
                    ).map((line, index) => (
                      <p
                        key={`${line}-${index}`}
                        className={`text-sm ${
                          index === 0
                            ? "font-semibold text-neutral-950"
                            : "mt-1 text-neutral-600"
                        }`}
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}

              {order.invoice_url ? (
                <a
                  href={order.invoice_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex w-full items-center justify-center rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-50"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Abrir fatura
                </a>
              ) : (
                <div className="mt-5 rounded-2xl bg-neutral-50 p-4 text-center text-sm text-neutral-500">
                  A fatura ainda não está disponível.
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-neutral-950 bg-neutral-950 p-6 text-white shadow-sm">
              <div className="flex items-center gap-3">
                <ReceiptText className="h-5 w-5 text-white/60" />

                <h2 className="text-lg font-semibold">
                  Totais
                </h2>
              </div>

              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between gap-4 text-white/70">
                  <dt>Produtos</dt>
                  <dd className="font-medium text-white">
                    {formatPrice(
                      order.subtotal,
                      order.currency,
                    )}
                  </dd>
                </div>

                <div className="flex justify-between gap-4 text-white/70">
                  <dt>Personalizações</dt>
                  <dd className="font-medium text-white">
                    {formatPrice(
                      order.personalization_total,
                      order.currency,
                    )}
                  </dd>
                </div>

                <div className="flex justify-between gap-4 text-white/70">
                  <dt>Setup e extras</dt>
                  <dd className="font-medium text-white">
                    {formatPrice(
                      order.setup_total,
                      order.currency,
                    )}
                  </dd>
                </div>

                <div className="flex justify-between gap-4 text-white/70">
                  <dt>Expedição</dt>
                  <dd className="font-medium text-white">
                    {formatPrice(
                      order.shipping_total,
                      order.currency,
                    )}
                  </dd>
                </div>

                <div className="flex justify-between gap-4 text-white/70">
                  <dt>Desconto</dt>
                  <dd className="font-medium text-white">
                    −{" "}
                    {formatPrice(
                      order.discount_total,
                      order.currency,
                    )}
                  </dd>
                </div>

                <div className="flex justify-between gap-4 text-white/70">
                  <dt>IVA</dt>
                  <dd className="font-medium text-white">
                    {formatPrice(
                      order.tax_total,
                      order.currency,
                    )}
                  </dd>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <div className="flex items-end justify-between gap-4">
                    <dt className="font-semibold">
                      Total
                    </dt>

                    <dd className="text-2xl font-semibold">
                      {formatPrice(
                        order.grand_total,
                        order.currency,
                      )}
                    </dd>
                  </div>
                </div>
              </dl>
            </section>

            <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <Hash className="h-5 w-5 text-neutral-500" />

                <h2 className="text-lg font-semibold text-neutral-950">
                  Referências técnicas
                </h2>
              </div>

              <dl className="mt-5">
                <DataRow
                  label="ID interno"
                  value={
                    <span className="break-all font-mono text-xs">
                      {order.id}
                    </span>
                  }
                />

                <DataRow
                  label="Carrinho"
                  value={
                    order.source_cart_id ? (
                      <span className="break-all font-mono text-xs">
                        {order.source_cart_id}
                      </span>
                    ) : (
                      "—"
                    )
                  }
                />

                <DataRow
                  label="Região fiscal"
                  value={
                    getMetadataString(
                      order.metadata,
                      "taxRegionLabel",
                    ) ?? "—"
                  }
                />

                <DataRow
                  label="Ambiente Stripe"
                  value={
                    stripeEvents.some(
                      (event) => event.livemode,
                    )
                      ? "Live"
                      : "Teste"
                  }
                />
              </dl>
            </section>
          </aside>
        </div>
        <section className="mt-10 flex justify-end border-t border-neutral-200 pt-8">
          <AdminDeleteOrderForm orderId={order.id} orderNumber={order.order_number} />
        </section>
      </section>
    </main>
  );
}
