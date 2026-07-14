import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  FileImage,
  FileText,
  MapPin,
  Package,
  ReceiptText,
  Truck,
  UserRound,
} from "lucide-react";
import {
  AdminArtworkForm,
  AdminOrderNoteForm,
  AdminOrderStatusForm,
  AdminSupplierStatusForm,
  AdminTrackingForm,
} from "@/components/admin/orders/AdminOrderOperations";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

type Address = {
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

type OrderItem = {
  id: string;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_price: number;
  personalization_unit_price: number;
  setup_cost: number;
  extras_total: number;
  subtotal: number;
  personalization_total: number;
  total: number;
  personalization_required: boolean;
  personalization_notes: string | null;
  personalization_data: JsonRecord;
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
  logo_file_name: string | null;
  logo_storage_path: string | null;
  logo_url: string | null;
  mockup_storage_path: string | null;
  mockup_url: string | null;
  technical_preview_url: string | null;
  artwork_status: string;
  artwork_approved: boolean;
  supplier_submission_status: string;
  supplier_submission_error: string | null;
  supplier_order_stamp: string | null;
  supplier_order_line_stamp: string | null;
};

type Payment = {
  id: string;
  provider: string;
  provider_payment_id: string | null;
  provider_checkout_session_id: string | null;
  provider_payment_intent_id: string | null;
  status: string;
  amount: number;
  amount_received: number;
  amount_refunded: number;
  currency: string;
  failure_code: string | null;
  failure_message: string | null;
  paid_at: string | null;
  failed_at: string | null;
  created_at: string;
};

type CheckoutSession = {
  id: string;
  provider_session_id: string;
  provider_payment_intent_id: string | null;
  status: string;
  amount_total: number;
  currency: string;
  checkout_url: string | null;
  completed_at: string | null;
  expired_at: string | null;
  cancelled_at: string | null;
  created_at: string;
};

type StatusHistory = {
  id: string;
  previous_status: string | null;
  new_status: string;
  changed_by: string | null;
  notes: string | null;
  metadata: JsonRecord;
  created_at: string;
};

type Order = {
  id: string;
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
  supplier_order_stamp: string | null;
  supplier_submission_error: string | null;
  supplier_submitted_at: string | null;
  currency: string;
  subtotal: number;
  personalization_total: number;
  setup_total: number;
  shipping_total: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  shipping_method: string | null;
  shipping_carrier: string | null;
  requested_shipping_date: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  invoice_number: string | null;
  invoice_url: string | null;
  invoice_status: string | null;
  customer_notes: string | null;
  internal_notes: string | null;
  internal_reference: string | null;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
  shipping_address: Address | null;
  billing_address: Address | null;
  order_items: OrderItem[] | null;
  payments: Payment[] | null;
  checkout_sessions: CheckoutSession[] | null;
  order_status_history: StatusHistory[] | null;
};

type AdminOrderDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const ARTWORK_BUCKET = "customization-artwork";

function formatPrice(value: number, currency: string): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency,
  }).format(Number(value ?? 0));
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getTimelineLabel(status: string): string {
  const labels: Record<string, string> = {
    pending_payment: "A aguardar pagamento",
    paid: "Pagamento confirmado",
    processing: "Em validação",
    sent_to_supplier: "Enviada à Stricker",
    supplier_confirmed: "Confirmada pela Stricker",
    in_production: "Em produção",
    shipped: "Encomenda expedida",
    delivered: "Encomenda entregue",
    cancelled: "Encomenda cancelada",
    refunded: "Pagamento reembolsado",
    failed: "Processo falhou",
    ready_for_review: "Pronta para revisão",
    approved_for_submission: "Aprovada para submissão",
    submitting: "A submeter à Stricker",
    submitted: "Submetida à Stricker",
    partially_submitted: "Submissão parcial",
    tracking_updated: "Tracking atualizado",
    internal_note_added: "Nota interna adicionada",
    uploaded: "Ficheiro de arte recebido",
    pending_review: "Arte em revisão",
    approved: "Arte aprovada",
    rejected: "Arte rejeitada",
    changes_requested: "Alterações à arte pedidas",
  };

  return labels[status] ?? status;
}

function getRecordString(
  record: JsonRecord,
  key: string,
): string | null {
  const value = record[key];

  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

async function requireAdmin(): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string }>();

  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    redirect("/");
  }
}

async function createSignedFileUrl(
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

export default async function AdminOrderDetailPage({
  params,
}: AdminOrderDetailPageProps) {
  await requireAdmin();

  const { id } = await params;
  const supabaseAdmin = createSupabaseAdminClient();

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(
      `
        id,
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
        supplier_order_stamp,
        supplier_submission_error,
        supplier_submitted_at,
        currency,
        subtotal,
        personalization_total,
        setup_total,
        shipping_total,
        discount_total,
        tax_total,
        grand_total,
        shipping_method,
        shipping_carrier,
        requested_shipping_date,
        tracking_number,
        tracking_url,
        invoice_number,
        invoice_url,
        invoice_status,
        customer_notes,
        internal_notes,
        internal_reference,
        paid_at,
        shipped_at,
        delivered_at,
        created_at,
        updated_at,
        shipping_address:customer_addresses!orders_shipping_address_id_fkey (
          id,
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
        ),
        billing_address:customer_addresses!orders_billing_address_id_fkey (
          id,
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
        ),
        order_items (
          id,
          product_name,
          product_sku,
          quantity,
          unit_price,
          personalization_unit_price,
          setup_cost,
          extras_total,
          subtotal,
          personalization_total,
          total,
          personalization_required,
          personalization_notes,
          personalization_data,
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
          logo_file_name,
          logo_storage_path,
          logo_url,
          mockup_storage_path,
          mockup_url,
          technical_preview_url,
          artwork_status,
          artwork_approved,
          supplier_submission_status,
          supplier_submission_error,
          supplier_order_stamp,
          supplier_order_line_stamp
        ),
        payments (
          id,
          provider,
          provider_payment_id,
          provider_checkout_session_id,
          provider_payment_intent_id,
          status,
          amount,
          amount_received,
          amount_refunded,
          currency,
          failure_code,
          failure_message,
          paid_at,
          failed_at,
          created_at
        ),
        checkout_sessions (
          id,
          provider_session_id,
          provider_payment_intent_id,
          status,
          amount_total,
          currency,
          checkout_url,
          completed_at,
          expired_at,
          cancelled_at,
          created_at
        ),
        order_status_history (
          id,
          previous_status,
          new_status,
          changed_by,
          notes,
          metadata,
          created_at
        )
      `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    notFound();
  }

  const order = data as unknown as Order;

  const itemsWithUrls = await Promise.all(
    (order.order_items ?? []).map(async (item) => ({
      ...item,
      resolvedLogoUrl:
        item.logo_url ??
        (await createSignedFileUrl(item.logo_storage_path)),
      resolvedMockupUrl:
        item.mockup_url ??
        (await createSignedFileUrl(item.mockup_storage_path)),
    })),
  );

  const history = [...(order.order_status_history ?? [])].sort(
    (a, b) =>
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime(),
  );

  const latestPayment = [...(order.payments ?? [])].sort(
    (a, b) =>
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime(),
  )[0];

  const latestSession = [...(order.checkout_sessions ?? [])].sort(
    (a, b) =>
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime(),
  )[0];

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-10">
      <section className="mx-auto max-w-[1600px]">
        <Link
          href="/admin/encomendas"
          className="inline-flex items-center text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar às encomendas
        </Link>

        <div className="mt-8 flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Encomenda
            </p>

            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-neutral-950">
              {order.order_number}
            </h1>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-neutral-950 px-3 py-1 text-xs font-semibold text-white">
                {getTimelineLabel(order.status)}
              </span>

              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                Pagamento: {getTimelineLabel(order.payment_status)}
              </span>

              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                Stricker:{" "}
                {getTimelineLabel(order.supplier_submission_status)}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
              <CalendarDays className="h-5 w-5 text-neutral-500" />
              <p className="mt-3 text-xs text-neutral-500">Criada</p>
              <p className="mt-1 text-sm font-semibold text-neutral-950">
                {formatDate(order.created_at)}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
              <CreditCard className="h-5 w-5 text-emerald-600" />
              <p className="mt-3 text-xs text-neutral-500">Pagamento</p>
              <p className="mt-1 text-sm font-semibold text-neutral-950">
                {formatDate(order.paid_at)}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
              <Banknote className="h-5 w-5 text-neutral-500" />
              <p className="mt-3 text-xs text-neutral-500">Total</p>
              <p className="mt-1 text-lg font-semibold text-neutral-950">
                {formatPrice(order.grand_total, order.currency)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-8">
            <section className="grid gap-5 lg:grid-cols-2">
              <article className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <UserRound className="h-5 w-5 text-neutral-500" />
                  <h2 className="text-lg font-semibold text-neutral-950">
                    Cliente
                  </h2>
                </div>

                <dl className="mt-6 space-y-4 text-sm">
                  <div>
                    <dt className="text-neutral-500">Nome</dt>
                    <dd className="mt-1 font-semibold text-neutral-950">
                      {order.customer_name}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-neutral-500">E-mail</dt>
                    <dd className="mt-1 font-semibold text-neutral-950">
                      {order.customer_email}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-neutral-500">Telefone</dt>
                    <dd className="mt-1 font-semibold text-neutral-950">
                      {order.customer_phone ?? "—"}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-neutral-500">Referência interna</dt>
                    <dd className="mt-1 font-semibold text-neutral-950">
                      {order.internal_reference ?? "—"}
                    </dd>
                  </div>
                </dl>
              </article>

              <article className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-neutral-500" />
                  <h2 className="text-lg font-semibold text-neutral-950">
                    Faturação
                  </h2>
                </div>

                <dl className="mt-6 space-y-4 text-sm">
                  <div>
                    <dt className="text-neutral-500">Empresa</dt>
                    <dd className="mt-1 font-semibold text-neutral-950">
                      {order.company_name ?? "—"}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-neutral-500">NIF</dt>
                    <dd className="mt-1 font-semibold text-neutral-950">
                      {order.company_tax_id ?? "—"}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-neutral-500">Estado da fatura</dt>
                    <dd className="mt-1 font-semibold text-neutral-950">
                      {order.invoice_status ?? "—"}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-neutral-500">Número da fatura</dt>
                    <dd className="mt-1 font-semibold text-neutral-950">
                      {order.invoice_number ?? "—"}
                    </dd>
                  </div>
                </dl>

                {order.invoice_url ? (
                  <a
                    href={order.invoice_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex items-center text-sm font-semibold text-neutral-950 underline-offset-4 hover:underline"
                  >
                    Abrir fatura
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                ) : null}
              </article>

              <article className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-neutral-500" />
                  <h2 className="text-lg font-semibold text-neutral-950">
                    Morada de entrega
                  </h2>
                </div>

                {order.shipping_address ? (
                  <p className="mt-5 text-sm leading-7 text-neutral-600">
                    {order.shipping_address.company_name ??
                      order.shipping_address.contact_name}
                    <br />
                    {order.shipping_address.address_line_1}
                    {order.shipping_address.address_line_2
                      ? `, ${order.shipping_address.address_line_2}`
                      : ""}
                    <br />
                    {order.shipping_address.postal_code}{" "}
                    {order.shipping_address.city}
                    {order.shipping_address.district
                      ? ` · ${order.shipping_address.district}`
                      : ""}
                    <br />
                    {order.shipping_address.country_code}
                  </p>
                ) : (
                  <p className="mt-5 text-sm text-neutral-500">
                    Morada não disponível.
                  </p>
                )}
              </article>

              <article className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <Truck className="h-5 w-5 text-neutral-500" />
                  <h2 className="text-lg font-semibold text-neutral-950">
                    Expedição
                  </h2>
                </div>

                <dl className="mt-6 space-y-4 text-sm">
                  <div>
                    <dt className="text-neutral-500">Método</dt>
                    <dd className="mt-1 font-semibold text-neutral-950">
                      {order.shipping_method ?? "—"}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-neutral-500">Transportadora</dt>
                    <dd className="mt-1 font-semibold text-neutral-950">
                      {order.shipping_carrier ?? "—"}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-neutral-500">Tracking</dt>
                    <dd className="mt-1 font-semibold text-neutral-950">
                      {order.tracking_number ?? "—"}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-neutral-500">Data pretendida</dt>
                    <dd className="mt-1 font-semibold text-neutral-950">
                      {order.requested_shipping_date ?? "—"}
                    </dd>
                  </div>
                </dl>

                {order.tracking_url ? (
                  <a
                    href={order.tracking_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex items-center text-sm font-semibold text-neutral-950 underline-offset-4 hover:underline"
                  >
                    Acompanhar expedição
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                ) : null}
              </article>
            </section>

            <section>
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-neutral-500" />
                <h2 className="text-xl font-semibold text-neutral-950">
                  Produtos e personalizações
                </h2>
              </div>

              <div className="mt-5 space-y-5">
                {itemsWithUrls.map((item) => {
                  const internalReference = getRecordString(
                    item.personalization_data,
                    "internalReference",
                  );

                  return (
                    <article
                      key={item.id}
                      className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                            {item.product_sku}
                          </p>

                          <h3 className="mt-2 text-xl font-semibold text-neutral-950">
                            {item.product_name}
                          </h3>

                          <p className="mt-2 text-sm text-neutral-600">
                            {item.quantity.toLocaleString("pt-PT")} unidades
                          </p>
                        </div>

                        <p className="text-xl font-semibold text-neutral-950">
                          {formatPrice(item.total, order.currency)}
                        </p>
                      </div>

                      <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl bg-neutral-50 p-4">
                          <dt className="text-neutral-500">Produto / un.</dt>
                          <dd className="mt-1 font-semibold text-neutral-950">
                            {formatPrice(item.unit_price, order.currency)}
                          </dd>
                        </div>

                        <div className="rounded-2xl bg-neutral-50 p-4">
                          <dt className="text-neutral-500">Personalização</dt>
                          <dd className="mt-1 font-semibold text-neutral-950">
                            {formatPrice(
                              item.personalization_total,
                              order.currency,
                            )}
                          </dd>
                        </div>

                        <div className="rounded-2xl bg-neutral-50 p-4">
                          <dt className="text-neutral-500">Setup</dt>
                          <dd className="mt-1 font-semibold text-neutral-950">
                            {formatPrice(item.setup_cost, order.currency)}
                          </dd>
                        </div>

                        <div className="rounded-2xl bg-neutral-50 p-4">
                          <dt className="text-neutral-500">Extras</dt>
                          <dd className="mt-1 font-semibold text-neutral-950">
                            {formatPrice(item.extras_total, order.currency)}
                          </dd>
                        </div>
                      </dl>

                      {item.personalization_required ? (
                        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                          <div className="rounded-2xl border border-neutral-200 p-5">
                            <h4 className="font-semibold text-neutral-950">
                              Dados técnicos
                            </h4>

                            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                              <div>
                                <dt className="text-neutral-500">Localização</dt>
                                <dd className="mt-1 font-semibold text-neutral-950">
                                  {item.customization_location_name ?? "—"}
                                </dd>
                              </div>

                              <div>
                                <dt className="text-neutral-500">Técnica</dt>
                                <dd className="mt-1 font-semibold text-neutral-950">
                                  {item.customization_technique_name ?? "—"}
                                </dd>
                              </div>

                              <div>
                                <dt className="text-neutral-500">Componente</dt>
                                <dd className="mt-1 font-semibold text-neutral-950">
                                  {item.customization_component_name ?? "—"}
                                </dd>
                              </div>

                              <div>
                                <dt className="text-neutral-500">
                                  Área de impressão
                                </dt>
                                <dd className="mt-1 font-semibold text-neutral-950">
                                  {item.printing_area_label ?? "—"}
                                </dd>
                              </div>

                              <div>
                                <dt className="text-neutral-500">
                                  Tabela Stricker
                                </dt>
                                <dd className="mt-1 font-semibold text-neutral-950">
                                  {[item.table_code, item.table_code_option]
                                    .filter(Boolean)
                                    .join(" · ") || "—"}
                                </dd>
                              </div>

                              <div>
                                <dt className="text-neutral-500">
                                  Referência interna
                                </dt>
                                <dd className="mt-1 font-semibold text-neutral-950">
                                  {internalReference ?? "—"}
                                </dd>
                              </div>
                            </dl>

                            {item.personalization_notes ? (
                              <div className="mt-5 rounded-2xl bg-neutral-50 p-4 text-sm leading-6 text-neutral-600">
                                {item.personalization_notes}
                              </div>
                            ) : null}

                            <div className="mt-5 flex flex-wrap gap-3">
                              {item.resolvedLogoUrl ? (
                                <a
                                  href={item.resolvedLogoUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center rounded-2xl border border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:border-neutral-950"
                                >
                                  <FileImage className="mr-2 h-4 w-4" />
                                  Abrir logótipo
                                </a>
                              ) : null}

                              {item.resolvedMockupUrl ? (
                                <a
                                  href={item.resolvedMockupUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center rounded-2xl border border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:border-neutral-950"
                                >
                                  <FileText className="mr-2 h-4 w-4" />
                                  Abrir maquete
                                </a>
                              ) : null}

                              {item.technical_preview_url ? (
                                <a
                                  href={item.technical_preview_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center rounded-2xl border border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:border-neutral-950"
                                >
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  Preview técnico
                                </a>
                              ) : null}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-neutral-200 p-5">
                            <div className="flex items-center justify-between gap-3">
                              <h4 className="font-semibold text-neutral-950">
                                Estado da arte
                              </h4>

                              {item.artwork_approved ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                              ) : (
                                <Clock3 className="h-5 w-5 text-amber-500" />
                              )}
                            </div>

                            <p className="mt-3 text-sm text-neutral-600">
                              Estado atual:{" "}
                              <span className="font-semibold text-neutral-950">
                                {getTimelineLabel(item.artwork_status)}
                              </span>
                            </p>

                            <p className="mt-2 text-sm text-neutral-600">
                              Aprovação:{" "}
                              <span className="font-semibold text-neutral-950">
                                {item.artwork_approved
                                  ? "Aprovada"
                                  : "Por aprovar"}
                              </span>
                            </p>

                            <AdminArtworkForm
                              orderItemId={item.id}
                              artworkStatus={item.artwork_status}
                            />
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <article className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-neutral-500" />
                  <h2 className="text-lg font-semibold text-neutral-950">
                    Stripe
                  </h2>
                </div>

                <dl className="mt-6 space-y-4 text-sm">
                  <div>
                    <dt className="text-neutral-500">Estado do pagamento</dt>
                    <dd className="mt-1 font-semibold text-neutral-950">
                      {latestPayment?.status ?? order.payment_status}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-neutral-500">Payment Intent</dt>
                    <dd className="mt-1 break-all font-mono text-xs text-neutral-700">
                      {latestPayment?.provider_payment_intent_id ?? "—"}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-neutral-500">Checkout Session</dt>
                    <dd className="mt-1 break-all font-mono text-xs text-neutral-700">
                      {latestSession?.provider_session_id ?? "—"}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-neutral-500">Valor recebido</dt>
                    <dd className="mt-1 font-semibold text-neutral-950">
                      {formatPrice(
                        latestPayment?.amount_received ?? 0,
                        latestPayment?.currency ?? order.currency,
                      )}
                    </dd>
                  </div>
                </dl>

                {latestPayment?.failure_message ? (
                  <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
                    {latestPayment.failure_message}
                  </div>
                ) : null}
              </article>

              <article className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <ReceiptText className="h-5 w-5 text-neutral-500" />
                  <h2 className="text-lg font-semibold text-neutral-950">
                    Resumo financeiro
                  </h2>
                </div>

                <dl className="mt-6 space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-neutral-500">Produtos</dt>
                    <dd className="font-semibold text-neutral-950">
                      {formatPrice(order.subtotal, order.currency)}
                    </dd>
                  </div>

                  <div className="flex justify-between gap-4">
                    <dt className="text-neutral-500">Personalização</dt>
                    <dd className="font-semibold text-neutral-950">
                      {formatPrice(
                        order.personalization_total,
                        order.currency,
                      )}
                    </dd>
                  </div>

                  <div className="flex justify-between gap-4">
                    <dt className="text-neutral-500">Setup e extras</dt>
                    <dd className="font-semibold text-neutral-950">
                      {formatPrice(order.setup_total, order.currency)}
                    </dd>
                  </div>

                  <div className="flex justify-between gap-4">
                    <dt className="text-neutral-500">Expedição</dt>
                    <dd className="font-semibold text-neutral-950">
                      {formatPrice(order.shipping_total, order.currency)}
                    </dd>
                  </div>

                  <div className="flex justify-between gap-4">
                    <dt className="text-neutral-500">Desconto</dt>
                    <dd className="font-semibold text-neutral-950">
                      -{formatPrice(order.discount_total, order.currency)}
                    </dd>
                  </div>

                  <div className="flex justify-between gap-4">
                    <dt className="text-neutral-500">IVA</dt>
                    <dd className="font-semibold text-neutral-950">
                      {formatPrice(order.tax_total, order.currency)}
                    </dd>
                  </div>

                  <div className="border-t border-neutral-200 pt-4">
                    <div className="flex justify-between gap-4 text-lg">
                      <dt className="font-semibold text-neutral-950">Total</dt>
                      <dd className="font-semibold text-neutral-950">
                        {formatPrice(order.grand_total, order.currency)}
                      </dd>
                    </div>
                  </div>
                </dl>
              </article>
            </section>

            <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <Clock3 className="h-5 w-5 text-neutral-500" />
                <h2 className="text-xl font-semibold text-neutral-950">
                  Linha temporal
                </h2>
              </div>

              <div className="mt-6 space-y-5">
                {history.map((event) => (
                  <article
                    key={event.id}
                    className="relative border-l-2 border-neutral-200 pl-6"
                  >
                    <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-neutral-950" />

                    <p className="font-semibold text-neutral-950">
                      {getTimelineLabel(event.new_status)}
                    </p>

                    <p className="mt-1 text-xs text-neutral-500">
                      {formatDate(event.created_at)}
                    </p>

                    {event.notes ? (
                      <p className="mt-3 text-sm leading-6 text-neutral-600">
                        {event.notes}
                      </p>
                    ) : null}
                  </article>
                ))}

                {history.length === 0 ? (
                  <p className="text-sm text-neutral-500">
                    Ainda não existem eventos registados.
                  </p>
                ) : null}
              </div>
            </section>
          </div>

          <aside className="space-y-6 xl:sticky xl:top-8 xl:self-start">
            <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-neutral-950">
                Estado operacional
              </h2>

              <div className="mt-5">
                <AdminOrderStatusForm
                  orderId={order.id}
                  currentStatus={order.status}
                />
              </div>
            </section>

            <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-neutral-950">
                Integração Stricker
              </h2>

              <div className="mt-5">
                <AdminSupplierStatusForm
                  orderId={order.id}
                  currentSupplierStatus={
                    order.supplier_submission_status
                  }
                />
              </div>

              {order.supplier_order_stamp ? (
                <p className="mt-5 break-all rounded-2xl bg-neutral-50 p-4 font-mono text-xs text-neutral-600">
                  {order.supplier_order_stamp}
                </p>
              ) : null}
            </section>

            <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-neutral-950">
                Tracking
              </h2>

              <div className="mt-5">
                <AdminTrackingForm
                  orderId={order.id}
                  shippingCarrier={order.shipping_carrier}
                  trackingNumber={order.tracking_number}
                  trackingUrl={order.tracking_url}
                />
              </div>
            </section>

            <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-neutral-950">
                Nota interna
              </h2>

              {order.internal_notes ? (
                <div className="mt-5 whitespace-pre-wrap rounded-2xl bg-neutral-50 p-4 text-sm leading-6 text-neutral-600">
                  {order.internal_notes}
                </div>
              ) : null}

              <div className="mt-5">
                <AdminOrderNoteForm orderId={order.id} />
              </div>
            </section>

            {order.customer_notes ? (
              <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-neutral-950">
                  Notas do cliente
                </h2>

                <p className="mt-4 text-sm leading-6 text-neutral-600">
                  {order.customer_notes}
                </p>
              </section>
            ) : null}
          </aside>
        </div>
      </section>
    </main>
  );
}