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

type StrickerDatasetDownloadOptions = {
  timeoutMs?: number;
};

function hashPayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
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
      throw new Error(
        `Erro ao descarregar dataset do fornecedor '${params.datasetName}': ${
          response.status
        } ${responseText || response.statusText}`,
      );
    }

    const trimmedResponse = responseText.trim();

    if (trimmedResponse.startsWith("<")) {
      throw new Error(buildReadableDownloadError(trimmedResponse));
    }

    let payload: unknown;

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
