import Link from "next/link";
import type { Metadata } from "next";
import { Search } from "lucide-react";
import ProductCard, {
  type ProductCardProduct,
} from "@/components/catalog/ProductCard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStrickerLanguage, localizePath, SITE_LOCALES } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { getCurrentLocale } from "@/lib/i18n/server";

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

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const text = getMessages(locale).catalog;
  return { title: text.searchTitle, description: text.searchIntro, robots: { index: false, follow: true } };
}

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
  const locale = await getCurrentLocale();
  const labels = getMessages(locale);
  const intlLocale = SITE_LOCALES[locale].intlLocale;
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
    let localizedProductIds: string[] = [];
    if (query && locale !== "pt") {
      const language = getStrickerLanguage(locale);
      const { data: translatedMatches } = await supabase
        .from("product_translations")
        .select("product_id")
        .eq("language", language)
        .or([
          `name.ilike.%${query}%`,
          `short_description.ilike.%${query}%`,
          `description.ilike.%${query}%`,
          `material.ilike.%${query}%`,
          `type_name.ilike.%${query}%`,
          `subtype_name.ilike.%${query}%`,
        ].join(","))
        .limit(200);
      localizedProductIds = Array.from(new Set((translatedMatches ?? []).map((row) => row.product_id)));
    }

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
      .order("is_purchasable", { ascending: false })
      .limit(48);

    if (query) {
      const filters = buildSearchFilter(query);
      productsQuery = localizedProductIds.length > 0
        ? productsQuery.or(`${filters},id.in.(${localizedProductIds.join(",")})`)
        : productsQuery.or(filters);
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

    if (!error && locale !== "pt" && products.length > 0) {
      const languages = Array.from(new Set([getStrickerLanguage(locale), "EN"]));
      const { data: translations } = await supabase
        .from("product_translations")
        .select("product_id,language,name,short_description,material,type_name,subtype_name")
        .in("product_id", products.map((product) => product.id))
        .in("language", languages);
      const byProduct = new Map<string, Record<string, unknown>>();
      for (const language of [...languages].reverse()) {
        for (const translation of translations ?? []) {
          if (translation.language === language) byProduct.set(translation.product_id, translation);
        }
      }
      products = products.map((product) => {
        const translation = byProduct.get(product.id);
        return translation ? { ...product, name: String(translation.name ?? product.name), short_description: (translation.short_description as string | null) ?? product.short_description, material: (translation.material as string | null) ?? product.material, type_name: (translation.type_name as string | null) ?? product.type_name, subtype_name: (translation.subtype_name as string | null) ?? product.subtype_name } : product;
      });
    }
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-12">
      <section className="mx-auto max-w-7xl">
        <Link
          href={localizePath("/", locale)}
          className="text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
        >
          ← {labels.common.backHome}
        </Link>

        <div className="mt-8">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
            {labels.catalog.searchEyebrow}
          </p>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950">
            {labels.catalog.searchTitle}
          </h1>

          <p className="mt-4 max-w-3xl text-neutral-600">
            {labels.catalog.searchIntro}
          </p>
        </div>

        <form action={localizePath("/pesquisa", locale)} className="mt-8 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder={labels.catalog.placeholder}
                className="w-full rounded-2xl border border-neutral-300 bg-white py-3 pl-11 pr-4 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl bg-neutral-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              {labels.header.search}
            </button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                {labels.catalog.type}
              </span>

              <select
                name="tipo"
                defaultValue={selectedType}
                className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
              >
                <option value="">{labels.catalog.allTypes}</option>
                {typeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                {labels.catalog.material}
              </span>

              <select
                name="material"
                defaultValue={selectedMaterial}
                className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
              >
                <option value="">{labels.catalog.allMaterials}</option>
                {materialOptions.map((material) => (
                  <option key={material} value={material}>
                    {material}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                {labels.catalog.customisation}
              </span>

              <select
                name="personalizado"
                defaultValue={selectedCustomizable}
                className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
              >
                <option value="">{labels.catalog.all}</option>
                <option value="sim">{labels.catalog.customisable}</option>
                <option value="nao">{labels.catalog.notCustomisable}</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                {labels.catalog.sort}
              </span>

              <select
                name="ordenar"
                defaultValue={selectedSort}
                className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
              >
                <option value="destaque">{labels.catalog.featuredFirst}</option>
                <option value="recentes">{labels.catalog.newest}</option>
                <option value="nome_asc">{labels.catalog.nameAsc}</option>
                <option value="nome_desc">{labels.catalog.nameDesc}</option>
              </select>
            </label>
          </div>
        </form>

        <div className="mt-8 flex items-center justify-between gap-4">
          <p className="text-sm text-neutral-500">
            {hasActiveSearch
              ? `${products.length.toLocaleString(intlLocale)} ${labels.catalog.shown}`
              : labels.catalog.start}
          </p>

          {hasActiveSearch ? (
            <Link
              href={localizePath("/pesquisa", locale)}
              className="text-sm font-semibold text-neutral-950 underline-offset-4 hover:underline"
            >
              {labels.catalog.clear}
            </Link>
          ) : null}
        </div>

        {hasProductsError ? (
          <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {labels.catalog.loadError} {labels.common.retry}
          </div>
        ) : null}

        {!hasActiveSearch ? (
          <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-neutral-950">
              {labels.catalog.readyTitle}
            </h2>

            <p className="mt-3 text-neutral-600">
              {labels.catalog.readyText}
            </p>
          </div>
        ) : products.length > 0 ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} locale={locale} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-neutral-950">
              {labels.catalog.noResults}
            </h2>

            <p className="mt-3 text-neutral-600">
              {labels.catalog.noResultsText}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
