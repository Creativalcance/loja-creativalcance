import Link from "next/link";
import { ArrowRight, Boxes, Search } from "lucide-react";
import ProductCard, {
  type ProductCardProduct,
} from "@/components/catalog/ProductCard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ProductsPageProps = {
  searchParams?: Promise<{
    categoria?: string;
  }>;
};

type CategoryRow = {
  type_name: string | null;
};

type CatalogCategory = {
  name: string;
  count: number;
};

function sanitizeFilterValue(value: string): string {
  return value.trim().replace(/[<>]/g, "").replace(/\s+/g, " ").slice(0, 100);
}

function buildCategoryHref(categoryName: string): string {
  const params = new URLSearchParams();

  params.set("categoria", categoryName);

  return `/produto?${params.toString()}`;
}

function getCatalogCategories(rows: CategoryRow[]): CatalogCategory[] {
  const categoryMap = new Map<string, number>();

  rows.forEach((row) => {
    const categoryName = row.type_name?.trim();

    if (!categoryName) {
      return;
    }

    categoryMap.set(categoryName, (categoryMap.get(categoryName) ?? 0) + 1);
  });

  return Array.from(categoryMap.entries())
    .map(([name, count]) => ({
      name,
      count,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-PT"));
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const resolvedSearchParams = await searchParams;
  const selectedCategory = sanitizeFilterValue(
    resolvedSearchParams?.categoria ?? "",
  );

  const supabase = await createSupabaseServerClient();

  const { data: categoryData, error: categoryError } = await supabase
    .from("products")
    .select("type_name")
    .eq("status", "active")
    .eq("is_active", true)
    .not("type_name", "is", null)
    .limit(5000);

  const categories = getCatalogCategories((categoryData ?? []) as CategoryRow[]);

  let productsQuery = supabase
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
    .order("is_featured", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(selectedCategory ? 48 : 12);

  if (selectedCategory) {
    productsQuery = productsQuery.eq("type_name", selectedCategory);
  }

  const { data: productsData, error: productsError } = await productsQuery;

  const products = productsError
    ? []
    : ((productsData ?? []) as unknown as ProductCardProduct[]);

  const hasError = Boolean(categoryError || productsError);

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-12">
      <section className="mx-auto max-w-7xl">
        <Link
          href="/"
          className="text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
        >
          ← Voltar à página inicial
        </Link>

        <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
              Catálogo
            </p>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950">
              {selectedCategory ? selectedCategory : "Categorias de produtos"}
            </h1>

            <p className="mt-4 max-w-3xl text-neutral-600">
              Explora o catálogo por categoria, encontra produtos reais
              importados da Stricker e pesquisa por nome, SKU, material, marca
              ou tipo de produto.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {selectedCategory ? (
              <Link
                href="/produto"
                className="inline-flex items-center justify-center rounded-2xl border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-950 transition hover:border-neutral-950"
              >
                Ver categorias
              </Link>
            ) : null}

            <Link
              href="/pesquisa"
              className="inline-flex items-center justify-center rounded-2xl bg-neutral-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              <Search className="mr-2 h-4 w-4" />
              Pesquisar produtos
            </Link>
          </div>
        </div>

        {hasError ? (
          <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            Não foi possível carregar o catálogo. Tenta novamente.
          </div>
        ) : null}

        {!selectedCategory ? (
          <>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {categories.map((category) => (
                <Link
                  key={category.name}
                  href={buildCategoryHref(category.name)}
                  className="group rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-950 text-white">
                    <Boxes className="h-5 w-5" />
                  </div>

                  <h2 className="mt-6 line-clamp-2 text-xl font-semibold tracking-tight text-neutral-950">
                    {category.name}
                  </h2>

                  <p className="mt-3 text-sm text-neutral-500">
                    {category.count.toLocaleString("pt-PT")} produto(s)
                    disponíveis
                  </p>

                  <span className="mt-6 inline-flex items-center text-sm font-semibold text-neutral-950">
                    Ver produtos
                    <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
            </div>

            <div className="mt-14 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
                  Produtos
                </p>

                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">
                  Produtos em destaque
                </h2>
              </div>

              <Link
                href="/pesquisa"
                className="text-sm font-semibold text-neutral-950 underline-offset-4 hover:underline"
              >
                Ver pesquisa avançada
              </Link>
            </div>
          </>
        ) : (
          <div className="mt-8 flex items-center justify-between gap-4">
            <p className="text-sm text-neutral-500">
              {products.length.toLocaleString("pt-PT")} produto(s)
              apresentado(s)
            </p>
          </div>
        )}

        {products.length > 0 ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-neutral-950">
              {selectedCategory
                ? "Sem produtos nesta categoria"
                : "Ainda não existem produtos disponíveis"}
            </h2>

            <p className="mt-3 text-neutral-600">
              Confirma se os produtos importados estão activos e se a
              sincronização terminou correctamente.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}