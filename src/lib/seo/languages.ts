import { localizePath, SITE_LOCALES, type SiteLocale } from "@/lib/i18n/config";
import { absoluteUrl } from "@/lib/seo/site";

export function buildLanguageAlternates(path: string | ((locale: SiteLocale) => string)): Record<string, string> {
  const localizedUrl = (locale: SiteLocale) => absoluteUrl(localizePath(typeof path === "string" ? path : path(locale), locale));
  return {
    ...Object.fromEntries((Object.keys(SITE_LOCALES) as SiteLocale[]).map((locale) => [SITE_LOCALES[locale].htmlLang, localizedUrl(locale)])),
    "x-default": localizedUrl("pt"),
  };
}
