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

type ImportColorsToCatalogResult = {
  colorsImported: number;
};

type SupplierColorUpsertRow = {
  supplier_id: string;
  external_id: string;
  code: string;
  name: string;
  hex_code: string | null;
  language: string;
  is_active: boolean;
  raw_payload: JsonRecord;
};

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

function buildColorRows(
  records: NormalizedImportRecordRow[],
): SupplierColorUpsertRow[] {
  return records.map((record) => {
    const payload = record.normalized_payload;

    const externalId =
      getString(payload, "external_id") ??
      getString(payload, "code") ??
      record.external_id;

    const code = getString(payload, "code") ?? externalId;
    const name =
      getString(payload, "name") ??
      getString(payload, "label") ??
      getString(payload, "description") ??
      code;

    return {
      supplier_id: record.supplier_id,
      external_id: externalId,
      code,
      name,
      hex_code:
        getString(payload, "hex_code") ??
        getString(payload, "hex") ??
        getString(payload, "hexCode"),
      language: getString(payload, "language") ?? "PT",
      is_active: getBoolean(payload, "is_active", true),
      raw_payload:
        record.supplier_payload && typeof record.supplier_payload === "object"
          ? record.supplier_payload
          : payload,
    };
  });
}

async function fetchColorRecords(params: {
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
    .eq("dataset_name", "colors")
    .returns<NormalizedImportRecordRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function importColorsToCatalog(params: {
  manualImportFileId: string;
}): Promise<ImportColorsToCatalogResult> {
  const supabaseAdmin = createSupabaseAdminClient();

  const records = await fetchColorRecords({
    supabaseAdmin,
    manualImportFileId: params.manualImportFileId,
  });

  if (records.length === 0) {
    return {
      colorsImported: 0,
    };
  }

  const colorRows = buildColorRows(records);

  const { error: upsertError } = await supabaseAdmin
    .from("supplier_colors")
    .upsert(colorRows, {
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
        records_imported: colorRows.length,
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
    colorsImported: colorRows.length,
  };
}