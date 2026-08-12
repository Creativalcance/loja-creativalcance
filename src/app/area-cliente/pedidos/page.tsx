import SiteHeader from "@/components/layout/SiteHeader";
import CustomerDashboardLink from "@/components/customer/CustomerDashboardLink";
import { assertCustomerAccess } from "@/lib/auth/assert-customer";

type QuoteRequest = {
  id: string;
  subject: string | null;
  status: string;
  message: string | null;
  created_at: string;
};

export const dynamic = "force-dynamic";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function CustomerQuoteRequestsPage() {
  const { user, supabase } = await assertCustomerAccess("/area-cliente/pedidos");

  const { data } = await supabase
    .from("quote_requests")
    .select("id, subject, status, message, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .returns<QuoteRequest[]>();

  const quoteRequests = data ?? [];

  return (
    <>
      <SiteHeader context="customer" />

      <main className="min-h-screen bg-neutral-50 px-6 py-10">
        <section className="mx-auto max-w-5xl">
          <CustomerDashboardLink />

          <h1 className="mt-8 text-4xl font-semibold tracking-tight text-neutral-950">
            Pedidos personalizados
          </h1>

          <p className="mt-4 text-neutral-600">
            Consulta os pedidos de orçamento ou personalização submetidos através
            da Loja Creativ.
          </p>

          {quoteRequests.length > 0 ? (
            <div className="mt-8 space-y-4">
              {quoteRequests.map((quoteRequest) => (
                <article
                  key={quoteRequest.id}
                  className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
                >
                  <p className="text-xl font-semibold text-neutral-950">
                    {quoteRequest.subject ?? "Pedido personalizado"}
                  </p>

                  <p className="mt-2 text-sm text-neutral-500">
                    {formatDate(quoteRequest.created_at)} ·{" "}
                    {quoteRequest.status}
                  </p>

                  {quoteRequest.message ? (
                    <p className="mt-4 rounded-2xl bg-neutral-50 p-4 text-sm leading-6 text-neutral-600">
                      {quoteRequest.message}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
              <p className="text-neutral-600">
                Ainda não existem pedidos personalizados associados à tua conta.
              </p>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
