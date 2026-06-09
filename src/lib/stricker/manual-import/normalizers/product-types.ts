import { type JsonRecord } from "../../types";

export type NormalizedManualProductType = {
  external_id: string;
  parent_external_id: string | null;
  type_code: string | null;
  type_name: string | null;
  subtype_code: string | null;
  subtype_name: string | null;
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

function normalizeRecord(
  record: JsonRecord,
  index: number,
): NormalizedManualProductType {
  const typeCode = getFirstString(record, [
    "Type",
    "type",
    "TypeCode",
    "typeCode",
    "ProductType",
    "productType",
    "Code",
    "code",
  ]);

  const typeName = getFirstString(record, [
    "TypeName",
    "typeName",
    "Name",
    "name",
    "Description",
    "description",
    "ProductTypeName",
    "productTypeName",
  ]);

  const subtypeCode = getFirstString(record, [
    "SubType",
    "subType",
    "Subtype",
    "subtype",
    "SubTypeCode",
    "subTypeCode",
    "SubtypeCode",
    "subtypeCode",
  ]);

  const subtypeName = getFirstString(record, [
    "SubTypeName",
    "subTypeName",
    "SubtypeName",
    "subtypeName",
    "SubDescription",
    "subDescription",
  ]);

  const externalId =
    getFirstString(record, [
      "Id",
      "id",
      "ExternalId",
      "externalId",
      "ExternalID",
      "externalID",
    ]) ??
    [typeCode, subtypeCode].filter(Boolean).join("-") ??
    `product-type-${index + 1}`;

  const parentExternalId = getFirstString(record, [
    "ParentId",
    "parentId",
    "ParentExternalId",
    "parentExternalId",
    "ParentCode",
    "parentCode",
  ]);

  return {
    external_id: externalId,
    parent_external_id: parentExternalId,
    type_code: typeCode,
    type_name: typeName,
    subtype_code: subtypeCode,
    subtype_name: subtypeName,
    raw_payload: record,
  };
}

export function normalizeProductTypesFromCsv(
  content: string,
): NormalizedManualProductType[] {
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

export function normalizeProductTypesFromXml(
  content: string,
): NormalizedManualProductType[] {
  const itemRegex =
    /<(ProductType|ProductTypes|Type|Types|ProductTypeResp|TypeResp)[^>]*>([\s\S]*?)<\/\1>/gi;

  const records: NormalizedManualProductType[] = [];
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(content)) !== null) {
    const itemXml = match[2] ?? "";

    const record: JsonRecord = {
      Id:
        extractXmlTagValue(itemXml, "Id") ??
        extractXmlTagValue(itemXml, "ExternalId"),
      Type:
        extractXmlTagValue(itemXml, "Type") ??
        extractXmlTagValue(itemXml, "TypeCode") ??
        extractXmlTagValue(itemXml, "Code"),
      TypeName:
        extractXmlTagValue(itemXml, "TypeName") ??
        extractXmlTagValue(itemXml, "Name") ??
        extractXmlTagValue(itemXml, "Description"),
      SubType:
        extractXmlTagValue(itemXml, "SubType") ??
        extractXmlTagValue(itemXml, "Subtype") ??
        extractXmlTagValue(itemXml, "SubTypeCode") ??
        extractXmlTagValue(itemXml, "SubtypeCode"),
      SubTypeName:
        extractXmlTagValue(itemXml, "SubTypeName") ??
        extractXmlTagValue(itemXml, "SubtypeName"),
      ParentId:
        extractXmlTagValue(itemXml, "ParentId") ??
        extractXmlTagValue(itemXml, "ParentCode"),
      raw_xml: itemXml.slice(0, 3000),
    };

    records.push(normalizeRecord(record, records.length));
  }

  return records;
}

export function normalizeManualProductTypes(
  content: string,
  extension: string,
): NormalizedManualProductType[] {
  if (extension === "csv") {
    return normalizeProductTypesFromCsv(content);
  }

  if (extension === "xml") {
    return normalizeProductTypesFromXml(content);
  }

  return [];
}