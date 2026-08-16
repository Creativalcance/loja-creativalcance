import Link from "next/link";
import {
  ArrowRight,
  BadgeEuro,
  CheckCircle2,
  HelpCircle,
  Search,
  Sparkles,
} from "lucide-react";
import ProductCard, {
  type ProductCardProduct,
} from "@/components/catalog/ProductCard";
import type { CommercialLandingConfig } from "@/lib/seo/commercial-pages";
import {
  getCommercialPageFaq,
  getRelatedCommercialPages,
} from "@/lib/seo/commercial-pages";

const GROUP_LABELS: Record<CommercialLandingConfig["group"], string> = {
  commercial: "Soluções comerciais",
  budget: "Soluções por orçamento",
  quantity: "Soluções por quantidade",
  occasion: "Soluções por ocasião",
};

export default function CommercialLandingPage({
  config,
  products,
}: {
  config: CommercialLandingConfig;
  products: ProductCardProduct[];
}) {
  const relatedPages = getRelatedCommercialPages(config);
  const faq = getCommercialPageFaq(config);
  const searchTerm = config.productQueries[0] ?? "";

  return (
    <main className="min-h-screen bg-neutral-50">
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <Link
            href="/solucoes"
            className="text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
          >
            ← Voltar às soluções
          </Link>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_0.8fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#e85f00]">
                {config.eyebrow}
              </p>
              <h1 className="mt-4 max-w-5xl text-4xl font-semibold tracking-tight text-neutral-950 md:text-6xl">
                {config.h1}
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-neutral-600">
                {config.intro}
              </p>
            </div>

            <aside className="rounded-3xl border border-neutral-200 bg-neutral-50 p-6 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#162334] text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                {GROUP_LABELS[config.group]}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-neutral-950">
                Precisa de cruzar mais critérios?
              </h2>
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                No Smart Merch pode combinar necessidade, quantidade, orçamento
                e prazo para reduzir a pesquisa antes de configurar o produto.
              </p>
              <Link
                href="/smart-merch"
                className="mt-5 inline-flex items-center rounded-full bg-[#162334] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#24364d]"
              >
                Experimentar Smart Merch
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </aside>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {config.highlights.map((highlight) => (
            <div
              key={highlight}
              className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm"
            >
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <p className="mt-4 text-sm font-semibold leading-6 text-neutral-900">
                {highlight}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-3">
          {config.sections.map((section) => (
            <article key={section.title}>
              <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">
                {section.title}
              </h2>
              <p className="mt-4 leading-7 text-neutral-600">{section.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">
                Seleção comercial
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
                Produtos que cumprem o filtro inicial desta página
              </h2>
              <p className="mt-3 max-w-3xl text-neutral-600">
                {config.selectionNote}
              </p>
            </div>

            <Link
              href={`/pesquisa?q=${encodeURIComponent(searchTerm)}`}
              className="inline-flex items-center justify-center rounded-full border border-neutral-300 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-900 transition hover:border-neutral-500"
            >
              <Search className="mr-2 h-4 w-4" />
              Pesquisar catálogo
            </Link>
          </div>

          {config.group === "budget" ? (
            <div className="mt-6 flex max-w-4xl gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              <BadgeEuro className="mt-0.5 h-5 w-5 shrink-0" />
              <p>
                O filtro de orçamento usa preços base existentes no catálogo.
                Não representa um orçamento fechado nem inclui automaticamente a
                personalização. O valor final deve ser confirmado para a
                quantidade e configuração escolhidas.
              </p>
            </div>
          ) : null}

          {products.length > 0 ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-3xl border border-neutral-200 bg-neutral-50 p-8 text-center">
              <h3 className="text-lg font-semibold text-neutral-950">
                Sem sugestões suficientes para este filtro
              </h3>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                O catálogo ou os dados disponíveis podem não devolver produtos
                que cumpram o critério neste momento. Continue pela pesquisa ou
                utilize o Smart Merch para ajustar quantidade e orçamento.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Antes de decidir
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">
              Compare a solução completa, não apenas o primeiro filtro
            </h2>
            <p className="mt-4 leading-7 text-neutral-600">
              Orçamento, quantidade e ocasião ajudam a reduzir opções, mas a
              decisão final deve incluir stock, materiais, variante, técnica de
              personalização, prazo e utilização prevista.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/guias/como-escolher-brindes-personalizados-empresas"
                className="inline-flex items-center rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white"
              >
                Guia de escolha <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/guias/como-planear-merchandising-por-orcamento"
                className="inline-flex items-center rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:border-neutral-500"
              >
                Guia de orçamento
              </Link>
            </div>
          </article>

          <aside className="rounded-3xl bg-[#162334] p-7 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
              Explorar por outro ângulo
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              Aplicação, setor ou técnica
            </h2>
            <p className="mt-4 text-sm leading-6 text-white/65">
              Se o orçamento ou a quantidade não forem o critério principal,
              explore soluções por aplicação, indústria ou método de
              personalização.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/aplicacoes"
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#162334]"
              >
                Aplicações
              </Link>
              <Link
                href="/industrias"
                className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Indústrias
              </Link>
              <Link
                href="/personalizacao"
                className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Personalização
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <section className="border-t border-neutral-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-12 md:py-16">
          <div className="flex items-center gap-3">
            <HelpCircle className="h-6 w-6 text-neutral-500" />
            <h2 className="text-3xl font-semibold tracking-tight text-neutral-950">
              Perguntas frequentes
            </h2>
          </div>
          <div className="mt-7 divide-y divide-neutral-200 rounded-3xl border border-neutral-200 bg-neutral-50 px-6">
            {faq.map((item) => (
              <article key={item.question} className="py-6">
                <h3 className="text-lg font-semibold text-neutral-950">
                  {item.question}
                </h3>
                <p className="mt-3 leading-7 text-neutral-600">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {relatedPages.length > 0 ? (
        <section className="border-t border-neutral-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">
              Soluções relacionadas
            </p>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {relatedPages.map((item) => (
                <Link
                  key={item.slug}
                  href={`/solucoes/${item.slug}`}
                  className="group rounded-3xl border border-neutral-200 bg-neutral-50 p-6 transition hover:-translate-y-1 hover:bg-white hover:shadow-lg"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
                    {GROUP_LABELS[item.group]}
                  </p>
                  <h2 className="mt-3 text-xl font-semibold tracking-tight text-neutral-950">
                    {item.h1}
                  </h2>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-neutral-600">
                    {item.description}
                  </p>
                  <span className="mt-5 inline-flex items-center text-sm font-semibold text-neutral-950">
                    Ver solução
                    <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
