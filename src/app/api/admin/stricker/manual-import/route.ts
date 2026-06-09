import { NextRequest, NextResponse } from "next/server";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStrickerSupplierId } from "@/lib/stricker/auth";
import { parseCsvPreview } from "@/lib/stricker/manual-import/csv-parser";
import { parseXmlPreview } from "@/lib/stricker/manual-import/xml-parser";
import {
  type ManualImportPreview,
  type StrickerManualDatasetName,
} from "@/lib/stricker/manual-import/types";

export const runtime = "nodejs";

const ALLOWED_EXTENSIONS = ["xml", "csv"];
const STORAGE_BUCKET = "supplier-imports";

function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

function isAllowedDataset(
  value: string,
): value is StrickerManualDatasetName {
  return [
    "products",
    "productsTree",
    "optionals",
    "optionalsPrice",
    "optionalsComplete",
    "customizationOptions",
    "customizationTables",
    "stocks",
    "colors",
    "productTypes",
    "catalogPrices",
    "canceledProducts",
    "restrictedProducts",
  ].includes(value);
}

function parsePreview(content: string, extension: string): ManualImportPreview {
  if (extension === "csv") {
    return parseCsvPreview(content);
  }

  if (extension === "xml") {
    return parseXmlPreview(content);
  }

  return {
    recordsDetected: 0,
    previewPayload: {},
    errors: [`Extensão não suportada: ${extension}`],
  };
}

function sanitizeFilename(filename: string): string {
  return filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await assertAdminAccess();

    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Sessão inválida.",
        },
        { status: 401 },
      );
    }

    const formData = await request.formData();

    const datasetNameRaw = String(formData.get("datasetName") ?? "");
    const file = formData.get("file");

    if (!isAllowedDataset(datasetNameRaw)) {
      return NextResponse.json(
        {
          success: false,
          message: "Dataset inválido.",
        },
        { status: 400 },
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          message: "Ficheiro em falta.",
        },
        { status: 400 },
      );
    }

    const extension = getFileExtension(file.name);

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return NextResponse.json(
        {
          success: false,
          message: "Formato inválido. Apenas XML e CSV são suportados.",
        },
        { status: 400 },
      );
    }

    const supplierId = await getStrickerSupplierId();
    const supabaseAdmin = createSupabaseAdminClient();

    const fileContent = await file.text();
    const preview = parsePreview(fileContent, extension);

    const safeFilename = sanitizeFilename(file.name);
    const storagePath = `stricker/${datasetNameRaw}/${Date.now()}-${safeFilename}`;

    const fileBuffer = Buffer.from(fileContent, "utf-8");

    const { error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: file.type || "text/plain",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        {
          success: false,
          message: uploadError.message,
        },
        { status: 500 },
      );
    }

    const { data: datasetImport, error: datasetImportError } =
      await supabaseAdmin
        .from("supplier_dataset_imports")
        .insert({
          supplier_id: supplierId,
          dataset_name: datasetNameRaw,
          language: null,
          country: null,
          extension,
          status: preview.errors.length > 0 ? "partial_success" : "success",
          records_received: preview.recordsDetected,
          records_imported: 0,
          records_failed: preview.errors.length,
          source_url: storagePath,
          raw_payload: preview.previewPayload,
          errors: preview.errors,
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
        })
        .select("id")
        .single<{ id: string }>();

    if (datasetImportError || !datasetImport) {
      return NextResponse.json(
        {
          success: false,
          message:
            datasetImportError?.message ??
            "Não foi possível criar o registo de importação.",
        },
        { status: 500 },
      );
    }

    const { error: manualFileError } = await supabaseAdmin
      .from("supplier_manual_import_files")
      .insert({
        supplier_id: supplierId,
        dataset_import_id: datasetImport.id,
        dataset_name: datasetNameRaw,
        original_filename: file.name,
        storage_bucket: STORAGE_BUCKET,
        storage_path: storagePath,
        mime_type: file.type || null,
        file_size_bytes: file.size,
        file_extension: extension,
        parser_status: preview.errors.length > 0 ? "failed" : "parsed",
        records_detected: preview.recordsDetected,
        preview_payload: preview.previewPayload,
        parser_errors: preview.errors,
        created_by: user.id,
      });

    if (manualFileError) {
      return NextResponse.json(
        {
          success: false,
          message: manualFileError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: preview.errors.length === 0,
      message:
        preview.errors.length === 0
          ? "Ficheiro carregado e analisado com sucesso."
          : "Ficheiro carregado, mas foram detectados avisos/erros no parser.",
      dataset: datasetNameRaw,
      extension,
      storagePath,
      recordsDetected: preview.recordsDetected,
      previewPayload: preview.previewPayload,
      errors: preview.errors,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Erro inesperado na importação manual.",
      },
      { status: 500 },
    );
  }
}