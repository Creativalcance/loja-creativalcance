import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";

// Public catalogue metadata only. Never cache an authenticated client or live prices/stock.
export const getSearchFacets = unstable_cache(async () => {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db.from("products")
    .select("material,type_name").eq("status", "active").eq("is_active", true).limit(3000).abortSignal(AbortSignal.timeout(3000));
  if (error) throw new Error("Search filters unavailable");
  return data ?? [];
}, ["public-search-facets-v1"], { revalidate: 300 });
