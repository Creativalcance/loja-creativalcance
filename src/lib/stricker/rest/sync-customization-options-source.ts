import { createHash } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStrickerSupplierId } from "@/lib/stricker/auth";
import { type StrickerLanguage } from "@/lib/stricker/rest/types";
import { type JsonRecord } from "@/lib/stricker/types";

type StrickerCustomizationOptionRecord = JsonRecord & {
  ProdReference?: string | number | null;
  ServiceCode?: string | number | null;
  Component?: string | number | null;
  Location?: string | number | null;
  TableCode?: string | number | null;
  TableCodeOption?: string | number | null;
};

type DirectDownloadPayload = JsonRecord & {
  CustomizationOptions?: unknown;
  customizationOptions?: unknown;
  Count?: unknown;
  count?: unknown;
};

type CacheRow = {
  supplier_id: string;
  language: StrickerLanguage;
  service_code: string;
  product_reference: string;
  table_code: string | null;
  table_code_option: string | null;
  component_name: string | null;
  location_name: string | null;
  payload_hash: string;
  raw_payload: JsonRecord;
  last_seen_at: string;
};

const DIRECT_DOWNLOAD_URL =
  "https://ws.stricker-europe.com/downloads/v1ssl/file";
const DOWNLOAD_TIMEOUT_MS = 240_000;
const UPSERT_CHUNK_SIZE = 500;
const UPSERT_CONCURRENCY = 4;

function getString(value: unknown): string | null {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function getInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : null;
  }

  return null;
}

function getAccessKey(): string {
  const accessKey = process.env.STRICKER_ACCESS_KEY?.trim();

  if (!accessKey) {
    throw new Error("Variável STRICKER_ACCESS_KEY em falta.");
  }

  return accessKey;
}

function chunkArray<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

function hashPayload(payload: JsonRecord): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function getCustomizationRecords(payload: unknown): {
  records: StrickerCustomizationOptionRecord[];
  advertisedCount: number | null;
} {
  if (Array.isArray(payload)) {
    return {
      records: payload.filter(
        (record): record is StrickerCustomizationOptionRecord =>
          Boolean(record) && typeof record === "object" && !Array.isArray(record),
      ),
      advertisedCount: null,
    };
  }

  if (!payload || typeof payload !== "object") {
    return { records: [], advertisedCount: null };
  }

  const record = payload as DirectDownloadPayload;
  const rawRecords = Array.isArray(record.CustomizationOptions)
    ? record.CustomizationOptions
    : Array.isArray(record.customizationOptions)
      ? record.customizationOptions
      : [];

  return {
    records: rawRecords.filter(
      (item): item is StrickerCustomizationOptionRecord =>
        Boolean(item) && typeof item === "object" && !Array.isArray(item),
    ),
    advertisedCount: getInteger(record.Count ?? record.count),
  };
}

async function fetchCompleteCustomizationOptions(params: {
  lang: StrickerLanguage;
}): Promise<{
  records: StrickerCustomizationOptionRecord[];
  advertisedCount: number | null;
}> {
  const url = new URL(DIRECT_DOWNLOAD_URL);
  url.searchParams.set("AccessKey", getAccessKey());
  url.searchParams.set("data", "customizationOptions");
  url.searchParams.set("lang", params.lang);
  url.searchParams.set("extension", "json");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(
        `Erro HTTP Stricker ${response.status} ao descarregar customizationOptions: ${text.slice(0, 500)}`,
      );
    }

    if (!text.trim()) {
      throw new Error(
        "O download direto customizationOptions foi recebido vazio.",
      );
    }

    const parsed = JSON.parse(text) as unknown;
    const result = getCustomizationRecords(parsed);

    if (result.records.length === 0) {
      throw new Error(
        "O download direto customizationOptions não contém registos válidos.",
      );
    }

    if (
      result.advertisedCount !== null &&
      result.advertisedCount > result.records.length
    ) {
      throw new Error(
        `O fornecedor anunciou ${result.advertisedCount} personalizações, mas o download contém apenas ${result.records.length}. A captura anterior foi preservada.`,
      );
    }

    return result;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(
        `Timeout ao descarregar customizationOptions após ${DOWNLOAD_TIMEOUT_MS}ms.`,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function upsertChunks(params: {
  chunks: CacheRow[][];
  upsert: (rows: CacheRow[]) => PromiseLike<{ error: { message: string } | null }>;
}): Promise<void> {
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < params.chunks.length) {
      const index = nextIndex;
      nextIndex += 1;
      const { error } = await params.upsert(params.chunks[index]);

      if (error) {
        throw new Error(
          `Não foi possível guardar a captura de personalizações: ${error.message}`,
        );
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(UPSERT_CONCURRENCY, params.chunks.length) },
      () => worker(),
    ),
  );
}

export async function syncRestCustomizationOptionsSource(params: {
  lang: StrickerLanguage;
}): Promise<Record<string, unknown>> {
  const supabaseAdmin = createSupabaseAdminClient();
  const supplierId = await getStrickerSupplierId();
  const capturedAt = new Date().toISOString();
  const { records, advertisedCount } =
    await fetchCompleteCustomizationOptions({ lang: params.lang });

  const rows: CacheRow[] = records.flatMap((record) => {
    const serviceCode = getString(record.ServiceCode);
    const productReference = getString(record.ProdReference);

    if (!serviceCode || !productReference) return [];

    return [
      {
        supplier_id: supplierId,
        language: params.lang,
        service_code: serviceCode,
        product_reference: productReference,
        table_code: getString(record.TableCode),
        table_code_option: getString(record.TableCodeOption),
        component_name: getString(record.Component),
        location_name: getString(record.Location),
        payload_hash: hashPayload(record),
        raw_payload: record,
        last_seen_at: capturedAt,
      },
    ];
  });

  if (rows.length === 0) {
    throw new Error(
      "O feed customizationOptions não contém referências e códigos de serviço válidos. A captura anterior foi preservada.",
    );
  }

  await upsertChunks({
    chunks: chunkArray(rows, UPSERT_CHUNK_SIZE),
    upsert: (rowChunk) =>
      supabaseAdmin
        .from("supplier_customization_options_cache")
        .upsert(rowChunk, {
          onConflict: "supplier_id,language,service_code",
        }),
  });

  const { error: cleanupError, count: removedCount } = await supabaseAdmin
    .from("supplier_customization_options_cache")
    .delete({ count: "exact" })
    .eq("supplier_id", supplierId)
    .eq("language", params.lang)
    .lt("last_seen_at", capturedAt);

  if (cleanupError) {
    throw new Error(
      `A captura foi atualizada, mas não foi possível retirar opções obsoletas: ${cleanupError.message}`,
    );
  }

  return {
    dataset: "customizationOptionsSource",
    lang: params.lang,
    source: "direct-download",
    recordsReceived: records.length,
    recordsAdvertised: advertisedCount,
    recordsCached: rows.length,
    recordsRemoved: removedCount ?? 0,
    capturedAt,
  };
}
