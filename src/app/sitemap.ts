import type { MetadataRoute } from "next";
import { getCommercialPages } from "@/lib/seo/commercial-pages";
import { getGuides } from "@/lib/seo/guide-pages";
import { getInstitutionalPages } from "@/lib/seo/institutional-pages";
import { getApplicationPages, getIndustryPages } from "@/lib/seo/landing-pages";
import { getPersonalizationPages } from "@/lib/seo/personalization-pages";
import { absoluteUrl } from "@/lib/seo/site";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SitemapProductRow = {
  id: string;
  slug: string;
  type_name: string | null;
  subtype_name: string | null;
  updated_at: string | null;
};

const PAGE_SIZE = 1000;
const MAX_PRODUCTS = 45000;

function parseDate(value: string | null): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

async function getActiveProducts(): Promise<SitemapProductRow[]> {
  const supabase = createSupabaseAdminClient();
  const products: SitemapProductRow[] = [];

  for (let from = 0; from < MAX_PRODUCTS; from += PAGE_SIZE) {
    const to = Math.min(from + PAGE_SIZE - 1, MAX_PRODUCTS - 1);

    const { data, error } = await supabase
      .from("products")
      .select("id, slug, type_name, subtype_name, updated_at")
      .eq("status", "active")
      .eq("is_active", true)
      .not("slug", "is", null)
      .order("updated_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, to);

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as SitemapProductRow[];
    products.push(...rows.filter((row) => Boolean(row.slug?.trim())));

    if (rows.length < PAGE_SIZE) {
      break;
    }
  }

  return products;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
  ];

  try {
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
  } catch (error) {
    console.error("SEO sitemap generation failed:", error);
    return staticEntries;
  }
}
