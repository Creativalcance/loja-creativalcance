import { NextRequest, NextResponse } from "next/server";
import { assertAdminAccess } from "../../../../../../../lib/auth/assert-admin";
import { createSupabaseAdminClient } from "../../../../../../../lib/supabase/admin";
import { normalizeManualColors } from "../../../../../../../lib/stricker/manual-import/normalizers/colors";
import { normalizeManualProductTypes } from "../../../../../../../lib/stricker/manual-import/normalizers/product-types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ManualImportFile = {
  id: string;
  supplier_id: string;
  dataset_import_id: string | null;
  dataset_name: string;
  storage_bucket: string;
  storage_path: string;
  file_extension: string;
};

async function getImportFile(id: string): Promise<ManualImportFile> {
  const supabaseAdmin = createSupabaseAdminClient();

  const { data, error } = await supabaseAdmin
    .from("supplier_manual_import_files")
    .select(
      `
        id,
        supplier_id,
        dataset_import_id,
        dataset_name,
        storage_bucket,
        storage_path,
        file_extension
      `,
    )
    .eq("id", id)
    .maybeSingle<ManualImportFile>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Ficheiro de importação não encontrado.");
  }

  return data;
}

async function downloadImportContent(file: ManualImportFile): Promise<string> {
  const supabaseAdmin = createSupabaseAdminClient();

  const { data, error } = await supabaseAdmin.storage
    .from(file.storage_bucket)
    .download(file.storage_path);

  if (error) {
    throw new Error(error.message);
  }

  return data.text();
}

async function normalizeColors(params: {
  supplierId: string;
  datasetImportId: string | null;
  fileId: string;
  content: string;
  extension: string;
}): Promise<{
  imported: number;
  failed: number;
  errors: string[];
}> {
  const supabaseAdmin = createSupabaseAdminClient();
  const colors = normalizeManualColors(params.content, params.extension);

  let imported = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const color of colors) {
    const { error } = await supabaseAdmin.from("supplier_colors").upsert(
      {
        supplier_id: params.supplierId,
        external_id: color.external_id,
        code: color.code,
        name: color.name,
        hex_code: color.hex_code,
        language: "PT",
        is_active: true,
        raw_payload: {
          ...color.raw_payload,
          manual_import_file_id: params.fileId,
          dataset_import_id: params.datasetImportId,
        },
      },
      {
        onConflict: "supplier_id,external_id,language",
      },
    );

    if (error) {
      failed += 1;
      errors.push(error.message);
    } else {
      imported += 1;
    }
  }

  return {
    imported,
    failed,
    errors,
  };
}

async function normalizeProductTypes(params: {
  supplierId: string;
  datasetImportId: string | null;
  fileId: string;
  content: string;
  extension: string;
}): Promise<{
  imported: number;
  failed: number;
  errors: string[];
}> {
  const supabaseAdmin = createSupabaseAdminClient();
  const productTypes = normalizeManualProductTypes(
    params.content,
    params.extension,
  );

  let imported = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const productType of productTypes) {
    const { error } = await supabaseAdmin
      .from("supplier_catalog_categories")
      .upsert(
        {
          supplier_id: params.supplierId,
          external_id: productType.external_id,
          parent_external_id: productType.parent_external_id,
          type_code: productType.type_code,
          type_name: productType.type_name,
          subtype_code: productType.subtype_code,
          subtype_name: productType.subtype_name,
          language: "PT",
          is_active: true,
          raw_payload: {
            ...productType.raw_payload,
            manual_import_file_id: params.fileId,
            dataset_import_id: params.datasetImportId,
          },
        },
        {
          onConflict: "supplier_id,external_id,language",
        },
      );

    if (error) {
      failed += 1;
      errors.push(error.message);
    } else {
      imported += 1;
    }
  }

  return {
    imported,
    failed,
    errors,
  };
}

export async function POST(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    await assertAdminAccess();

    const { id } = await context.params;
    const file = await getImportFile(id);
    const content = await downloadImportContent(file);

    let result: {
      imported: number;
      failed: number;
      errors: string[];
    } | null = null;

    if (file.dataset_name === "colors") {
      result = await normalizeColors({
        supplierId: file.supplier_id,
        datasetImportId: file.dataset_import_id,
        fileId: file.id,
        content,
        extension: file.file_extension,
      });
    }

    if (file.dataset_name === "productTypes") {
      result = await normalizeProductTypes({
        supplierId: file.supplier_id,
        datasetImportId: file.dataset_import_id,
        fileId: file.id,
        content,
        extension: file.file_extension,
      });
    }

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Este dataset ainda não tem normalização activa. Para já estão activos: colors e productTypes.",
        },
        { status: 400 },
      );
    }

    const status =
      result.failed === 0
        ? "success"
        : result.imported > 0
          ? "partial_success"
          : "failed";

    const supabaseAdmin = createSupabaseAdminClient();

    await supabaseAdmin
      .from("supplier_manual_import_files")
      .update({
        parser_status: status === "failed" ? "failed" : "parsed",
        records_detected: result.imported + result.failed,
        parser_errors: result.errors,
      })
      .eq("id", file.id);

    if (file.dataset_import_id) {
      await supabaseAdmin
        .from("supplier_dataset_imports")
        .update({
          status,
          records_imported: result.imported,
          records_failed: result.failed,
          errors: result.errors,
          finished_at: new Date().toISOString(),
        })
        .eq("id", file.dataset_import_id);
    }

    return NextResponse.json({
      success: result.failed === 0,
      message:
        result.failed === 0
          ? "Normalização concluída com sucesso."
          : "Normalização concluída com erros.",
      dataset: file.dataset_name,
      imported: result.imported,
      failed: result.failed,
      errors: result.errors,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao normalizar importação manual.",
      },
      { status: 500 },
    );
  }
}