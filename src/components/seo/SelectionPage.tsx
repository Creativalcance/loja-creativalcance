import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import ProductCard, {
  type ProductCardProduct,
} from "@/components/catalog/ProductCard";
import type { SelectionConfig } from "@/lib/seo/selection-pages";
import { getRelatedSelectionPages } from "@/lib/seo/selection-pages";
import { localizePath, type SiteLocale } from "@/lib/i18n/config";

const copy = {
  pt: {
    back: "← Voltar às Seleções 360", noRanking: "Sem ranking artificial", methodology: "Ver metodologia editorial",
    criteria: "Critérios da seleção", criterion: "Critério", products: "Produtos relacionados", productsHeading: "Opções do catálogo ativo para comparar",
    productsText: "A seleção é um ponto de partida. Confirme sempre stock, quantidade mínima, preço, materiais, variante e personalização na ficha individual antes de decidir.",
    search: "Pesquisar catálogo", emptyHeading: "Sem sugestões suficientes neste momento", emptyText: "O catálogo pode não devolver referências suficientes para os termos desta seleção. Continue pela pesquisa ou use o Smart Merch para ajustar os critérios.",
    helpHeading: "Precisa de cruzar orçamento, quantidade e prazo?", helpText: "As Seleções 360 ajudam a comparar famílias de produto. Para um pedido concreto, use o Smart Merch ou uma página comercial com filtros explícitos.",
    principle: "Princípio editorial", principleHeading: "O termo “melhores” precisa de contexto", principleText: "Não usamos o termo como sinónimo de vencedor absoluto. Explicamos os critérios, mostramos opções relacionadas e deixamos a decisão final dependente da necessidade concreta e dos dados do produto.",
    faq: "Perguntas frequentes", others: "Outras Seleções 360", view: "Ver seleção",
  },
  en: {
    back: "← Back to 360 Selections", noRanking: "No artificial ranking", methodology: "View editorial methodology",
    criteria: "Selection criteria", criterion: "Criterion", products: "Related products", productsHeading: "Active catalogue options to compare",
    productsText: "This selection is a starting point. Always check stock, minimum quantity, price, materials, variant and customisation on the individual product page before deciding.",
    search: "Search catalogue", emptyHeading: "Not enough suggestions right now", emptyText: "The catalogue may not return enough products for this selection. Continue to search or use Smart Merch to adjust your criteria.",
    helpHeading: "Need to balance budget, quantity and deadline?", helpText: "360 Selections help you compare product families. For a specific request, use Smart Merch or a commercial page with explicit filters.",
    principle: "Editorial principle", principleHeading: "The word “best” needs context", principleText: "We do not use the term to imply an absolute winner. We explain the criteria, show related options and leave the final decision to your specific needs and the product data.",
    faq: "Frequently asked questions", others: "Other 360 Selections", view: "View selection",
  },
  fr: {
    back: "← Retour aux Sélections 360", noRanking: "Aucun classement artificiel", methodology: "Voir la méthodologie éditoriale",
    criteria: "Critères de sélection", criterion: "Critère", products: "Produits associés", productsHeading: "Options du catalogue actif à comparer",
    productsText: "Cette sélection est un point de départ. Vérifiez toujours le stock, la quantité minimale, le prix, les matières, la variante et la personnalisation sur la fiche produit avant de décider.",
    search: "Rechercher dans le catalogue", emptyHeading: "Pas assez de suggestions pour le moment", emptyText: "Le catalogue peut ne pas proposer assez de références pour cette sélection. Poursuivez votre recherche ou ajustez vos critères avec Smart Merch.",
    helpHeading: "Vous devez concilier budget, quantité et délai ?", helpText: "Les Sélections 360 aident à comparer les familles de produits. Pour une demande précise, utilisez Smart Merch ou une page commerciale avec des filtres explicites.",
    principle: "Principe éditorial", principleHeading: "Le terme « meilleur » exige du contexte", principleText: "Nous ne l’utilisons pas comme synonyme de vainqueur absolu. Nous expliquons les critères, présentons les options associées et faisons dépendre la décision finale de votre besoin et des données du produit.",
    faq: "Questions fréquentes", others: "Autres Sélections 360", view: "Voir la sélection",
  },
} satisfies Record<SiteLocale, Record<string, string>>;

export default function SelectionPage({
  config,
  products,
  locale,
}: {
  config: SelectionConfig;
  products: ProductCardProduct[];
  locale: SiteLocale;
}) {
  const related = getRelatedSelectionPages(config, locale);
  const t = copy[locale];
  const searchTerm = config.productQueries[0] ?? "";

  return (
    <main className="min-h-screen bg-neutral-50">
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <Link
            href={localizePath("/selecoes", locale)}
            className="text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
          >
            {t.back}
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
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#162334] text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-lg font-semibold text-neutral-950">
                {t.noRanking}
              </h2>
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                {config.methodology}
              </p>
              <Link
                href={localizePath("/metodologia-editorial", locale)}
                className="mt-5 inline-flex items-center text-sm font-semibold text-neutral-950"
              >
                {t.methodology}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </aside>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">
          {t.criteria}
        </p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {config.criteria.map((criterion, index) => (
            <div
              key={criterion}
              className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm"
            >
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
                {t.criterion} {index + 1}
              </span>
              <CheckCircle2 className="mt-4 h-5 w-5 text-emerald-600" />
              <p className="mt-3 text-sm font-semibold leading-6 text-neutral-900">
                {criterion}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">
                {t.products}
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
                {t.productsHeading}
              </h2>
              <p className="mt-3 max-w-3xl text-neutral-600">
                {t.productsText}
              </p>
            </div>

            <Link
              href={`${localizePath("/pesquisa", locale)}?q=${encodeURIComponent(searchTerm)}`}
              className="inline-flex items-center justify-center rounded-full border border-neutral-300 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-900 transition hover:border-neutral-500"
            >
              <Search className="mr-2 h-4 w-4" />
              {t.search}
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
                {t.emptyHeading}
              </h3>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                {t.emptyText}
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-950 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight text-neutral-950">
              {t.helpHeading}
            </h2>
            <p className="mt-4 leading-7 text-neutral-600">
              {t.helpText}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={localizePath("/smart-merch", locale)}
                className="inline-flex items-center rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white"
              >
                Smart Merch <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href={localizePath(config.relatedSolutionHref, locale)}
                className="inline-flex items-center rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:border-neutral-500"
              >
                {config.relatedSolutionLabel}
              </Link>
            </div>
          </article>

          <aside className="rounded-3xl bg-[#162334] p-7 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
              {t.principle}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              {t.principleHeading}
            </h2>
            <p className="mt-4 text-sm leading-6 text-white/65">
              {t.principleText}
            </p>
          </aside>
        </div>
      </section>

      <section className="border-y border-neutral-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-12 md:py-16">
          <div className="flex items-center gap-3">
            <HelpCircle className="h-6 w-6 text-neutral-500" />
            <h2 className="text-3xl font-semibold tracking-tight text-neutral-950">
              {t.faq}
            </h2>
          </div>
          <div className="mt-7 divide-y divide-neutral-200 rounded-3xl border border-neutral-200 bg-neutral-50 px-6">
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
        <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">
            {t.others}
          </p>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {related.map((item) => (
              <Link
                key={item.slug}
                href={localizePath(`/selecoes/${item.slug}`, locale)}
                className="group rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <h2 className="text-xl font-semibold tracking-tight text-neutral-950">
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
        </section>
      ) : null}
    </main>
  );
}
