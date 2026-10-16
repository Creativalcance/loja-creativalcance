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
const readIdentities = unstable_cache(async () => {
  const admin = createSupabaseAdminClient();
  const result: Identity[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await admin.from("product_commercial_identities")
      .select("product_id,public_reference,review_status,translations,products!inner(slug,supplier_id)")
      .order("product_id").range(from, from + 499);
    if (error) throw new Error("Não foi possível obter o catálogo 360.");
    const rows = data as unknown as Identity[];
    result.push(...rows.filter(row => row.products.supplier_id));
    if (rows.length < 500) break;
  }
  return result;
}, ["commercial-identities-v1"], { revalidate: 60, tags: [IDENTITY_CACHE_TAG] });
const identities = cache(readIdentities);
const generic = { pt: "Produto", en: "Product", fr: "Produit", es: "Producto", de: "Produkt", it: "Prodotto" };
export async function getPublicIdentity(productId: string, locale: SiteLocale = "pt") {
  let row = (await identities()).find(row => row.product_id === productId);
  if (!row) {
    // A newly imported product may be newer than the shared cache.
    const { data, error } = await createSupabaseAdminClient().from("product_commercial_identities")
      .select("product_id,public_reference,review_status,translations,products!inner(slug,supplier_id)").eq("product_id", productId).maybeSingle();
    if (error) throw new Error("Não foi possível obter a identidade 360.");
    const fresh = data as unknown as Identity | null;
    if (!fresh?.products.supplier_id) return null;
    row = fresh;
  }
  const text = row.review_status === "ready" ? row.translations[locale] : undefined;
  return {
    reference: row.public_reference,
    slug: row.public_reference.toLowerCase(),
    name: text?.name?.trim() || `${generic[locale]} ${row.public_reference}`,
    description: text?.description?.trim() || null,
  };
}
// Resolve only on the server. Existing IDs, supplier slugs and order contracts stay intact.
export async function resolveSupplierSlug(slug: string): Promise<string> {
  if (!/^360-[a-f0-9]{12}$/i.test(slug)) return slug;
  const row = (await identities()).find(row => row.public_reference.toLowerCase() === slug.toLowerCase());
  if (row) return row.products.slug;
  const { data, error } = await createSupabaseAdminClient().from("product_commercial_identities")
    .select("products!inner(slug)").eq("public_reference", slug.toUpperCase()).maybeSingle();
  if (error) throw new Error("Não foi possível resolver o produto.");
  return (data as unknown as { products: { slug: string } } | null)?.products.slug ?? slug;
}
export async function findPublicProductIds(query: string, locale: SiteLocale): Promise<string[]> {
  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return (await identities()).filter(row => {
    const text = `${row.public_reference} ${row.review_status === "ready" ? row.translations[locale]?.name ?? "" : ""}`.toLocaleLowerCase();
    return terms.every(term => text.includes(term));
  }).slice(0, 200).map(row => row.product_id);
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
