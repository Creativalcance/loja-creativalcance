import Link from "next/link";
import { Search } from "lucide-react";
import ProductCard, {
  type ProductCardProduct,
} from "@/components/catalog/ProductCard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CategoryProductsPageProps = {
  params: Promise<{
    categoria: string;
  }>;
};

function sanitizeCategoryValue(value: string): string {
  return decodeURIComponent(value)
    .trim()
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 100);
}

export default async function CategoryProductsPage({
  params,
}: CategoryProductsPageProps) {
  const resolvedParams = await params;
  const categoryName = sanitizeCategoryValue(resolvedParams.categoria);

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
    .order("is_featured", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(48);

  const products = error ? [] : ((data ?? []) as unknown as ProductCardProduct[]);

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
              {categoryName}
            </h1>

            <p className="mt-4 max-w-3xl text-neutral-600">
              Produtos disponíveis nesta categoria, com imagem, SKU, preço
              mínimo, stock e indicação de personalização.
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

        <div className="mt-8 flex items-center justify-between gap-4">
          <p className="text-sm text-neutral-500">
            {products.length.toLocaleString("pt-PT")} produto(s)
            apresentado(s)
          </p>
        </div>

        {error ? (
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
      </section>
    </main>
  );
}