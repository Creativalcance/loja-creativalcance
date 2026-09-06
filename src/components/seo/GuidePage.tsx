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
import { localizePath, type SiteLocale } from "@/lib/i18n/config";

const copy = {
  pt: { back: "Voltar aos guias", by: "Conteúdo por", summary: "Em resumo", catalogue: "Explorar o catálogo", products: "Produtos relacionados com este guia", productText: "Estas sugestões são obtidas a partir do catálogo ativo. Confirme stock, preço, quantidades e personalização na página do produto.", solutions: "Explorar por orçamento e quantidade", search: "Pesquisar catálogo", empty: "Não foi possível carregar sugestões específicas neste momento.", faq: "Perguntas frequentes", continue: "Continuar a explorar", read: "Ler guia" },
  en: { back: "Back to guides", by: "Content by", summary: "In summary", catalogue: "Explore the catalogue", products: "Products related to this guide", productText: "These suggestions come from the active catalogue. Confirm stock, price, quantities and customisation on each product page.", solutions: "Explore by budget and quantity", search: "Search catalogue", empty: "Specific suggestions could not be loaded at this time.", faq: "Frequently asked questions", continue: "Continue exploring", read: "Read guide" },
  fr: { back: "Retour aux guides", by: "Contenu par", summary: "En résumé", catalogue: "Explorer le catalogue", products: "Produits associés à ce guide", productText: "Ces suggestions proviennent du catalogue actif. Confirmez le stock, le prix, les quantités et la personnalisation sur chaque page produit.", solutions: "Explorer par budget et quantité", search: "Rechercher dans le catalogue", empty: "Impossible de charger des suggestions spécifiques pour le moment.", faq: "Questions fréquentes", continue: "Continuer à explorer", read: "Lire le guide" },
} as const;

export default function GuidePage({
  config,
  products,
  locale,
}: {
  config: GuideConfig;
  products: ProductCardProduct[];
  locale: SiteLocale;
}) {
  const t = copy[locale];
  const related = getRelatedGuides(config, locale);

  return (
    <main className="min-h-screen bg-neutral-50">
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <Link
            href={localizePath("/guias", locale)}
            className="text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
          >
            ← {t.back}
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
              <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-neutral-500">
                <span>{t.by}</span>
                <Link
                  href={localizePath("/autores/360-merchandising", locale)}
                  className="font-semibold text-neutral-950 hover:underline"
                >
                  360 Merchandising
                </Link>
                <span aria-hidden="true">·</span>
                <Link
                  href="/metodologia-editorial"
                  className="font-medium text-neutral-700 hover:text-neutral-950 hover:underline"
                >
                  Metodologia editorial
                </Link>
              </div>
            </div>

            <aside className="rounded-3xl border border-neutral-200 bg-neutral-50 p-6 shadow-sm">
              <Sparkles className="h-6 w-6 text-[#e85f00]" />
              <h2 className="mt-4 text-lg font-semibold text-neutral-950">
                {t.summary}
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
                {t.catalogue}
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
                {t.products}
              </h2>
              <p className="mt-3 max-w-3xl text-neutral-600">
                {t.productText}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href={localizePath("/solucoes", locale)}
                className="inline-flex items-center justify-center rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
              >
                {t.solutions}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href={localizePath(`/pesquisa?q=${encodeURIComponent(config.productQueries[0] ?? "")}`, locale)}
                className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-semibold text-neutral-900 transition hover:border-neutral-500"
              >
                <Search className="mr-2 h-4 w-4" />
                {t.search}
              </Link>
            </div>
          </div>

          {products.length > 0 ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} locale={locale} />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-3xl border border-neutral-200 bg-neutral-50 p-8 text-center text-sm text-neutral-600">
              {t.empty}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-3">
            <HelpCircle className="h-6 w-6 text-neutral-500" />
            <h2 className="text-3xl font-semibold tracking-tight text-neutral-950">
              {t.faq}
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
              {t.continue}
            </p>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {related.map((guide) => (
                <Link
                  key={guide.slug}
                  href={localizePath(`/guias/${guide.slug}`, locale)}
                  className="group rounded-3xl border border-neutral-200 bg-neutral-50 p-6 transition hover:-translate-y-1 hover:bg-white hover:shadow-lg"
                >
                  <h2 className="text-xl font-semibold tracking-tight text-neutral-950">
                    {guide.h1}
                  </h2>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-neutral-600">
                    {guide.description}
                  </p>
                  <span className="mt-5 inline-flex items-center text-sm font-semibold text-neutral-950">
                    {t.read}
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
