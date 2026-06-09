import {
  type ManualImportPreview,
  type ParsedCsvRow,
} from "@/lib/stricker/manual-import/types";

function detectDelimiter(firstLine: string): string {
  const candidates = [";", ",", "\t", "|"];

  let bestDelimiter = ";";
  let bestCount = 0;

  for (const delimiter of candidates) {
    const count = firstLine.split(delimiter).length;

    if (count > bestCount) {
      bestCount = count;
      bestDelimiter = delimiter;
    }
  }

  return bestDelimiter;
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

export function parseCsvPreview(content: string): ManualImportPreview {
  const errors: string[] = [];

  const lines = content
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return {
      recordsDetected: 0,
      previewPayload: {
        rows: [],
      },
      errors: ["O ficheiro CSV está vazio."],
    };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter).map((header) =>
    header.trim(),
  );

  if (headers.length === 0) {
    errors.push("Não foi possível detectar cabeçalhos no CSV.");
  }

  const rows: ParsedCsvRow[] = lines.slice(1, 11).map((line) => {
    const values = parseCsvLine(line, delimiter);

    return headers.reduce<ParsedCsvRow>((row, header, index) => {
      row[header || `column_${index + 1}`] = values[index] ?? "";
      return row;
    }, {});
  });

  return {
    recordsDetected: Math.max(0, lines.length - 1),
    previewPayload: {
      delimiter,
      headers,
      sampleRows: rows,
    },
    errors,
  };
}