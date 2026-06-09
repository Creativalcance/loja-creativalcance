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

function hashPayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
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
): Promise<StrickerDatasetDownloadResult> {
  const url = buildStrickerDownloadUrl(params);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const responseText = await response.text();

    throw new Error(
      `Erro ao descarregar dataset Stricker '${params.datasetName}': ${
        response.status
      } ${responseText || response.statusText}`,
    );
  }

  const payload = (await response.json()) as unknown;

  return {
    url,
    payload,
    payloadHash: hashPayload(payload),
  };
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