import { createHash } from "node:crypto";
import { getStrickerConfig } from "@/lib/stricker/config";
import {
  type JsonRecord,
  type StrickerDatasetDownloadParams,
} from "@/lib/stricker/types";

export type StrickerDatasetDownloadResult = {
  url: string;
  payload: unknown;
  payloadHash: string;
};

export class StrickerDownloadHttpError extends Error {
  constructor(
    public readonly status: number,
    datasetName: string,
  ) {
    super(
      `O servidor de download do fornecedor devolveu o erro ${status} para o dataset '${datasetName}'.`,
    );
    this.name = "StrickerDownloadHttpError";
  }
}

type StrickerDatasetDownloadOptions = {
  timeoutMs?: number;
};

function hashPayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function detectCsvDelimiter(content: string): string {
  const firstLine = content.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0] ?? "";
  const candidates = [";", ",", "\t", "|"];

  return candidates.reduce((best, candidate) =>
    firstLine.split(candidate).length > firstLine.split(best).length
      ? candidate
      : best,
  );
}

function parseCsvDataset(content: string): JsonRecord[] {
  const delimiter = detectCsvDelimiter(content);
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  const normalized = content.replace(/^\uFEFF/, "");

  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index];
    const nextCharacter = normalized[index + 1];

    if (character === '"' && quoted && nextCharacter === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      row.push(value.trim());
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && nextCharacter === "\n") index += 1;
      row.push(value.trim());
      value = "";
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
    } else {
      value += character;
    }
  }

  row.push(value.trim());
  if (row.some((cell) => cell.length > 0)) rows.push(row);

  const headers = rows.shift()?.map((header) => header.trim()) ?? [];
  if (headers.length === 0) return [];

  return rows.map((values) =>
    headers.reduce<JsonRecord>((record, header, index) => {
      if (header) record[header] = values[index] ?? "";
      return record;
    }, {}),
  );
}

function extractXmlTagValue(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}>(.*?)</${tagName}>`, "is");
  const match = xml.match(regex);

  if (!match?.[1]) {
    return null;
  }

  return match[1].trim();
}

function buildReadableDownloadError(responseText: string): string {
  const errorMessage =
    extractXmlTagValue(responseText, "ErrorMessage") ??
    extractXmlTagValue(responseText, "Message") ??
    extractXmlTagValue(responseText, "Description");

  const errorCode =
    extractXmlTagValue(responseText, "ErrorCode") ??
    extractXmlTagValue(responseText, "Code");

  if (errorMessage || errorCode) {
    return `Erro Stricker FileDownload${
      errorCode ? ` ${errorCode}` : ""
    }: ${errorMessage ?? "sem mensagem adicional"}`;
  }

  const preview =
    responseText.length > 300
      ? `${responseText.slice(0, 300)}...`
      : responseText;

  return `A resposta do fornecedor não é JSON. Pré-visualização: ${preview}`;
}

export function buildStrickerDownloadUrl(
  params: StrickerDatasetDownloadParams,
): string {
  const config = getStrickerConfig();

  const url = new URL(config.downloadBaseUrl);
  url.searchParams.set("AccessKey", config.accessKey);
  url.searchParams.set("data", params.datasetName);
  url.searchParams.set("lang", params.lang ?? config.defaultLanguage);
  url.searchParams.set("extension", params.extension ?? "json");

  return url.toString();
}

export async function downloadStrickerDataset(
  params: StrickerDatasetDownloadParams,
  options: StrickerDatasetDownloadOptions = {},
): Promise<StrickerDatasetDownloadResult> {
  const url = buildStrickerDownloadUrl(params);
  const timeoutMs = options.timeoutMs ?? 120_000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json, text/xml, application/xml, text/plain",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new StrickerDownloadHttpError(response.status, params.datasetName);
    }

    const trimmedResponse = responseText.trim();

    if (trimmedResponse.startsWith("<")) {
      throw new Error(buildReadableDownloadError(trimmedResponse));
    }

    let payload: unknown;

    if (params.extension === "csv") {
      payload = parseCsvDataset(trimmedResponse);
    } else {
      try {
        payload = JSON.parse(trimmedResponse);
      } catch {
        throw new Error(
          `Resposta do fornecedor não pôde ser convertida para JSON. Pré-visualização: ${trimmedResponse.slice(
            0,
            300,
          )}`,
        );
      }
    }

    return {
      url,
      payload,
      payloadHash: hashPayload(payload),
    };
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(
        `O download do dataset '${params.datasetName}' excedeu ${Math.round(
          timeoutMs / 1000,
        )} segundos.`,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function extractDatasetRecords(
  payload: unknown,
  candidateKeys: string[],
): JsonRecord[] {
  if (Array.isArray(payload)) {
    return payload.filter(
      (item): item is JsonRecord =>
        typeof item === "object" && item !== null && !Array.isArray(item),
    );
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return [];
  }

  const record = payload as JsonRecord;

  for (const key of candidateKeys) {
    const value = record[key];

    if (Array.isArray(value)) {
      return value.filter(
        (item): item is JsonRecord =>
          typeof item === "object" && item !== null && !Array.isArray(item),
      );
    }
  }

  return [record];
}
