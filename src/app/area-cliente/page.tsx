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
import { localizePath, SITE_LOCALES, type SiteLocale } from "@/lib/i18n/config";
import { getCurrentLocale } from "@/lib/i18n/server";
import { customerCopy } from "@/lib/i18n/account";

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

function formatDate(value: string, locale: SiteLocale): string {
  return new Intl.DateTimeFormat(SITE_LOCALES[locale].intlLocale, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatPrice(value: number, currency: string, locale: SiteLocale): string {
  return new Intl.NumberFormat(SITE_LOCALES[locale].intlLocale, {
    style: "currency",
    currency,
  }).format(value);
}

function getOrderStatusLabel(status: string, locale: SiteLocale): string {
  const all = { pt: { pending_payment: "A aguardar pagamento", paid: "Pago", processing: "Em processamento", sent_to_supplier: "Enviado ao fornecedor", supplier_confirmed: "Confirmado pelo fornecedor", in_production: "Em produção", shipped: "Expedido", delivered: "Entregue", cancelled: "Cancelado", refunded: "Reembolsado", failed: "Falhou" }, en: { pending_payment: "Awaiting payment", paid: "Paid", processing: "Processing", sent_to_supplier: "Sent to supplier", supplier_confirmed: "Confirmed by supplier", in_production: "In production", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled", refunded: "Refunded", failed: "Failed" }, fr: { pending_payment: "En attente de paiement", paid: "Payé", processing: "En traitement", sent_to_supplier: "Envoyé au fournisseur", supplier_confirmed: "Confirmé par le fournisseur", in_production: "En production", shipped: "Expédié", delivered: "Livré", cancelled: "Annulé", refunded: "Remboursé", failed: "Échec" } };
  const labels: Record<string, string> = all[locale];

  return labels[status] ?? status;
}

function getQuoteStatusLabel(status: string, locale: SiteLocale): string {
  const all = { pt: { new: "Novo", in_analysis: "Em análise", proposal_sent: "Proposta enviada", negotiation: "Negociação", won: "Ganho", lost: "Perdido", cancelled: "Cancelado" }, en: { new: "New", in_analysis: "Under review", proposal_sent: "Proposal sent", negotiation: "Negotiation", won: "Won", lost: "Lost", cancelled: "Cancelled" }, fr: { new: "Nouveau", in_analysis: "En analyse", proposal_sent: "Proposition envoyée", negotiation: "Négociation", won: "Gagné", lost: "Perdu", cancelled: "Annulé" } };
  const labels: Record<string, string> = all[locale];

  return labels[status] ?? status;
}

export default async function CustomerAreaPage() {
  const locale = await getCurrentLocale(); const t = customerCopy[locale];
  const { user, supabase } = await assertCustomerAccess(localizePath("/area-cliente", locale));

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
                {t.area}
              </p>

              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950">
                {t.hello}, {profile?.full_name || t.welcome}
              </h1>

              <p className="mt-4 max-w-3xl text-neutral-600">
                {t.intro}
              </p>
            </div>

            <aside className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <UserRound className="h-6 w-6 text-neutral-500" />

              <p className="mt-4 font-semibold text-neutral-950">
                {profile?.full_name || t.customer}
              </p>

              <p className="mt-1 text-sm text-neutral-500">
                {profile?.email ?? user.email}
              </p>

              <form action={localizePath("/logout", locale)} method="post" className="mt-5">
                <button
                  type="submit"
                  className="inline-flex items-center rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:border-neutral-950"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t.logout}
                </button>
              </form>
            </aside>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <a
              href={localizePath("/area-cliente/dados", locale)}
              className="group rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <Settings className="h-7 w-7 text-neutral-500" />
              <p className="mt-6 text-sm text-neutral-500">{t.account}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">{t.personalData}</p>
              <span className="mt-6 inline-flex items-center text-sm font-semibold text-neutral-950">{t.manageData}<ArrowRight className="ml-2 h-4 w-4" /></span>
            </a>
            <a
              href={localizePath("/area-cliente/encomendas", locale)}
              className="group rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <Package className="h-7 w-7 text-neutral-500" />

              <p className="mt-6 text-sm text-neutral-500">{t.orders}</p>

              <p className="mt-1 text-3xl font-semibold tracking-tight text-neutral-950">
                {(ordersCount ?? 0).toLocaleString(SITE_LOCALES[locale].intlLocale)}
              </p>

              <span className="mt-6 inline-flex items-center text-sm font-semibold text-neutral-950">
                {t.viewOrders}
                <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </a>

            <a
              href={localizePath("/area-cliente/pedidos", locale)}
              className="group rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <ClipboardList className="h-7 w-7 text-neutral-500" />

              <p className="mt-6 text-sm text-neutral-500">
                {t.requests}
              </p>

              <p className="mt-1 text-3xl font-semibold tracking-tight text-neutral-950">
                {(quoteRequestsCount ?? 0).toLocaleString(SITE_LOCALES[locale].intlLocale)}
              </p>

              <span className="mt-6 inline-flex items-center text-sm font-semibold text-neutral-950">
                {t.viewRequests}
                <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </a>

            <Link
              href={localizePath("/carrinho", locale)}
              className="group rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <ShoppingCart className="h-7 w-7 text-neutral-500" />

              <p className="mt-6 text-sm text-neutral-500">{t.cart}</p>

              <p className="mt-1 text-3xl font-semibold tracking-tight text-neutral-950">
                {t.active}
              </p>

              <span className="mt-6 inline-flex items-center text-sm font-semibold text-neutral-950">
                {t.openCart}
                <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </Link>
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-neutral-950">
                    {t.recentOrders}
                  </h2>

                  <p className="mt-2 text-sm text-neutral-500">
                    {t.recentOrdersText}
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
                            {formatDate(order.created_at, locale)}
                          </p>

                          <p className="mt-2 text-sm text-neutral-600">
                            {getOrderStatusLabel(order.status, locale)}
                          </p>
                        </div>

                        <p className="font-semibold text-neutral-950">
                          {formatPrice(order.grand_total, order.currency, locale)}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl bg-neutral-50 p-6 text-sm text-neutral-600">
                  {t.noOrders}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-neutral-950">
                    {t.requests}
                  </h2>

                  <p className="mt-2 text-sm text-neutral-500">
                    {t.requestsText}
                  </p>
                </div>

                <FileText className="h-6 w-6 text-neutral-400" />
              </div>

              {quoteRequests.length > 0 ? (
                <div className="mt-6 divide-y divide-neutral-100">
                  {quoteRequests.map((quoteRequest) => (
                    <article key={quoteRequest.id} className="py-4">
                      <p className="font-semibold text-neutral-950">
                        {quoteRequest.subject ?? t.quote}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-neutral-500">
                        <span>{formatDate(quoteRequest.created_at, locale)}</span>
                        <span>·</span>
                        <span>{getQuoteStatusLabel(quoteRequest.status, locale)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl bg-neutral-50 p-6 text-sm text-neutral-600">
                  {t.noRequests}
                </div>
              )}
            </section>
          </div>
        </section>
      </main>
    </>
  );
}
