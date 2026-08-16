const DEFAULT_SITE_URL = "https://360-merchandising.com";

export const SITE_NAME = "360 Merchandising";
export const SITE_LOCALE = "pt-PT";
export const SITE_LANGUAGE = "pt";
export const DEFAULT_SOCIAL_IMAGE = "/brand/360-merchandising.png";

function normalizeSiteUrl(value: string | undefined): string | null {
  const candidate = value?.trim();

  if (!candidate) {
    return null;
  }

  try {
    return new URL(candidate).origin;
  } catch {
    return null;
  }
}

export function getSiteUrl(): string {
  return normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) ?? DEFAULT_SITE_URL;
}

export function absoluteUrl(path = "/"): string {
  return new URL(path, `${getSiteUrl()}/`).toString();
}
