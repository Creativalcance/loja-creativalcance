import "server-only";
import { unstable_cache } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPublicIdentity, publicMediaUrl } from "@/lib/catalog-identity/public";
import { defaultHomepageConfig, homepageSchema, HOMEPAGE_CACHE_TAG } from "./config";
import type { SiteLocale } from "@/lib/i18n/config";

export const getHomepageConfig = unstable_cache(async () => {
  const { data, error } = await createSupabaseAdminClient().from("homepage_settings").select("config").eq("id", "main").abortSignal(AbortSignal.timeout(4000)).single();
  if (error) throw new Error("Homepage settings unavailable");
  const parsed = homepageSchema.safeParse(data.config);
  if (!parsed.success) throw new Error("Invalid homepage settings");
  return parsed.data;
}, ["homepage-settings-v1"], { revalidate: 3600, tags: [HOMEPAGE_CACHE_TAG] });

export type HomepageProduct = { id: string; name: string; slug: string; image: string | null; price: number; minimum: number };

// Only the selected IDs are read. Prices and availability are checked on every request.
export async function getHomepageProducts(ids: string[], locale: SiteLocale): Promise<HomepageProduct[]> {
  if (!ids.length) return [];
  const { data, error } = await createSupabaseAdminClient().from("products")
    .select("id,name,slug,supplier_id,min_order_quantity,product_images(id),product_prices(final_price,quantity_min,currency)")
    .in("id", ids.slice(0, 12)).eq("status", "active").eq("is_active", true).eq("is_purchasable", true).is("deleted_at", null)
    .limit(1, { referencedTable: "product_images" }).limit(12).abortSignal(AbortSignal.timeout(4000));
  if (error) throw new Error("Homepage products unavailable");
  const mapped = await Promise.all((data ?? []).map(async product => {
    const prices = product.product_prices.filter(row => row.currency === "EUR" && Number(row.final_price) > 0)
      .sort((a, b) => a.quantity_min - b.quantity_min);
    const price = Number(prices[0]?.final_price);
    if (!Number.isFinite(price) || price <= 0) return null;
    const identity = product.supplier_id ? await getPublicIdentity(product.id, locale) : null;
    if (product.supplier_id && !identity) return null;
    return { id: product.id, name: identity?.name ?? product.name, slug: identity?.slug ?? product.slug,
      image: product.product_images.length ? publicMediaUrl(product.id) : null,
      price, minimum: product.min_order_quantity || 1 };
  }));
  const byId = new Map(mapped.filter((row): row is HomepageProduct => row !== null).map(row => [row.id, row]));
  return ids.flatMap(id => byId.has(id) ? [byId.get(id)!] : []);
}

export async function loadHomepage(locale: SiteLocale) {
  try {
    const config = await getHomepageConfig();
    const products = config.sections.some(section => section.id === "campaign" && section.enabled)
      ? await getHomepageProducts(config.campaign.productIds, locale).catch(() => []) : [];
    return { config, products };
  } catch {
    // A configuration outage must not take down the existing storefront.
    return { config: defaultHomepageConfig, products: [] };
  }
}
