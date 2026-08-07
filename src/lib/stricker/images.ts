const STRICKER_PRODUCTS_CDN_BASE_URL =
  "https://cdn.hideacontent.com/public/products/1000x1000";

const STRICKER_PRODUCTS_HIGH_RESOLUTION_CDN_BASE_URL =
  "https://cdn.hideacontent.com/public/products_hr";

const STRICKER_PRODUCTS_500_CDN_BASE_URL =
  "https://cdn.hideacontent.com/public/products/500x500";

const STRICKER_PRINTING_COMPONENTS_CDN_BASE_URL =
  "https://cdn.hideacontent.com/public/printings/components/500x500";

const STRICKER_PRINTING_LOCATIONS_CDN_BASE_URL =
  "https://cdn.hideacontent.com/public/printings/locations/500x500";

const STRICKER_PRINTING_LINES_CDN_BASE_URL =
  "https://cdn.hideacontent.com/public/printings/printinglines/500x500";

function isAbsoluteUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

function sanitizeFilename(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/^\/+/g, "");
}

function buildCdnUrl(baseUrl: string, filename: string | null | undefined): string | null {
  const sanitized = sanitizeFilename(filename);

  if (!sanitized) {
    return null;
  }

  if (isAbsoluteUrl(sanitized)) {
    return sanitized;
  }

  return `${baseUrl}/${encodeURIComponent(sanitized)}`;
}

function getFilenameFromUrlOrPath(
  value: string | null | undefined,
): string | null {
  const sanitized = sanitizeFilename(value);

  if (!sanitized) {
    return null;
  }

  try {
    const pathname = isAbsoluteUrl(sanitized)
      ? new URL(sanitized).pathname
      : sanitized.split(/[?#]/, 1)[0];
    const filename = pathname.split("/").filter(Boolean).at(-1);

    return filename ? decodeURIComponent(filename) : null;
  } catch {
    return null;
  }
}

export function buildStrickerProductImageUrl(
  filename: string | null | undefined,
): string | null {
  return buildCdnUrl(STRICKER_PRODUCTS_CDN_BASE_URL, filename);
}

export function buildStrickerProduct500ImageUrl(
  filename: string | null | undefined,
): string | null {
  return buildCdnUrl(STRICKER_PRODUCTS_500_CDN_BASE_URL, filename);
}

export function buildStrickerProductHighResolutionImageUrl(
  filenameOrUrl: string | null | undefined,
): string | null {
  return buildCdnUrl(
    STRICKER_PRODUCTS_HIGH_RESOLUTION_CDN_BASE_URL,
    getFilenameFromUrlOrPath(filenameOrUrl),
  );
}

export function buildStrickerComponentImageUrl(
  filename: string | null | undefined,
): string | null {
  return buildCdnUrl(STRICKER_PRINTING_COMPONENTS_CDN_BASE_URL, filename);
}

export function buildStrickerLocationImageUrl(
  filename: string | null | undefined,
): string | null {
  return buildCdnUrl(STRICKER_PRINTING_LOCATIONS_CDN_BASE_URL, filename);
}

export function buildStrickerPrintingLinesImageUrl(
  filename: string | null | undefined,
): string | null {
  return buildCdnUrl(STRICKER_PRINTING_LINES_CDN_BASE_URL, filename);
}
