import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type CatalogInsights = {
  activeProducts: number | null;
  customizableProducts: number | null;
  productsFor50Units: number | null;
  productsFor100Units: number | null;
  generatedAt: string;
};

type CountOptions = {
  customizableOnly?: boolean;
  maxMinimumOrder?: number;
};

async function countActiveProducts(
  options: CountOptions = {},
): Promise<number | null> {
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .eq("is_active", true);

  if (options.customizableOnly) {
    query = query.eq("is_customizable", true);
  }

  if (options.maxMinimumOrder !== undefined) {
    query = query
      .not("min_order_quantity", "is", null)
      .lte("min_order_quantity", options.maxMinimumOrder);
  }

  const { count, error } = await query;

  if (error) {
    console.error("SEO insights count failed:", error);
    return null;
  }

  return count ?? 0;
}

export async function getCatalogInsights(): Promise<CatalogInsights> {
  const [
    activeProducts,
    customizableProducts,
    productsFor50Units,
    productsFor100Units,
  ] = await Promise.all([
    countActiveProducts(),
    countActiveProducts({ customizableOnly: true }),
    countActiveProducts({ maxMinimumOrder: 50 }),
    countActiveProducts({ maxMinimumOrder: 100 }),
  ]);

  return {
    activeProducts,
    customizableProducts,
    productsFor50Units,
    productsFor100Units,
    generatedAt: new Date().toISOString(),
  };
}
