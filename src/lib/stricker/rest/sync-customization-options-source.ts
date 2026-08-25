import { createHash } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStrickerSupplierId } from "@/lib/stricker/auth";
import { fetchStrickerCustomizationOptions } from "@/lib/stricker/rest/client";
import { getValidStrickerSessionToken } from "@/lib/stricker/rest/session";
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

const UPSERT_CHUNK_SIZE = 500;
const UPSERT_CONCURRENCY = 12;

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
  const token = await getValidStrickerSessionToken();
  const capturedAt = new Date().toISOString();
  const payload = await fetchStrickerCustomizationOptions(token, params.lang);
  const records = Array.isArray(payload.CustomizationOptions)
    ? (payload.CustomizationOptions as StrickerCustomizationOptionRecord[])
    : [];

  if (records.length === 0) {
    throw new Error(
      "O feed customizationOptions foi recebido sem registos. A captura anterior foi preservada.",
    );
  }

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
    recordsReceived: records.length,
    recordsCached: rows.length,
    recordsRemoved: removedCount ?? 0,
    capturedAt,
  };
}
