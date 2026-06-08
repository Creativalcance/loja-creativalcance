import Link from "next/link";
import SiteHeader from "@/components/layout/SiteHeader";

export default function CheckoutSuccessPage() {
  return (
    <>
      <SiteHeader />

      <main className="min-h-screen bg-neutral-50 px-6 py-12">
        <section className="mx-auto max-w-3xl rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-600">
            Pagamento recebido
          </p>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950">
            Obrigado pela tua encomenda
          </h1>

          <p className="mt-4 text-neutral-600">
            A tua encomenda foi registada. Assim que o pagamento for confirmado,
            a equipa da Loja Creativ dará seguimento ao processo.
          </p>

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
    </>
  );
}