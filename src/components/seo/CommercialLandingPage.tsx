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
import { localizePath, type SiteLocale } from "@/lib/i18n/config";

const copy = {
  pt: { groups: { commercial: "Soluções comerciais", budget: "Soluções por orçamento", quantity: "Soluções por quantidade", occasion: "Soluções por ocasião" }, back: "Voltar às soluções", moreTitle: "Precisa de cruzar mais critérios?", moreText: "No Smart Merch pode combinar necessidade, quantidade, orçamento e prazo para reduzir a pesquisa antes de configurar o produto.", smart: "Experimentar Smart Merch", selection: "Seleção comercial", productTitle: "Produtos que cumprem o filtro inicial desta página", search: "Pesquisar catálogo", budget: "O filtro de orçamento usa preços base existentes no catálogo. Não representa um orçamento fechado nem inclui automaticamente a personalização. O valor final deve ser confirmado para a quantidade e configuração escolhidas.", emptyTitle: "Sem sugestões suficientes para este filtro", emptyText: "O catálogo pode não devolver produtos que cumpram o critério neste momento. Continue pela pesquisa ou utilize o Smart Merch.", before: "Antes de decidir", compareTitle: "Compare a solução completa, não apenas o primeiro filtro", compareText: "Orçamento, quantidade e ocasião ajudam a reduzir opções, mas a decisão final deve incluir stock, materiais, variante, personalização, prazo e utilização prevista.", choiceGuide: "Guia de escolha", budgetGuide: "Guia de orçamento", angle: "Explorar por outro ângulo", angleTitle: "Aplicação, setor ou técnica", angleText: "Se orçamento ou quantidade não forem o critério principal, explore por aplicação, indústria ou método de personalização.", applications: "Aplicações", industries: "Indústrias", customization: "Personalização", faq: "Perguntas frequentes", related: "Soluções relacionadas", view: "Ver solução" },
  en: { groups: { commercial: "Business solutions", budget: "Solutions by budget", quantity: "Solutions by quantity", occasion: "Solutions by occasion" }, back: "Back to solutions", moreTitle: "Need to combine more criteria?", moreText: "Smart Merch combines need, quantity, budget and deadline to narrow your search before configuring a product.", smart: "Try Smart Merch", selection: "Business selection", productTitle: "Products matching this page’s initial filter", search: "Search catalogue", budget: "The budget filter uses base catalogue prices. It is not a final quote and does not automatically include customisation. Confirm the final value for your quantity and configuration.", emptyTitle: "Not enough suggestions for this filter", emptyText: "The catalogue may not currently contain products matching this criterion. Continue with search or adjust your criteria in Smart Merch.", before: "Before deciding", compareTitle: "Compare the complete solution, not only the initial filter", compareText: "Budget, quantity and occasion narrow the options, but your final decision should include stock, materials, variant, customisation, timing and intended use.", choiceGuide: "Selection guide", budgetGuide: "Budget guide", angle: "Explore another angle", angleTitle: "Application, industry or technique", angleText: "If budget or quantity is not the main criterion, explore by application, industry or customisation method.", applications: "Applications", industries: "Industries", customization: "Customisation", faq: "Frequently asked questions", related: "Related solutions", view: "View solution" },
  fr: { groups: { commercial: "Solutions d’entreprise", budget: "Solutions par budget", quantity: "Solutions par quantité", occasion: "Solutions par occasion" }, back: "Retour aux solutions", moreTitle: "Besoin de combiner davantage de critères ?", moreText: "Smart Merch combine le besoin, la quantité, le budget et le délai pour affiner la recherche avant la configuration.", smart: "Essayer Smart Merch", selection: "Sélection commerciale", productTitle: "Produits correspondant au filtre initial", search: "Rechercher dans le catalogue", budget: "Le filtre utilise les prix de base du catalogue. Il ne constitue pas un devis final et n’inclut pas automatiquement la personnalisation. Confirmez le montant final.", emptyTitle: "Pas assez de suggestions pour ce filtre", emptyText: "Le catalogue peut ne pas contenir actuellement de produits correspondant à ce critère. Poursuivez la recherche ou ajustez les critères dans Smart Merch.", before: "Avant de décider", compareTitle: "Comparez la solution complète, pas seulement le premier filtre", compareText: "Le budget, la quantité et l’occasion réduisent les options, mais la décision finale doit aussi intégrer le stock, les matériaux, la variante, la personnalisation, le délai et l’usage.", choiceGuide: "Guide de sélection", budgetGuide: "Guide du budget", angle: "Explorer autrement", angleTitle: "Application, secteur ou technique", angleText: "Si le budget ou la quantité ne sont pas prioritaires, explorez par application, secteur ou méthode de personnalisation.", applications: "Applications", industries: "Secteurs", customization: "Personnalisation", faq: "Questions fréquentes", related: "Solutions associées", view: "Voir la solution" },
};

export default function CommercialLandingPage({
  config,
  products,
  locale,
}: {
  config: CommercialLandingConfig;
  products: ProductCardProduct[];
  locale: SiteLocale;
}) {
  const t = copy[locale];
  const relatedPages = getRelatedCommercialPages(config, locale);
  const faq = getCommercialPageFaq(config, locale);
  const searchTerm = config.productQueries[0] ?? "";

  return (
    <main className="min-h-screen bg-neutral-50">
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <Link
            href={localizePath("/solucoes", locale)}
            className="text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
          >
            ← {t.back}
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
                {t.groups[config.group]}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-neutral-950">
                {t.moreTitle}
              </h2>
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                {t.moreText}
              </p>
              <Link
                href={localizePath("/smart-merch", locale)}
                className="mt-5 inline-flex items-center rounded-full bg-[#162334] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#24364d]"
              >
                {t.smart}
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
                {t.selection}
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
                {t.productTitle}
              </h2>
              <p className="mt-3 max-w-3xl text-neutral-600">
                {config.selectionNote}
              </p>
            </div>

            <Link
              href={localizePath(`/pesquisa?q=${encodeURIComponent(searchTerm)}`, locale)}
              className="inline-flex items-center justify-center rounded-full border border-neutral-300 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-900 transition hover:border-neutral-500"
            >
              <Search className="mr-2 h-4 w-4" />
              {t.search}
            </Link>
          </div>

          {config.group === "budget" ? (
            <div className="mt-6 flex max-w-4xl gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              <BadgeEuro className="mt-0.5 h-5 w-5 shrink-0" />
              <p>
                {t.budget}
              </p>
            </div>
          ) : null}

          {products.length > 0 ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} locale={locale} />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-3xl border border-neutral-200 bg-neutral-50 p-8 text-center">
              <h3 className="text-lg font-semibold text-neutral-950">
                {t.emptyTitle}
              </h3>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                {t.emptyText}
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              {t.before}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">
              {t.compareTitle}
            </h2>
            <p className="mt-4 leading-7 text-neutral-600">
              {t.compareText}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={localizePath("/guias/como-escolher-brindes-personalizados-empresas", locale)}
                className="inline-flex items-center rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white"
              >
                {t.choiceGuide} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href={localizePath("/guias/como-planear-merchandising-por-orcamento", locale)}
                className="inline-flex items-center rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:border-neutral-500"
              >
                {t.budgetGuide}
              </Link>
            </div>
          </article>

          <aside className="rounded-3xl bg-[#162334] p-7 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
              {t.angle}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              {t.angleTitle}
            </h2>
            <p className="mt-4 text-sm leading-6 text-white/65">
              {t.angleText}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={localizePath("/aplicacoes", locale)}
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#162334]"
              >
                {t.applications}
              </Link>
              <Link
                href={localizePath("/industrias", locale)}
                className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {t.industries}
              </Link>
              <Link
                href={localizePath("/personalizacao", locale)}
                className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {t.customization}
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
              {t.faq}
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
              {t.related}
            </p>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {relatedPages.map((item) => (
                <Link
                  key={item.slug}
                  href={localizePath(`/solucoes/${item.slug}`, locale)}
                  className="group rounded-3xl border border-neutral-200 bg-neutral-50 p-6 transition hover:-translate-y-1 hover:bg-white hover:shadow-lg"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
                    {t.groups[item.group]}
                  </p>
                  <h2 className="mt-3 text-xl font-semibold tracking-tight text-neutral-950">
                    {item.h1}
                  </h2>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-neutral-600">
                    {item.description}
                  </p>
                  <span className="mt-5 inline-flex items-center text-sm font-semibold text-neutral-950">
                    {t.view}
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
