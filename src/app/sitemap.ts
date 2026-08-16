import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo/site";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SitemapProductRow = {
  id: string;
  slug: string;
  type_name: string | null;
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
      .select("id, slug, type_name, updated_at")
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

    const productEntries: MetadataRoute.Sitemap = products.map((product) => {
      const updatedAt = parseDate(product.updated_at);
      const categoryName = product.type_name?.trim();

      if (categoryName) {
        const currentCategoryDate = categories.get(categoryName);

        if (
          !currentCategoryDate ||
          (updatedAt && updatedAt.getTime() > currentCategoryDate.getTime())
        ) {
          categories.set(categoryName, updatedAt);
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

    return [...staticEntries, ...categoryEntries, ...productEntries];
  } catch (error) {
    console.error("SEO sitemap generation failed:", error);
    return staticEntries;
  }
}
