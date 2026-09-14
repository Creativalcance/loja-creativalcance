import type { SiteLocale } from "@/lib/i18n/config";
import { getStrickerLanguage } from "@/lib/i18n/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ColorVariant = { color_code?: string | null; color_name: string | null };
type SupplierColor = { code: string; name: string; language: string };

const normalizeName = (name: string) => name.trim().toLocaleLowerCase("pt-PT");

// Two retired codes still occur in active variants but are absent from the
// current Colors feeds. These labels translate the archived EN descriptions;
// they are store fallbacks, not additional supplier records.
const retiredColors: Partial<Record<SiteLocale, Record<string, string>>> = {
  fr: { "318": "Jaune fluo", "379": "Vert OTAN / Rose fluo" },
  es: { "318": "Amarillo neón", "379": "Verde OTAN / Rosa neón" },
  de: { "318": "Neongelb", "379": "NATO-Grün / Neonpink" },
  it: { "318": "Giallo neon", "379": "Verde NATO / Rosa neon" },
};

// Labels are presentation only: canonical names still identify colour groups,
// and IDs/SKUs still determine stock, pricing, images and supplier orders.
export async function localizeProductColors<T extends ColorVariant>(
  variants: T[], supplierId: string | null, locale: SiteLocale,
): Promise<(T & { color_label: string | null })[]> {
  if (locale === "pt" || !supplierId || !variants.length) {
    return variants.map((variant) => ({ ...variant, color_label: variant.color_name }));
  }
  const language = getStrickerLanguage(locale);
  const { data, error } = await createSupabaseAdminClient()
    .from("supplier_colors")
    .select("code,name,language")
    .eq("supplier_id", supplierId)
    .in("language", [...new Set([language, "EN", "PT"])])
    .returns<SupplierColor[]>();
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const byCode = new Map<string, string>();
  for (const lang of ["EN", language]) {
    if (lang === language) {
      for (const [code, name] of Object.entries(retiredColors[locale] ?? {})) {
        if (byCode.has(code)) byCode.set(code, name);
      }
    }
    for (const row of rows) {
      if (row.language === lang && row.name.trim()) byCode.set(row.code, row.name.trim());
    }
  }
  // Older/manual variants can lack a code or use a retired code. Only match
  // exact Portuguese names within this supplier, never colour-list positions.
  const byName = new Map<string, string>();
  for (const row of rows) {
    const translated = byCode.get(row.code);
    if (row.language === "PT" && translated) byName.set(normalizeName(row.name), translated);
  }
  return variants.map((variant) => ({
    ...variant,
    color_label: (variant.color_code && byCode.get(variant.color_code)) ||
      (variant.color_name && byName.get(normalizeName(variant.color_name))) || variant.color_name,
  }));
}

export async function getLocalizedVariantColors(variantIds: string[], locale: SiteLocale) {
  const labels = new Map<string, string>();
  const ids = [...new Set(variantIds)];
  if (locale === "pt" || !ids.length) return labels;
  const { data, error } = await createSupabaseAdminClient()
    .from("product_variants")
    .select("id,color_code,color_name,products!inner(supplier_id)")
    .in("id", ids)
    .returns<(ColorVariant & { id: string; products: { supplier_id: string | null } })[]>();
  if (error) throw new Error(error.message);
  const variants = data ?? [];
  const suppliers = [...new Set(variants.map((variant) => variant.products.supplier_id))];
  await Promise.all(suppliers.map(async (supplierId) => {
    const localized = await localizeProductColors(
      variants.filter((variant) => variant.products.supplier_id === supplierId), supplierId, locale,
    );
    for (const variant of localized) if (variant.color_label) labels.set(variant.id, variant.color_label);
  }));
  return labels;
}
