import { sitemapIndexXml, SITEMAP_HEADERS } from "@/lib/seo/sitemap-xml";

export const dynamic = "force-static";
export const revalidate = 3600;

export function GET() {
  return new Response(sitemapIndexXml(), { headers: SITEMAP_HEADERS });
}
