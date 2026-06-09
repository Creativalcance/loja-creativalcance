import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStrickerSupplierId } from "@/lib/stricker/auth";
import { fetchStrickerDataset } from "@/lib/stricker/rest/client";
import { getValidStrickerSessionToken } from "@/lib/stricker/rest/session";
import {
  type StrickerCountry,
  type StrickerLanguage,
} from "@/lib/stricker/rest/types";
import { type JsonRecord } from "@/lib/stricker/types";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

type SupplierDatasetImportRow = {
  id: string;
};

type StrickerStockRecord = {
  Sku?: string | number | null;
  WebSku?: string | number | null;
  Quantity?: string | number | null;
  Country?: string | null;
  NextQuantity1?: string | number | null;
  NextDate1?: string | null;
  NextQuantity2?: string | number | null;
  NextDate2?: string | null;
  NextQuantity3?: string | number | null;
  NextDate3?: string | null;
  NextQuantity4?: string | number | null;
  NextDate4?: string | null;
  NextQuantity5?: string | number | null;
  NextDate5?: string | null;
  NextQuantity6?: string | number | null;
  NextDate6?: string | null;
};

type ProductVariantRow = {
  id: string;
  product_id: string;
  supplier_id: string;
  external_variant_id: string;
  sku: string;
};

type ProductStockUpsertRow = {
  product_id: string;
  variant_id: string;
  supplier_id: string;
  warehouse_code: string;
  available_quantity: number;
  reserved_quantity: number;
  incoming_quantity: number;
  expected_restock_date: string | null;
  last_synced_at: string;
  future_quantities: JsonRecord[];
  stock_scope: string;
  raw_payload?: JsonRecord;
};

type ProductFutureStockUpsertRow = {
  product_id: string;
  variant_id: string;
  supplier_id: string;
  warehouse_code: string;
  expected_date: string;
  expected_quantity: number;
  raw_payload: JsonRecord;
};

export type SyncRestStocksByCountryResult = {
  dataset: "stocksByCountry";
  lang: StrickerLanguage;
  country: StrickerCountry;
  recordsReceived: number;
  variantsMatched: number;
  stocksImported: number;
  futureStocksImported: number;
  datasetImportId: string;
};

const QUERY_CHUNK_SIZE = 400;
const UPSERT_CHUNK_SIZE = 500;

function chunkArray<TValue>(values: TValue[], size: number): TValue[][] {
  const chunks: TValue[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

function getNullableString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function getInteger(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value.replace(",", ".").replace(/[^\d.-]/g, ""));

    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.round(parsed));
    }
  }

  return fallback;
}

function toJsonRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as JsonRecord;
}

function normalizeDate(value: unknown): string | null {
  const rawValue = getNullableString(value);

  if (!rawValue) {
    return null;
  }

  const parsed = new Date(rawValue);

  if (!Number.isFinite(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function getStockSku(record: StrickerStockRecord): string | null {
  return getNullableString(record.WebSku) ?? getNullableString(record.Sku);
}

function getFutureStockRows(params: {
  record: StrickerStockRecord;
  variant: ProductVariantRow;
  warehouseCode: string;
}): ProductFutureStockUpsertRow[] {
  const rows: ProductFutureStockUpsertRow[] = [];

  for (let index = 1; index <= 6; index += 1) {
    const quantity = getInteger(
      params.record[`NextQuantity${index}` as keyof StrickerStockRecord],
      0,
    );

    const expectedDate = normalizeDate(
      params.record[`NextDate${index}` as keyof StrickerStockRecord],
    );

    if (!expectedDate || quantity <= 0) {
      continue;
    }

    rows.push({
      product_id: params.variant.product_id,
      variant_id: params.variant.id,
      supplier_id: params.variant.supplier_id,
      warehouse_code: params.warehouseCode,
      expected_date: expectedDate,
      expected_quantity: quantity,
      raw_payload: toJsonRecord(params.record),
    });
  }

  return rows;
}

function getFirstFutureDate(rows: ProductFutureStockUpsertRow[]): string | null {
  if (rows.length === 0) {
    return null;
  }

  return rows
    .map((row) => row.expected_date)
    .sort((a, b) => a.localeCompare(b))[0];
}

async function createDatasetImport(params: {
  supabaseAdmin: SupabaseAdminClient;
  supplierId: string;
  lang: StrickerLanguage;
  country: StrickerCountry;
}): Promise<string> {
  const { data, error } = await params.supabaseAdmin
    .from("supplier_dataset_imports")
    .insert({
      supplier_id: params.supplierId,
      dataset_name: "stocksByCountry",
      language: params.lang,
      country: params.country,
      extension: "json",
      status: "running",
      records_received: 0,
      records_imported: 0,
      records_failed: 0,
      source_url: "stricker-rest",
      raw_payload: {},
      errors: [],
      started_at: new Date().toISOString(),
      finished_at: null,
    })
    .select("id")
    .single<SupplierDatasetImportRow>();

  if (error || !data) {
    throw new Error(
      error?.message ?? "Não foi possível criar o registo de sincronização.",
    );
  }

  return data.id;
}

async function finishDatasetImport(params: {
  supabaseAdmin: SupabaseAdminClient;
  datasetImportId: string;
  status: "success" | "failed" | "partial_success";
  recordsReceived: number;
  recordsImported: number;
  recordsFailed: number;
  rawPayload: JsonRecord;
  errors: string[];
}): Promise<void> {
  const { error } = await params.supabaseAdmin
    .from("supplier_dataset_imports")
    .update({
      status: params.status,
      records_received: params.recordsReceived,
      records_imported: params.recordsImported,
      records_failed: params.recordsFailed,
      raw_payload: params.rawPayload,
      errors: params.errors,
      finished_at: new Date().toISOString(),
    })
    .eq("id", params.datasetImportId);

  if (error) {
    throw new Error(error.message);
  }
}

async function fetchVariantsBySkus(params: {
  supabaseAdmin: SupabaseAdminClient;
  supplierId: string;
  skus: string[];
}): Promise<ProductVariantRow[]> {
  if (params.skus.length === 0) {
    return [];
  }

  const uniqueSkus = Array.from(new Set(params.skus));
  const variants = new Map<string, ProductVariantRow>();

  for (const skuChunk of chunkArray(uniqueSkus, QUERY_CHUNK_SIZE)) {
    const { data: variantsBySku, error: skuError } = await params.supabaseAdmin
      .from("product_variants")
      .select("id,product_id,supplier_id,external_variant_id,sku")
      .eq("supplier_id", params.supplierId)
      .in("sku", skuChunk)
      .returns<ProductVariantRow[]>();

    if (skuError) {
      throw new Error(skuError.message);
    }

    for (const variant of variantsBySku ?? []) {
      variants.set(variant.id, variant);
    }

    const { data: variantsByExternalId, error: externalIdError } =
      await params.supabaseAdmin
        .from("product_variants")
        .select("id,product_id,supplier_id,external_variant_id,sku")
        .eq("supplier_id", params.supplierId)
        .in("external_variant_id", skuChunk)
        .returns<ProductVariantRow[]>();

    if (externalIdError) {
      throw new Error(externalIdError.message);
    }

    for (const variant of variantsByExternalId ?? []) {
      variants.set(variant.id, variant);
    }
  }

  return Array.from(variants.values());
}

function buildVariantMap(
  variants: ProductVariantRow[],
): Map<string, ProductVariantRow> {
  const map = new Map<string, ProductVariantRow>();

  for (const variant of variants) {
    map.set(variant.sku, variant);
    map.set(variant.external_variant_id, variant);
  }

  return map;
}

async function upsertProductStocks(params: {
  supabaseAdmin: SupabaseAdminClient;
  rows: ProductStockUpsertRow[];
}): Promise<void> {
  for (const rowChunk of chunkArray(params.rows, UPSERT_CHUNK_SIZE)) {
    const { error } = await params.supabaseAdmin
      .from("product_stocks")
      .upsert(rowChunk, {
        onConflict: "product_id,variant_id,supplier_id,warehouse_code",
      });

    if (error) {
      throw new Error(error.message);
    }
  }
}

async function deleteFutureStocks(params: {
  supabaseAdmin: SupabaseAdminClient;
  supplierId: string;
  warehouseCode: string;
  variantIds: string[];
}): Promise<void> {
  const uniqueVariantIds = Array.from(new Set(params.variantIds));

  for (const variantIdChunk of chunkArray(uniqueVariantIds, QUERY_CHUNK_SIZE)) {
    const { error } = await params.supabaseAdmin
      .from("product_future_stocks")
      .delete()
      .eq("supplier_id", params.supplierId)
      .eq("warehouse_code", params.warehouseCode)
      .in("variant_id", variantIdChunk);

    if (error) {
      throw new Error(error.message);
    }
  }
}

async function upsertFutureStocks(params: {
  supabaseAdmin: SupabaseAdminClient;
  rows: ProductFutureStockUpsertRow[];
}): Promise<void> {
  for (const rowChunk of chunkArray(params.rows, UPSERT_CHUNK_SIZE)) {
    const { error } = await params.supabaseAdmin
      .from("product_future_stocks")
      .upsert(rowChunk, {
        onConflict:
          "product_id,variant_id,supplier_id,warehouse_code,expected_date",
      });

    if (error) {
      throw new Error(error.message);
    }
  }
}

export async function syncRestStocksByCountry(params: {
  lang: StrickerLanguage;
  country: StrickerCountry;
}): Promise<SyncRestStocksByCountryResult> {
  const supabaseAdmin = createSupabaseAdminClient();
  const supplierId = await getStrickerSupplierId();

  const datasetImportId = await createDatasetImport({
    supabaseAdmin,
    supplierId,
    lang: params.lang,
    country: params.country,
  });

  try {
    const token = await getValidStrickerSessionToken();

    const payload = await fetchStrickerDataset(
      {
        dataset: "stocksByCountry",
        token,
        lang: params.lang,
        country: params.country,
      },
      {
        timeoutMs: 180_000,
      },
    );

    const records = Array.isArray(payload.Stocks)
      ? (payload.Stocks as StrickerStockRecord[])
      : [];

    const skus = records
      .map((record) => getStockSku(record))
      .filter((value): value is string => Boolean(value));

    const variants = await fetchVariantsBySkus({
      supabaseAdmin,
      supplierId,
      skus,
    });

    const variantMap = buildVariantMap(variants);

    const now = new Date().toISOString();
    const warehouseCode = params.country;

    const stockRows: ProductStockUpsertRow[] = [];
    const futureStockRows: ProductFutureStockUpsertRow[] = [];

    for (const record of records) {
      const sku = getStockSku(record);

      if (!sku) {
        continue;
      }

      const variant = variantMap.get(sku);

      if (!variant) {
        continue;
      }

      const futureRowsForVariant = getFutureStockRows({
        record,
        variant,
        warehouseCode,
      });

      futureStockRows.push(...futureRowsForVariant);

      const incomingQuantity = futureRowsForVariant.reduce(
        (total, row) => total + row.expected_quantity,
        0,
      );

      stockRows.push({
        product_id: variant.product_id,
        variant_id: variant.id,
        supplier_id: variant.supplier_id,
        warehouse_code: warehouseCode,
        available_quantity: getInteger(record.Quantity, 0),
        reserved_quantity: 0,
        incoming_quantity: incomingQuantity,
        expected_restock_date: getFirstFutureDate(futureRowsForVariant),
        last_synced_at: now,
        future_quantities: futureRowsForVariant.map((row) => ({
          expected_date: row.expected_date,
          expected_quantity: row.expected_quantity,
          warehouse_code: row.warehouse_code,
        })),
        stock_scope: "country",
        raw_payload: toJsonRecord(record),
      });
    }

    if (stockRows.length > 0) {
      await upsertProductStocks({
        supabaseAdmin,
        rows: stockRows,
      });
    }

    const variantIds = stockRows.map((row) => row.variant_id);

    if (variantIds.length > 0) {
      await deleteFutureStocks({
        supabaseAdmin,
        supplierId,
        warehouseCode,
        variantIds,
      });
    }

    if (futureStockRows.length > 0) {
      await upsertFutureStocks({
        supabaseAdmin,
        rows: futureStockRows,
      });
    }

    const status = stockRows.length > 0 ? "success" : "partial_success";

    const errors =
      stockRows.length > 0
        ? []
        : [
            "Stocks recebidos da Stricker, mas nenhuma variante correspondente foi encontrada em product_variants.",
          ];

    await finishDatasetImport({
      supabaseAdmin,
      datasetImportId,
      status,
      recordsReceived: records.length,
      recordsImported: stockRows.length,
      recordsFailed: Math.max(records.length - stockRows.length, 0),
      rawPayload: {
        Count: payload.Count ?? records.length,
        Currency: payload.Currency ?? null,
        Language: payload.Language ?? params.lang,
        Country: params.country,
        sample: records.slice(0, 5),
      },
      errors,
    });

    return {
      dataset: "stocksByCountry",
      lang: params.lang,
      country: params.country,
      recordsReceived: records.length,
      variantsMatched: variants.length,
      stocksImported: stockRows.length,
      futureStocksImported: futureStockRows.length,
      datasetImportId,
    };
  } catch (error) {
    await finishDatasetImport({
      supabaseAdmin,
      datasetImportId,
      status: "failed",
      recordsReceived: 0,
      recordsImported: 0,
      recordsFailed: 1,
      rawPayload: {},
      errors: [
        error instanceof Error
          ? error.message
          : "Erro inesperado na sincronização REST de stocks.",
      ],
    });

    throw error;
  }
}