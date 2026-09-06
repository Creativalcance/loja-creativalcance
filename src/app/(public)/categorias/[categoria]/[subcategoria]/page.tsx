import Link from "next/link";
import type { Metadata } from "next";
import { Search } from "lucide-react";
import { notFound } from "next/navigation";
import ProductCard, {
  type ProductCardProduct,
} from "@/components/catalog/ProductCard";
import { buildSubcategoryDescription } from "@/lib/seo/category-content";
import {
  buildCollectionStructuredData,
  serializeJsonLd,
} from "@/lib/seo/structured-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { localizePath } from "@/lib/i18n/config";
import { getCurrentLocale } from "@/lib/i18n/server";

type SubcategoryPageProps = {
  params: Promise<{
    categoria: string;
    subcategoria: string;
  }>;
};

function sanitizeValue(value: string): string {
  return decodeURIComponent(value)
    .trim()
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 120);
}

export default async function SubcategoryPage({ params }: SubcategoryPageProps) {
  const locale = await getCurrentLocale();
  const resolvedParams = await params;
  const categoryName = sanitizeValue(resolvedParams.categoria);
  const subcategoryName = sanitizeValue(resolvedParams.subcategoria);
  const copy = locale === "en"
    ? {
        back: `Back to ${categoryName}`, label: "Subcategory",
        title: `Customisable ${subcategoryName} products`, search: "Search the catalogue",
        productCount: (count: number) => `${count.toLocaleString("en-GB")} product${count === 1 ? "" : "s"}`,
        loadError: "We couldn't load the products in this subcategory. Please try again.",
        emptyTitle: "No products available", emptyText: "Explore the main category or search the catalogue.",
      }
    : locale === "fr"
      ? {
          back: `Retour à ${categoryName}`, label: "Sous-catégorie",
          title: `Produits ${subcategoryName} personnalisables`, search: "Rechercher dans le catalogue",
          productCount: (count: number) => `${count.toLocaleString("fr-FR")} produit${count === 1 ? "" : "s"}`,
          loadError: "Impossible de charger les produits de cette sous-catégorie. Veuillez réessayer.",
          emptyTitle: "Aucun produit disponible", emptyText: "Explorez la catégorie principale ou utilisez la recherche du catalogue.",
        }
      : {
          back: `Voltar a ${categoryName}`, label: "Subcategoria",
          title: `Produtos de ${subcategoryName} personalizáveis`, search: "Pesquisar no catálogo",
          productCount: (count: number) => `${count.toLocaleString("pt-PT")} produto${count === 1 ? "" : "s"} apresentado${count === 1 ? "" : "s"}`,
          loadError: "Não foi possível carregar os produtos desta subcategoria. Tenta novamente.",
          emptyTitle: "Sem produtos disponíveis", emptyText: "Explore a categoria principal ou utilize a pesquisa do catálogo.",
        };
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
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
    .eq("subtype_name", subcategoryName)
    .order("is_purchasable", { ascending: false })
    .order("is_featured", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(48);

  const products = error ? [] : ((data ?? []) as unknown as ProductCardProduct[]);

  if (!error && products.length === 0) {
    return notFound();
  }

  const categoryPath = `/categorias/${encodeURIComponent(categoryName)}`;
  const path = `${categoryPath}/${encodeURIComponent(subcategoryName)}`;
  const description = buildSubcategoryDescription(categoryName, subcategoryName, locale);
  const structuredData = buildCollectionStructuredData({
    name: copy.title,
    description,
    path: localizePath(path, locale),
    breadcrumbParentPath: localizePath(categoryPath, locale),
    breadcrumbParentLabel: categoryName,
    breadcrumbLabel: subcategoryName,
  });

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-12">
      <section className="mx-auto max-w-7xl">
        <Link
          href={localizePath(categoryPath, locale)}
          className="text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
        >
          ← {copy.back}
        </Link>

        <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
              {categoryName} · {copy.label}
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950">
              {copy.title}
            </h1>
            <p className="mt-4 max-w-3xl leading-7 text-neutral-600">
              {description}
            </p>
          </div>

          <Link
            href={localizePath(`/pesquisa?q=${encodeURIComponent(subcategoryName)}`, locale)}
            className="inline-flex items-center justify-center rounded-2xl bg-neutral-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            <Search className="mr-2 h-4 w-4" />
            {copy.search}
          </Link>
        </div>

        <p className="mt-8 text-sm text-neutral-500">
          {copy.productCount(products.length)}
        </p>

        {error ? (
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
}: SubcategoryPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const locale = await getCurrentLocale();
  const categoryName = sanitizeValue(resolvedParams.categoria);
  const subcategoryName = sanitizeValue(resolvedParams.subcategoria);
  const path = localizePath(`/categorias/${encodeURIComponent(categoryName)}/${encodeURIComponent(subcategoryName)}`, locale);
  const description = buildSubcategoryDescription(categoryName, subcategoryName, locale);
  const title = locale === "en"
    ? `Customisable ${subcategoryName} products`
    : locale === "fr"
      ? `Produits ${subcategoryName} personnalisables`
      : `Produtos de ${subcategoryName} personalizáveis`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: locale === "en" ? "en_GB" : locale === "fr" ? "fr_FR" : "pt_PT",
      title,
      description,
      url: path,
    },
  };
}
