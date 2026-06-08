import Link from "next/link";
import { ArrowRight, Boxes } from "lucide-react";
import ProductCard, {
  type ProductCardProduct,
} from "@/components/catalog/ProductCard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  seo_title: string | null;
  seo_description: string | null;
};

export default async function CategoriesPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: categoriesData }, { data: productsData }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, slug, description, seo_title, seo_description")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .returns<Category[]>(),
    supabase
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
      .limit(8),
  ]);

  const categories = categoriesData ?? [];
  const products = (productsData ?? []) as unknown as ProductCardProduct[];

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
            Catálogo
          </p>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950">
            Categorias de produtos
          </h1>

          <p className="mt-4 max-w-3xl text-neutral-600">
            Explora as principais categorias da Loja Creativ para campanhas de
            marketing, eventos corporativos, gifts empresariais, equipas e
            activações de marca.
          </p>
        </div>

        {categories.length > 0 ? (
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/pesquisa?q=${encodeURIComponent(category.name)}`}
                className="group rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <Boxes className="h-7 w-7 text-neutral-500" />

                <h2 className="mt-8 text-xl font-semibold text-neutral-950">
                  {category.name}
                </h2>

                <p className="mt-3 line-clamp-3 text-sm leading-6 text-neutral-600">
                  {category.description ??
                    "Soluções personalizadas para comunicação de marca e merchandising empresarial."}
                </p>

                <span className="mt-6 inline-flex items-center text-sm font-semibold text-neutral-950">
                  Explorar categoria
                  <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-neutral-950">
              Ainda não existem categorias activas
            </h2>

            <p className="mt-3 text-neutral-600">
              As categorias serão apresentadas assim que estiverem activas no
              backoffice.
            </p>
          </div>
        )}

        <div className="mt-16 flex items-end justify-between gap-6">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
              Destaques
            </p>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
              Produtos em destaque
            </h2>
          </div>

          <Link
            href="/pesquisa"
            className="hidden rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-950 transition hover:border-neutral-950 md:inline-flex"
          >
            Ver todos
          </Link>
        </div>

        {products.length > 0 ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
            <p className="text-neutral-600">
              Ainda não existem produtos activos para apresentar.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}