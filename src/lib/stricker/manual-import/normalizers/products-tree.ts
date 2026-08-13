import { type JsonRecord } from "../../types";

export type NormalizedManualProductsTreeProduct = {
  external_id: string;
  sku: string;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  brand: string | null;
  material: string | null;
  dimensions: string | null;
  weight: number | null;
  country_of_origin: string | null;
  type_code: string | null;
  type_name: string | null;
  subtype_code: string | null;
  subtype_name: string | null;
  taric: string | null;
  main_image_url: string | null;
  box_image_url: string | null;
  min_order_quantity: number;
  is_active: boolean;
  is_customizable: boolean;
  is_featured: boolean;
  supplier_payload: JsonRecord;
};

function createSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function stripXmlTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function getFirstString(record: JsonRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }

    if (typeof value === "boolean") {
      return value ? "true" : "false";
    }
  }

  return null;
}

function getFirstNumber(record: JsonRecord, keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim().length > 0) {
      const normalized = value.replace(",", ".").replace(/[^\d.-]/g, "");
      const parsed = Number(normalized);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function getFirstBoolean(
  record: JsonRecord,
  keys: string[],
  fallback: boolean,
): boolean {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();

      if (["true", "1", "yes", "sim", "s"].includes(normalized)) {
        return true;
      }

      if (["false", "0", "no", "não", "nao", "n"].includes(normalized)) {
        return false;
      }
    }

    if (typeof value === "number") {
      return value === 1;
    }
  }

  return fallback;
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

function normalizeRecord(
  record: JsonRecord,
  index: number,
): NormalizedManualProductsTreeProduct {
  const reference =
    getFirstString(record, [
      "ProdReference",
      "prodReference",
      "Reference",
      "reference",
      "ProductReference",
      "productReference",
      "Sku",
      "SKU",
      "sku",
      "Code",
      "code",
      "Id",
      "id",
    ]) ?? `product-${index + 1}`;

  const name =
    getFirstString(record, [
      "Name",
      "name",
      "ProductName",
      "productName",
      "Description",
      "description",
    ]) ?? reference;

  const description = getFirstString(record, [
    "Description",
    "description",
    "LongDescription",
    "longDescription",
    "Details",
    "details",
  ]);

  const shortDescription = getFirstString(record, [
    "ShortDescription",
    "shortDescription",
    "Summary",
    "summary",
  ]);

  const brand = getFirstString(record, ["Brand", "brand"]);
  const material = getFirstString(record, [
    "Materials",
    "materials",
    "Material",
    "material",
    "Composition",
    "composition",
  ]);

  const dimensions = getFirstString(record, [
    "Dimensions",
    "dimensions",
    "Size",
    "size",
    "BoxSizeM",
    "boxSizeM",
  ]);

  const weight = getFirstNumber(record, [
    "WeightGr",
    "weightGr",
    "Weight",
    "weight",
    "BoxWeightKG",
    "boxWeightKG",
  ]);

  const typeCode = getFirstString(record, [
    "Type",
    "type",
    "TypeCode",
    "typeCode",
  ]);

  const typeName = getFirstString(record, [
    "TypeName",
    "typeName",
    "ProductType",
    "productType",
  ]);

  const subtypeCode = getFirstString(record, [
    "SubType",
    "subType",
    "Subtype",
    "subtype",
    "SubTypeCode",
    "subTypeCode",
  ]);

  const subtypeName = getFirstString(record, [
    "SubTypeName",
    "subTypeName",
    "SubtypeName",
    "subtypeName",
  ]);

  const mainImageUrl = getFirstString(record, [
    "MainImage",
    "mainImage",
    "Image",
    "image",
    "ImageUrl",
    "imageUrl",
  ]);

  const slugBase = `${name}-${reference}`;

  return {
    external_id: reference,
    sku: reference,
    name,
    slug: createSlug(slugBase),
    short_description: shortDescription,
    description,
    brand,
    material,
    dimensions,
    weight,
    country_of_origin: getFirstString(record, [
      "CountryOfOrigin",
      "countryOfOrigin",
      "Origin",
      "origin",
    ]),
    type_code: typeCode,
    type_name: typeName,
    subtype_code: subtypeCode,
    subtype_name: subtypeName,
    taric: getFirstString(record, ["Taric", "taric", "TARIC"]),
    main_image_url: mainImageUrl,
    box_image_url: getFirstString(record, ["BoxImage", "boxImage"]),
    min_order_quantity:
      getFirstNumber(record, ["MinOrderQuantity", "minOrderQuantity", "Multiplier", "multiplier"]) ?? 1,
    is_active: !getFirstBoolean(record, ["Canceled", "canceled", "IsCanceled", "isCanceled"], false),
    is_customizable: getFirstBoolean(
      record,
      [
        "HasCustomization",
        "hasCustomization",
        "IsCustomizable",
        "isCustomizable",
        "CustomizationTypes",
        "customizationTypes",
      ],
      true,
    ),
    is_featured: getFirstBoolean(
      record,
      ["Novelties", "novelties", "IsFeatured", "isFeatured", "is_featured"],
      false,
    ),
    supplier_payload: record,
  };
}

export function normalizeProductsTreeFromCsv(
  content: string,
): NormalizedManualProductsTreeProduct[] {
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

export function normalizeProductsTreeFromXml(
  content: string,
): NormalizedManualProductsTreeProduct[] {
  const itemRegex =
    /<(ProductTree|Product|ProductsTree|Products|ProductResp|ProductsTreeResp)[^>]*>([\s\S]*?)<\/\1>/gi;

  const records: NormalizedManualProductsTreeProduct[] = [];
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(content)) !== null) {
    const itemXml = match[2] ?? "";

    const record: JsonRecord = {
      ProdReference:
        extractXmlTagValue(itemXml, "ProdReference") ??
        extractXmlTagValue(itemXml, "Reference") ??
        extractXmlTagValue(itemXml, "ProductReference") ??
        extractXmlTagValue(itemXml, "Sku"),
      Name:
        extractXmlTagValue(itemXml, "Name") ??
        extractXmlTagValue(itemXml, "ProductName"),
      Description: extractXmlTagValue(itemXml, "Description"),
      ShortDescription: extractXmlTagValue(itemXml, "ShortDescription"),
      Brand: extractXmlTagValue(itemXml, "Brand"),
      Materials:
        extractXmlTagValue(itemXml, "Materials") ??
        extractXmlTagValue(itemXml, "Material") ??
        extractXmlTagValue(itemXml, "Composition"),
      Composition: extractXmlTagValue(itemXml, "Composition"),
      Packing: extractXmlTagValue(itemXml, "Packing"),
      ProductCare: extractXmlTagValue(itemXml, "ProductCare"),
      WeightGr:
        extractXmlTagValue(itemXml, "WeightGr") ??
        extractXmlTagValue(itemXml, "Weight"),
      BoxWeightKG: extractXmlTagValue(itemXml, "BoxWeightKG"),
      BoxSizeM: extractXmlTagValue(itemXml, "BoxSizeM"),
      Taric: extractXmlTagValue(itemXml, "Taric"),
      Type:
        extractXmlTagValue(itemXml, "Type") ??
        extractXmlTagValue(itemXml, "TypeCode"),
      TypeName: extractXmlTagValue(itemXml, "TypeName"),
      SubType:
        extractXmlTagValue(itemXml, "SubType") ??
        extractXmlTagValue(itemXml, "Subtype"),
      SubTypeName:
        extractXmlTagValue(itemXml, "SubTypeName") ??
        extractXmlTagValue(itemXml, "SubtypeName"),
      MainImage: extractXmlTagValue(itemXml, "MainImage"),
      BoxImage: extractXmlTagValue(itemXml, "BoxImage"),
      Multiplier: extractXmlTagValue(itemXml, "Multiplier"),
      HasColors: extractXmlTagValue(itemXml, "HasColors"),
      HasSizes: extractXmlTagValue(itemXml, "HasSizes"),
      HasCapacitys: extractXmlTagValue(itemXml, "HasCapacitys"),
      CustomizationTypes: extractXmlTagValue(itemXml, "CustomizationTypes"),
      Certificates: extractXmlTagValue(itemXml, "Certificates"),
      Properties: extractXmlTagValue(itemXml, "Properties"),
      KeyWords: extractXmlTagValue(itemXml, "KeyWords"),
      RelatedReferences: extractXmlTagValue(itemXml, "RelatedReferences"),
      raw_xml: itemXml.slice(0, 8000),
    };

    const product = normalizeRecord(record, records.length);

    if (product.external_id) {
      records.push(product);
    }
  }

  return records;
}

export function normalizeManualProductsTree(
  content: string,
  extension: string,
): NormalizedManualProductsTreeProduct[] {
  if (extension === "csv") {
    return normalizeProductsTreeFromCsv(content);
  }

  if (extension === "xml") {
    return normalizeProductsTreeFromXml(content);
  }

  return [];
}
