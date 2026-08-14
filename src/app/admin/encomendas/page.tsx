import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CheckCircle2,
  Clock3,
  Package,
  RefreshCw,
  Search,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type AdminOrdersPageProps = {
  searchParams?: Promise<{
    q?: string;
    estado?: string;
    pagamento?: string;
    stricker?: string;
    expedicao?: string;
    pagina?: string;
  }>;
};

type OrderRecord = {
  id: string;
  order_number: string;

  customer_name: string;
  customer_email: string;
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
  tax_total: number;
  grand_total: number;

  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;

  supplier_order_stamp: string | null;
  supplier_submission_error: string | null;

  tracking_number: string | null;
  tracking_url: string | null;

  paid_at: string | null;
  supplier_submitted_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;

  created_at: string;
  updated_at: string;
};

type OrderItemSummaryRecord = {
  order_id: string;
  quantity: number;
  personalization_required: boolean;
  artwork_approved: boolean;
  supplier_submission_status: string;
};

type OrderListItem = OrderRecord & {
  itemsCount: number;
  totalQuantity: number;
  personalizedItemsCount: number;
  approvedArtworkCount: number;
  submittedItemsCount: number;
};

type OrderStatistics = {
  total: number;
  pendingPayment: number;
  paid: number;
  supplierErrors: number;
  inProduction: number;
  shipped: number;
  completed: number;
  cancelled: number;
  delayed: number;
  revenue: number;
  supplierCosts: number;
  margin: number;
};

const PAGE_SIZE = 25;

const ORDER_STATUS_OPTIONS = [
  {
    value: "",
    label: "Todos os estados",
  },
  {
    value: "pending_payment",
    label: "A aguardar pagamento",
  },
  {
    value: "paid",
    label: "Pago",
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
    label: "Confirmada pelo fornecedor",
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
    value: "failed",
    label: "Falhou",
  },
];

const PAYMENT_STATUS_OPTIONS = [
  {
    value: "",
    label: "Todos os pagamentos",
  },
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

const SUPPLIER_STATUS_OPTIONS = [
  {
    value: "",
    label: "Todos os estados do fornecedor",
  },
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
    label: "Falhou",
  },
  {
    value: "cancelled",
    label: "Cancelada",
  },
];

const FULFILLMENT_STATUS_OPTIONS = [
  {
    value: "",
    label: "Todos os estados de expedição",
  },
  {
    value: "unfulfilled",
    label: "Por preparar",
  },
  {
    value: "partially_fulfilled",
    label: "Parcialmente preparada",
  },
  {
    value: "fulfilled",
    label: "Preparada",
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
];

function formatPrice(
  value: number | null | undefined,
  currency = "EUR",
): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency,
  }).format(Number(value ?? 0));
}

function formatDateTime(
  value: string | null | undefined,
): string {
  if (!value) {
    return "—";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
}

function formatNumber(
  value: number | null | undefined,
): string {
  return Number(value ?? 0).toLocaleString("pt-PT");
}

function getStatusLabel(
  status: string | null | undefined,
): string {
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
      return "Enviada ao fornecedor";

    case "supplier_confirmed":
      return "Confirmada pelo fornecedor";

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

    default:
      return status
        ? status.replaceAll("_", " ")
        : "Sem estado";
  }
}

function getStatusClasses(
  status: string | null | undefined,
): string {
  const normalizedStatus = status ?? "";

  if (
    [
      "paid",
      "submitted",
      "supplier_confirmed",
      "fulfilled",
      "shipped",
      "delivered",
    ].includes(normalizedStatus)
  ) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (
    [
      "failed",
      "cancelled",
      "refunded",
    ].includes(normalizedStatus)
  ) {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  if (
    [
      "pending",
      "pending_payment",
      "authorized",
      "ready_for_review",
      "approved_for_submission",
      "submitting",
      "partially_submitted",
      "partially_fulfilled",
      "processing",
      "in_production",
    ].includes(normalizedStatus)
  ) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-neutral-100 text-neutral-700 ring-neutral-200";
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

function buildOrdersPageHref(params: {
  query: string;
  status: string;
  paymentStatus: string;
  supplierStatus: string;
  fulfillmentStatus: string;
  page: number;
}): string {
  const searchParams = new URLSearchParams();

  if (params.query) {
    searchParams.set("q", params.query);
  }

  if (params.status) {
    searchParams.set("estado", params.status);
  }

  if (params.paymentStatus) {
    searchParams.set(
      "pagamento",
      params.paymentStatus,
    );
  }

  if (params.supplierStatus) {
    searchParams.set(
      "stricker",
      params.supplierStatus,
    );
  }

  if (params.fulfillmentStatus) {
    searchParams.set(
      "expedicao",
      params.fulfillmentStatus,
    );
  }

  searchParams.set("pagina", String(params.page));

  return `/admin/encomendas?${searchParams.toString()}`;
}

function sanitizeSearchQuery(value: string): string {
  return value
    .replace(/[%_(),]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

async function getOrderStatistics(): Promise<OrderStatistics> {
  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error } = await supabaseAdmin.from("orders").select("status,payment_status,fulfillment_status,supplier_submission_status,grand_total,supplier_cost_total,requested_shipping_date").is("deleted_at", null).returns<Array<{status:string;payment_status:string;fulfillment_status:string;supplier_submission_status:string;grand_total:number;supplier_cost_total:number;requested_shipping_date:string|null}>>();
  if(error)throw new Error(error.message);const rows=data??[];const today=new Date().toISOString().slice(0,10);const paid=rows.filter(row=>row.payment_status==="paid");const revenue=paid.reduce((sum,row)=>sum+Number(row.grand_total??0),0);const supplierCosts=paid.reduce((sum,row)=>sum+Number(row.supplier_cost_total??0),0);
  return {total:rows.length,pendingPayment:rows.filter(row=>row.payment_status==="pending").length,paid:paid.length,supplierErrors:rows.filter(row=>row.supplier_submission_status==="failed").length,inProduction:rows.filter(row=>row.status==="in_production").length,shipped:rows.filter(row=>row.fulfillment_status==="shipped").length,completed:rows.filter(row=>row.status==="delivered"||row.fulfillment_status==="delivered").length,cancelled:rows.filter(row=>row.status==="cancelled").length,delayed:rows.filter(row=>Boolean(row.requested_shipping_date&&row.requested_shipping_date<today)&&!["delivered","cancelled"].includes(row.fulfillment_status)).length,revenue,supplierCosts,margin:revenue-supplierCosts};
}

async function getOrders(params: {
  query: string;
  status: string;
  paymentStatus: string;
  supplierStatus: string;
  fulfillmentStatus: string;
  page: number;
}): Promise<{
  orders: OrderListItem[];
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
        currency,
        subtotal,
        personalization_total,
        setup_total,
        shipping_total,
        tax_total,
        grand_total,
        stripe_checkout_session_id,
        stripe_payment_intent_id,
        supplier_order_stamp,
        supplier_submission_error,
        tracking_number,
        tracking_url,
        paid_at,
        supplier_submitted_at,
        shipped_at,
        delivered_at,
        created_at,
        updated_at
      `,
      {
        count: "exact",
      },
    )
    .order("created_at", {
      ascending: false,
    })
    .is("deleted_at", null)
    .range(from, to);

  if (params.query) {
    queryBuilder = queryBuilder.or(
      [
        `order_number.ilike.%${params.query}%`,
        `customer_name.ilike.%${params.query}%`,
        `customer_email.ilike.%${params.query}%`,
        `company_name.ilike.%${params.query}%`,
        `company_tax_id.ilike.%${params.query}%`,
        `supplier_order_stamp.ilike.%${params.query}%`,
        `tracking_number.ilike.%${params.query}%`,
      ].join(","),
    );
  }

  if (params.status) {
    queryBuilder = queryBuilder.eq(
      "status",
      params.status,
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

  if (params.fulfillmentStatus) {
    queryBuilder = queryBuilder.eq(
      "fulfillment_status",
      params.fulfillmentStatus,
    );
  }

  const {
    data,
    error,
    count,
  } = await queryBuilder.returns<OrderRecord[]>();

  if (error) {
    throw new Error(error.message);
  }

  const orderRows = data ?? [];
  const orderIds = orderRows.map(
    (order) => order.id,
  );

  const itemsByOrder = new Map<
    string,
    OrderItemSummaryRecord[]
  >();

  if (orderIds.length > 0) {
    const { data: itemRows, error: itemError } =
      await supabaseAdmin
        .from("order_items")
        .select(
          `
            order_id,
            quantity,
            personalization_required,
            artwork_approved,
            supplier_submission_status
          `,
        )
        .in("order_id", orderIds)
        .returns<OrderItemSummaryRecord[]>();

    if (itemError) {
      throw new Error(itemError.message);
    }

    for (const item of itemRows ?? []) {
      const existingItems =
        itemsByOrder.get(item.order_id) ?? [];

      existingItems.push(item);

      itemsByOrder.set(
        item.order_id,
        existingItems,
      );
    }
  }

  const orders: OrderListItem[] =
    orderRows.map((order) => {
      const items =
        itemsByOrder.get(order.id) ?? [];

      return {
        ...order,
        itemsCount: items.length,
        totalQuantity: items.reduce(
          (total, item) =>
            total + Number(item.quantity ?? 0),
          0,
        ),
        personalizedItemsCount: items.filter(
          (item) =>
            item.personalization_required,
        ).length,
        approvedArtworkCount: items.filter(
          (item) => item.artwork_approved,
        ).length,
        submittedItemsCount: items.filter(
          (item) =>
            item.supplier_submission_status ===
            "submitted",
        ).length,
      };
    });

  return {
    orders,
    count: count ?? 0,
  };
}

function StatisticsCard({
  label,
  value,
  description,
  icon: Icon,
  variant = "neutral",
}: {
  label: string;
  value: number;
  description: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  variant?:
    | "neutral"
    | "success"
    | "warning"
    | "error";
}) {
  const iconClasses =
    variant === "success"
      ? "bg-emerald-100 text-emerald-700"
      : variant === "warning"
        ? "bg-amber-100 text-amber-700"
        : variant === "error"
          ? "bg-red-100 text-red-700"
          : "bg-neutral-100 text-neutral-700";

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-neutral-500">
            {label}
          </p>

          <p className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">
            {value.toLocaleString("pt-PT")}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconClasses}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <p className="mt-4 text-xs leading-5 text-neutral-500">
        {description}
      </p>
    </div>
  );
}

export default async function AdminOrdersPage({
  searchParams,
}: AdminOrdersPageProps) {
  await assertAdminAccess("/admin/encomendas");

  const resolvedSearchParams =
    await searchParams;

  const query = sanitizeSearchQuery(
    resolvedSearchParams?.q ?? "",
  );

  const status =
    resolvedSearchParams?.estado?.trim() ?? "";

  const paymentStatus =
    resolvedSearchParams?.pagamento?.trim() ??
    "";

  const supplierStatus =
    resolvedSearchParams?.stricker?.trim() ??
    "";

  const fulfillmentStatus =
    resolvedSearchParams?.expedicao?.trim() ??
    "";

  const requestedPage = Number(
    resolvedSearchParams?.pagina ?? 1,
  );

  const page =
    Number.isFinite(requestedPage) &&
    requestedPage > 0
      ? Math.floor(requestedPage)
      : 1;

  const [statistics, result] =
    await Promise.all([
      getOrderStatistics(),
      getOrders({
        query,
        status,
        paymentStatus,
        supplierStatus,
        fulfillmentStatus,
        page,
      }),
    ]);

  const totalPages = Math.max(
    1,
    Math.ceil(result.count / PAGE_SIZE),
  );

  const hasActiveFilters = Boolean(
    query ||
      status ||
      paymentStatus ||
      supplierStatus ||
      fulfillmentStatus,
  );

  return (
    <main className="min-h-screen bg-neutral-50 px-5 py-8 lg:px-8">
      <section className="mx-auto max-w-[1700px]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Backoffice
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950 lg:text-4xl">
              Encomendas
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
              Acompanhe pagamentos, produtos,
              personalizações, aprovação de artes,
              submissão automática ao fornecedor,
              produção, expedição, tracking e
              faturação.
            </p>
          </div>

          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-2xl border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-950 transition hover:border-neutral-950"
          >
            Voltar ao backoffice
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <StatisticsCard
            label="Total"
            value={statistics.total}
            description="Todas as encomendas registadas."
            icon={ShoppingBag}
          />

          <StatisticsCard
            label="A aguardar pagamento"
            value={statistics.pendingPayment}
            description="Encomendas ainda não liquidadas."
            icon={Clock3}
            variant="warning"
          />

          <StatisticsCard
            label="Pagas"
            value={statistics.paid}
            description="Pagamentos confirmados."
            icon={CircleDollarSign}
            variant="success"
          />

          <StatisticsCard
            label="Erros do fornecedor"
            value={statistics.supplierErrors}
            description="Submissões que exigem atenção."
            icon={AlertTriangle}
            variant="error"
          />

          <StatisticsCard
            label="Em produção"
            value={statistics.inProduction}
            description="Encomendas atualmente em produção."
            icon={RefreshCw}
            variant="warning"
          />

          <StatisticsCard
            label="Expedidas"
            value={statistics.shipped}
            description="Expedidas ou já entregues."
            icon={Truck}
            variant="success"
          />
          <StatisticsCard label="Concluídas" value={statistics.completed} description="Entregues ao cliente final." icon={CheckCircle2} variant="success" />
          <StatisticsCard label="Canceladas" value={statistics.cancelled} description="Encomendas canceladas." icon={AlertTriangle} variant="error" />
          <StatisticsCard label="Atrasadas" value={statistics.delayed} description="Ultrapassaram a data de entrega solicitada." icon={Clock3} variant="error" />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <FinancialCard label="Faturação paga" value={statistics.revenue} description="Total de encomendas com pagamento confirmado." />
          <FinancialCard label="Custos do fornecedor" value={statistics.supplierCosts} description="Valores de compra registados nas encomendas." />
          <FinancialCard label="Margem bruta" value={statistics.margin} description="Faturação paga menos os custos do fornecedor registados." />
        </div>

        <form
          action="/admin/encomendas"
          method="get"
          className="mt-8 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm"
        >
          <div className="grid gap-4 xl:grid-cols-[minmax(280px,1.5fr)_repeat(4,minmax(170px,1fr))_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Número, cliente, empresa, e-mail, NIF ou tracking"
                className="w-full rounded-2xl border border-neutral-300 bg-white py-3 pl-11 pr-4 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
              />
            </div>

            <select
              name="estado"
              defaultValue={status}
              className="rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
            >
              {ORDER_STATUS_OPTIONS.map(
                (option) => (
                  <option
                    key={
                      option.value ||
                      "all-orders"
                    }
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ),
              )}
            </select>

            <select
              name="pagamento"
              defaultValue={paymentStatus}
              className="rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
            >
              {PAYMENT_STATUS_OPTIONS.map(
                (option) => (
                  <option
                    key={
                      option.value ||
                      "all-payments"
                    }
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ),
              )}
            </select>

            <select
              name="stricker"
              defaultValue={supplierStatus}
              className="rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
            >
              {SUPPLIER_STATUS_OPTIONS.map(
                (option) => (
                  <option
                    key={
                      option.value ||
                      "all-supplier-statuses"
                    }
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ),
              )}
            </select>

            <select
              name="expedicao"
              defaultValue={fulfillmentStatus}
              className="rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
            >
              {FULFILLMENT_STATUS_OPTIONS.map(
                (option) => (
                  <option
                    key={
                      option.value ||
                      "all-fulfillment-statuses"
                    }
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ),
              )}
            </select>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              <Search className="mr-2 h-4 w-4" />
              Filtrar
            </button>
          </div>

          {hasActiveFilters ? (
            <div className="mt-4 flex justify-end">
              <Link
                href="/admin/encomendas"
                className="text-sm font-semibold text-neutral-500 underline-offset-4 transition hover:text-neutral-950 hover:underline"
              >
                Limpar filtros
              </Link>
            </div>
          ) : null}
        </form>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-neutral-500">
            {result.count.toLocaleString(
              "pt-PT",
            )}{" "}
            encomendas encontradas
          </p>

          <p className="text-sm text-neutral-500">
            Página {page} de {totalPages}
          </p>
        </div>

        <div className="mt-4 space-y-4">
          {result.orders.map((order) => {
            const hasSupplierError =
              order.supplier_submission_status ===
                "failed" ||
              Boolean(
                order.supplier_submission_error,
              );

            const hasPaymentError =
              order.payment_status === "failed";

            const personalizedProgress =
              order.personalizedItemsCount > 0
                ? `${order.approvedArtworkCount}/${order.personalizedItemsCount}`
                : "—";

            const supplierProgress =
              order.itemsCount > 0
                ? `${order.submittedItemsCount}/${order.itemsCount}`
                : "—";

            return (
              <article
                key={order.id}
                className={`overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:shadow-md ${
                  hasSupplierError ||
                  hasPaymentError
                    ? "border-red-200"
                    : "border-neutral-200"
                }`}
              >
                {hasSupplierError ||
                hasPaymentError ? (
                  <div className="flex items-start gap-3 border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-800">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

                    <p>
                      {hasPaymentError
                        ? "O pagamento desta encomenda falhou."
                        : "A submissão desta encomenda ao fornecedor requer atenção."}
                    </p>
                  </div>
                ) : null}

                <div className="grid gap-6 p-5 xl:grid-cols-[minmax(280px,1.3fr)_minmax(220px,1fr)_repeat(4,minmax(135px,0.7fr))_auto] xl:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                        {order.order_number}
                      </p>

                      <StatusBadge
                        status={order.status}
                      />
                    </div>

                    <h2 className="mt-3 text-lg font-semibold text-neutral-950">
                      {order.company_name ??
                        order.customer_name}
                    </h2>

                    {order.company_name ? (
                      <p className="mt-1 text-sm text-neutral-600">
                        {order.customer_name}
                      </p>
                    ) : null}

                    <p className="mt-2 text-sm text-neutral-500">
                      {order.customer_email}
                    </p>

                    <p className="mt-3 text-xs text-neutral-400">
                      Criada em{" "}
                      {formatDateTime(
                        order.created_at,
                      )}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-neutral-50 p-4">
                      <Package className="h-4 w-4 text-neutral-500" />

                      <p className="mt-3 text-xs text-neutral-500">
                        Produtos
                      </p>

                      <p className="mt-1 font-semibold text-neutral-950">
                        {order.itemsCount}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-neutral-50 p-4">
                      <ShoppingBag className="h-4 w-4 text-neutral-500" />

                      <p className="mt-3 text-xs text-neutral-500">
                        Unidades
                      </p>

                      <p className="mt-1 font-semibold text-neutral-950">
                        {formatNumber(
                          order.totalQuantity,
                        )}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                      Pagamento
                    </p>

                    <div className="mt-2">
                      <StatusBadge
                        status={
                          order.payment_status
                        }
                      />
                    </div>

                    {order.paid_at ? (
                      <p className="mt-2 text-xs text-neutral-400">
                        {formatDateTime(
                          order.paid_at,
                        )}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                      Artes
                    </p>

                    <p className="mt-2 font-semibold text-neutral-950">
                      {personalizedProgress}
                    </p>

                    <p className="mt-1 text-xs text-neutral-500">
                      aprovadas
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                      Fornecedor
                    </p>

                    <div className="mt-2">
                      <StatusBadge
                        status={
                          order.supplier_submission_status
                        }
                      />
                    </div>

                    <p className="mt-2 text-xs text-neutral-500">
                      Linhas: {supplierProgress}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                      Expedição
                    </p>

                    <div className="mt-2">
                      <StatusBadge
                        status={
                          order.fulfillment_status
                        }
                      />
                    </div>

                    {order.tracking_number ? (
                      <p className="mt-2 truncate text-xs text-neutral-500">
                        {order.tracking_number}
                      </p>
                    ) : null}
                  </div>

                  <div className="xl:text-right">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                      Total
                    </p>

                    <p className="mt-2 text-xl font-semibold text-neutral-950">
                      {formatPrice(
                        order.grand_total,
                        order.currency,
                      )}
                    </p>

                    <div className="mt-4 flex gap-2 xl:justify-end"><Link href={`/admin/encomendas/${order.id}`} className="inline-flex items-center justify-center rounded-2xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white">Ver encomenda<ArrowRight className="ml-2 h-4 w-4"/></Link></div>
                  </div>
                </div>

                <div className="grid border-t border-neutral-200 bg-neutral-50 sm:grid-cols-3">
                  <div className="border-b border-neutral-200 px-5 py-3 text-xs text-neutral-500 sm:border-b-0 sm:border-r">
                    Produtos:{" "}
                    <span className="font-semibold text-neutral-950">
                      {formatPrice(
                        order.subtotal,
                        order.currency,
                      )}
                    </span>
                  </div>

                  <div className="border-b border-neutral-200 px-5 py-3 text-xs text-neutral-500 sm:border-b-0 sm:border-r">
                    Personalização e setup:{" "}
                    <span className="font-semibold text-neutral-950">
                      {formatPrice(
                        Number(
                          order.personalization_total ??
                            0,
                        ) +
                          Number(
                            order.setup_total ?? 0,
                          ),
                        order.currency,
                      )}
                    </span>
                  </div>

                  <div className="px-5 py-3 text-xs text-neutral-500">
                    Expedição + IVA:{" "}
                    <span className="font-semibold text-neutral-950">
                      {formatPrice(
                        Number(
                          order.shipping_total ?? 0,
                        ) +
                          Number(
                            order.tax_total ?? 0,
                          ),
                        order.currency,
                      )}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {result.orders.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-neutral-300 bg-white p-12 text-center">
            <ShoppingBag className="mx-auto h-9 w-9 text-neutral-400" />

            <h2 className="mt-5 text-lg font-semibold text-neutral-950">
              Nenhuma encomenda encontrada
            </h2>

            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Altere os filtros de pesquisa ou
              confirme se já existem encomendas
              concluídas no checkout.
            </p>

            {hasActiveFilters ? (
              <Link
                href="/admin/encomendas"
                className="mt-5 inline-flex rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
              >
                Limpar filtros
              </Link>
            ) : null}
          </div>
        ) : null}

        {totalPages > 1 ? (
          <nav className="mt-8 flex items-center justify-center gap-3">
            {page > 1 ? (
              <Link
                href={buildOrdersPageHref({
                  query,
                  status,
                  paymentStatus,
                  supplierStatus,
                  fulfillmentStatus,
                  page: page - 1,
                })}
                className="inline-flex items-center rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 transition hover:border-neutral-400"
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

            <span className="rounded-2xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white">
              {page} / {totalPages}
            </span>

            {page < totalPages ? (
              <Link
                href={buildOrdersPageHref({
                  query,
                  status,
                  paymentStatus,
                  supplierStatus,
                  fulfillmentStatus,
                  page: page + 1,
                })}
                className="inline-flex items-center rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 transition hover:border-neutral-400"
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

function FinancialCard({ label, value, description }: { label: string; value: number; description: string }) {
  return <article className="rounded-3xl border border-neutral-200 bg-neutral-950 p-5 text-white shadow-sm"><p className="text-sm text-white/60">{label}</p><p className="mt-2 text-2xl font-semibold">{formatPrice(value)}</p><p className="mt-4 text-xs leading-5 text-white/50">{description}</p></article>;
}
