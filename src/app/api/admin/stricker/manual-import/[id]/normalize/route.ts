import { NextRequest, NextResponse } from "next/server";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizeManualImportDataset } from "@/lib/stricker/manual-import/normalizers";
import { type JsonRecord } from "@/lib/stricker/types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ManualImportFileRow = {
  id: string;
  supplier_id: string;
  dataset_import_id: string | null;
  dataset_name: string;
  storage_bucket: string;
  storage_path: string;
  file_extension: string;
};

type NormalizedRecordBase = JsonRecord & {
  external_id?: string;
  sku?: string;
  slug?: string;
  name?: string;
  code?: string;
  label?: string;
  supplier_payload?: JsonRecord;
};

function getRecordExternalId(record: NormalizedRecordBase, index: number): string {
  const externalId =
    typeof record.external_id === "string" && record.external_id.trim().length > 0
      ? record.external_id.trim()
      : null;

  const code =
    typeof record.code === "string" && record.code.trim().length > 0
      ? record.code.trim()
      : null;

  const sku =
    typeof record.sku === "string" && record.sku.trim().length > 0
      ? record.sku.trim()
      : null;

  return externalId ?? code ?? sku ?? `record-${index + 1}`;
}

function getNullableString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function buildNormalizedRow(params: {
  supplierId: string;
  datasetImportId: string | null;
  manualImportFileId: string;
  datasetName: string;
  record: NormalizedRecordBase;
  index: number;
}) {
  const {
    supplierId,
    datasetImportId,
    manualImportFileId,
    datasetName,
    record,
    index,
  } = params;

  const externalId = getRecordExternalId(record, index);

  const supplierPayload =
    record.supplier_payload &&
    typeof record.supplier_payload === "object" &&
    !Array.isArray(record.supplier_payload)
      ? record.supplier_payload
      : {};

  return {
    supplier_id: supplierId,
    dataset_import_id: datasetImportId,
    manual_import_file_id: manualImportFileId,
    dataset_name: datasetName,
    external_id: externalId,
    sku: getNullableString(record.sku),
    slug: getNullableString(record.slug),
    name: getNullableString(record.name) ?? getNullableString(record.label),
    normalized_payload: record,
    supplier_payload: supplierPayload,
    import_status: "normalized",
    error_message: null,
  };
}

export async function POST(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    await assertAdminAccess();

    const { id } = await context.params;
    const supabaseAdmin = createSupabaseAdminClient();

    const { data: manualFile, error: manualFileError } = await supabaseAdmin
      .from("supplier_manual_import_files")
      .select(
        [
          "id",
          "supplier_id",
          "dataset_import_id",
          "dataset_name",
          "storage_bucket",
          "storage_path",
          "file_extension",
        ].join(","),
      )
      .eq("id", id)
      .single<ManualImportFileRow>();

    if (manualFileError || !manualFile) {
      return NextResponse.json(
        {
          success: false,
          message:
            manualFileError?.message ??
            "Ficheiro de importação manual não encontrado.",
        },
        { status: 404 },
      );
    }

    const { data: downloadedFile, error: downloadError } =
      await supabaseAdmin.storage
        .from(manualFile.storage_bucket)
        .download(manualFile.storage_path);

    if (downloadError || !downloadedFile) {
      return NextResponse.json(
        {
          success: false,
          message:
            downloadError?.message ??
            "Não foi possível descarregar o ficheiro da Storage.",
        },
        { status: 500 },
      );
    }

    const content = await downloadedFile.text();

    const normalized = normalizeManualImportDataset({
      datasetName: manualFile.dataset_name,
      content,
      extension: manualFile.file_extension,
    });

    const rows = normalized.records.map((record, index) =>
      buildNormalizedRow({
        supplierId: manualFile.supplier_id,
        datasetImportId: manualFile.dataset_import_id,
        manualImportFileId: manualFile.id,
        datasetName: normalized.datasetName,
        record: record as NormalizedRecordBase,
        index,
      }),
    );

    if (rows.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from("supplier_normalized_import_records")
        .upsert(rows, {
          onConflict: "manual_import_file_id,dataset_name,external_id",
        });

      if (upsertError) {
        return NextResponse.json(
          {
            success: false,
            message: upsertError.message,
          },
          { status: 500 },
        );
      }
    }

    const normalizedPreview = {
      datasetName: normalized.datasetName,
      recordsDetected: rows.length,
      sample: rows.slice(0, 5).map((row) => row.normalized_payload),
    };

    const { error: updateManualFileError } = await supabaseAdmin
      .from("supplier_manual_import_files")
      .update({
        parser_status: "parsed",
        records_detected: rows.length,
        preview_payload: normalizedPreview,
        parser_errors: [],
      })
      .eq("id", manualFile.id);

    if (updateManualFileError) {
      return NextResponse.json(
        {
          success: false,
          message: updateManualFileError.message,
        },
        { status: 500 },
      );
    }

    if (manualFile.dataset_import_id) {
      const { error: updateDatasetImportError } = await supabaseAdmin
        .from("supplier_dataset_imports")
        .update({
          status: "success",
          records_imported: rows.length,
          records_failed: 0,
          raw_payload: normalizedPreview,
          errors: [],
          finished_at: new Date().toISOString(),
        })
        .eq("id", manualFile.dataset_import_id);

      if (updateDatasetImportError) {
        return NextResponse.json(
          {
            success: false,
            message: updateDatasetImportError.message,
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Ficheiro normalizado com sucesso.",
      dataset: normalized.datasetName,
      recordsNormalized: rows.length,
      sample: normalizedPreview.sample,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Erro inesperado na normalização manual.",
      },
      { status: 500 },
    );
  }
}