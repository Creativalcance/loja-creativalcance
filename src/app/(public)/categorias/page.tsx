import Link from "next/link";
import { ArrowRight, Boxes, Search } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CategoryRow = {
  type_name: string | null;
};

type CatalogCategory = {
  name: string;
  count: number;
};

function buildCategoryHref(categoryName: string): string {
  return `/categorias/${encodeURIComponent(categoryName)}`;
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

export default async function CategoriesPage() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("products")
    .select("type_name")
    .eq("status", "active")
    .eq("is_active", true)
    .not("type_name", "is", null)
    .limit(5000);

  const categories = error
    ? []
    : getCatalogCategories((data ?? []) as CategoryRow[]);

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
              Categorias de produtos
            </h1>

            <p className="mt-4 max-w-3xl text-neutral-600">
              Explora o catálogo por categorias reais importadas da Stricker e
              encontra rapidamente os produtos certos para campanhas, eventos,
              equipas e clientes empresariais.
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

        {error ? (
          <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            Não foi possível carregar as categorias. Tenta novamente.
          </div>
        ) : null}

        {categories.length > 0 ? (
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
        ) : (
          <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-neutral-950">
              Ainda não existem categorias disponíveis
            </h2>

            <p className="mt-3 text-neutral-600">
              Confirma se os produtos importados têm o campo type_name
              preenchido e se estão activos.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}