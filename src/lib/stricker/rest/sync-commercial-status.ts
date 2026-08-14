import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStrickerSupplierId } from "@/lib/stricker/auth";
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
      records_failed: Math.max(
        params.recordsReceived - params.recordsImported,
        params.status === "failed" ? 1 : 0,
      ),
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
    let recordsImported = 0;

    if (params.dataset === "canceledProducts") {
      const rows = buildCanceledRows({ supplierId, records });
      const { error: deleteError } = await supabaseAdmin
        .from("supplier_canceled_products")
        .delete()
        .eq("supplier_id", supplierId);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      for (const rowChunk of chunkArray(rows, INSERT_CHUNK_SIZE)) {
        const { error: insertError } = await supabaseAdmin
          .from("supplier_canceled_products")
          .insert(rowChunk);

        if (insertError) {
          throw new Error(insertError.message);
        }
      }

      recordsImported = rows.length;
    } else {
      const rows = buildRestrictedRows({ supplierId, records });
      const { error: deleteError } = await supabaseAdmin
        .from("supplier_restricted_products")
        .delete()
        .eq("supplier_id", supplierId);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      for (const rowChunk of chunkArray(rows, INSERT_CHUNK_SIZE)) {
        const { error: insertError } = await supabaseAdmin
          .from("supplier_restricted_products")
          .insert(rowChunk);

        if (insertError) {
          throw new Error(insertError.message);
        }
      }

      recordsImported = rows.length;
    }

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
