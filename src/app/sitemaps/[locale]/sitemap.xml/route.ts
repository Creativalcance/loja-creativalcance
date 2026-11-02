import { isSiteLocale } from "@/lib/i18n/config";
import { getSitemapEntries, localizeSitemapEntries } from "@/lib/seo/sitemap-data";
import { sitemapXml, SITEMAP_HEADERS } from "@/lib/seo/sitemap-xml";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSiteLocale(locale)) return new Response("Not found", { status: 404 });
  try {
    const entries = localizeSitemapEntries(await getSitemapEntries(), locale);
    return new Response(sitemapXml(entries), { headers: SITEMAP_HEADERS });
  } catch (error) {
    console.error("SEO sitemap generation failed:", error);
    // Do not advertise a partial catalogue as a successful sitemap on an outage.
    return new Response("Sitemap temporarily unavailable", {
      status: 503,
      headers: { "Cache-Control": "no-store", "Retry-After": "300" },
    });
  }
}
