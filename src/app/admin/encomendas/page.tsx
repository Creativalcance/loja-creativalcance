import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  PackageCheck,
  PackageOpen,
  RefreshCw,
  Search,
  ShoppingBag,
  UserRound,
  XCircle,
} from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type OrderStatus =
  | "pending_payment"
  | "paid"
  | "processing"
  | "sent_to_supplier"
  | "supplier_confirmed"
  | "in_production"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"
  | "failed";

type PaymentStatus =
  | "pending"
  | "authorized"
  | "paid"
  | "failed"
  | "refunded"
  | "partially_refunded"
  | "cancelled";

type SupplierSubmissionStatus =
  | "not_submitted"
  | "ready_for_review"
  | "approved_for_submission"
  | "submitting"
  | "submitted"
  | "partially_submitted"
  | "failed"
  | "cancelled";

type AdminProfile = {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
};

type OrderItemSummary = {
  id: string;
  quantity: number;
  total: number;
  personalization_required: boolean;
  artwork_status: string;
  artwork_approved: boolean;
  supplier_submission_status: string;
};

type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  company_name: string | null;
  company_tax_id: string | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  fulfillment_status: string;
  supplier_submission_status: SupplierSubmissionStatus;
  supplier_order_stamp: string | null;
  supplier_submission_error: string | null;
  currency: string;
  subtotal: number;
  personalization_total: number;
  setup_total: number;
  shipping_total: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  shipping_method: string | null;
  shipping_carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  invoice_number: string | null;
  invoice_url: string | null;
  invoice_status: string | null;
  internal_reference: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  order_items: OrderItemSummary[] | null;
};

type OrdersPageSearchParams = {
  q?: string;
  estado?: string;
  pagamento?: string;
  stricker?: string;
  pagina?: string;
};

type AdminOrdersPageProps = {
  searchParams?: Promise<OrdersPageSearchParams>;
};

type OrderStats = {
  total: number;
  pendingPayment: number;
  paid: number;
  needsReview: number;
  supplierFailed: number;
};

const PAGE_SIZE = 25;

const ORDER_STATUS_OPTIONS: Array<{
  value: OrderStatus;
  label: string;
}> = [
  {
    value: "pending_payment",
    label: "A aguardar pagamento",
  },
  {
    value: "paid",
    label: "Paga",
  },
  {
    value: "processing",
    label: "Em processamento",
  },
  {
    value: "sent_to_supplier",
    label: "Enviada ao fornecedor",
  },
  {
    value: "supplier_confirmed",
    label: "Confirmada pela Stricker",
  },
  {
    value: "in_production",
    label: "Em produção",
  },
  {
    value: "shipped",
    label: "Expedida",
  },
  {
    value: "delivered",
    label: "Entregue",
  },
  {
    value: "cancelled",
    label: "Cancelada",
  },
  {
    value: "refunded",
    label: "Reembolsada",
  },
  {
    value: "failed",
    label: "Com erro",
  },
];

const PAYMENT_STATUS_OPTIONS: Array<{
  value: PaymentStatus;
  label: string;
}> = [
  {
    value: "pending",
    label: "Pendente",
  },
  {
    value: "authorized",
    label: "Autorizado",
  },
  {
    value: "paid",
    label: "Pago",
  },
  {
    value: "failed",
    label: "Falhou",
  },
  {
    value: "refunded",
    label: "Reembolsado",
  },
  {
    value: "partially_refunded",
    label: "Parcialmente reembolsado",
  },
  {
    value: "cancelled",
    label: "Cancelado",
  },
];

const SUPPLIER_STATUS_OPTIONS: Array<{
  value: SupplierSubmissionStatus;
  label: string;
}> = [
  {
    value: "not_submitted",
    label: "Não submetida",
  },
  {
    value: "ready_for_review",
    label: "Pronta para validação",
  },
  {
    value: "approved_for_submission",
    label: "Aprovada para submissão",
  },
  {
    value: "submitting",
    label: "A submeter",
  },
  {
    value: "submitted",
    label: "Submetida",
  },
  {
    value: "partially_submitted",
    label: "Parcialmente submetida",
  },
  {
    value: "failed",
    label: "Erro de submissão",
  },
  {
    value: "cancelled",
    label: "Cancelada",
  },
];

function formatPrice(
  value: number,
  currency = "EUR",
): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency,
  }).format(Number(value ?? 0));
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  }).format(new Date(value));
}

function getOrderStatusLabel(status: OrderStatus): string {
  return (
    ORDER_STATUS_OPTIONS.find(
      (option) => option.value === status,
    )?.label ?? status
  );
}

function getPaymentStatusLabel(
  status: PaymentStatus,
): string {
  return (
    PAYMENT_STATUS_OPTIONS.find(
      (option) => option.value === status,
    )?.label ?? status
  );
}

function getSupplierStatusLabel(
  status: SupplierSubmissionStatus,
): string {
  return (
    SUPPLIER_STATUS_OPTIONS.find(
      (option) => option.value === status,
    )?.label ?? status
  );
}

function getOrderStatusClasses(status: OrderStatus): string {
  switch (status) {
    case "paid":
      return "bg-blue-50 text-blue-700 ring-blue-200";

    case "processing":
    case "sent_to_supplier":
    case "supplier_confirmed":
    case "in_production":
      return "bg-amber-50 text-amber-700 ring-amber-200";

    case "shipped":
      return "bg-violet-50 text-violet-700 ring-violet-200";

    case "delivered":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";

    case "cancelled":
    case "refunded":
      return "bg-neutral-100 text-neutral-600 ring-neutral-200";

    case "failed":
      return "bg-red-50 text-red-700 ring-red-200";

    case "pending_payment":
    default:
      return "bg-orange-50 text-orange-700 ring-orange-200";
  }
}

function getPaymentStatusClasses(
  status: PaymentStatus,
): string {
  switch (status) {
    case "paid":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";

    case "authorized":
      return "bg-blue-50 text-blue-700 ring-blue-200";

    case "pending":
      return "bg-amber-50 text-amber-700 ring-amber-200";

    case "refunded":
    case "partially_refunded":
      return "bg-violet-50 text-violet-700 ring-violet-200";

    case "failed":
    case "cancelled":
    default:
      return "bg-red-50 text-red-700 ring-red-200";
  }
}

function getSupplierStatusClasses(
  status: SupplierSubmissionStatus,
): string {
  switch (status) {
    case "submitted":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";

    case "submitting":
      return "bg-blue-50 text-blue-700 ring-blue-200";

    case "approved_for_submission":
      return "bg-cyan-50 text-cyan-700 ring-cyan-200";

    case "ready_for_review":
      return "bg-amber-50 text-amber-700 ring-amber-200";

    case "partially_submitted":
      return "bg-orange-50 text-orange-700 ring-orange-200";

    case "failed":
      return "bg-red-50 text-red-700 ring-red-200";

    case "cancelled":
      return "bg-neutral-100 text-neutral-600 ring-neutral-200";

    case "not_submitted":
    default:
      return "bg-neutral-100 text-neutral-600 ring-neutral-200";
  }
}

function getOrderUnits(order: OrderRow): number {
  return (order.order_items ?? []).reduce(
    (total, item) => total + Number(item.quantity ?? 0),
    0,
  );
}

function getPersonalizedItemCount(order: OrderRow): number {
  return (order.order_items ?? []).filter(
    (item) => item.personalization_required,
  ).length;
}

function hasArtworkPending(order: OrderRow): boolean {
  return (order.order_items ?? []).some(
    (item) =>
      item.personalization_required &&
      (!item.artwork_approved ||
        !["approved", "production_ready"].includes(
          item.artwork_status,
        )),
  );
}

function needsOperationalAttention(order: OrderRow): boolean {
  if (
    order.status === "failed" ||
    order.payment_status === "failed" ||
    order.supplier_submission_status === "failed"
  ) {
    return true;
  }

  if (
    order.payment_status === "paid" &&
    order.supplier_submission_status === "ready_for_review"
  ) {
    return true;
  }

  return hasArtworkPending(order);
}

function sanitizeSearchQuery(value: string): string {
  return value
    .replace(/[%_(),]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

function parseOrderStatus(
  value: string | undefined,
): OrderStatus | null {
  return ORDER_STATUS_OPTIONS.some(
    (option) => option.value === value,
  )
    ? (value as OrderStatus)
    : null;
}

function parsePaymentStatus(
  value: string | undefined,
): PaymentStatus | null {
  return PAYMENT_STATUS_OPTIONS.some(
    (option) => option.value === value,
  )
    ? (value as PaymentStatus)
    : null;
}

function parseSupplierStatus(
  value: string | undefined,
): SupplierSubmissionStatus | null {
  return SUPPLIER_STATUS_OPTIONS.some(
    (option) => option.value === value,
  )
    ? (value as SupplierSubmissionStatus)
    : null;
}

function buildPageHref(params: {
  query: string;
  orderStatus: OrderStatus | null;
  paymentStatus: PaymentStatus | null;
  supplierStatus: SupplierSubmissionStatus | null;
  page: number;
}): string {
  const searchParams = new URLSearchParams();

  if (params.query) {
    searchParams.set("q", params.query);
  }

  if (params.orderStatus) {
    searchParams.set("estado", params.orderStatus);
  }

  if (params.paymentStatus) {
    searchParams.set(
      "pagamento",
      params.paymentStatus,
    );
  }

  if (params.supplierStatus) {
    searchParams.set("stricker", params.supplierStatus);
  }

  if (params.page > 1) {
    searchParams.set("pagina", String(params.page));
  }

  const queryString = searchParams.toString();

  return queryString
    ? `/admin/encomendas?${queryString}`
    : "/admin/encomendas";
}

async function requireAdmin(): Promise<AdminProfile> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", user.id)
    .maybeSingle<AdminProfile>();

  if (
    error ||
    !profile ||
    !["admin", "super_admin"].includes(profile.role)
  ) {
    redirect("/");
  }

  return profile;
}

async function getOrderStats(): Promise<OrderStats> {
  const supabaseAdmin = createSupabaseAdminClient();

  const [
    totalResult,
    pendingPaymentResult,
    paidResult,
    reviewResult,
    failedResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("orders")
      .select("id", {
        count: "exact",
        head: true,
      }),

    supabaseAdmin
      .from("orders")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("payment_status", "pending"),

    supabaseAdmin
      .from("orders")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("payment_status", "paid"),

    supabaseAdmin
      .from("orders")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "supplier_submission_status",
        "ready_for_review",
      ),

    supabaseAdmin
      .from("orders")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("supplier_submission_status", "failed"),
  ]);

  return {
    total: totalResult.count ?? 0,
    pendingPayment: pendingPaymentResult.count ?? 0,
    paid: paidResult.count ?? 0,
    needsReview: reviewResult.count ?? 0,
    supplierFailed: failedResult.count ?? 0,
  };
}

async function getOrders(params: {
  query: string;
  orderStatus: OrderStatus | null;
  paymentStatus: PaymentStatus | null;
  supplierStatus: SupplierSubmissionStatus | null;
  page: number;
}): Promise<{
  orders: OrderRow[];
  count: number;
}> {
  const supabaseAdmin = createSupabaseAdminClient();

  const from = (params.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let queryBuilder = supabaseAdmin
    .from("orders")
    .select(
      `
        id,
        order_number,
        customer_name,
        customer_email,
        customer_phone,
        company_name,
        company_tax_id,
        status,
        payment_status,
        fulfillment_status,
        supplier_submission_status,
        supplier_order_stamp,
        supplier_submission_error,
        currency,
        subtotal,
        personalization_total,
        setup_total,
        shipping_total,
        discount_total,
        tax_total,
        grand_total,
        stripe_checkout_session_id,
        stripe_payment_intent_id,
        shipping_method,
        shipping_carrier,
        tracking_number,
        tracking_url,
        invoice_number,
        invoice_url,
        invoice_status,
        internal_reference,
        paid_at,
        created_at,
        updated_at,
        order_items (
          id,
          quantity,
          total,
          personalization_required,
          artwork_status,
          artwork_approved,
          supplier_submission_status
        )
      `,
      {
        count: "exact",
      },
    )
    .order("created_at", {
      ascending: false,
    })
    .range(from, to);

  if (params.query) {
    queryBuilder = queryBuilder.or(
      [
        `order_number.ilike.%${params.query}%`,
        `customer_name.ilike.%${params.query}%`,
        `customer_email.ilike.%${params.query}%`,
        `company_name.ilike.%${params.query}%`,
        `internal_reference.ilike.%${params.query}%`,
        `supplier_order_stamp.ilike.%${params.query}%`,
      ].join(","),
    );
  }

  if (params.orderStatus) {
    queryBuilder = queryBuilder.eq(
      "status",
      params.orderStatus,
    );
  }

  if (params.paymentStatus) {
    queryBuilder = queryBuilder.eq(
      "payment_status",
      params.paymentStatus,
    );
  }

  if (params.supplierStatus) {
    queryBuilder = queryBuilder.eq(
      "supplier_submission_status",
      params.supplierStatus,
    );
  }

  const { data, error, count } =
    await queryBuilder.returns<OrderRow[]>();

  if (error) {
    throw new Error(
      `Não foi possível carregar as encomendas: ${error.message}`,
    );
  }

  return {
    orders: data ?? [],
    count: count ?? 0,
  };
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  alert = false,
}: {
  title: string;
  value: number;
  description: string;
  icon: typeof ShoppingBag;
  alert?: boolean;
}) {
  return (
    <article
      className={`rounded-3xl border p-5 shadow-sm ${
        alert
          ? "border-red-200 bg-red-50"
          : "border-neutral-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className={`text-sm font-medium ${
              alert ? "text-red-700" : "text-neutral-500"
            }`}
          >
            {title}
          </p>

          <p
            className={`mt-3 text-3xl font-semibold tracking-tight ${
              alert ? "text-red-950" : "text-neutral-950"
            }`}
          >
            {value.toLocaleString("pt-PT")}
          </p>
        </div>

        <div
          className={`rounded-2xl p-3 ${
            alert
              ? "bg-red-100 text-red-700"
              : "bg-neutral-100 text-neutral-700"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <p
        className={`mt-4 text-xs leading-5 ${
          alert ? "text-red-700" : "text-neutral-500"
        }`}
      >
        {description}
      </p>
    </article>
  );
}

export default async function AdminOrdersPage({
  searchParams,
}: AdminOrdersPageProps) {
  await requireAdmin();

  const resolvedSearchParams = await searchParams;

  const query = sanitizeSearchQuery(
    resolvedSearchParams?.q ?? "",
  );

  const orderStatus = parseOrderStatus(
    resolvedSearchParams?.estado,
  );

  const paymentStatus = parsePaymentStatus(
    resolvedSearchParams?.pagamento,
  );

  const supplierStatus = parseSupplierStatus(
    resolvedSearchParams?.stricker,
  );

  const requestedPage = Number(
    resolvedSearchParams?.pagina ?? "1",
  );

  const page =
    Number.isFinite(requestedPage) && requestedPage > 0
      ? Math.floor(requestedPage)
      : 1;

  const [stats, result] = await Promise.all([
    getOrderStats(),
    getOrders({
      query,
      orderStatus,
      paymentStatus,
      supplierStatus,
      page,
    }),
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(result.count / PAGE_SIZE),
  );

  const hasActiveFilters = Boolean(
    query ||
      orderStatus ||
      paymentStatus ||
      supplierStatus,
  );

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-10">
      <section className="mx-auto max-w-[1700px]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <Link
              href="/admin"
              className="inline-flex text-sm font-semibold text-neutral-500 transition hover:text-neutral-950"
            >
              ← Voltar ao backoffice
            </Link>

            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Operações
            </p>

            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-neutral-950">
              Encomendas
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-6 text-neutral-600">
              Acompanhe o pagamento, a personalização, a
              aprovação da arte, a submissão à Stricker, a
              produção, a expedição e a faturação de cada
              encomenda.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/encomendas"
              className="inline-flex items-center rounded-2xl border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-700 shadow-sm transition hover:border-neutral-400"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Link>

            <Link
              href="/admin"
              className="inline-flex items-center rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              Painel principal
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            title="Total de encomendas"
            value={stats.total}
            description="Todas as encomendas registadas na plataforma."
            icon={ShoppingBag}
          />

          <StatCard
            title="A aguardar pagamento"
            value={stats.pendingPayment}
            description="Encomendas criadas que ainda não foram pagas."
            icon={Clock3}
          />

          <StatCard
            title="Pagas"
            value={stats.paid}
            description="Pagamentos confirmados pela Stripe."
            icon={CircleDollarSign}
          />

          <StatCard
            title="A validar"
            value={stats.needsReview}
            description="Pagas e prontas para validação operacional."
            icon={PackageCheck}
          />

          <StatCard
            title="Erros Stricker"
            value={stats.supplierFailed}
            description="Submissões que necessitam de intervenção."
            icon={AlertTriangle}
            alert={stats.supplierFailed > 0}
          />
        </div>

        <form
          action="/admin/encomendas"
          method="get"
          className="mt-8 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm"
        >
          <div className="grid gap-4 xl:grid-cols-[minmax(320px,1fr)_230px_230px_250px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Número, cliente, email, empresa ou referência"
                className="w-full rounded-2xl border border-neutral-300 bg-white py-3 pl-11 pr-4 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
              />
            </div>

            <select
              name="estado"
              defaultValue={orderStatus ?? ""}
              className="rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-700 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
            >
              <option value="">Todos os estados</option>

              {ORDER_STATUS_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>

            <select
              name="pagamento"
              defaultValue={paymentStatus ?? ""}
              className="rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-700 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
            >
              <option value="">Todos os pagamentos</option>

              {PAYMENT_STATUS_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>

            <select
              name="stricker"
              defaultValue={supplierStatus ?? ""}
              className="rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-700 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
            >
              <option value="">Todos os estados Stricker</option>

              {SUPPLIER_STATUS_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="rounded-2xl bg-neutral-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              Aplicar filtros
            </button>
          </div>

          {hasActiveFilters ? (
            <div className="mt-4 flex justify-end">
              <Link
                href="/admin/encomendas"
                className="inline-flex items-center text-sm font-semibold text-neutral-500 transition hover:text-neutral-950"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Limpar filtros
              </Link>
            </div>
          ) : null}
        </form>

        <div className="mt-6 flex flex-col gap-2 text-sm text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            {result.count.toLocaleString("pt-PT")}{" "}
            encomendas encontradas
          </p>

          <p>
            Página {page} de {totalPages}
          </p>
        </div>

        {result.orders.length > 0 ? (
          <div className="mt-4 space-y-4">
            {result.orders.map((order) => {
              const itemCount =
                order.order_items?.length ?? 0;

              const units = getOrderUnits(order);

              const personalizedItems =
                getPersonalizedItemCount(order);

              const artworkPending =
                hasArtworkPending(order);

              const attention =
                needsOperationalAttention(order);

              return (
                <article
                  key={order.id}
                  className={`overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:shadow-md ${
                    attention
                      ? "border-amber-300"
                      : "border-neutral-200"
                  }`}
                >
                  {attention ? (
                    <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-5 py-3 text-xs font-semibold text-amber-800">
                      <AlertTriangle className="h-4 w-4" />
                      Esta encomenda necessita de atenção
                      operacional.
                    </div>
                  ) : null}

                  <div className="grid gap-6 p-5 xl:grid-cols-[minmax(270px,1.2fr)_minmax(220px,1fr)_180px_180px_220px_160px] xl:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/admin/encomendas/${order.id}`}
                          className="text-lg font-semibold text-neutral-950 transition hover:underline"
                        >
                          {order.order_number}
                        </Link>

                        {order.internal_reference ? (
                          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
                            {order.internal_reference}
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-2 text-sm text-neutral-500">
                        Criada em{" "}
                        {formatDateTime(order.created_at)}
                      </p>

                      {order.paid_at ? (
                        <p className="mt-1 text-xs text-emerald-700">
                          Pagamento confirmado em{" "}
                          {formatDateTime(order.paid_at)}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <div className="flex items-start gap-3">
                        <div className="rounded-2xl bg-neutral-100 p-2.5 text-neutral-600">
                          <UserRound className="h-4 w-4" />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-semibold text-neutral-950">
                            {order.customer_name}
                          </p>

                          {order.company_name ? (
                            <p className="mt-1 truncate text-sm text-neutral-600">
                              {order.company_name}
                            </p>
                          ) : null}

                          <p className="mt-1 truncate text-xs text-neutral-500">
                            {order.customer_email}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                        Conteúdo
                      </p>

                      <p className="mt-2 font-semibold text-neutral-950">
                        {itemCount.toLocaleString("pt-PT")}{" "}
                        {itemCount === 1 ? "produto" : "produtos"}
                      </p>

                      <p className="mt-1 text-xs text-neutral-500">
                        {units.toLocaleString("pt-PT")} unidades
                      </p>

                      {personalizedItems > 0 ? (
                        <p
                          className={`mt-1 text-xs ${
                            artworkPending
                              ? "text-amber-700"
                              : "text-emerald-700"
                          }`}
                        >
                          {personalizedItems} com personalização
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                        Valor
                      </p>

                      <p className="mt-2 text-lg font-semibold text-neutral-950">
                        {formatPrice(
                          order.grand_total,
                          order.currency,
                        )}
                      </p>

                      <div className="mt-2 space-y-1 text-xs text-neutral-500">
                        <p>
                          Produto:{" "}
                          {formatPrice(
                            order.subtotal,
                            order.currency,
                          )}
                        </p>

                        <p>
                          Personalização:{" "}
                          {formatPrice(
                            order.personalization_total,
                            order.currency,
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${getOrderStatusClasses(
                            order.status,
                          )}`}
                        >
                          {getOrderStatusLabel(order.status)}
                        </span>
                      </div>

                      <div>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${getPaymentStatusClasses(
                            order.payment_status,
                          )}`}
                        >
                          Stripe:{" "}
                          {getPaymentStatusLabel(
                            order.payment_status,
                          )}
                        </span>
                      </div>

                      <div>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${getSupplierStatusClasses(
                            order.supplier_submission_status,
                          )}`}
                        >
                          Stricker:{" "}
                          {getSupplierStatusLabel(
                            order.supplier_submission_status,
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Link
                        href={`/admin/encomendas/${order.id}`}
                        className="inline-flex items-center justify-center rounded-2xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
                      >
                        Abrir
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Link>

                      {order.tracking_url ? (
                        <a
                          href={order.tracking_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 transition hover:border-neutral-400"
                        >
                          Tracking
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </a>
                      ) : null}
                    </div>
                  </div>

                  {order.supplier_submission_error ? (
                    <div className="border-t border-red-200 bg-red-50 px-5 py-4">
                      <div className="flex items-start gap-3">
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />

                        <div>
                          <p className="text-sm font-semibold text-red-900">
                            Erro de submissão à Stricker
                          </p>

                          <p className="mt-1 text-xs leading-5 text-red-700">
                            {order.supplier_submission_error}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-dashed border-neutral-300 bg-white p-14 text-center">
            <PackageOpen className="mx-auto h-10 w-10 text-neutral-400" />

            <h2 className="mt-5 text-xl font-semibold text-neutral-950">
              Nenhuma encomenda encontrada
            </h2>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-neutral-600">
              Não existem encomendas que correspondam aos
              filtros selecionados. Altere os filtros ou
              confirme se o checkout e o webhook da Stripe
              estão a criar corretamente os registos.
            </p>

            {hasActiveFilters ? (
              <Link
                href="/admin/encomendas"
                className="mt-6 inline-flex rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
              >
                Limpar filtros
              </Link>
            ) : null}
          </div>
        )}

        {totalPages > 1 ? (
          <nav className="mt-8 flex items-center justify-center gap-3">
            {page > 1 ? (
              <Link
                href={buildPageHref({
                  query,
                  orderStatus,
                  paymentStatus,
                  supplierStatus,
                  page: page - 1,
                })}
                className="inline-flex items-center rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 shadow-sm transition hover:border-neutral-400"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Anterior
              </Link>
            ) : (
              <span className="inline-flex cursor-not-allowed items-center rounded-2xl border border-neutral-200 bg-neutral-100 px-4 py-3 text-sm font-semibold text-neutral-400">
                <ChevronLeft className="mr-1 h-4 w-4" />
                Anterior
              </span>
            )}

            <span className="rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white">
              {page} / {totalPages}
            </span>

            {page < totalPages ? (
              <Link
                href={buildPageHref({
                  query,
                  orderStatus,
                  paymentStatus,
                  supplierStatus,
                  page: page + 1,
                })}
                className="inline-flex items-center rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 shadow-sm transition hover:border-neutral-400"
              >
                Seguinte
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            ) : (
              <span className="inline-flex cursor-not-allowed items-center rounded-2xl border border-neutral-200 bg-neutral-100 px-4 py-3 text-sm font-semibold text-neutral-400">
                Seguinte
                <ChevronRight className="ml-1 h-4 w-4" />
              </span>
            )}
          </nav>
        ) : null}
      </section>
    </main>
  );
}