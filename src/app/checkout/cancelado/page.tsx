import Link from "next/link";
import SiteHeader from "@/components/layout/SiteHeader";

export default function CheckoutCancelledPage() {
  return (
    <>
      <SiteHeader />

      <main className="min-h-screen bg-neutral-50 px-6 py-12">
        <section className="mx-auto max-w-3xl rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-600">
            Checkout cancelado
          </p>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950">
            O pagamento não foi concluído
          </h1>

          <p className="mt-4 text-neutral-600">
            Podes voltar ao carrinho e tentar novamente. A tua encomenda só será
            processada depois do pagamento confirmado.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/carrinho"
              className="inline-flex items-center justify-center rounded-2xl bg-neutral-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              Voltar ao carrinho
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
    </>
  );
}