import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  PackageCheck,
  Search,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  order_number: string;
  customer_email: string;
  customer_name: string;
  company_name: string | null;
  status: string;
  payment_status: string;
  fulfillment_status: string;
  supplier_submission_status: string;
  currency: string;
  grand_total: number;
  shipping_method: string | null;
  shipping_carrier: string | null;
  tracking_number: string | null;
  created_at: string;
  paid_at: string | null;
  order_items: Array<{
    id: string;
    quantity: number;
  }> | null;
};

type AdminOrdersPageProps = {
  searchParams?: Promise<{
    q?: string;
    estado?: string;
    pagamento?: string;
    stricker?: string;
    pagina?: string;
  }>;
};

const PAGE_SIZE = 25;

const ORDER_STATUS_OPTIONS = [
  "pending_payment",
  "paid",
  "processing",
  "sent_to_supplier",
  "supplier_confirmed",
  "in_production",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
  "failed",
] as const;

const PAYMENT_STATUS_OPTIONS = [
  "pending",
  "authorized",
  "paid",
  "failed",
  "refunded",
  "partially_refunded",
  "cancelled",
] as const;

const SUPPLIER_STATUS_OPTIONS = [
  "not_submitted",
  "ready_for_review",
  "approved_for_submission",
  "submitting",
  "submitted",
  "partially_submitted",
  "failed",
  "cancelled",
] as const;

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

function getOrderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending_payment: "A aguardar pagamento",
    paid: "Paga",
    processing: "Em validação",
    sent_to_supplier: "Enviada ao fornecedor",
    supplier_confirmed: "Confirmada pelo fornecedor",
    in_production: "Em produção",
    shipped: "Expedida",
    delivered: "Entregue",
    cancelled: "Cancelada",
    refunded: "Reembolsada",
    failed: "Falhou",
  };

  return labels[status] ?? status;
}

function getPaymentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "Pendente",
    authorized: "Autorizado",
    paid: "Pago",
    failed: "Falhou",
    refunded: "Reembolsado",
    partially_refunded: "Reembolso parcial",
    cancelled: "Cancelado",
  };

  return labels[status] ?? status;
}

function getSupplierStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    not_submitted: "Não submetida",
    ready_for_review: "Pronta para revisão",
    approved_for_submission: "Aprovada para submissão",
    submitting: "A submeter",
    submitted: "Submetida",
    partially_submitted: "Parcialmente submetida",
    failed: "Falhou",
    cancelled: "Cancelada",
  };

  return labels[status] ?? status;
}

function getStatusClasses(status: string): string {
  if (
    ["paid", "supplier_confirmed", "delivered", "submitted"].includes(status)
  ) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (
    ["pending_payment", "pending", "ready_for_review", "processing"].includes(
      status,
    )
  ) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  if (["failed", "cancelled"].includes(status)) {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  if (
    ["in_production", "shipped", "submitting", "sent_to_supplier"].includes(
      status,
    )
  ) {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

  return "bg-neutral-100 text-neutral-700 ring-neutral-200";
}

function sanitizeSearchQuery(value: string): string {
  return value
    .replace(/[%_(),]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function buildPageHref(params: {
  query: string;
  orderStatus: string;
  paymentStatus: string;
  supplierStatus: string;
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
    searchParams.set("pagamento", params.paymentStatus);
  }

  if (params.supplierStatus) {
    searchParams.set("stricker", params.supplierStatus);
  }

  searchParams.set("pagina", String(params.page));

  return `/admin/encomendas?${searchParams.toString()}`;
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

export default async function AdminOrdersPage({
  searchParams,
}: AdminOrdersPageProps) {
  await requireAdmin();

  const resolvedSearchParams = await searchParams;

  const query = sanitizeSearchQuery(resolvedSearchParams?.q ?? "");
  const orderStatus = ORDER_STATUS_OPTIONS.includes(
    resolvedSearchParams?.estado as (typeof ORDER_STATUS_OPTIONS)[number],
  )
    ? resolvedSearchParams?.estado ?? ""
    : "";

  const paymentStatus = PAYMENT_STATUS_OPTIONS.includes(
    resolvedSearchParams?.pagamento as (typeof PAYMENT_STATUS_OPTIONS)[number],
  )
    ? resolvedSearchParams?.pagamento ?? ""
    : "";

  const supplierStatus = SUPPLIER_STATUS_OPTIONS.includes(
    resolvedSearchParams?.stricker as (typeof SUPPLIER_STATUS_OPTIONS)[number],
  )
    ? resolvedSearchParams?.stricker ?? ""
    : "";

  const requestedPage = Number(resolvedSearchParams?.pagina ?? 1);
  const page =
    Number.isFinite(requestedPage) && requestedPage > 0
      ? Math.floor(requestedPage)
      : 1;

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabaseAdmin = createSupabaseAdminClient();

  let ordersQuery = supabaseAdmin
    .from("orders")
    .select(
      `
        id,
        order_number,
        customer_email,
        customer_name,
        company_name,
        status,
        payment_status,
        fulfillment_status,
        supplier_submission_status,
        currency,
        grand_total,
        shipping_method,
        shipping_carrier,
        tracking_number,
        created_at,
        paid_at,
        order_items (
          id,
          quantity
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

  if (query) {
    ordersQuery = ordersQuery.or(
      [
        `order_number.ilike.%${query}%`,
        `customer_name.ilike.%${query}%`,
        `customer_email.ilike.%${query}%`,
        `company_name.ilike.%${query}%`,
      ].join(","),
    );
  }

  if (orderStatus) {
    ordersQuery = ordersQuery.eq("status", orderStatus);
  }

  if (paymentStatus) {
    ordersQuery = ordersQuery.eq("payment_status", paymentStatus);
  }

  if (supplierStatus) {
    ordersQuery = ordersQuery.eq(
      "supplier_submission_status",
      supplierStatus,
    );
  }

  const {
    data,
    error,
    count,
  } = await ordersQuery.returns<OrderRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  const orders = data ?? [];
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-10">
      <section className="mx-auto max-w-[1600px]">
        <Link
          href="/admin"
          className="inline-flex items-center text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao backoffice
        </Link>

        <div className="mt-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Operação
            </p>

            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-neutral-950">
              Encomendas
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
              Gestão centralizada de pagamentos, personalizações, maquetes,
              aprovação de arte, submissão à Stricker, produção, expedição e
              faturação.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
              <ShoppingBag className="h-5 w-5 text-neutral-500" />
              <p className="mt-3 text-xs uppercase tracking-[0.14em] text-neutral-500">
                Resultados
              </p>
              <p className="mt-1 text-xl font-semibold text-neutral-950">
                {totalCount.toLocaleString("pt-PT")}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
              <Clock3 className="h-5 w-5 text-amber-500" />
              <p className="mt-3 text-xs uppercase tracking-[0.14em] text-neutral-500">
                Página
              </p>
              <p className="mt-1 text-xl font-semibold text-neutral-950">
                {page}/{totalPages}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
              <CircleDollarSign className="h-5 w-5 text-emerald-600" />
              <p className="mt-3 text-xs uppercase tracking-[0.14em] text-neutral-500">
                Pagamentos
              </p>
              <p className="mt-1 text-sm font-semibold text-neutral-950">
                Stripe integrado
              </p>
            </div>
          </div>
        </div>

        <form
          action="/admin/encomendas"
          method="get"
          className="mt-8 grid gap-3 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm lg:grid-cols-[minmax(260px,1fr)_220px_220px_240px_auto]"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Encomenda, cliente, empresa ou e-mail"
              className="w-full rounded-2xl border border-neutral-300 bg-white py-3 pl-11 pr-4 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
            />
          </div>

          <select
            name="estado"
            defaultValue={orderStatus}
            className="rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none focus:border-neutral-950"
          >
            <option value="">Todos os estados</option>

            {ORDER_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {getOrderStatusLabel(status)}
              </option>
            ))}
          </select>

          <select
            name="pagamento"
            defaultValue={paymentStatus}
            className="rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none focus:border-neutral-950"
          >
            <option value="">Todos os pagamentos</option>

            {PAYMENT_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {getPaymentStatusLabel(status)}
              </option>
            ))}
          </select>

          <select
            name="stricker"
            defaultValue={supplierStatus}
            className="rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none focus:border-neutral-950"
          >
            <option value="">Todos os estados Stricker</option>

            {SUPPLIER_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {getSupplierStatusLabel(status)}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="rounded-2xl bg-neutral-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            Filtrar
          </button>
        </form>

        <div className="mt-6 overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-5 py-4 text-left font-semibold text-neutral-500">
                    Encomenda
                  </th>
                  <th className="px-5 py-4 text-left font-semibold text-neutral-500">
                    Cliente
                  </th>
                  <th className="px-5 py-4 text-right font-semibold text-neutral-500">
                    Quantidade
                  </th>
                  <th className="px-5 py-4 text-right font-semibold text-neutral-500">
                    Total
                  </th>
                  <th className="px-5 py-4 text-left font-semibold text-neutral-500">
                    Estado
                  </th>
                  <th className="px-5 py-4 text-left font-semibold text-neutral-500">
                    Pagamento
                  </th>
                  <th className="px-5 py-4 text-left font-semibold text-neutral-500">
                    Stricker
                  </th>
                  <th className="px-5 py-4 text-left font-semibold text-neutral-500">
                    Expedição
                  </th>
                  <th className="px-5 py-4 text-right font-semibold text-neutral-500">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100">
                {orders.map((order) => {
                  const totalQuantity = (order.order_items ?? []).reduce(
                    (total, item) => total + Number(item.quantity ?? 0),
                    0,
                  );

                  return (
                    <tr key={order.id} className="align-top hover:bg-neutral-50">
                      <td className="px-5 py-5">
                        <Link
                          href={`/admin/encomendas/${order.id}`}
                          className="font-semibold text-neutral-950 hover:underline"
                        >
                          {order.order_number}
                        </Link>

                        <p className="mt-1 text-xs text-neutral-500">
                          {formatDate(order.created_at)}
                        </p>
                      </td>

                      <td className="px-5 py-5">
                        <p className="font-medium text-neutral-950">
                          {order.company_name ?? order.customer_name}
                        </p>

                        <p className="mt-1 max-w-64 truncate text-xs text-neutral-500">
                          {order.customer_email}
                        </p>
                      </td>

                      <td className="px-5 py-5 text-right font-medium text-neutral-950">
                        {totalQuantity.toLocaleString("pt-PT")}
                      </td>

                      <td className="px-5 py-5 text-right font-semibold text-neutral-950">
                        {formatPrice(order.grand_total, order.currency)}
                      </td>

                      <td className="px-5 py-5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClasses(
                            order.status,
                          )}`}
                        >
                          {getOrderStatusLabel(order.status)}
                        </span>
                      </td>

                      <td className="px-5 py-5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClasses(
                            order.payment_status,
                          )}`}
                        >
                          {getPaymentStatusLabel(order.payment_status)}
                        </span>

                        {order.paid_at ? (
                          <p className="mt-2 text-xs text-neutral-500">
                            {formatDate(order.paid_at)}
                          </p>
                        ) : null}
                      </td>

                      <td className="px-5 py-5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClasses(
                            order.supplier_submission_status,
                          )}`}
                        >
                          {getSupplierStatusLabel(
                            order.supplier_submission_status,
                          )}
                        </span>
                      </td>

                      <td className="px-5 py-5">
                        <div className="flex items-start gap-2">
                          <Truck className="mt-0.5 h-4 w-4 text-neutral-400" />

                          <div>
                            <p className="text-neutral-700">
                              {order.shipping_carrier ??
                                order.shipping_method ??
                                "—"}
                            </p>

                            {order.tracking_number ? (
                              <p className="mt-1 text-xs text-neutral-500">
                                {order.tracking_number}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-5 text-right">
                        <Link
                          href={`/admin/encomendas/${order.id}`}
                          className="inline-flex items-center rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:border-neutral-950 hover:text-neutral-950"
                        >
                          Abrir
                          <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {orders.length === 0 ? (
            <div className="p-12 text-center">
              <PackageCheck className="mx-auto h-10 w-10 text-neutral-300" />

              <h2 className="mt-4 text-lg font-semibold text-neutral-950">
                Nenhuma encomenda encontrada
              </h2>

              <p className="mt-2 text-sm text-neutral-600">
                Altera a pesquisa ou os filtros selecionados.
              </p>
            </div>
          ) : null}
        </div>

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
                className="inline-flex items-center rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 transition hover:border-neutral-400"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Anterior
              </Link>
            ) : null}

            <span className="rounded-2xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white">
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
                className="inline-flex items-center rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 transition hover:border-neutral-400"
              >
                Seguinte
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            ) : null}
          </nav>
        ) : null}
      </section>
    </main>
  );
}