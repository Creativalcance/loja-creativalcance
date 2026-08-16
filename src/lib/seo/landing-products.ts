import type { ProductCardProduct } from "@/components/catalog/ProductCard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function sanitizeSearchTerm(value: string): string {
  return value
    .trim()
    .replace(/[%_,()]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 60);
}

function buildLandingFilter(terms: string[]): string {
  const safeTerms = terms
    .map(sanitizeSearchTerm)
    .filter(Boolean)
    .slice(0, 8);

  const fields = [
    "name",
    "short_description",
    "material",
    "type_name",
    "subtype_name",
  ];

  return safeTerms
    .flatMap((term) => fields.map((field) => `${field}.ilike.%${term}%`))
    .join(",");
}

export async function getLandingProducts(
  terms: string[],
  limit = 12,
): Promise<ProductCardProduct[]> {
  const filter = buildLandingFilter(terms);

  if (!filter) {
    return [];
  }

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
    .or(filter)
    .order("is_featured", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(Math.max(1, Math.min(limit, 24)));

  if (error) {
    console.error("SEO landing product query failed:", error);
    return [];
  }

  const products = (data ?? []) as unknown as ProductCardProduct[];

  return [...products].sort((a, b) => {
    const stockA = (a.product_stocks ?? []).reduce(
      (total, stock) => total + (stock.available_quantity ?? 0),
      0,
    );
    const stockB = (b.product_stocks ?? []).reduce(
      (total, stock) => total + (stock.available_quantity ?? 0),
      0,
    );

    if ((stockA > 0) !== (stockB > 0)) {
      return stockA > 0 ? -1 : 1;
    }

    if (a.is_featured !== b.is_featured) {
      return a.is_featured ? -1 : 1;
    }

    return 0;
  });
}
