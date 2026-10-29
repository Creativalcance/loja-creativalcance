import "server-only";
import { createHash } from "node:crypto";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SiteLocale } from "@/lib/i18n/config";

type Identity = {
  product_id: string; public_reference: string; review_status: string;
  translations: Partial<Record<SiteLocale, { name?: string; description?: string }>>;
  products: { slug: string; supplier_id: string | null };
};
export const IDENTITY_CACHE_TAG = "commercial-identities";
// Product pages must never read the entire catalogue to resolve one identity.
const readIdentity = cache(unstable_cache(async (productId: string) => {
  const { data, error } = await createSupabaseAdminClient().from("product_commercial_identities")
    .select("product_id,public_reference,review_status,translations,products!inner(slug,supplier_id)")
    .eq("product_id", productId).maybeSingle();
  if (error) throw new Error("Não foi possível obter a identidade 360.");
  return data as unknown as Identity | null;
}, ["commercial-identity-v2"], { revalidate: 3600, tags: [IDENTITY_CACHE_TAG] }));

type SearchIdentity = { product_id: string; public_reference: string; review_status: string; name: string | null; products: { supplier_id: string | null } };
// Cache bounded pages: descriptions and other languages are not search inputs.
const readSearchPage = unstable_cache(async (locale: SiteLocale, from: number) => {
  const { data, error } = await createSupabaseAdminClient().from("product_commercial_identities")
    .select(`product_id,public_reference,review_status,name:translations->${locale}->>name,products!inner(supplier_id)`)
    .order("product_id").range(from, from + 499);
  if (error) throw new Error("Não foi possível pesquisar o catálogo 360.");
  return (data ?? []) as unknown as SearchIdentity[];
}, ["commercial-identity-search-v2"], { revalidate: 3600, tags: [IDENTITY_CACHE_TAG] });
const generic = { pt: "Produto", en: "Product", fr: "Produit", es: "Producto", de: "Produkt", it: "Prodotto" };
export async function getPublicIdentity(productId: string, locale: SiteLocale = "pt") {
  const row = await readIdentity(productId);
  if (!row?.products.supplier_id) return null;
  const text = row.review_status === "ready" ? row.translations[locale] : undefined;
  return {
    reference: row.public_reference,
    slug: row.public_reference.toLowerCase(),
    name: text?.name?.trim() || `${generic[locale]} ${row.public_reference}`,
    description: text?.description?.trim() || null,
  };
}
// Resolve only on the server. Existing IDs, supplier slugs and order contracts stay intact.
const readSupplierSlug = cache(unstable_cache(async (reference: string) => {
  const { data, error } = await createSupabaseAdminClient().from("product_commercial_identities")
    .select("products!inner(slug)").eq("public_reference", reference).maybeSingle();
  if (error) throw new Error("Não foi possível resolver o produto.");
  return (data as unknown as { products: { slug: string } } | null)?.products.slug ?? null;
}, ["commercial-identity-slug-v2"], { revalidate: 3600, tags: [IDENTITY_CACHE_TAG] }));
export async function resolveSupplierSlug(slug: string): Promise<string> {
  if (!/^360-[a-f0-9]{12}$/i.test(slug)) return slug;
  return (await readSupplierSlug(slug.toUpperCase())) ?? slug;
}
export async function findPublicProductIds(query: string, locale: SiteLocale): Promise<string[]> {
  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const ids: string[] = [];
  for (let from = 0; ; from += 500) {
    const rows = await readSearchPage(locale, from);
    for (const row of rows) {
      if (!row.products.supplier_id) continue;
      const text = `${row.public_reference} ${row.review_status === "ready" ? row.name ?? "" : ""}`.toLocaleLowerCase();
      if (terms.every(term => text.includes(term))) ids.push(row.product_id);
      if (ids.length === 200) return ids;
    }
    if (rows.length < 500) return ids;
  }
}
export async function getPublicVariantReferences(ids: string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const { data, error } = await createSupabaseAdminClient().from("variant_commercial_identities")
    .select("variant_id,public_reference").in("variant_id", ids);
  if (error) throw new Error("Não foi possível obter as variantes 360.");
  return new Map((data ?? []).map(row => [row.variant_id, row.public_reference]));
}
export function publicMediaUrl(productId: string, asset = "main", size = "standard") {
  return `/api/catalog/media/${productId}?asset=${encodeURIComponent(asset)}&size=${size}`;
}
export function preserveProductQuery(path: string, params?: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    for (const entry of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, entry);
  }
  return query.size ? `${path}?${query}` : path;
}

export function publicMediaAsset(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 24);
}
