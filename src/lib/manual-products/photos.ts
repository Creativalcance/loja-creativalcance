export const MAX_PRODUCT_PHOTOS = 10;
export const MAX_PHOTO_BYTES = 3_000_000;
export const PRODUCT_PHOTO_BUCKET = "product-360-photos";

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
