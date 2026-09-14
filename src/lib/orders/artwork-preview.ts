export type PrintAreaGeometry = {
  left: number; top: number; width: number; height: number;
  origin_x: string | null; origin_y: string | null;
};
export type OrderArtworkItem = {
  personalization_data?: unknown;
  technical_preview_url?: string | null;
  printing_width_mm?: number | string | null;
  printing_height_mm?: number | string | null;
  logo_position_x?: number | string | null;
  logo_position_y?: number | string | null;
  logo_scale?: number | string | null;
  logo_rotation?: number | string | null;
  logo_width_mm?: number | string | null;
  logo_height_mm?: number | string | null;
};
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function number(value: unknown, fallback: number): number {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
export function normalizePrintAreaGeometry(value: unknown): PrintAreaGeometry | null {
  const r = record(value);
  const left = number(r.left, NaN), top = number(r.top, NaN);
  const width = number(r.width, NaN), height = number(r.height, NaN);
  if (![left, top, width, height].every(Number.isFinite) || left < 0 || top < 0 || width <= 0 || height <= 0 || Math.max(left, top, width, height) > 10000) return null;
  return { left, top, width, height, origin_x: typeof r.origin_x === "string" ? r.origin_x : null, origin_y: typeof r.origin_y === "string" ? r.origin_y : null };
}
export function supplierPrintAreaGeometry(value: unknown): PrintAreaGeometry | null {
  const r = Object.fromEntries(Object.entries(record(value)).map(([key, val]) => [key.toLowerCase(), val]));
  for (const index of [1, 2]) {
    const prefix = `hotspot${index}`;
    const geometry = normalizePrintAreaGeometry({ left: r[`${prefix}left`], top: r[`${prefix}top`], width: r[`${prefix}width`], height: r[`${prefix}height`], origin_x: r[`${prefix}originx`], origin_y: r[`${prefix}originy`] });
    if (geometry) return geometry;
  }
  return null;
}
export function buildOrderArtworkPreview(item: OrderArtworkItem, assets: { logoUrl: string | null; mockupUrl: string | null }) {
  const data = record(item.personalization_data);
  const composed = data.hasComposedArtwork === true || data.hasComposedArtwork === "true";
  const layer = record(data.textLayer);
  const printRatio = Math.max(number(item.printing_width_mm, 1), 0.01) / Math.max(number(item.printing_height_mm, 1), 0.01);
  const textArtwork = !composed && typeof layer.content === "string" && layer.content.trim() ? {
    content: layer.content, fontFamily: typeof layer.fontFamily === "string" ? layer.fontFamily : "Arial",
    fontSize: number(layer.fontSize, 24), fontWeight: layer.fontWeight === "700" ? "700" as const : "400" as const,
    fontStyle: layer.fontStyle === "italic" ? "italic" as const : "normal" as const,
    color: typeof layer.color === "string" ? layer.color : "#111827",
    x: number(layer.x, 50), y: number(layer.y, 50), rotation: number(layer.rotation, 0),
  } : null;
  return {
    ...assets, baseUrl: item.technical_preview_url || null,
    printAreaGeometry: normalizePrintAreaGeometry(data.printAreaGeometry), printAreaAspectRatio: printRatio,
    artworkPosition: composed ? { x: 0, y: 0, width: 100, rotation: 0 } : {
      x: number(item.logo_position_x, 20), y: number(item.logo_position_y, 35),
      width: number(item.logo_scale, 60), rotation: number(item.logo_rotation, 0),
    },
    artworkAspectRatio: composed ? printRatio : Math.max(number(item.logo_width_mm, 1), 0.01) / Math.max(number(item.logo_height_mm, 1), 0.01),
    textArtwork,
  };
}
export type OrderArtworkPreviewData = ReturnType<typeof buildOrderArtworkPreview>;
export function hasOrderArtworkPreview(preview: OrderArtworkPreviewData): boolean {
  return Boolean(preview.mockupUrl || (preview.baseUrl && (preview.logoUrl || preview.textArtwork)));
}
