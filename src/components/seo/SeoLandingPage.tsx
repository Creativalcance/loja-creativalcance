import Link from "next/link";
import { ArrowRight, CheckCircle2, Search, Sparkles } from "lucide-react";
import ProductCard, {
  type ProductCardProduct,
} from "@/components/catalog/ProductCard";
import type { SeoLandingConfig } from "@/lib/seo/landing-pages";
import { getRelatedLandingPages } from "@/lib/seo/landing-pages";
import { localizePath, type SiteLocale } from "@/lib/i18n/config";

function getBasePath(config: SeoLandingConfig): string {
  return config.kind === "application" ? "/aplicacoes" : "/industrias";
}

type SeoLandingPageProps = {
  config: SeoLandingConfig;
  products: ProductCardProduct[];
  locale: SiteLocale;
};

export default function SeoLandingPage({
  config,
  products,
  locale,
}: SeoLandingPageProps) {
  const basePath = getBasePath(config);
  const text = locale === "en" ? { applications: "applications", industries: "industries", back: "Back to", thinking: "Planning for this requirement?", thinkingText: "Use Smart Merch to combine product type, quantity, budget and deadline, or explore the suggestions on this page.", trySmart: "Try Smart Merch", budget: "By budget and quantity", relatedProducts: "Related products", suggestions: "Suggestions to get started", suggestionsText: "This selection uses the active catalogue and terms related to this requirement. Always confirm stock, quantities and customisation on the product page.", search: "Search catalogue", explore: "Browse the full catalogue", empty: "Specific suggestions are not available right now. Continue with search or Smart Merch.", also: "Explore more", view: "View page" } : locale === "fr" ? { applications: "applications", industries: "secteurs", back: "Retour aux", thinking: "Vous préparez ce type de projet ?", thinkingText: "Utilisez Smart Merch pour croiser type de produit, quantité, budget et délai, ou consultez les suggestions de cette page.", trySmart: "Essayer Smart Merch", budget: "Par budget et quantité", relatedProducts: "Produits associés", suggestions: "Suggestions pour commencer", suggestionsText: "Cette sélection repose sur le catalogue actif et des termes liés à ce besoin. Vérifiez toujours le stock, les quantités et la personnalisation sur la fiche produit.", search: "Rechercher dans le catalogue", explore: "Explorer tout le catalogue", empty: "Aucune suggestion spécifique n’est disponible pour le moment. Continuez avec la recherche ou Smart Merch.", also: "À découvrir également", view: "Voir la page" } : { applications: "aplicações", industries: "indústrias", back: "Voltar a", thinking: "A pensar nesta necessidade?", thinkingText: "Use o Smart Merch para cruzar tipo de produto, quantidade, orçamento e prazo, ou explore as sugestões desta página.", trySmart: "Experimentar Smart Merch", budget: "Por orçamento e quantidade", relatedProducts: "Produtos relacionados", suggestions: "Sugestões para começar", suggestionsText: "A seleção abaixo é construída a partir do catálogo ativo e de termos relacionados com esta necessidade. Confirme sempre stock, quantidades e opções de personalização na página do produto.", search: "Pesquisar catálogo", explore: "Explore o catálogo completo", empty: "Não foi possível carregar sugestões específicas neste momento. Pode continuar pela pesquisa ou pelo Smart Merch.", also: "Explorar também", view: "Ver página" };
  const hubLabel = config.kind === "application" ? text.applications : text.industries;
  const relatedPages = getRelatedLandingPages(config, locale);

  return (
    <main className="min-h-screen bg-neutral-50">
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <Link
            href={localizePath(basePath, locale)}
            className="text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
          >
            ← {text.back} {hubLabel}
          </Link>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_0.8fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#e85f00]">
                {config.eyebrow}
              </p>
              <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-neutral-950 md:text-6xl">
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
              <h2 className="mt-5 text-lg font-semibold text-neutral-950">
                {text.thinking}
              </h2>
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                {text.thinkingText}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={localizePath("/smart-merch", locale)}
                  className="inline-flex items-center rounded-full bg-[#162334] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#24364d]"
                >
                  {text.trySmart}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  href={localizePath("/solucoes", locale)}
                  className="inline-flex items-center rounded-full border border-neutral-300 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-900 transition hover:border-neutral-500"
                >
                  {text.budget}
                </Link>
              </div>
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
                {text.relatedProducts}
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
                {text.suggestions}
              </h2>
              <p className="mt-3 max-w-3xl text-neutral-600">
                {text.suggestionsText}
              </p>
            </div>

            <Link
              href={localizePath(`/pesquisa?q=${encodeURIComponent(config.productQueries[0] ?? "")}`, locale)}
              className="inline-flex items-center justify-center rounded-full border border-neutral-300 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-900 transition hover:border-neutral-500"
            >
              <Search className="mr-2 h-4 w-4" />
              {text.search}
            </Link>
          </div>

          {products.length > 0 ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} locale={locale} />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-3xl border border-neutral-200 bg-neutral-50 p-8 text-center">
              <h3 className="text-lg font-semibold text-neutral-950">
                {text.explore}
              </h3>
              <p className="mt-2 text-sm text-neutral-600">
                {text.empty}
              </p>
            </div>
          )}
        </div>
      </section>

      {relatedPages.length > 0 ? (
        <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">
            {text.also}
          </p>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {relatedPages.map((item) => (
              <Link
                key={item.slug}
                href={localizePath(`${basePath}/${item.slug}`, locale)}
                className="group rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <h2 className="text-xl font-semibold tracking-tight text-neutral-950">
                  {item.h1}
                </h2>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-neutral-600">
                  {item.description}
                </p>
                <span className="mt-5 inline-flex items-center text-sm font-semibold text-neutral-950">
                  {text.view}
                  <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
