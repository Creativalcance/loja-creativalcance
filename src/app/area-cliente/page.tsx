import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  FileText,
  LogOut,
  Package,
  ShoppingCart,
  UserRound,
  Settings,
} from "lucide-react";
import SiteHeader from "@/components/layout/SiteHeader";
import { assertCustomerAccess } from "@/lib/auth/assert-customer";

type Profile = {
  full_name: string | null;
  email: string;
  role: string;
};

export const dynamic = "force-dynamic";

type OrderSummary = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  fulfillment_status: string;
  grand_total: number;
  currency: string;
  created_at: string;
};

type QuoteSummary = {
  id: string;
  subject: string | null;
  status: string;
  created_at: string;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatPrice(value: number, currency: string): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency,
  }).format(value);
}

function getOrderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending_payment: "A aguardar pagamento",
    paid: "Pago",
    processing: "Em processamento",
    sent_to_supplier: "Enviado ao fornecedor",
    supplier_confirmed: "Confirmado pelo fornecedor",
    in_production: "Em produção",
    shipped: "Expedido",
    delivered: "Entregue",
    cancelled: "Cancelado",
    refunded: "Reembolsado",
    failed: "Falhou",
  };

  return labels[status] ?? status;
}

function getQuoteStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    new: "Novo",
    in_analysis: "Em análise",
    proposal_sent: "Proposta enviada",
    negotiation: "Negociação",
    won: "Ganho",
    lost: "Perdido",
    cancelled: "Cancelado",
  };

  return labels[status] ?? status;
}

export default async function CustomerAreaPage() {
  const { user, supabase } = await assertCustomerAccess("/area-cliente");

  const [
    { data: profile },
    { data: ordersData, count: ordersCount },
    { data: quoteRequestsData, count: quoteRequestsCount },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email, role")
      .eq("id", user.id)
      .maybeSingle<Profile>(),
    supabase
      .from("orders")
      .select(
        "id, order_number, status, payment_status, fulfillment_status, grand_total, currency, created_at",
        { count: "exact" },
      )
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<OrderSummary[]>(),
    supabase
      .from("quote_requests")
      .select("id, subject, status, created_at", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<QuoteSummary[]>(),
  ]);

  const orders = ordersData ?? [];
  const quoteRequests = quoteRequestsData ?? [];

  return (
    <>
      <SiteHeader context="customer" />

      <main className="min-h-screen bg-neutral-50 px-6 py-10">
        <section className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
                Área Cliente
              </p>

              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950">
                Olá, {profile?.full_name || "bem-vindo"}
              </h1>

              <p className="mt-4 max-w-3xl text-neutral-600">
                Acompanha as tuas encomendas, pedidos de orçamento, carrinho e
                dados comerciais da tua conta 360 Merchandising.
              </p>
            </div>

            <aside className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <UserRound className="h-6 w-6 text-neutral-500" />

              <p className="mt-4 font-semibold text-neutral-950">
                {profile?.full_name || "Cliente"}
              </p>

              <p className="mt-1 text-sm text-neutral-500">
                {profile?.email ?? user.email}
              </p>

              <form action="/logout" method="post" className="mt-5">
                <button
                  type="submit"
                  className="inline-flex items-center rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:border-neutral-950"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </button>
              </form>
            </aside>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <a
              href="/area-cliente/dados"
              className="group rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <Settings className="h-7 w-7 text-neutral-500" />
              <p className="mt-6 text-sm text-neutral-500">Conta</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">Dados pessoais</p>
              <span className="mt-6 inline-flex items-center text-sm font-semibold text-neutral-950">Gerir dados<ArrowRight className="ml-2 h-4 w-4" /></span>
            </a>
            <a
              href="/area-cliente/encomendas"
              className="group rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <Package className="h-7 w-7 text-neutral-500" />

              <p className="mt-6 text-sm text-neutral-500">Encomendas</p>

              <p className="mt-1 text-3xl font-semibold tracking-tight text-neutral-950">
                {(ordersCount ?? 0).toLocaleString("pt-PT")}
              </p>

              <span className="mt-6 inline-flex items-center text-sm font-semibold text-neutral-950">
                Ver encomendas
                <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </a>

            <a
              href="/area-cliente/pedidos"
              className="group rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <ClipboardList className="h-7 w-7 text-neutral-500" />

              <p className="mt-6 text-sm text-neutral-500">
                Pedidos personalizados
              </p>

              <p className="mt-1 text-3xl font-semibold tracking-tight text-neutral-950">
                {(quoteRequestsCount ?? 0).toLocaleString("pt-PT")}
              </p>

              <span className="mt-6 inline-flex items-center text-sm font-semibold text-neutral-950">
                Ver pedidos
                <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </a>

            <Link
              href="/carrinho"
              className="group rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <ShoppingCart className="h-7 w-7 text-neutral-500" />

              <p className="mt-6 text-sm text-neutral-500">Carrinho</p>

              <p className="mt-1 text-3xl font-semibold tracking-tight text-neutral-950">
                Activo
              </p>

              <span className="mt-6 inline-flex items-center text-sm font-semibold text-neutral-950">
                Abrir carrinho
                <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </Link>
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-neutral-950">
                    Encomendas recentes
                  </h2>

                  <p className="mt-2 text-sm text-neutral-500">
                    Compra directa, pagamento e estado de processamento.
                  </p>
                </div>

                <Package className="h-6 w-6 text-neutral-400" />
              </div>

              {orders.length > 0 ? (
                <div className="mt-6 divide-y divide-neutral-100">
                  {orders.map((order) => (
                    <article key={order.id} className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-neutral-950">
                            {order.order_number}
                          </p>

                          <p className="mt-1 text-sm text-neutral-500">
                            {formatDate(order.created_at)}
                          </p>

                          <p className="mt-2 text-sm text-neutral-600">
                            {getOrderStatusLabel(order.status)}
                          </p>
                        </div>

                        <p className="font-semibold text-neutral-950">
                          {formatPrice(order.grand_total, order.currency)}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl bg-neutral-50 p-6 text-sm text-neutral-600">
                  Ainda não existem encomendas. Quando comprares online, vais
                  poder acompanhar aqui o estado da encomenda.
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-neutral-950">
                    Pedidos personalizados
                  </h2>

                  <p className="mt-2 text-sm text-neutral-500">
                    Orçamentos para pedidos especiais ou personalizações
                    complexas.
                  </p>
                </div>

                <FileText className="h-6 w-6 text-neutral-400" />
              </div>

              {quoteRequests.length > 0 ? (
                <div className="mt-6 divide-y divide-neutral-100">
                  {quoteRequests.map((quoteRequest) => (
                    <article key={quoteRequest.id} className="py-4">
                      <p className="font-semibold text-neutral-950">
                        {quoteRequest.subject ?? "Pedido de orçamento"}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-neutral-500">
                        <span>{formatDate(quoteRequest.created_at)}</span>
                        <span>·</span>
                        <span>{getQuoteStatusLabel(quoteRequest.status)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl bg-neutral-50 p-6 text-sm text-neutral-600">
                  Ainda não existem pedidos personalizados associados à tua
                  conta.
                </div>
              )}
            </section>
          </div>
        </section>
      </main>
    </>
  );
}
