import Link from "next/link";
import SiteHeader from "@/components/layout/SiteHeader";
import { assertCustomerAccess } from "@/lib/auth/assert-customer";

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

export default async function CustomerOrdersPage() {
  const { user, supabase } = await assertCustomerAccess("/area-cliente/encomendas");

  const { data } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, payment_status, fulfillment_status, grand_total, currency, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .returns<Order[]>();

  const orders = data ?? [];

  return (
    <>
      <SiteHeader context="customer" />

      <main className="min-h-screen bg-neutral-50 px-6 py-10">
        <section className="mx-auto max-w-5xl">
          <Link
            href="/area-cliente"
            className="text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
          >
            ← Voltar à área cliente
          </Link>

          <h1 className="mt-8 text-4xl font-semibold tracking-tight text-neutral-950">
            As minhas encomendas
          </h1>

          <p className="mt-4 text-neutral-600">
            Consulta aqui as encomendas realizadas na Loja Creativ.
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
                        {formatDate(order.created_at)}
                      </p>

                      <p className="mt-2 text-sm text-neutral-600">
                        Estado: {order.status} · Pagamento:{" "}
                        {order.payment_status}
                      </p>
                    </div>

                    <p className="text-lg font-semibold text-neutral-950">
                      {formatPrice(order.grand_total, order.currency)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
              <p className="text-neutral-600">
                Ainda não existem encomendas associadas à tua conta.
              </p>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
