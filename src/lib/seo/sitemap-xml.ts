import type { MetadataRoute } from "next";
import { SITE_LOCALES } from "@/lib/i18n/config";
import { absoluteUrl } from "@/lib/seo/site";

export const SITEMAP_HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
};

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character]!);
}

export function sitemapIndexXml(): string {
  return '<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    + Object.keys(SITE_LOCALES).map((locale) => `<sitemap><loc>${escapeXml(absoluteUrl(`/sitemaps/${locale}/sitemap.xml`))}</loc></sitemap>`).join("")
    + "</sitemapindex>";
}

export function sitemapXml(entries: MetadataRoute.Sitemap): string {
  if (entries.length > 50000) throw new Error("Sitemap exceeds the URL limit.");
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'
    + entries.map((entry) => {
      const modified = entry.lastModified instanceof Date ? entry.lastModified.toISOString() : entry.lastModified;
      return `<url><loc>${escapeXml(entry.url)}</loc>`
        + (modified ? `<lastmod>${escapeXml(modified)}</lastmod>` : "")
        + Object.entries(entry.alternates?.languages ?? {}).flatMap(([language, href]) => href ? [`<xhtml:link rel="alternate" hreflang="${escapeXml(language)}" href="${escapeXml(href)}"/>`] : []).join("")
        + (entry.changeFrequency ? `<changefreq>${entry.changeFrequency}</changefreq>` : "")
        + (entry.priority !== undefined ? `<priority>${entry.priority}</priority>` : "")
        + "</url>";
    }).join("") + "</urlset>";
}
