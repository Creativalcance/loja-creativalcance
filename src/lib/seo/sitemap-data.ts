import { IDENTITY_CACHE_TAG } from "@/lib/catalog-identity/public";
import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { getCommercialPages } from "@/lib/seo/commercial-pages";
import { getGuides } from "@/lib/seo/guide-pages";
import { getInstitutionalPages } from "@/lib/seo/institutional-pages";
import { getApplicationPages, getIndustryPages } from "@/lib/seo/landing-pages";
import { getPersonalizationPages } from "@/lib/seo/personalization-pages";
import { getSelectionPages } from "@/lib/seo/selection-pages";
import { absoluteUrl } from "@/lib/seo/site";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { localizePath, SITE_LOCALES, type SiteLocale } from "@/lib/i18n/config";
import { buildLanguageAlternates } from "@/lib/seo/languages";

type SitemapProductRow = {
  id: string;
  slug: string;
  type_name: string | null;
  subtype_name: string | null;
  updated_at: string | null;
  product_translations: Array<{ language: string; type_name: string | null; subtype_name: string | null }>;
};

const PAGE_SIZE = 500;
const MAX_PRODUCTS = 45000;

function parseDate(value: string | null): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

const getActiveProductPage = unstable_cache(async (from: number): Promise<SitemapProductRow[]> => {
  const supabase = createSupabaseAdminClient();

    const to = Math.min(from + PAGE_SIZE - 1, MAX_PRODUCTS - 1);

    const { data, error } = await supabase
      .from("products")
      .select("id, slug, type_name, subtype_name, updated_at, supplier_id, product_commercial_identities(public_reference), product_translations(language,type_name,subtype_name)")
      .eq("status", "active")
      .eq("is_active", true)
      .not("slug", "is", null)
      // Stable indexed pagination; updates do not move products between pages.
      .order("id", { ascending: true })
      .range(from, to);

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as unknown as (SitemapProductRow & {
      supplier_id: string | null;
      product_commercial_identities: { public_reference: string } | null;
    })[];
    return rows.map(({ supplier_id, product_commercial_identities: identity, ...row }) => ({
      ...row, slug: supplier_id && identity ? identity.public_reference.toLowerCase() : row.slug,
    }));
}, ["sitemap-active-products-page-v4"], { revalidate: 3600, tags: [IDENTITY_CACHE_TAG] });

async function getActiveProducts(): Promise<SitemapProductRow[]> {
  const products: SitemapProductRow[] = [];
  for (let from = 0; from < MAX_PRODUCTS; from += PAGE_SIZE) {
    const rows = await getActiveProductPage(from);
    products.push(...rows.filter(row => Boolean(row.slug?.trim())));
    if (rows.length < PAGE_SIZE) break;
  }
  return products;
}

// Resolve translated taxonomy names in one cached catalogue read, not one
// database request per category and language. Match the route's majority rule.
function taxonomyLanguages(products: SitemapProductRow[], category: string, subcategory?: string) {
  const categoryRows = products.filter((row) => row.type_name?.trim() === category);
  const subcategoryRows = subcategory
    ? categoryRows.filter((row) => row.subtype_name?.trim() === subcategory)
    : [];
  function translatedName(rows: SitemapProductRow[], locale: SiteLocale, field: "type_name" | "subtype_name", fallback: string) {
    if (locale === "pt") return fallback;
    const counts = new Map<string, number>();
    for (const row of rows) {
      const name = row.product_translations?.find((t) => t.language === SITE_LOCALES[locale].strickerLanguage)?.[field]?.trim();
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? fallback;
  }
  return buildLanguageAlternates((locale) => {
    const name = translatedName(categoryRows, locale, "type_name", category);
    const path = `/categorias/${encodeURIComponent(name)}`;
    return subcategory
      ? `${path}/${encodeURIComponent(translatedName(subcategoryRows, locale, "subtype_name", subcategory))}`
      : path;
  });
}

export function localizeSitemapEntries(entries: MetadataRoute.Sitemap, locale: SiteLocale): MetadataRoute.Sitemap {
  return entries.map((entry) => {
    const languages: Record<string, string | undefined> = entry.alternates?.languages ?? buildLanguageAlternates(new URL(entry.url).pathname);
    return {
      ...entry,
      url: languages[SITE_LOCALES[locale].htmlLang] ?? absoluteUrl(localizePath(new URL(entry.url).pathname, locale)),
      alternates: { languages },
    };
  });
}

export async function getSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const commercialEntries: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/solucoes"),
      changeFrequency: "monthly",
      priority: 0.88,
    },
    ...getCommercialPages().map((page) => ({
      url: absoluteUrl(`/solucoes/${page.slug}`),
      changeFrequency: "monthly" as const,
      priority: page.group === "commercial" ? 0.86 : 0.82,
    })),
  ];

  const applicationEntries: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/aplicacoes"),
      changeFrequency: "monthly",
      priority: 0.85,
    },
    ...getApplicationPages().map((page) => ({
      url: absoluteUrl(`/aplicacoes/${page.slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.82,
    })),
  ];

  const industryEntries: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/industrias"),
      changeFrequency: "monthly",
      priority: 0.85,
    },
    ...getIndustryPages().map((page) => ({
      url: absoluteUrl(`/industrias/${page.slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.82,
    })),
  ];

  const guideEntries: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/guias"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...getGuides().map((guide) => ({
      url: absoluteUrl(`/guias/${guide.slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.78,
    })),
  ];

  const personalizationEntries: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/personalizacao"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...getPersonalizationPages().map((page) => ({
      url: absoluteUrl(`/personalizacao/${page.slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.74,
    })),
  ];

  const selectionEntries: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/selecoes"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...getSelectionPages().map((page) => ({
      url: absoluteUrl(`/selecoes/${page.slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.76,
    })),
  ];

  const institutionalEntries: MetadataRoute.Sitemap = [
    ...getInstitutionalPages().map((page) => ({
      url: absoluteUrl(`/${page.slug}`),
      changeFrequency: "monthly" as const,
      priority: page.slug === "sobre" || page.slug === "como-funciona" ? 0.72 : 0.62,
    })),
    {
      url: absoluteUrl("/autores/360-merchandising"),
      changeFrequency: "monthly",
      priority: 0.58,
    },
  ];

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/categorias"),
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...commercialEntries,
    ...applicationEntries,
    ...industryEntries,
    ...guideEntries,
    ...personalizationEntries,
    ...selectionEntries,
    ...institutionalEntries,
    {
      url: absoluteUrl("/sustentabilidade"),
      changeFrequency: "monthly",
      priority: 0.78,
    },
    {
      url: absoluteUrl("/blog"),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/ajuda"),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: absoluteUrl("/contacto"),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: absoluteUrl("/contactos"),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    ...[
      "/termos-e-condicoes",
      "/politica-de-privacidade",
      "/politica-de-cookies",
      "/reembolsos-e-devolucoes",
    ].map((pathname) => ({
      url: absoluteUrl(pathname),
      changeFrequency: "yearly" as const,
      priority: 0.35,
    })),
  ];

  {
    const products = await getActiveProducts();
    const categories = new Map<string, Date | undefined>();
    const subcategories = new Map<string, { category: string; subcategory: string; lastModified?: Date }>();

    const productEntries: MetadataRoute.Sitemap = products.map((product) => {
      const updatedAt = parseDate(product.updated_at);
      const categoryName = product.type_name?.trim();
      const subcategoryName = product.subtype_name?.trim();

      if (categoryName) {
        const currentCategoryDate = categories.get(categoryName);

        if (
          !currentCategoryDate ||
          (updatedAt && updatedAt.getTime() > currentCategoryDate.getTime())
        ) {
          categories.set(categoryName, updatedAt);
        }

        if (subcategoryName) {
          const key = `${categoryName}\u0000${subcategoryName}`;
          const currentSubcategory = subcategories.get(key);

          if (
            !currentSubcategory?.lastModified ||
            (updatedAt && updatedAt.getTime() > currentSubcategory.lastModified.getTime())
          ) {
            subcategories.set(key, {
              category: categoryName,
              subcategory: subcategoryName,
              lastModified: updatedAt,
            });
          }
        }
      }

      return {
        url: absoluteUrl(`/produto/${encodeURIComponent(product.slug)}`),
        lastModified: updatedAt,
        changeFrequency: "weekly",
        priority: 0.7,
      };
    });

    const categoryEntries: MetadataRoute.Sitemap = Array.from(
      categories.entries(),
    )
      .sort(([categoryA], [categoryB]) =>
        categoryA.localeCompare(categoryB, "pt-PT"),
      )
      .map(([categoryName, lastModified]) => ({
        url: absoluteUrl(`/categorias/${encodeURIComponent(categoryName)}`),
        alternates: { languages: taxonomyLanguages(products, categoryName) },
        lastModified,
        changeFrequency: "weekly",
        priority: 0.8,
      }));

    const subcategoryEntries: MetadataRoute.Sitemap = Array.from(
      subcategories.values(),
    )
      .sort((a, b) => {
        const categoryCompare = a.category.localeCompare(b.category, "pt-PT");
        return categoryCompare !== 0
          ? categoryCompare
          : a.subcategory.localeCompare(b.subcategory, "pt-PT");
      })
      .map(({ category, subcategory, lastModified }) => ({
        url: absoluteUrl(
          `/categorias/${encodeURIComponent(category)}/${encodeURIComponent(subcategory)}`,
        ),
        alternates: { languages: taxonomyLanguages(products, category, subcategory) },
        lastModified,
        changeFrequency: "weekly",
        priority: 0.75,
      }));

    return [
      ...staticEntries,
      ...categoryEntries,
      ...subcategoryEntries,
      ...productEntries,
    ];
  }
}
