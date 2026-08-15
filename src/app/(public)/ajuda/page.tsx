import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  CreditCard,
  HelpCircle,
  PackageCheck,
  Palette,
  Search,
  Truck,
} from "lucide-react";

const helpTopics = [
  {
    title: "Como comprar",
    description:
      "Escolhe o produto, define quantidade, personalização, adiciona ao carrinho e finaliza o checkout.",
    icon: CreditCard,
  },
  {
    title: "Personalização",
    description:
      "Podes indicar técnica, notas de impressão e carregar ficheiros de logótipo nas próximas etapas.",
    icon: Palette,
  },
  {
    title: "Stock e prazos",
    description:
      "Os stocks, preços e características são sincronizados diretamente com o fornecedor.",
    icon: PackageCheck,
  },
  {
    title: "Envio",
    description:
      "As opções e os custos de expedição são apresentados no checkout antes da confirmação da encomenda.",
    icon: Truck,
  },
];

export const metadata: Metadata = {
  title: "Ajuda e apoio à compra",
  description:
    "Saiba como comprar, personalizar e acompanhar merchandising e brindes promocionais na 360 Merchandising.",
  alternates: { canonical: "/ajuda" },
};

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-12">
      <section className="mx-auto max-w-7xl">
        <Link
          href="/"
          className="text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
        >
          ← Voltar à página inicial
        </Link>

        <div className="mt-8">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
            Ajuda
          </p>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950">
            Como podemos ajudar?
          </h1>

          <p className="mt-4 max-w-3xl text-neutral-600">
            Encontra informação sobre compra directa, personalização, pedidos
            especiais, stock, prazos, checkout e acompanhamento de encomendas.
          </p>
        </div>

        <form action="/pesquisa" className="mt-8 max-w-2xl">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

            <input
              type="search"
              name="q"
              placeholder="Pesquisar produtos ou temas de ajuda"
              className="w-full rounded-2xl border border-neutral-300 bg-white py-4 pl-11 pr-4 text-sm text-neutral-950 shadow-sm outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
            />
          </div>
        </form>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {helpTopics.map((topic) => {
            const Icon = topic.icon;

            return (
              <article
                key={topic.title}
                className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
              >
                <Icon className="h-7 w-7 text-neutral-500" />

                <h2 className="mt-8 text-xl font-semibold text-neutral-950">
                  {topic.title}
                </h2>

                <p className="mt-3 text-sm leading-6 text-neutral-600">
                  {topic.description}
                </p>
              </article>
            );
          })}
        </div>

        <section className="mt-12 rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
          <HelpCircle className="h-8 w-8 text-neutral-500" />

          <h2 className="mt-6 text-2xl font-semibold tracking-tight text-neutral-950">
            Precisas de apoio personalizado?
          </h2>

          <p className="mt-3 max-w-2xl text-neutral-600">
            Para campanhas complexas, grandes quantidades ou personalizações
            específicas, envia-nos um pedido personalizado.
          </p>

          <Link
            href="/contacto"
            className="mt-6 inline-flex items-center rounded-2xl bg-neutral-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            Fazer pedido personalizado
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </section>
      </section>
    </main>
  );
}
