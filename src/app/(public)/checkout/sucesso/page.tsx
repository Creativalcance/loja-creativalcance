import Link from "next/link";
import { CheckCircle2, Clock3 } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CheckoutSuccessPageProps = {
  searchParams?: Promise<{
    session_id?: string;
  }>;
};

type CheckoutRecord = {
  order_id: string | null;
  status: string;
  amount_total: number;
  currency: string;
  orders: {
    order_number: string;
    payment_status: string;
    status: string;
  } | null;
};

function formatPrice(value: number, currency: string): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency,
  }).format(Number(value ?? 0));
}

export default async function CheckoutSuccessPage({
  searchParams,
}: CheckoutSuccessPageProps) {
  const resolvedSearchParams = await searchParams;
  const sessionId =
    resolvedSearchParams?.session_id?.trim() ?? null;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let checkout: CheckoutRecord | null = null;

  if (sessionId && user) {
    const supabaseAdmin = createSupabaseAdminClient();

    const { data } = await supabaseAdmin
      .from("checkout_sessions")
      .select(
        `
          order_id,
          status,
          amount_total,
          currency,
          orders (
            order_number,
            payment_status,
            status
          )
        `,
      )
      .eq("provider_session_id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle();

    checkout = data as unknown as CheckoutRecord | null;
  }

  const isPaid =
    checkout?.status === "completed" ||
    checkout?.orders?.payment_status === "paid";

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-12">
      <section className="mx-auto max-w-3xl rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
        {isPaid ? (
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
        ) : (
          <Clock3 className="mx-auto h-14 w-14 text-amber-500" />
        )}

        <p
          className={`mt-6 text-sm font-medium uppercase tracking-[0.2em] ${
            isPaid ? "text-emerald-600" : "text-amber-600"
          }`}
        >
          {isPaid
            ? "Pagamento confirmado"
            : "Pagamento em confirmação"}
        </p>

        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950">
          {isPaid
            ? "Obrigado pela tua encomenda"
            : "Recebemos o teu pagamento"}
        </h1>

        <p className="mx-auto mt-4 max-w-2xl leading-7 text-neutral-600">
          {isPaid
            ? "A encomenda foi registada e será agora validada pela nossa equipa antes do envio para produção."
            : "A Stripe está a confirmar o pagamento. O estado da encomenda será atualizado automaticamente."}
        </p>

        {checkout?.orders?.order_number ? (
          <div className="mt-8 rounded-2xl bg-neutral-50 p-5">
            <p className="text-sm text-neutral-500">
              Número da encomenda
            </p>

            <p className="mt-1 text-xl font-semibold text-neutral-950">
              {checkout.orders.order_number}
            </p>

            <p className="mt-4 text-sm text-neutral-500">
              Total
            </p>

            <p className="mt-1 font-semibold text-neutral-950">
              {formatPrice(
                checkout.amount_total,
                checkout.currency,
              )}
            </p>
          </div>
        ) : null}

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/area-cliente/encomendas"
            className="inline-flex items-center justify-center rounded-2xl bg-neutral-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            Ver encomendas
          </Link>

          <Link
            href="/pesquisa"
            className="inline-flex items-center justify-center rounded-2xl border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-950 transition hover:border-neutral-950"
          >
            Continuar a comprar
          </Link>
        </div>
      </section>
    </main>
  );
}