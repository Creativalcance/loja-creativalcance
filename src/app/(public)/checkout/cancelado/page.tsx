import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { localizePath } from "@/lib/i18n/config";
import { getCurrentLocale } from "@/lib/i18n/server";

export default async function CheckoutCancelledPage() {
  const locale = await getCurrentLocale();
  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-12">
      <section className="mx-auto max-w-3xl rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
        <AlertCircle className="mx-auto h-14 w-14 text-amber-500" />

        <p className="mt-6 text-sm font-medium uppercase tracking-[0.2em] text-amber-600">
          Pagamento cancelado
        </p>

        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950">
          A encomenda ainda não foi paga
        </h1>

        <p className="mx-auto mt-4 max-w-2xl leading-7 text-neutral-600">
          Não foi efetuada qualquer confirmação de pagamento.
          Podes regressar ao checkout, rever os dados e tentar
          novamente.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href={localizePath("/checkout/pagamento", locale)}
            className="inline-flex items-center justify-center rounded-2xl bg-neutral-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            Tentar novamente
          </Link>

          <Link
            href={localizePath("/carrinho", locale)}
            className="inline-flex items-center justify-center rounded-2xl border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-950 transition hover:border-neutral-950"
          >
            Voltar ao carrinho
          </Link>
        </div>
      </section>
    </main>
  );
}
