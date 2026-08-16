import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStrickerSupplierId } from "@/lib/stricker/auth";
import { hasSupplierPayloadChanged } from "@/lib/stricker/change-detection";
import { fetchStrickerDataset } from "@/lib/stricker/rest/client";
import { getValidStrickerSessionToken } from "@/lib/stricker/rest/session";
import { type JsonRecord } from "@/lib/stricker/types";
import { assertSyncNotCancelled } from "@/lib/stricker/sync-control";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

type CommercialDataset = "canceledProducts" | "restrictedProducts";

type StrickerCommercialRecord = {
  ProdReference?: unknown;
  ProductReference?: unknown;
  Reference?: unknown;
  Product?: unknown;
  ProductId?: unknown;
  Sku?: unknown;
  SKU?: unknown;
  WebSku?: unknown;
  Country?: unknown;
  CountryCode?: unknown;
  Reason?: unknown;
  Description?: unknown;
  CanceledAt?: unknown;
  CancelledAt?: unknown;
  Date?: unknown;
};

type DatasetImportRow = {
  id: string;
};

type ReconciliationRow = {
  products_total: number;
  products_purchasable: number;
  products_coming_soon: number;
  products_unavailable: number;
  products_restricted: number;
  products_canceled: number;
};

type CommercialSyncRow = {
  supplier_id: string;
  external_product_id: string;
  product_reference: string;
  sku: string | null;
  country_code?: string;
  canceled_at?: string | null;
  reason: string | null;
  raw_payload: JsonRecord;
};

type ExistingCommercialRow = CommercialSyncRow & {
  id: string;
};

export type SyncCommercialDatasetResult = {
  dataset: CommercialDataset;
  recordsReceived: number;
  recordsImported: number;
  datasetImportId: string;
};

export type ReconcileCommercialAvailabilityResult = {
  productsTotal: number;
  productsPurchasable: number;
  productsComingSoon: number;
  productsUnavailable: number;
  productsRestricted: number;
  productsCanceled: number;
};

const INSERT_CHUNK_SIZE = 250;

function chunkArray<TValue>(values: TValue[], size: number): TValue[][] {
  const chunks: TValue[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

function getNullableString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return null;
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

  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

async function createDatasetImport(params: {
  supabaseAdmin: SupabaseAdminClient;
  supplierId: string;
  dataset: CommercialDataset;
}): Promise<string> {
  const { data, error } = await params.supabaseAdmin
    .from("supplier_dataset_imports")
    .insert({
      supplier_id: params.supplierId,
      dataset_name: params.dataset,
      language: null,
      country: params.dataset === "restrictedProducts" ? "PT" : null,
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
    .single<DatasetImportRow>();

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
  status: "success" | "failed";
  recordsReceived: number;
  recordsImported: number;
  errors: string[];
}): Promise<void> {
  const { error } = await params.supabaseAdmin
    .from("supplier_dataset_imports")
    .update({
      status: params.status,
      records_received: params.recordsReceived,
      records_imported: params.recordsImported,
      records_failed: params.status === "failed" ? 1 : 0,
      errors: params.errors,
      finished_at: new Date().toISOString(),
    })
    .eq("id", params.datasetImportId)
    .eq("status", "running");

  if (error) {
    throw new Error(error.message);
  }
}

function getRecords(
  dataset: CommercialDataset,
  payload: {
    CanceledProducts?: unknown[];
    RestrictedProducts?: unknown[];
  },
): StrickerCommercialRecord[] {
  const records =
    dataset === "canceledProducts"
      ? payload.CanceledProducts
      : payload.RestrictedProducts;

  return Array.isArray(records)
    ? (records as StrickerCommercialRecord[])
    : [];
}

function buildCanceledRows(params: {
  supplierId: string;
  records: StrickerCommercialRecord[];
}) {
  return params.records.flatMap((record) => {
    const reference = getNullableString(
      record.ProdReference,
      record.ProductReference,
      record.Reference,
      record.Product,
      record.ProductId,
    );

    if (!reference) {
      return [];
    }

    return [{
      supplier_id: params.supplierId,
      external_product_id: reference,
      product_reference: reference,
      sku: getNullableString(record.WebSku, record.Sku, record.SKU),
      canceled_at: normalizeDate(
        record.CanceledAt ?? record.CancelledAt ?? record.Date,
      ),
      reason: getNullableString(record.Reason, record.Description),
      raw_payload: toJsonRecord(record),
    }];
  });
}

function buildRestrictedRows(params: {
  supplierId: string;
  records: StrickerCommercialRecord[];
}) {
  return params.records.flatMap((record) => {
    const reference = getNullableString(
      record.ProdReference,
      record.ProductReference,
      record.Reference,
      record.Product,
      record.ProductId,
    );

    if (!reference) {
      return [];
    }

    return [{
      supplier_id: params.supplierId,
      external_product_id: reference,
      product_reference: reference,
      sku: getNullableString(record.WebSku, record.Sku, record.SKU),
      country_code:
        getNullableString(record.CountryCode, record.Country)?.toUpperCase() ??
        "PT",
      reason: getNullableString(record.Reason, record.Description),
      raw_payload: toJsonRecord(record),
    }];
  });
}

function commercialRowKey(
  dataset: CommercialDataset,
  row: Pick<CommercialSyncRow, "product_reference" | "sku" | "country_code">,
): string {
  return [
    row.product_reference,
    row.sku ?? "",
    dataset === "restrictedProducts" ? row.country_code ?? "PT" : "",
  ].join(":");
}

async function synchronizeCommercialRows(params: {
  supabaseAdmin: SupabaseAdminClient;
  supplierId: string;
  dataset: CommercialDataset;
  rows: CommercialSyncRow[];
}): Promise<{ changed: number; removed: number; unchanged: number }> {
  const table =
    params.dataset === "canceledProducts"
      ? "supplier_canceled_products"
      : "supplier_restricted_products";
  const selectColumns =
    params.dataset === "canceledProducts"
      ? "id,supplier_id,external_product_id,product_reference,sku,canceled_at,reason,raw_payload"
      : "id,supplier_id,external_product_id,product_reference,sku,country_code,reason,raw_payload";

  const { data, error } = await params.supabaseAdmin
    .from(table)
    .select(selectColumns)
    .eq("supplier_id", params.supplierId)
    .returns<ExistingCommercialRow[]>();

  if (error) throw new Error(error.message);

  const existingRows = data ?? [];
  const existingByKey = new Map(
    existingRows.map((row) => [commercialRowKey(params.dataset, row), row]),
  );
  const incomingKeys = new Set(
    params.rows.map((row) => commercialRowKey(params.dataset, row)),
  );
  const rowsToInsert: CommercialSyncRow[] = [];
  const rowsToUpdate: Array<{ id: string; row: CommercialSyncRow }> = [];
  let unchanged = 0;

  for (const row of params.rows) {
    const current = existingByKey.get(commercialRowKey(params.dataset, row));

    if (!current) {
      rowsToInsert.push(row);
    } else if (hasSupplierPayloadChanged(current.raw_payload, row.raw_payload)) {
      rowsToUpdate.push({ id: current.id, row });
    } else {
      unchanged += 1;
    }
  }

  for (const rowChunk of chunkArray(rowsToInsert, INSERT_CHUNK_SIZE)) {
    const { error: insertError } = await params.supabaseAdmin
      .from(table)
      .insert(rowChunk);
    if (insertError) throw new Error(insertError.message);
  }

  for (const item of rowsToUpdate) {
    const { error: updateError } = await params.supabaseAdmin
      .from(table)
      .update(item.row)
      .eq("id", item.id);
    if (updateError) throw new Error(updateError.message);
  }

  const removedIds = existingRows
    .filter((row) => !incomingKeys.has(commercialRowKey(params.dataset, row)))
    .map((row) => row.id);

  for (const idChunk of chunkArray(removedIds, INSERT_CHUNK_SIZE)) {
    const { error: deleteError } = await params.supabaseAdmin
      .from(table)
      .delete()
      .in("id", idChunk);
    if (deleteError) throw new Error(deleteError.message);
  }

  return {
    changed: rowsToInsert.length + rowsToUpdate.length,
    removed: removedIds.length,
    unchanged,
  };
}

export async function syncCommercialDataset(params: {
  dataset: CommercialDataset;
}): Promise<SyncCommercialDatasetResult> {
  const supabaseAdmin = createSupabaseAdminClient();
  const supplierId = await getStrickerSupplierId();
  const datasetImportId = await createDatasetImport({
    supabaseAdmin,
    supplierId,
    dataset: params.dataset,
  });

  try {
    const token = await getValidStrickerSessionToken();
    const payload = await fetchStrickerDataset(
      {
        dataset: params.dataset,
        token,
      },
      {
        timeoutMs: 180_000,
      },
    );

    await assertSyncNotCancelled({ supabaseAdmin, datasetImportId });

    const records = getRecords(params.dataset, payload);
    const expectedRecordCount = Number(payload.Count);

    if (
      Number.isFinite(expectedRecordCount) &&
      expectedRecordCount > records.length
    ) {
      throw new Error(
        `O dataset ${params.dataset} chegou incompleto (${records.length}/${expectedRecordCount}). Os dados existentes foram preservados.`,
      );
    }

    const rows: CommercialSyncRow[] =
      params.dataset === "canceledProducts"
        ? buildCanceledRows({ supplierId, records })
        : buildRestrictedRows({ supplierId, records });
    const synchronization = await synchronizeCommercialRows({
      supabaseAdmin,
      supplierId,
      dataset: params.dataset,
      rows,
    });
    const recordsImported = synchronization.changed;

    await assertSyncNotCancelled({ supabaseAdmin, datasetImportId });
    await finishDatasetImport({
      supabaseAdmin,
      datasetImportId,
      status: "success",
      recordsReceived: records.length,
      recordsImported,
      errors: [],
    });

    return {
      dataset: params.dataset,
      recordsReceived: records.length,
      recordsImported,
      datasetImportId,
    };
  } catch (error) {
    await finishDatasetImport({
      supabaseAdmin,
      datasetImportId,
      status: "failed",
      recordsReceived: 0,
      recordsImported: 0,
      errors: [
        error instanceof Error
          ? error.message
          : "Erro inesperado na sincronização da disponibilidade comercial.",
      ],
    });

    throw error;
  }
}

export async function reconcileCommercialAvailability(): Promise<ReconcileCommercialAvailabilityResult> {
  const supabaseAdmin = createSupabaseAdminClient();
  const supplierId = await getStrickerSupplierId();

  const { data, error } = await supabaseAdmin.rpc(
    "reconcile_stricker_commercial_availability",
    {
      target_supplier_id: supplierId,
      target_country_code: "PT",
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | ReconciliationRow
    | null;

  return {
    productsTotal: Number(row?.products_total ?? 0),
    productsPurchasable: Number(row?.products_purchasable ?? 0),
    productsComingSoon: Number(row?.products_coming_soon ?? 0),
    productsUnavailable: Number(row?.products_unavailable ?? 0),
    productsRestricted: Number(row?.products_restricted ?? 0),
    productsCanceled: Number(row?.products_canceled ?? 0),
  };
}
