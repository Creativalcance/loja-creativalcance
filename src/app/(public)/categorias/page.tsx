import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Boxes, Search } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { localizePath, SITE_LOCALES } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { getCurrentLocale } from "@/lib/i18n/server";

type ProductImage = {
  external_url: string | null;
  storage_url: string | null;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
  image_type?: string | null;
};

type ProductVariant = {
  optional_image_1_url: string | null;
  optional_image_2_url: string | null;
};

type CategoryRow = {
  sku: string;
  name: string | null;
  type_name: string | null;
  product_images: ProductImage[] | null;
  product_variants: ProductVariant[] | null;
};

type CatalogCategory = {
  name: string;
  count: number;
  imageUrl: string | null;
  imageAlt: string;
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const text = getMessages(locale).catalog;
  return {
    title: text.title,
    description: text.intro,
    alternates: { canonical: localizePath("/categorias", locale) },
  };
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getCleanUrl(value: string | null | undefined): string | null {
  const cleanValue = value?.trim();

  if (!cleanValue) {
    return null;
  }

  const normalizedValue = normalizeText(cleanValue);

  const isPlaceholder =
    normalizedValue.includes("placeholder") ||
    normalizedValue.includes("placehold") ||
    normalizedValue.includes("dummy") ||
    normalizedValue.includes("mock") ||
    normalizedValue.includes("sem-imagem") ||
    normalizedValue.includes("no-image") ||
    normalizedValue.includes("fallback");

  return isPlaceholder ? null : cleanValue;
}

function isDemoProduct(row: CategoryRow): boolean {
  return normalizeText(row.sku).startsWith("lc-");
}

function buildCategoryHref(categoryName: string): string {
  return `/categorias/${encodeURIComponent(categoryName)}`;
}

function getPrimaryImage(images: ProductImage[] | null): ProductImage | null {
  const validImages = images ?? [];

  if (validImages.length === 0) {
    return null;
  }

  const primaryImage = validImages.find((image) => image.is_primary);

  if (primaryImage) {
    return primaryImage;
  }

  return (
    [...validImages].sort((a, b) => a.sort_order - b.sort_order)[0] ?? null
  );
}

function getVariantImageUrl(variants: ProductVariant[] | null): string | null {
  for (const variant of variants ?? []) {
    const imageUrl =
      getCleanUrl(variant.optional_image_1_url) ??
      getCleanUrl(variant.optional_image_2_url);

    if (imageUrl) {
      return imageUrl;
    }
  }

  return null;
}

function getImageUrl(row: CategoryRow): string | null {
  const image = getPrimaryImage(row.product_images);

  return (
    getCleanUrl(image?.storage_url) ??
    getCleanUrl(image?.external_url) ??
    getVariantImageUrl(row.product_variants)
  );
}

function getCatalogCategories(rows: CategoryRow[]): CatalogCategory[] {
  const categoryMap = new Map<string, CatalogCategory>();

  rows.forEach((row) => {
    const categoryName = row.type_name?.trim();

    if (!categoryName) {
      return;
    }

    const existingCategory = categoryMap.get(categoryName);
    const imageUrl = isDemoProduct(row) ? null : getImageUrl(row);

    if (existingCategory) {
      categoryMap.set(categoryName, {
        ...existingCategory,
        count: existingCategory.count + 1,
        imageUrl: existingCategory.imageUrl ?? imageUrl,
        imageAlt:
          existingCategory.imageAlt !== categoryName
            ? existingCategory.imageAlt
            : row.name ?? categoryName,
      });

      return;
    }

    categoryMap.set(categoryName, {
      name: categoryName,
      count: 1,
      imageUrl,
      imageAlt: row.name ?? categoryName,
    });
  });

  return Array.from(categoryMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "pt-PT"),
  );
}

export default async function CategoriesPage() {
  const locale = await getCurrentLocale();
  const labels = getMessages(locale);
  const intlLocale = SITE_LOCALES[locale].intlLocale;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
        sku,
        name,
        type_name,
        product_images (
          external_url,
          storage_url,
          alt_text,
          is_primary,
          sort_order,
          image_type
        ),
        product_variants (
          optional_image_1_url,
          optional_image_2_url
        )
      `,
    )
    .eq("status", "active")
    .eq("is_active", true)
    .not("type_name", "is", null)
    .order("is_purchasable", { ascending: false })
    .order("is_featured", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(10000);

  const categories = error
    ? []
    : getCatalogCategories((data ?? []) as unknown as CategoryRow[]);

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <section className="mx-auto w-full max-w-7xl px-6 py-12">
        <Link
          href={localizePath("/", locale)}
          className="text-sm font-medium text-white/50 transition hover:text-white"
        >
          ← {labels.common.backHome}
        </Link>

        <div className="mt-12 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/45">
              {labels.catalog.eyebrow}
            </p>

            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
              {labels.catalog.title}
            </h1>

            <p className="mt-5 max-w-3xl text-base leading-8 text-white/65">
              {labels.catalog.intro}
            </p>
          </div>

          <Link
            href={localizePath("/pesquisa", locale)}
            className="inline-flex items-center justify-center rounded-full border border-white/20 !bg-transparent px-6 py-3 text-sm font-semibold !text-white transition hover:border-white/40 hover:!bg-white/10"
          >
            <Search className="mr-2 h-4 w-4" />
            {labels.common.searchProducts}
          </Link>
        </div>

        {error ? (
          <div className="mt-10 rounded-3xl border border-red-400/30 bg-red-500/10 p-6 text-sm text-red-100">
            {labels.catalog.loadError} {labels.common.retry}
          </div>
        ) : null}

        {categories.length > 0 ? (
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categories.map((category) => (
              <Link
                key={category.name}
                href={localizePath(buildCategoryHref(category.name), locale)}
                className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] transition hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.06]"
              >
                <div className="aspect-[4/3] bg-white">
                  {category.imageUrl ? (
                    <img
                      src={category.imageUrl}
                      alt={category.imageAlt}
                      className="h-full w-full object-contain p-6 transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-neutral-400">
                      <Boxes className="h-10 w-10" />
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white">
                    <Boxes className="h-5 w-5" />
                  </div>

                  <h2 className="mt-6 line-clamp-2 text-xl font-semibold tracking-tight text-white">
                    {category.name}
                  </h2>

                  <p className="mt-3 text-sm text-white/55">
                    {category.count.toLocaleString(intlLocale)} {category.count === 1 ? labels.common.product : labels.common.products} {labels.common.available}
                  </p>

                  <span className="mt-6 inline-flex items-center text-sm font-semibold text-white">
                    {labels.common.viewProducts}
                    <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center">
            <h2 className="text-xl font-semibold text-white">
              {labels.catalog.emptyTitle}
            </h2>

            <p className="mt-3 text-white/60">
              {labels.catalog.emptyText}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
