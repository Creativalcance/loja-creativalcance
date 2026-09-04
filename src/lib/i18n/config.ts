import type { StrickerLanguage } from "@/lib/stricker/rest/types";

export const DEFAULT_SITE_LOCALE = "pt" as const;

export const SITE_LOCALES = {
  pt: {
    label: "Português",
    htmlLang: "pt-PT",
    intlLocale: "pt-PT",
    strickerLanguage: "PT" as StrickerLanguage,
    pathPrefix: "",
  },
  en: {
    label: "English",
    htmlLang: "en-GB",
    intlLocale: "en-GB",
    strickerLanguage: "EN" as StrickerLanguage,
    pathPrefix: "/en",
  },
  fr: {
    label: "Français",
    htmlLang: "fr-FR",
    intlLocale: "fr-FR",
    strickerLanguage: "FR" as StrickerLanguage,
    pathPrefix: "/fr",
  },
} as const;

export type SiteLocale = keyof typeof SITE_LOCALES;

export function isSiteLocale(value: string): value is SiteLocale {
  return Object.prototype.hasOwnProperty.call(SITE_LOCALES, value);
}

export function getSiteLocale(value: string | null | undefined): SiteLocale {
  const normalized = value?.trim().toLowerCase();
  return normalized && isSiteLocale(normalized)
    ? normalized
    : DEFAULT_SITE_LOCALE;
}

export function getStrickerLanguage(locale: SiteLocale): StrickerLanguage {
  return SITE_LOCALES[locale].strickerLanguage;
}

export function localizePath(path: string, locale: SiteLocale): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const pathWithoutLocale = normalizedPath.replace(/^\/(?:en|fr)(?=\/|$)/, "") || "/";
  const prefix = SITE_LOCALES[locale].pathPrefix;

  return pathWithoutLocale === "/"
    ? prefix || "/"
    : `${prefix}${pathWithoutLocale}`;
}
