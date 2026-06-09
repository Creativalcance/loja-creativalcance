import {
  type JsonRecord,
  type NormalizedStrickerColor,
} from "@/lib/stricker/types";

function getFirstString(record: JsonRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return null;
}

export function normalizeStrickerColor(
  rawColor: JsonRecord,
  index: number,
): NormalizedStrickerColor {
  const code =
    getFirstString(rawColor, [
      "Code",
      "code",
      "ColorCode",
      "colorCode",
      "ColourCode",
      "colourCode",
      "Id",
      "id",
    ]) ?? `color-${index + 1}`;

  const name =
    getFirstString(rawColor, [
      "Name",
      "name",
      "Description",
      "description",
      "Color",
      "color",
      "Colour",
      "colour",
      "ColorName",
      "colorName",
    ]) ?? code;

  const hexCode = getFirstString(rawColor, [
    "Hex",
    "hex",
    "HexCode",
    "hexCode",
    "HTMLColor",
    "htmlColor",
  ]);

  return {
    external_id: code,
    code,
    name,
    hex_code: hexCode,
    raw_payload: rawColor,
  };
}