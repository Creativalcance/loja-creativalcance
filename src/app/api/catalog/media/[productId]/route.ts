import { publicMediaAsset } from "@/lib/catalog-identity/public";
import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildProductGallery } from "@/lib/catalog/product-gallery";

const readMedia = unstable_cache(async (id: string) => {
  const { data, error } = await createSupabaseAdminClient().from("products")
    .select("sku,all_image_list:supplier_payload->>AllImageList,product_images(variant_id,external_url,storage_url,image_type,is_primary,sort_order),product_variants(id,color_code,color_name,optional_image_1_url,optional_image_2_url)")
    .eq("id", id).eq("status", "active").eq("is_active", true).is("deleted_at", null).maybeSingle();
  if (error) throw new Error("Media lookup failed");
  if (!data) return null;
  return { gallery: buildProductGallery({ sku: data.sku, allImageList: data.all_image_list, images: data.product_images, variants: data.product_variants }), variants: data.product_variants };
}, ["public-catalog-media-v1"], { revalidate: 300 });
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export async function GET(request: NextRequest, context: { params: Promise<{ productId: string }> }) {
  const { productId } = await context.params;
  const asset = request.nextUrl.searchParams.get("asset") ?? "main";
  const size = request.nextUrl.searchParams.get("size") ?? "standard";
  if (!uuid.test(productId) || !(asset === "main" || /^[a-f0-9]{24}$/.test(asset) || uuid.test(asset)) || !["standard", "small", "large"].includes(size)) return new NextResponse(null, { status: 400 });
  try {
    const media = await readMedia(productId);
    if (!media) return new NextResponse(null, { status: 404 });
    const variant = uuid.test(asset) ? media.variants.find(row => row.id === asset) : null;
    const image = asset === "main" ? media.gallery[0] : media.gallery.find(image => publicMediaAsset(image.url) === asset);
    const source = variant ? variant.optional_image_1_url ?? variant.optional_image_2_url : image ? size === "large" ? image.zoomUrl : size === "small" ? image.thumbnailUrl : image.url : null;
    if (!source) return new NextResponse(null, { status: 404 });
    const url = new URL(source);
    const storageHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname;
    // No caller-provided URLs, redirects, arbitrary hosts or private storage.
    if (url.protocol !== "https:" || url.username || url.password || url.port ||
      !(url.hostname === "cdn.hideacontent.com" && url.pathname.startsWith("/public/") || url.hostname === storageHost && url.pathname.startsWith("/storage/v1/object/public/"))) return new NextResponse(null, { status: 404 });
    const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(15000), next: { revalidate: 86400 } });
    const type = response.headers.get("content-type")?.split(";")[0] ?? "";
    if (!response.ok || !["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"].includes(type)) return new NextResponse(null, { status: 404 });
    return new NextResponse(response.body, { headers: { "Content-Type": type, "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800", "X-Content-Type-Options": "nosniff" } });
  } catch { return new NextResponse(null, { status: 502 }); }
}
