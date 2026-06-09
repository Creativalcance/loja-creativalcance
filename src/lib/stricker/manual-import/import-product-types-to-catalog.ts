import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { type JsonRecord } from "@/lib/stricker/types";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

type NormalizedImportRecordRow = {
  id: string;
  supplier_id: string;
  dataset_import_id: string | null;
  manual_import_file_id: string;
  dataset_name: string;
  external_id: string;
  normalized_payload: JsonRecord;
  supplier_payload: JsonRecord | null;
};

type ImportProductTypesToCatalogResult = {
  productTypesImported: number;
};

type SupplierCatalogCategoryUpsertRow = {
  supplier_id: string;
  external_id: string;
  parent_external_id: string | null;
  type_code: string | null;
  type_name: string | null;
  subtype_code: string | null;
  subtype_name: string | null;
  language: string;
  is_active: boolean;
  raw_payload: JsonRecord;
};

function createSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getString(record: JsonRecord, key: string): string | null {
  const value = record[key];

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function getBoolean(record: JsonRecord, key: string, fallback: boolean): boolean {
  const value = record[key];

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "1", "yes", "sim", "s"].includes(normalized)) {
      return true;
    }

    if (["false", "0", "no", "não", "nao", "n"].includes(normalized)) {
      return false;
    }
  }

  return fallback;
}

function buildExternalId(value: string): string {
  if (value.startsWith("type:")) {
    return value;
  }

  return `type:${value}`;
}

function buildProductTypeRows(
  records: NormalizedImportRecordRow[],
): SupplierCatalogCategoryUpsertRow[] {
  return records.map((record) => {
    const payload = record.normalized_payload;

    const code =
      getString(payload, "code") ??
      getString(payload, "type_code") ??
      getString(payload, "typeCode") ??
      record.external_id;

    const name =
      getString(payload, "name") ??
      getString(payload, "label") ??
      getString(payload, "type_name") ??
      getString(payload, "typeName") ??
      code;

    const externalId =
      getString(payload, "external_id") ??
      buildExternalId(code || createSlug(name));

    return {
      supplier_id: record.supplier_id,
      external_id: buildExternalId(externalId),
      parent_external_id: null,
      type_code: code,
      type_name: name,
      subtype_code: null,
      subtype_name: null,
      language: getString(payload, "language") ?? "PT",
      is_active: getBoolean(payload, "is_active", true),
      raw_payload:
        record.supplier_payload && typeof record.supplier_payload === "object"
          ? record.supplier_payload
          : payload,
    };
  });
}

async function fetchProductTypeRecords(params: {
  supabaseAdmin: SupabaseAdminClient;
  manualImportFileId: string;
}): Promise<NormalizedImportRecordRow[]> {
  const { data, error } = await params.supabaseAdmin
    .from("supplier_normalized_import_records")
    .select(
      [
        "id",
        "supplier_id",
        "dataset_import_id",
        "manual_import_file_id",
        "dataset_name",
        "external_id",
        "normalized_payload",
        "supplier_payload",
      ].join(","),
    )
    .eq("manual_import_file_id", params.manualImportFileId)
    .eq("dataset_name", "productTypes")
    .returns<NormalizedImportRecordRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function importProductTypesToCatalog(params: {
  manualImportFileId: string;
}): Promise<ImportProductTypesToCatalogResult> {
  const supabaseAdmin = createSupabaseAdminClient();

  const records = await fetchProductTypeRecords({
    supabaseAdmin,
    manualImportFileId: params.manualImportFileId,
  });

  if (records.length === 0) {
    return {
      productTypesImported: 0,
    };
  }

  const productTypeRows = buildProductTypeRows(records);

  const { error: upsertError } = await supabaseAdmin
    .from("supplier_catalog_categories")
    .upsert(productTypeRows, {
      onConflict: "supplier_id,external_id,language",
    });

  if (upsertError) {
    throw new Error(upsertError.message);
  }

  const recordIds = records.map((record) => record.id);

  const { error: updateRecordsError } = await supabaseAdmin
    .from("supplier_normalized_import_records")
    .update({
      import_status: "imported",
      error_message: null,
    })
    .in("id", recordIds);

  if (updateRecordsError) {
    throw new Error(updateRecordsError.message);
  }

  const datasetImportIds = Array.from(
    new Set(
      records
        .map((record) => record.dataset_import_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  if (datasetImportIds.length > 0) {
    const { error: updateImportsError } = await supabaseAdmin
      .from("supplier_dataset_imports")
      .update({
        status: "success",
        records_imported: productTypeRows.length,
        records_failed: 0,
        errors: [],
        finished_at: new Date().toISOString(),
      })
      .in("id", datasetImportIds);

    if (updateImportsError) {
      throw new Error(updateImportsError.message);
    }
  }

  return {
    productTypesImported: productTypeRows.length,
  };
}