import Link from "next/link";
import type { Metadata } from "next";
import { Search } from "lucide-react";
import ProductCard, {
  type ProductCardProduct,
} from "@/components/catalog/ProductCard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SearchPageProps = {
  searchParams?: Promise<{
    q?: string;
    tipo?: string;
    material?: string;
    personalizado?: string;
    ordenar?: string;
  }>;
};

type FacetProduct = {
  material: string | null;
  type_name: string | null;
};

type SortOption = "destaque" | "recentes" | "nome_asc" | "nome_desc";

export const metadata: Metadata = {
  title: "Pesquisar produtos",
  description: "Pesquise o catálogo de merchandising e brindes promocionais.",
  robots: { index: false, follow: true },
};

function sanitizeSearchQuery(value: string): string {
  return value
    .trim()
    .replace(/[%_,()]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

function sanitizeFilterValue(value: string): string {
  return value.trim().replace(/[<>]/g, "").replace(/\s+/g, " ").slice(0, 100);
}

function getSortOption(value: string | undefined): SortOption {
  if (
    value === "destaque" ||
    value === "recentes" ||
    value === "nome_asc" ||
    value === "nome_desc"
  ) {
    return value;
  }

  return "destaque";
}

function buildSearchFilter(query: string): string {
  const safeQuery = sanitizeSearchQuery(query);

  return [
    `name.ilike.%${safeQuery}%`,
    `sku.ilike.%${safeQuery}%`,
    `short_description.ilike.%${safeQuery}%`,
    `material.ilike.%${safeQuery}%`,
    `brand.ilike.%${safeQuery}%`,
    `type_name.ilike.%${safeQuery}%`,
    `subtype_name.ilike.%${safeQuery}%`,
  ].join(",");
}

function getUniqueSortedValues(
  items: FacetProduct[],
  field: "material" | "type_name",
): string[] {
  return Array.from(
    new Set(
      items
        .map((item) => item[field])
        .filter((value): value is string => Boolean(value?.trim())),
    ),
  ).sort((a, b) => a.localeCompare(b, "pt-PT"));
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = await searchParams;

  const query = sanitizeSearchQuery(resolvedSearchParams?.q ?? "");
  const selectedType = sanitizeFilterValue(resolvedSearchParams?.tipo ?? "");
  const selectedMaterial = sanitizeFilterValue(
    resolvedSearchParams?.material ?? "",
  );
  const selectedCustomizable = sanitizeFilterValue(
    resolvedSearchParams?.personalizado ?? "",
  );
  const selectedSort = getSortOption(resolvedSearchParams?.ordenar);

  const hasActiveSearch =
    Boolean(query) ||
    Boolean(selectedType) ||
    Boolean(selectedMaterial) ||
    Boolean(selectedCustomizable) ||
    selectedSort !== "destaque";

  const supabase = await createSupabaseServerClient();

  const { data: facetData } = await supabase
    .from("products")
    .select("material, type_name")
    .eq("status", "active")
    .eq("is_active", true)
    .limit(3000);

  const facets = (facetData ?? []) as FacetProduct[];
  const materialOptions = getUniqueSortedValues(facets, "material");
  const typeOptions = getUniqueSortedValues(facets, "type_name");

  let products: ProductCardProduct[] = [];
  let hasProductsError = false;

  if (hasActiveSearch) {
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
      .limit(48);

    if (query) {
      productsQuery = productsQuery.or(buildSearchFilter(query));
    }

    if (selectedType) {
      productsQuery = productsQuery.eq("type_name", selectedType);
    }

    if (selectedMaterial) {
      productsQuery = productsQuery.eq("material", selectedMaterial);
    }

    if (selectedCustomizable === "sim") {
      productsQuery = productsQuery.eq("is_customizable", true);
    }

    if (selectedCustomizable === "nao") {
      productsQuery = productsQuery.eq("is_customizable", false);
    }

    if (selectedSort === "recentes") {
      productsQuery = productsQuery.order("updated_at", { ascending: false });
    }

    if (selectedSort === "nome_asc") {
      productsQuery = productsQuery.order("name", { ascending: true });
    }

    if (selectedSort === "nome_desc") {
      productsQuery = productsQuery.order("name", { ascending: false });
    }

    if (selectedSort === "destaque") {
      productsQuery = productsQuery
        .order("is_featured", { ascending: false })
        .order("updated_at", { ascending: false });
    }

    const { data, error } = await productsQuery;

    products = error ? [] : ((data ?? []) as unknown as ProductCardProduct[]);
    hasProductsError = Boolean(error);
  }

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

        <form className="mt-8 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Pesquisar por produto, SKU, material, marca ou categoria"
                className="w-full rounded-2xl border border-neutral-300 bg-white py-3 pl-11 pr-4 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl bg-neutral-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              Pesquisar
            </button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Tipo
              </span>

              <select
                name="tipo"
                defaultValue={selectedType}
                className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
              >
                <option value="">Todos os tipos</option>
                {typeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Material
              </span>

              <select
                name="material"
                defaultValue={selectedMaterial}
                className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
              >
                <option value="">Todos os materiais</option>
                {materialOptions.map((material) => (
                  <option key={material} value={material}>
                    {material}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Personalização
              </span>

              <select
                name="personalizado"
                defaultValue={selectedCustomizable}
                className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
              >
                <option value="">Todos</option>
                <option value="sim">Personalizáveis</option>
                <option value="nao">Não personalizáveis</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Ordenar
              </span>

              <select
                name="ordenar"
                defaultValue={selectedSort}
                className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
              >
                <option value="destaque">Destaques primeiro</option>
                <option value="recentes">Mais recentes</option>
                <option value="nome_asc">Nome A-Z</option>
                <option value="nome_desc">Nome Z-A</option>
              </select>
            </label>
          </div>
        </form>

        <div className="mt-8 flex items-center justify-between gap-4">
          <p className="text-sm text-neutral-500">
            {hasActiveSearch
              ? `${products.length.toLocaleString("pt-PT")} produto(s) apresentado(s)`
              : "Introduz uma pesquisa ou usa os filtros para encontrar produtos."}
          </p>

          {hasActiveSearch ? (
            <Link
              href="/pesquisa"
              className="text-sm font-semibold text-neutral-950 underline-offset-4 hover:underline"
            >
              Limpar pesquisa
            </Link>
          ) : null}
        </div>

        {hasProductsError ? (
          <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            Não foi possível carregar a pesquisa. Tenta novamente.
          </div>
        ) : null}

        {!hasActiveSearch ? (
          <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-neutral-950">
              Pesquisa pronta a usar
            </h2>

            <p className="mt-3 text-neutral-600">
              Escreve o nome de um produto, SKU, material ou marca. Também
              podes usar os filtros por tipo, material ou personalização.
            </p>
          </div>
        ) : products.length > 0 ? (
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
              Experimenta pesquisar por “garrafa”, “caneca”, “t-shirt”,
              “algodão”, “metal” ou SKU.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
