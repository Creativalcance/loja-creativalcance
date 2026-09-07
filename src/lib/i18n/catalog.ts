import type { SiteLocale } from "@/lib/i18n/config";
import { getStrickerLanguage } from "@/lib/i18n/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type LocalizedProductText = {
  productId: string;
  language: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  material: string | null;
  typeName: string | null;
  subtypeName: string | null;
};

export type ResolvedCatalogTaxonomy = {
  sourceName: string;
  localizedName: string;
};

type TranslationRow = {
  product_id: string;
  language: string;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  seo_title: string | null;
  seo_description: string | null;
  material: string | null;
  type_name: string | null;
  subtype_name: string | null;
};

function mapTranslation(row: TranslationRow): LocalizedProductText {
  return {
    productId: row.product_id,
    language: row.language,
    name: row.name,
    slug: row.slug,
    shortDescription: row.short_description,
    description: row.description,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    material: row.material,
    typeName: row.type_name,
    subtypeName: row.subtype_name,
  };
}

export async function getLocalizedProductText(params: {
  productId: string;
  locale: SiteLocale;
}): Promise<LocalizedProductText | null> {
  const supabase = createSupabaseAdminClient();
  const requestedLanguage = getStrickerLanguage(params.locale);
  const fallbackLanguages = Array.from(
    new Set([requestedLanguage, "EN", "PT"]),
  );

  const { data, error } = await supabase
    .from("product_translations")
    .select(
      "product_id,language,name,slug,short_description,description,seo_title,seo_description,material,type_name,subtype_name",
    )
    .eq("product_id", params.productId)
    .in("language", fallbackLanguages)
    .returns<TranslationRow[]>();

  if (error) {
    throw new Error(`Não foi possível obter a tradução do produto: ${error.message}`);
  }

  const translations = new Map(
    (data ?? []).map((translation) => [translation.language, translation]),
  );

  for (const language of fallbackLanguages) {
    const translation = translations.get(language);

    if (translation) {
      return mapTranslation(translation);
    }
  }

  return null;
}

// Each product can return three fallback languages; stay safely below the
// PostgREST default response limit of 1,000 rows per request.
const QUERY_CHUNK_SIZE = 250;

function chunkValues<T>(values: T[], size = QUERY_CHUNK_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

export async function getLocalizedProductTexts(params: {
  productIds: string[];
  locale: SiteLocale;
}): Promise<Map<string, LocalizedProductText>> {
  const uniqueIds = Array.from(new Set(params.productIds.filter(Boolean)));
  const result = new Map<string, LocalizedProductText>();

  if (uniqueIds.length === 0 || params.locale === "pt") {
    return result;
  }

  const supabase = createSupabaseAdminClient();
  const requestedLanguage = getStrickerLanguage(params.locale);
  const fallbackLanguages = Array.from(new Set([requestedLanguage, "EN", "PT"]));
  const translations: TranslationRow[] = [];

  for (const productIds of chunkValues(uniqueIds)) {
    const { data, error } = await supabase
      .from("product_translations")
      .select("product_id,language,name,slug,short_description,description,seo_title,seo_description,material,type_name,subtype_name")
      .in("product_id", productIds)
      .in("language", fallbackLanguages)
      .returns<TranslationRow[]>();

    if (error) {
      throw new Error(`Não foi possível obter as traduções dos produtos: ${error.message}`);
    }

    translations.push(...(data ?? []));
  }

  const byProduct = new Map<string, Map<string, TranslationRow>>();
  for (const translation of translations) {
    const languages = byProduct.get(translation.product_id) ?? new Map<string, TranslationRow>();
    languages.set(translation.language, translation);
    byProduct.set(translation.product_id, languages);
  }

  for (const productId of uniqueIds) {
    const languages = byProduct.get(productId);
    if (!languages) continue;

    for (const language of fallbackLanguages) {
      const translation = languages.get(language);
      if (translation) {
        result.set(productId, mapTranslation(translation));
        break;
      }
    }
  }

  return result;
}

type SourceTaxonomyRow = {
  id: string;
  type_name: string | null;
  subtype_name?: string | null;
};

type TaxonomyTranslationRow = {
  product_id: string;
  language: string;
  type_name: string | null;
  subtype_name: string | null;
};

function mostFrequent(values: Array<string | null | undefined>): string | null {
  const counts = new Map<string, number>();
  for (const value of values) {
    const clean = value?.trim();
    if (clean) counts.set(clean, (counts.get(clean) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;
}

async function getTargetTaxonomyName(params: {
  productIds: string[];
  locale: SiteLocale;
  field: "type_name" | "subtype_name";
  fallback: string;
}): Promise<string> {
  if (params.locale === "pt" || params.productIds.length === 0) return params.fallback;

  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("product_translations")
    .select("product_id,language,type_name,subtype_name")
    .eq("language", getStrickerLanguage(params.locale))
    .in("product_id", params.productIds.slice(0, QUERY_CHUNK_SIZE))
    .returns<TaxonomyTranslationRow[]>();

  return mostFrequent((data ?? []).map((row) => row[params.field])) ?? params.fallback;
}

export async function resolveCategoryRoute(
  routeName: string,
  locale: SiteLocale,
): Promise<ResolvedCatalogTaxonomy> {
  const supabase = createSupabaseAdminClient();
  let sourceRows: SourceTaxonomyRow[] = [];

  const direct = await supabase
    .from("products")
    .select("id,type_name")
    .eq("type_name", routeName)
    .limit(QUERY_CHUNK_SIZE)
    .returns<SourceTaxonomyRow[]>();
  sourceRows = direct.data ?? [];

  if (sourceRows.length === 0) {
    const translated = await supabase
      .from("product_translations")
      .select("product_id,language,type_name,subtype_name")
      .ilike("type_name", routeName)
      .limit(QUERY_CHUNK_SIZE)
      .returns<TaxonomyTranslationRow[]>();
    const productIds = Array.from(new Set((translated.data ?? []).map((row) => row.product_id)));

    if (productIds.length > 0) {
      const source = await supabase
        .from("products")
        .select("id,type_name")
        .in("id", productIds)
        .limit(QUERY_CHUNK_SIZE)
        .returns<SourceTaxonomyRow[]>();
      sourceRows = source.data ?? [];
    }
  }

  const sourceName = mostFrequent(sourceRows.map((row) => row.type_name)) ?? routeName;
  const matchingRows = sourceRows.filter((row) => row.type_name === sourceName);
  const localizedName = await getTargetTaxonomyName({
    productIds: matchingRows.map((row) => row.id), locale, field: "type_name", fallback: sourceName,
  });

  return { sourceName, localizedName };
}

export async function resolveSubcategoryRoute(params: {
  categorySourceName: string;
  routeName: string;
  locale: SiteLocale;
}): Promise<ResolvedCatalogTaxonomy> {
  const supabase = createSupabaseAdminClient();
  let sourceRows: SourceTaxonomyRow[] = [];

  const direct = await supabase
    .from("products")
    .select("id,type_name,subtype_name")
    .eq("type_name", params.categorySourceName)
    .eq("subtype_name", params.routeName)
    .limit(QUERY_CHUNK_SIZE)
    .returns<SourceTaxonomyRow[]>();
  sourceRows = direct.data ?? [];

  if (sourceRows.length === 0) {
    const translated = await supabase
      .from("product_translations")
      .select("product_id,language,type_name,subtype_name")
      .ilike("subtype_name", params.routeName)
      .limit(QUERY_CHUNK_SIZE)
      .returns<TaxonomyTranslationRow[]>();
    const productIds = Array.from(new Set((translated.data ?? []).map((row) => row.product_id)));

    if (productIds.length > 0) {
      const source = await supabase
        .from("products")
        .select("id,type_name,subtype_name")
        .in("id", productIds)
        .eq("type_name", params.categorySourceName)
        .limit(QUERY_CHUNK_SIZE)
        .returns<SourceTaxonomyRow[]>();
      sourceRows = source.data ?? [];
    }
  }

  const sourceName = mostFrequent(sourceRows.map((row) => row.subtype_name)) ?? params.routeName;
  const matchingRows = sourceRows.filter((row) => row.subtype_name === sourceName);
  const localizedName = await getTargetTaxonomyName({
    productIds: matchingRows.map((row) => row.id), locale: params.locale, field: "subtype_name", fallback: sourceName,
  });

  return { sourceName, localizedName };
}
