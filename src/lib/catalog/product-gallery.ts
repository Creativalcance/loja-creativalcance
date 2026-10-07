export type GalleryVariant = {
  id: string;
  color_code?: string | null;
  color_name?: string | null;
  optional_image_1_url?: string | null;
  optional_image_2_url?: string | null;
};

type StoredImage = {
  external_url: string | null;
  storage_url: string | null;
  variant_id?: string | null;
  image_type?: string;
  is_primary?: boolean;
  sort_order?: number;
};

export type ProductGalleryImage = {
  id: string;
  url: string;
  thumbnailUrl: string;
  zoomUrl: string;
  colorKeys: string[];
  personalizationExample: boolean;
};

const CDN = "https://cdn.hideacontent.com";

// Only product photographs from the documented CDN paths; never printing diagrams.
function supplierFilename(value: string): string | null {
  let filename = value.trim();
  if (/^https?:/i.test(filename)) {
    try {
      const url = new URL(filename);
      if (url.origin !== CDN || url.username || url.password ||
          !/^\/public\/(?:products\/(?:500x500|1000x1000)|products_hr)\/[^/]+$/.test(url.pathname)) return null;
      filename = decodeURIComponent(url.pathname.split("/").at(-1) ?? "");
    } catch { return null; }
  }
  return /^[a-z0-9][a-z0-9_.()-]*\.(?:jpe?g|png|webp)$/i.test(filename) && !filename.includes("..")
    ? filename : null;
}

function safeStoredUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return value;
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
    if (url.hostname === "cdn.hideacontent.com" && !supplierFilename(value)) return null;
    return value;
  } catch { return null; }
}

export function getGalleryColorKey(variant: Pick<GalleryVariant, "id" | "color_code" | "color_name"> | null | undefined): string | null {
  if (!variant) return null;
  const code = variant.color_code?.trim();
  if (code) return `code:${code}`;
  const name = variant.color_name?.trim().toLowerCase();
  return name ? `name:${name}` : `variant:${variant.id}`;
}

export function buildProductGallery({ sku, allImageList, images, variants }: {
  sku: string;
  allImageList: unknown;
  images: StoredImage[];
  variants: GalleryVariant[];
}): ProductGalleryImage[] {
  const gallery = new Map<string, ProductGalleryImage>();
  const variantKeys = new Map(variants.map(variant => [variant.id, getGalleryColorKey(variant)!]));
  function add(value: string | null | undefined, colorKey: string | null = null, source?: string | null) {
    if (!value) return;
    const filename = supplierFilename(source ?? value);
    const url = safeStoredUrl(value) ?? (filename === value ? `${CDN}/public/products/1000x1000/${encodeURIComponent(filename)}` : null);
    if (!url) return;
    const id = filename ? `supplier:${filename.toLowerCase()}` : url;
    // Infer a colour only from the current product's filename. General/set images stay shared.
    const suffix = filename?.startsWith(`${sku}_`) ? filename.slice(sku.length + 1) : "";
    const filenameColor = suffix.match(/^(\d+)(?=[_.-])/u)?.[1];
    const inferredKey = colorKey ?? (filenameColor ? `code:${filenameColor}` : null);
    const existing = gallery.get(id);
    if (existing) {
      if (inferredKey && !existing.colorKeys.includes(inferredKey)) existing.colorKeys.push(inferredKey);
      return;
    }
    const useCdn = filename && (!source || value === source);
    const encoded = filename ? encodeURIComponent(filename) : "";
    gallery.set(id, {
      id,
      url: useCdn ? `${CDN}/public/products/1000x1000/${encoded}` : url,
      thumbnailUrl: useCdn ? `${CDN}/public/products/500x500/${encoded}` : url,
      zoomUrl: useCdn ? `${CDN}/public/products_hr/${encoded}` : url,
      colorKeys: inferredKey ? [inferredKey] : [],
      personalizationExample: !!filename && /(?:^|[-_])logo(?:[-_.]|$)/i.test(filename),
    });
  }

  // Existing uploads/variant photos take precedence and remain usable without a supplier list.
  for (const image of [...images].sort((a, b) => Number(!!b.is_primary) - Number(!!a.is_primary) || (a.sort_order ?? 0) - (b.sort_order ?? 0))) {
    if (image.image_type && !["main", "box", "variant", "gallery", "manual"].includes(image.image_type)) continue;
    add(image.storage_url ?? image.external_url, image.variant_id ? variantKeys.get(image.variant_id) ?? null : null, image.external_url);
  }
  for (const variant of variants) {
    add(variant.optional_image_1_url, getGalleryColorKey(variant));
    add(variant.optional_image_2_url, getGalleryColorKey(variant));
  }
  if (typeof allImageList === "string") {
    for (const entry of allImageList.split(",")) {
      const filename = supplierFilename(entry.trim());
      if (!filename || !(filename.startsWith(`${sku}_`) || filename.startsWith(`${sku}.`))) continue;
      add(filename);
    }
  }
  return [...gallery.values()];
}

export function selectGalleryImages(images: ProductGalleryImage[], colorKey: string | null, preferredUrl: string | null, showAll: boolean): ProductGalleryImage[] {
  const preferredFilename = preferredUrl ? supplierFilename(preferredUrl)?.toLowerCase() : null;
  const visible = images.filter(image => showAll || !colorKey || !image.colorKeys.length || image.colorKeys.includes(colorKey));
  function rank(image: ProductGalleryImage): number {
    if (image.url === preferredUrl || (preferredFilename && image.id === `supplier:${preferredFilename}`)) return 0;
    if (image.personalizationExample) return 3;
    return colorKey && image.colorKeys.includes(colorKey) ? 1 : 2;
  }
  return visible.sort((a, b) => rank(a) - rank(b));
}
