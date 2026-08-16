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
  const resolvedParams = await params;
  const categoryName = sanitizeCategoryValue(resolvedParams.categoria);
  const seoContent = buildCategorySeoContent(categoryName);

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
    breadcrumbParentLabel: "Categorias",
    breadcrumbLabel: categoryName,
  });

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-12">
      <section className="mx-auto max-w-7xl">
        <Link
          href="/categorias"
          className="text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
        >
          ← Voltar às categorias
        </Link>

        <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
              Categoria
            </p>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950">
              {seoContent.title}
            </h1>

            <p className="mt-4 max-w-3xl leading-7 text-neutral-600">
              {seoContent.intro}
            </p>
          </div>

          <Link
            href="/pesquisa"
            className="inline-flex items-center justify-center rounded-2xl bg-neutral-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            <Search className="mr-2 h-4 w-4" />
            Pesquisar produtos
          </Link>
        </div>

        {subcategories.length > 0 ? (
          <div className="mt-10 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Subcategorias
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {subcategories.map((subcategory) => (
                <Link
                  key={subcategory}
                  href={`${categoryPath}/${encodeURIComponent(subcategory)}`}
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
            {products.length.toLocaleString("pt-PT")} produto(s) apresentado(s)
          </p>
        </div>

        {productsResult.error ? (
          <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            Não foi possível carregar os produtos desta categoria. Tenta
            novamente.
          </div>
        ) : null}

        {products.length > 0 ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-neutral-950">
              Sem produtos nesta categoria
            </h2>

            <p className="mt-3 text-neutral-600">
              Confirma se existem produtos activos com esta categoria.
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
              Explorar por necessidade
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              Não procure apenas por categoria
            </h2>
            <p className="mt-4 text-sm leading-6 text-white/65">
              Consulte soluções para welcome kits, eventos, congressos,
              colaboradores e setores específicos.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/aplicacoes"
                className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#162334]"
              >
                Aplicações <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/industrias"
                className="inline-flex items-center rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Indústrias
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
  const categoryName = sanitizeCategoryValue(resolvedParams.categoria);
  const seoContent = buildCategorySeoContent(categoryName);
  const canonical = `/categorias/${encodeURIComponent(categoryName)}`;

  return {
    title: seoContent.title,
    description: seoContent.description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      locale: "pt_PT",
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
