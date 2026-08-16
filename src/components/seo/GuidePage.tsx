import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Search,
  Sparkles,
} from "lucide-react";
import ProductCard, {
  type ProductCardProduct,
} from "@/components/catalog/ProductCard";
import type { GuideConfig } from "@/lib/seo/guide-pages";
import { getRelatedGuides } from "@/lib/seo/guide-pages";

export default function GuidePage({
  config,
  products,
}: {
  config: GuideConfig;
  products: ProductCardProduct[];
}) {
  const related = getRelatedGuides(config);

  return (
    <main className="min-h-screen bg-neutral-50">
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <Link
            href="/guias"
            className="text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
          >
            ← Voltar aos guias
          </Link>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1.35fr_0.65fr] lg:items-start">
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
              <Sparkles className="h-6 w-6 text-[#e85f00]" />
              <h2 className="mt-4 text-lg font-semibold text-neutral-950">
                Em resumo
              </h2>
              <ul className="mt-4 space-y-3">
                {config.takeaways.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-6 text-neutral-600">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <div className="mx-auto max-w-4xl space-y-12">
          {config.sections.map((section) => (
            <article key={section.title}>
              <h2 className="text-2xl font-semibold tracking-tight text-neutral-950 md:text-3xl">
                {section.title}
              </h2>
              <p className="mt-4 text-base leading-8 text-neutral-600">
                {section.text}
              </p>
              {section.points?.length ? (
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {section.points.map((point) => (
                    <li
                      key={point}
                      className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700"
                    >
                      {point}
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">
                Explorar o catálogo
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
                Produtos relacionados com este guia
              </h2>
              <p className="mt-3 max-w-3xl text-neutral-600">
                Estas sugestões são obtidas a partir do catálogo ativo. Confirme
                na página de cada produto o stock, preço, quantidades e opções de
                personalização disponíveis.
              </p>
            </div>
            <Link
              href={`/pesquisa?q=${encodeURIComponent(config.productQueries[0] ?? "")}`}
              className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-semibold text-neutral-900 transition hover:border-neutral-500"
            >
              <Search className="mr-2 h-4 w-4" />
              Pesquisar catálogo
            </Link>
          </div>

          {products.length > 0 ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-3xl border border-neutral-200 bg-neutral-50 p-8 text-center text-sm text-neutral-600">
              Não foi possível carregar sugestões específicas neste momento.
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-3">
            <HelpCircle className="h-6 w-6 text-neutral-500" />
            <h2 className="text-3xl font-semibold tracking-tight text-neutral-950">
              Perguntas frequentes
            </h2>
          </div>
          <div className="mt-7 divide-y divide-neutral-200 rounded-3xl border border-neutral-200 bg-white px-6 shadow-sm">
            {config.faq.map((item) => (
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

      {related.length > 0 ? (
        <section className="border-t border-neutral-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">
              Continuar a explorar
            </p>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {related.map((guide) => (
                <Link
                  key={guide.slug}
                  href={`/guias/${guide.slug}`}
                  className="group rounded-3xl border border-neutral-200 bg-neutral-50 p-6 transition hover:-translate-y-1 hover:bg-white hover:shadow-lg"
                >
                  <h2 className="text-xl font-semibold tracking-tight text-neutral-950">
                    {guide.h1}
                  </h2>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-neutral-600">
                    {guide.description}
                  </p>
                  <span className="mt-5 inline-flex items-center text-sm font-semibold text-neutral-950">
                    Ler guia
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
