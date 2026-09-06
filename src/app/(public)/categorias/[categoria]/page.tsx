import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Search } from "lucide-react";
import ProductCard, {
  type ProductCardProduct,
} from "@/components/catalog/ProductCard";
import { buildCategorySeoContent } from "@/lib/seo/category-content";
import {
  buildCollectionStructuredData,
  serializeJsonLd,
} from "@/lib/seo/structured-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { localizePath } from "@/lib/i18n/config";
import { getCurrentLocale } from "@/lib/i18n/server";

type CategoryProductsPageProps = {
  params: Promise<{
    categoria: string;
  }>;
};

type SubtypeRow = {
  subtype_name: string | null;
};

function sanitizeCategoryValue(value: string): string {
  return decodeURIComponent(value)
    .trim()
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 100);
}

function getSubcategories(rows: SubtypeRow[]): string[] {
  return Array.from(
    new Set(
      rows
        .map((row) => row.subtype_name?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort((a, b) => a.localeCompare(b, "pt-PT"));
}

export default async function CategoryProductsPage({
  params,
}: CategoryProductsPageProps) {
  const locale = await getCurrentLocale();
  const resolvedParams = await params;
  const categoryName = sanitizeCategoryValue(resolvedParams.categoria);
  const seoContent = buildCategorySeoContent(categoryName, locale);
  const copy = locale === "en"
    ? {
        back: "Back to categories", category: "Category", search: "Search products",
        subcategories: "Subcategories", productCount: (count: number) => `${count.toLocaleString("en-GB")} product${count === 1 ? "" : "s"}`,
        loadError: "We couldn't load the products in this category. Please try again.", emptyTitle: "No products in this category",
        emptyText: "Check whether there are active products assigned to this category.", explore: "Explore by need",
        exploreTitle: "Go beyond categories", exploreText: "Browse solutions by budget and quantity, use cases such as welcome kits and events, or pages for specific industries.",
        solutions: "Solutions", applications: "Use cases", industries: "Industries", breadcrumb: "Categories",
      }
    : locale === "fr"
      ? {
          back: "Retour aux catégories", category: "Catégorie", search: "Rechercher des produits",
          subcategories: "Sous-catégories", productCount: (count: number) => `${count.toLocaleString("fr-FR")} produit${count === 1 ? "" : "s"}`,
          loadError: "Impossible de charger les produits de cette catégorie. Veuillez réessayer.", emptyTitle: "Aucun produit dans cette catégorie",
          emptyText: "Vérifiez que des produits actifs sont associés à cette catégorie.", explore: "Explorer selon vos besoins",
          exploreTitle: "Ne vous limitez pas aux catégories", exploreText: "Découvrez des solutions par budget et quantité, des usages comme les welcome kits et événements, ou des pages dédiées à des secteurs précis.",
          solutions: "Solutions", applications: "Usages", industries: "Secteurs", breadcrumb: "Catégories",
        }
      : {
          back: "Voltar às categorias", category: "Categoria", search: "Pesquisar produtos",
          subcategories: "Subcategorias", productCount: (count: number) => `${count.toLocaleString("pt-PT")} produto${count === 1 ? "" : "s"} apresentado${count === 1 ? "" : "s"}`,
          loadError: "Não foi possível carregar os produtos desta categoria. Tenta novamente.", emptyTitle: "Sem produtos nesta categoria",
          emptyText: "Confirma se existem produtos ativos com esta categoria.", explore: "Explorar por necessidade",
          exploreTitle: "Não procure apenas por categoria", exploreText: "Consulte soluções por orçamento e quantidade, aplicações como welcome kits e eventos, ou páginas dedicadas a setores específicos.",
          solutions: "Soluções", applications: "Aplicações", industries: "Indústrias", breadcrumb: "Categorias",
        };

  const supabase = await createSupabaseServerClient();

  const [productsResult, subtypesResult] = await Promise.all([
    supabase
      .from("products")
      .select(
        `
          id,
          sku,
          name,
          slug,
          short_description,
          brand,
          material,
          type_name,
          subtype_name,
          is_featured,
          is_customizable,
          min_order_quantity,
          product_images (
            external_url,
            storage_url,
            alt_text,
            is_primary,
            sort_order,
            image_type
          ),
          product_prices (
            final_price,
            quantity_min,
            currency
          ),
          product_stocks (
            available_quantity
          )
        `,
      )
      .eq("status", "active")
      .eq("is_active", true)
      .eq("type_name", categoryName)
      .order("is_purchasable", { ascending: false })
      .order("is_featured", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(48),
    supabase
      .from("products")
      .select("subtype_name")
      .eq("status", "active")
      .eq("is_active", true)
      .eq("type_name", categoryName)
      .not("subtype_name", "is", null)
      .limit(2000),
  ]);

  const products = productsResult.error
    ? []
    : ((productsResult.data ?? []) as unknown as ProductCardProduct[]);
  const subcategories = subtypesResult.error
    ? []
    : getSubcategories((subtypesResult.data ?? []) as SubtypeRow[]);

  const categoryPath = `/categorias/${encodeURIComponent(categoryName)}`;
  const structuredData = buildCollectionStructuredData({
    name: seoContent.title,
    description: seoContent.description,
    path: categoryPath,
    breadcrumbParentPath: "/categorias",
    breadcrumbParentLabel: copy.breadcrumb,
    breadcrumbLabel: categoryName,
  });

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-12">
      <section className="mx-auto max-w-7xl">
        <Link
          href={localizePath("/categorias", locale)}
          className="text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
        >
          ← {copy.back}
        </Link>

        <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
              {copy.category}
            </p>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950">
              {seoContent.title}
            </h1>

            <p className="mt-4 max-w-3xl leading-7 text-neutral-600">
              {seoContent.intro}
            </p>
          </div>

          <Link
            href={localizePath("/pesquisa", locale)}
            className="inline-flex items-center justify-center rounded-2xl bg-neutral-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            <Search className="mr-2 h-4 w-4" />
            {copy.search}
          </Link>
        </div>

        {subcategories.length > 0 ? (
          <div className="mt-10 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              {copy.subcategories}
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {subcategories.map((subcategory) => (
                <Link
                  key={subcategory}
                  href={localizePath(`${categoryPath}/${encodeURIComponent(subcategory)}`, locale)}
                  className="rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 hover:bg-white hover:text-neutral-950"
                >
                  {subcategory}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex items-center justify-between gap-4">
          <p className="text-sm text-neutral-500">
            {copy.productCount(products.length)}
          </p>
        </div>

        {productsResult.error ? (
          <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {copy.loadError}
          </div>
        ) : null}

        {products.length > 0 ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} locale={locale} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-neutral-950">
              {copy.emptyTitle}
            </h2>

            <p className="mt-3 text-neutral-600">
              {copy.emptyText}
            </p>
          </div>
        )}

        <div className="mt-14 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">
              {seoContent.guideTitle}
            </h2>
            <p className="mt-4 leading-7 text-neutral-600">
              {seoContent.guideText}
            </p>
          </article>

          <aside className="rounded-3xl bg-[#162334] p-7 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
              {copy.explore}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              {copy.exploreTitle}
            </h2>
            <p className="mt-4 text-sm leading-6 text-white/65">
              {copy.exploreText}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={localizePath("/solucoes", locale)}
                className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#162334]"
              >
                {copy.solutions} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href={localizePath("/aplicacoes", locale)}
                className="inline-flex items-center rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {copy.applications}
              </Link>
              <Link
                href={localizePath("/industrias", locale)}
                className="inline-flex items-center rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {copy.industries}
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
    </main>
  );
}

export async function generateMetadata({
  params,
}: CategoryProductsPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const locale = await getCurrentLocale();
  const categoryName = sanitizeCategoryValue(resolvedParams.categoria);
  const seoContent = buildCategorySeoContent(categoryName, locale);
  const canonical = localizePath(`/categorias/${encodeURIComponent(categoryName)}`, locale);

  return {
    title: seoContent.title,
    description: seoContent.description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      locale: locale === "en" ? "en_GB" : locale === "fr" ? "fr_FR" : "pt_PT",
      title: seoContent.title,
      description: seoContent.description,
      url: canonical,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}
