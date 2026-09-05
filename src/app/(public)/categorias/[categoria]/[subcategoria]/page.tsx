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
  const description = buildSubcategoryDescription(categoryName, subcategoryName);
  const structuredData = buildCollectionStructuredData({
    name: `Produtos de ${subcategoryName} personalizáveis`,
    description,
    path,
    breadcrumbParentPath: categoryPath,
    breadcrumbParentLabel: categoryName,
    breadcrumbLabel: subcategoryName,
  });

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-12">
      <section className="mx-auto max-w-7xl">
        <Link
          href={categoryPath}
          className="text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
        >
          ← Voltar a {categoryName}
        </Link>

        <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
              {categoryName} · Subcategoria
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950">
              Produtos de {subcategoryName} personalizáveis
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
            Pesquisar no catálogo
          </Link>
        </div>

        <p className="mt-8 text-sm text-neutral-500">
          {products.length.toLocaleString("pt-PT")} produto(s) apresentado(s)
        </p>

        {error ? (
          <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            Não foi possível carregar os produtos desta subcategoria. Tenta
            novamente.
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
              Sem produtos disponíveis
            </h2>
            <p className="mt-3 text-neutral-600">
              Explore a categoria principal ou utilize a pesquisa do catálogo.
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
  const categoryName = sanitizeValue(resolvedParams.categoria);
  const subcategoryName = sanitizeValue(resolvedParams.subcategoria);
  const path = `/categorias/${encodeURIComponent(categoryName)}/${encodeURIComponent(subcategoryName)}`;
  const description = buildSubcategoryDescription(categoryName, subcategoryName);

  return {
    title: `Produtos de ${subcategoryName} personalizáveis`,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "pt_PT",
      title: `Produtos de ${subcategoryName} personalizáveis`,
      description,
      url: path,
    },
  };
}
