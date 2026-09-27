import Link from "next/link";
import type { Metadata } from "next";
import ProductCard, { type ProductCardProduct } from "@/components/catalog/ProductCard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n/server";
import { localizePath, SITE_LOCALES } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { localizeProductCards } from "@/lib/i18n/product-presentation";
import { MATERIALS_PATH, materialMessages, getMaterialClaims, parseMaterialFilter } from "@/lib/catalog/materials-collection";

const PAGE_SIZE = 24;
type MaterialProduct = ProductCardProduct & { properties: unknown };

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  return {
    title: materialMessages[locale].title,
    description: materialMessages[locale].intro,
    alternates: { canonical: localizePath(MATERIALS_PATH, locale) },
  };
}

export default async function MaterialsCollection({ searchParams }: {
  searchParams: Promise<{ filter?: string | string[]; page?: string | string[] }>;
}) {
  const [locale, params, supabase] = await Promise.all([
    getCurrentLocale(), searchParams, createSupabaseServerClient(),
  ]);
  const copy = materialMessages[locale];
  const common = getMessages(locale).common;
  const filter = parseMaterialFilter(params.filter);
  const requestedPage = typeof params.page === "string" && /^\d{1,5}$/.test(params.page) ? Number(params.page) : 1;
  const page = Math.max(1, requestedPage);
  let query = supabase.from("products").select(`
    id,sku,name,slug,short_description,brand,material,type_name,subtype_name,
    is_featured,is_customizable,min_order_quantity,properties,
    product_images(external_url,storage_url,alt_text,is_primary,sort_order,image_type),
    product_prices(final_price,quantity_min,currency),product_stocks(available_quantity)
  `, { count: "exact" }).eq("status", "active").eq("is_active", true);
  if (filter === "all") {
    // Quote JSON values for the PostgREST OR grammar; only fixed keys are used.
    const predicate = (key: string) => `properties.cs."${JSON.stringify([{ key, value: true }]).replace(/"/g, '\\"')}"`;
    query = query.or([predicate("recycled_materials"), predicate("fsc")].join(","));
  } else {
    query = query.contains("properties", [{ key: filter, value: true }]);
  }
  const { data, error, count } = await query
    .order("is_purchasable", { ascending: false })
    .order("name").order("id")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const raw = error ? [] : (data ?? []) as unknown as MaterialProduct[];
  const products = await localizeProductCards(raw, locale);
  const claims = new Map(raw.map(product => [product.id, getMaterialClaims(product.properties)]));
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const href = (value: string, targetPage = 1) => localizePath(`${MATERIALS_PATH}?${new URLSearchParams({ filter: value, page: String(targetPage) })}`, locale);

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10 sm:px-6">
      <section className="mx-auto max-w-7xl">
        <Link href={localizePath("/categorias", locale)} className="text-sm text-neutral-600 underline underline-offset-4">{common.backCategories}</Link>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">{copy.title}</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-neutral-600">{copy.intro}</p>
        <nav aria-label={copy.title} className="my-6 flex flex-wrap gap-2">
          {([['all', copy.all], ['recycled_materials', copy.recycled], ['fsc', copy.fsc]] as const).map(([value, label]) => (
            <Link key={value} href={href(value)} aria-current={filter === value ? "page" : undefined}
              className={`rounded-full border px-4 py-2 text-sm font-medium ${filter === value ? "border-emerald-900 bg-emerald-900 text-white" : "border-neutral-300 bg-white text-neutral-700 hover:border-emerald-900"}`}>
              {label}
            </Link>
          ))}
        </nav>
        {error ? <p role="alert">{copy.error}</p> : <>
          <p className="mb-5 text-sm text-neutral-600">{(count ?? 0).toLocaleString(SITE_LOCALES[locale].intlLocale)} {common.products}</p>
          {products.length === 0 ? <p>{copy.empty}</p> : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map(product => (
                <div key={product.id} className="min-w-0">
                  <ul className="mb-2 flex flex-wrap gap-1.5">
                    {(claims.get(product.id) ?? []).map(claim => <li key={claim} className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-950">{claim === "fsc" ? copy.fsc : copy.recycled}</li>)}
                  </ul>
                  <ProductCard product={product} locale={locale} />
                </div>
              ))}
            </div>
          )}
          <nav aria-label={copy.previous + " / " + copy.next} className="mt-8 flex items-center justify-center gap-5 text-sm">
            {page > 1 ? <Link className="rounded border bg-white px-4 py-2" href={href(filter, Math.min(page - 1, totalPages))}>{copy.previous}</Link> : null}
            {page <= totalPages ? <span>{page} / {totalPages}</span> : null}
            {page < totalPages ? <Link className="rounded border bg-white px-4 py-2" href={href(filter, page + 1)}>{copy.next}</Link> : null}
          </nav>
        </>}
      </section>
    </main>
  );
}
