import SiteHeader from "@/components/layout/SiteHeader";
import CustomerDashboardLink from "@/components/customer/CustomerDashboardLink";
import { assertCustomerAccess } from "@/lib/auth/assert-customer";
import { localizePath, SITE_LOCALES, type SiteLocale } from "@/lib/i18n/config";
import { getCurrentLocale } from "@/lib/i18n/server";
import { customerCopy } from "@/lib/i18n/account";

type Order = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  fulfillment_status: string;
  grand_total: number;
  currency: string;
  created_at: string;
};

export const dynamic = "force-dynamic";

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

export default async function CustomerOrdersPage() {
  const locale = await getCurrentLocale(); const t = customerCopy[locale];
  const { user, supabase } = await assertCustomerAccess(localizePath("/area-cliente/encomendas", locale));

  const { data } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, payment_status, fulfillment_status, grand_total, currency, created_at",
    )
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .returns<Order[]>();

  const orders = data ?? [];

  return (
    <>
      <SiteHeader context="customer" />

      <main className="min-h-screen bg-neutral-50 px-6 py-10">
        <section className="mx-auto max-w-5xl">
          <CustomerDashboardLink locale={locale} />

          <h1 className="mt-8 text-4xl font-semibold tracking-tight text-neutral-950">
            {t.ordersTitle}
          </h1>

          <p className="mt-4 text-neutral-600">
            {t.ordersIntro}
          </p>

          {orders.length > 0 ? (
            <div className="mt-8 space-y-4">
              {orders.map((order) => (
                <article
                  key={order.id}
                  className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                      <p className="text-xl font-semibold text-neutral-950">
                        {order.order_number}
                      </p>

                      <p className="mt-2 text-sm text-neutral-500">
                        {formatDate(order.created_at, locale)}
                      </p>

                      <p className="mt-2 text-sm text-neutral-600">
                        {t.status}: {order.status} · {t.payment}:{" "}
                        {order.payment_status}
                      </p>
                    </div>

                    <p className="text-lg font-semibold text-neutral-950">
                      {formatPrice(order.grand_total, order.currency, locale)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
              <p className="text-neutral-600">
                {t.noOrders}
              </p>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
