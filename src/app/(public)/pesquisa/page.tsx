import Link from "next/link";
import { Search } from "lucide-react";
import ProductCard, {
  type ProductCardProduct,
} from "@/components/catalog/ProductCard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SearchPageProps = {
  searchParams?: Promise<{
    q?: string;
  }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.q?.trim() ?? "";

  const supabase = await createSupabaseServerClient();

  let productsQuery = supabase
    .from("products")
    .select(
      `
        id,
        sku,
        name,
        slug,
        short_description,
        material,
        is_featured,
        is_customizable,
        min_order_quantity,
        product_images (
          external_url,
          storage_url,
          alt_text,
          is_primary,
          sort_order
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
    .limit(48);

  if (query) {
    productsQuery = productsQuery.or(
      `name.ilike.%${query}%,sku.ilike.%${query}%,short_description.ilike.%${query}%,description.ilike.%${query}%,material.ilike.%${query}%`,
    );
  }

  const { data } = await productsQuery;

  const products = (data ?? []) as unknown as ProductCardProduct[];

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-12">
      <section className="mx-auto max-w-7xl">
        <Link
          href="/"
          className="text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
        >
          ← Voltar à página inicial
        </Link>

        <div className="mt-8">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
            Pesquisa
          </p>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950">
            Pesquisa de produtos
          </h1>

          <p className="mt-4 max-w-3xl text-neutral-600">
            Encontra brindes promocionais, merchandising corporativo, gifts
            empresariais e vestuário promocional para campanhas, eventos e
            equipas.
          </p>
        </div>

        <form className="mt-8 flex flex-col gap-4 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Pesquisar por produto, SKU, material ou descrição"
              className="w-full rounded-2xl border border-neutral-300 bg-white py-3 pl-11 pr-4 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-2xl bg-neutral-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            Pesquisar
          </button>
        </form>

        <div className="mt-8 flex items-center justify-between gap-4">
          <p className="text-sm text-neutral-500">
            {products.length.toLocaleString("pt-PT")} produto(s) encontrado(s)
          </p>

          {query ? (
            <Link
              href="/pesquisa"
              className="text-sm font-semibold text-neutral-950 underline-offset-4 hover:underline"
            >
              Limpar pesquisa
            </Link>
          ) : null}
        </div>

        {products.length > 0 ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-neutral-950">
              Sem resultados
            </h2>

            <p className="mt-3 text-neutral-600">
              Experimenta pesquisar por “caneca”, “garrafa”, “t-shirt”,
              “algodão” ou SKU.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}