import { DEFAULT_SITE_LOCALE, isSiteLocale, type SiteLocale } from "@/lib/i18n/config";

// The country is a language hint, never a restriction on the visitor's choice.
const COUNTRY_LOCALES: Record<string, readonly SiteLocale[]> = {
  PT: ["pt"], BR: ["pt"], AO: ["pt"], MZ: ["pt"], CV: ["pt"],
  GW: ["pt"], ST: ["pt"], TL: ["pt"],
  GB: ["en"], IE: ["en"], US: ["en"], AU: ["en"], NZ: ["en"],
  FR: ["fr"], MC: ["fr"],
  ES: ["es"], MX: ["es"], AR: ["es"], BO: ["es"], CL: ["es"],
  CO: ["es"], CR: ["es"], CU: ["es"], DO: ["es"], EC: ["es"],
  GT: ["es"], HN: ["es"], NI: ["es"], PA: ["es"], PE: ["es"],
  PR: ["es"], PY: ["es"], SV: ["es"], UY: ["es"], VE: ["es"],
  DE: ["de"], AT: ["de"], LI: ["de"],
  IT: ["it"], SM: ["it"], VA: ["it"],
  // Use browser preferences to distinguish the available languages here.
  CH: ["de", "fr", "it", "en"], CA: ["en", "fr"],
  BE: ["fr", "de", "en"], LU: ["fr", "de", "en"],
};

export function preferredBrowserLocales(header: string | null): SiteLocale[] {
  return (header ?? "").slice(0, 4096).split(",")
    .map((part, index) => {
      const [tag, ...parameters] = part.trim().split(";");
      const locale = tag.toLowerCase().split("-")[0];
      const qualityParameter = parameters.map((p) => p.trim()).find((p) => /^q=/i.test(p));
      const quality = qualityParameter === undefined ? 1 : Number(qualityParameter.slice(2));
      return { locale, quality, index };
    })
    .filter((entry): entry is { locale: SiteLocale; quality: number; index: number } =>
      isSiteLocale(entry.locale) && Number.isFinite(entry.quality) && entry.quality > 0 && entry.quality <= 1)
    .sort((a, b) => b.quality - a.quality || a.index - b.index)
    .map((entry) => entry.locale);
}

export function detectEntryLocale(input: {
  savedLocale?: string | null;
  country?: string | null;
  acceptLanguage?: string | null;
}): SiteLocale {
  if (input.savedLocale && isSiteLocale(input.savedLocale)) return input.savedLocale;
  const country = input.country?.trim().toUpperCase() ?? "";
  const candidates = Object.prototype.hasOwnProperty.call(COUNTRY_LOCALES, country) ? COUNTRY_LOCALES[country] : undefined;
  const browserLocales = preferredBrowserLocales(input.acceptLanguage ?? null);
  if (candidates) return browserLocales.find((locale) => candidates.includes(locale)) ?? candidates[0];
  // For other countries use a supported browser language, then English.
  // With no usable location or language information, retain the Portuguese site.
  return browserLocales[0] ?? (/^[A-Z]{2}$/.test(country) && country !== "XX" ? "en" : DEFAULT_SITE_LOCALE);
}

export function isDocumentNavigation(request: { method: string; headers: Headers }): boolean {
  const headers = request.headers;
  const destination = headers.get("sec-fetch-dest");
  return request.method === "GET"
    && (headers.get("accept") ?? "").toLowerCase().includes("text/html")
    && (!destination || destination === "document")
    && !headers.has("next-action") && !headers.has("rsc") && !headers.has("next-router-prefetch")
    && !/prefetch/i.test(`${headers.get("purpose") ?? ""} ${headers.get("sec-purpose") ?? ""}`);
}
