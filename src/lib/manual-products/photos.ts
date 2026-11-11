export const MAX_PRODUCT_PHOTOS = 10;
export const MAX_PHOTO_BYTES = 3_000_000;
export const PRODUCT_PHOTO_BUCKET = "product-360-photos";

export type SavedProductPhoto = { id: string; url: string; label: string };
export type ProductPhotoSelection = { id: string } | { url: string } | { externalUrl: string };

export function isProductPhotoUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return value.length <= 4000 && ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}

// Existing photos are referenced by ID: the database checks product ownership.
// New uploads must belong to this administrator; legacy external URLs remain supported.
export function parseProductPhotoSelection(raw: string, origin: string, userId: string): ProductPhotoSelection[] {
  let items: unknown;
  try { items = JSON.parse(raw); } catch { throw new Error("A seleção de fotografias é inválida."); }
  if (!Array.isArray(items) || items.length > MAX_PRODUCT_PHOTOS)
    throw new Error("Seleciona até 10 fotografias diferentes.");
  const seen = new Set<string>();
  return items.map(item => {
    if (!item || typeof item !== "object" || Object.keys(item).length !== 1)
      throw new Error("A seleção de fotografias é inválida.");
    let result: ProductPhotoSelection;
    let key: string;
    if (typeof item.id === "string" && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(item.id)) {
      result = { id: item.id.toLowerCase() }; key = `id:${result.id}`;
    } else if (typeof item.url === "string") {
      const [url] = parseProductPhotos(JSON.stringify([item.url]), origin, userId);
      result = { url }; key = `url:${url}`;
    } else if (typeof item.externalUrl === "string" && isProductPhotoUrl(item.externalUrl.trim())) {
      result = { externalUrl: item.externalUrl.trim() }; key = `url:${result.externalUrl}`;
    } else throw new Error("Indica uma fotografia ou um URL HTTP ou HTTPS válido.");
    if (seen.has(key)) throw new Error("Seleciona fotografias diferentes.");
    seen.add(key);
    return result;
  });
}

export function detectProductPhoto(bytes: Uint8Array): { mime: string; extension: string } | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 && bytes.at(-2) === 255 && bytes.at(-1) === 217)
    return { mime: "image/jpeg", extension: "jpg" };
  if ([137,80,78,71,13,10,26,10].every((b, i) => bytes[i] === b))
    return { mime: "image/png", extension: "png" };
  if (String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP")
    return { mime: "image/webp", extension: "webp" };
  return null;
}

export function parseProductPhotos(raw: string, origin: string, userId: string): string[] {
  const urls: unknown = JSON.parse(raw || "[]");
  if (!Array.isArray(urls) || urls.length > MAX_PRODUCT_PHOTOS || new Set(urls).size !== urls.length)
    throw new Error("Seleciona até 10 fotografias diferentes.");
  const prefix = `${new URL(origin).origin}/storage/v1/object/public/${PRODUCT_PHOTO_BUCKET}/${userId}/`;
  return urls.map((url: unknown) => {
    if (typeof url !== "string" || !url.startsWith(prefix) ||
        !/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(url.slice(prefix.length)))
      throw new Error("Uma fotografia não corresponde a um carregamento autorizado.");
    return url;
  });
}
