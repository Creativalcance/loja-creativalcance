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
