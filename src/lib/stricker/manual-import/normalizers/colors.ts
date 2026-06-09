import { type JsonRecord } from "../../types";

export type NormalizedManualColor = {
  external_id: string;
  code: string;
  name: string;
  hex_code: string | null;
  raw_payload: JsonRecord;
};

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

function stripXmlTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractXmlTagValue(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, "i");
  const match = xml.match(regex);

  if (!match?.[1]) {
    return null;
  }

  const value = stripXmlTags(match[1]);

  return value.length > 0 ? value : null;
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === delimiter && !insideQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());

  return values;
}

function detectDelimiter(firstLine: string): string {
  const candidates = [";", ",", "\t", "|"];

  return candidates.reduce((bestDelimiter, delimiter) => {
    const bestCount = firstLine.split(bestDelimiter).length;
    const currentCount = firstLine.split(delimiter).length;

    return currentCount > bestCount ? delimiter : bestDelimiter;
  }, ";");
}

function normalizeRecord(record: JsonRecord, index: number): NormalizedManualColor {
  const code =
    getFirstString(record, [
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
    getFirstString(record, [
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

  const hexCode = getFirstString(record, [
    "Hex",
    "hex",
    "HexCode",
    "hexCode",
    "HTMLColor",
    "htmlColor",
    "ColorHex",
    "colorHex",
  ]);

  return {
    external_id: code,
    code,
    name,
    hex_code: hexCode,
    raw_payload: record,
  };
}

export function normalizeColorsFromCsv(content: string): NormalizedManualColor[] {
  const lines = content
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter);

  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line, delimiter);

    const record = headers.reduce<JsonRecord>((accumulator, header, valueIndex) => {
      accumulator[header || `column_${valueIndex + 1}`] =
        values[valueIndex] ?? "";
      return accumulator;
    }, {});

    return normalizeRecord(record, index);
  });
}

export function normalizeColorsFromXml(content: string): NormalizedManualColor[] {
  const itemRegex =
    /<(Color|Colour|Colors|Colours|ColorResp|ColourResp)[^>]*>([\s\S]*?)<\/\1>/gi;

  const records: NormalizedManualColor[] = [];
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(content)) !== null) {
    const itemXml = match[2] ?? "";

    const record: JsonRecord = {
      Code:
        extractXmlTagValue(itemXml, "Code") ??
        extractXmlTagValue(itemXml, "ColorCode") ??
        extractXmlTagValue(itemXml, "ColourCode") ??
        extractXmlTagValue(itemXml, "Id"),
      Name:
        extractXmlTagValue(itemXml, "Name") ??
        extractXmlTagValue(itemXml, "Description") ??
        extractXmlTagValue(itemXml, "Color") ??
        extractXmlTagValue(itemXml, "Colour"),
      Hex:
        extractXmlTagValue(itemXml, "Hex") ??
        extractXmlTagValue(itemXml, "HexCode") ??
        extractXmlTagValue(itemXml, "HTMLColor") ??
        extractXmlTagValue(itemXml, "ColorHex"),
      raw_xml: itemXml.slice(0, 3000),
    };

    records.push(normalizeRecord(record, records.length));
  }

  return records;
}

export function normalizeManualColors(
  content: string,
  extension: string,
): NormalizedManualColor[] {
  if (extension === "csv") {
    return normalizeColorsFromCsv(content);
  }

  if (extension === "xml") {
    return normalizeColorsFromXml(content);
  }

  return [];
}