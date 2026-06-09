import { NextResponse } from "next/server";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStrickerConfig } from "@/lib/stricker/config";
import { getStrickerSupplierId } from "@/lib/stricker/auth";
import {
  downloadStrickerDataset,
  extractDatasetRecords,
} from "@/lib/stricker/download-client";
import { normalizeStrickerColor } from "@/lib/stricker/normalizers/colors";

export const runtime = "nodejs";

export async function POST(): Promise<NextResponse> {
  const supabaseAdmin = createSupabaseAdminClient();

  try {
    await assertAdminAccess();

    const config = getStrickerConfig();
    const supplierId = await getStrickerSupplierId();
    const startedAt = new Date().toISOString();

    const { data: importRecord, error: importCreateError } = await supabaseAdmin
      .from("supplier_dataset_imports")
      .insert({
        supplier_id: supplierId,
        dataset_name: "colors",
        language: config.defaultLanguage,
        extension: "json",
        status: "running",
        started_at: startedAt,
      })
      .select("id")
      .single<{ id: string }>();

    if (importCreateError || !importRecord) {
      throw new Error(
        importCreateError?.message ?? "Não foi possível criar registo de importação.",
      );
    }

    const downloadResult = await downloadStrickerDataset({
      datasetName: "colors",
      lang: config.defaultLanguage,
      extension: "json",
    });

    const records = extractDatasetRecords(downloadResult.payload, [
      "Colors",
      "colors",
      "Colours",
      "colours",
      "Data",
      "data",
      "Items",
      "items",
    ]);

    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const [index, record] of records.entries()) {
      try {
        const normalizedColor = normalizeStrickerColor(record, index);

        const { error } = await supabaseAdmin.from("supplier_colors").upsert(
          {
            supplier_id: supplierId,
            external_id: normalizedColor.external_id,
            code: normalizedColor.code,
            name: normalizedColor.name,
            hex_code: normalizedColor.hex_code,
            language: config.defaultLanguage,
            is_active: true,
            raw_payload: normalizedColor.raw_payload,
          },
          {
            onConflict: "supplier_id,external_id,language",
          },
        );

        if (error) {
          throw new Error(error.message);
        }

        imported += 1;
      } catch (error) {
        failed += 1;
        errors.push(
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao importar cor.",
        );
      }
    }

    const status =
      failed === 0 ? "success" : imported > 0 ? "partial_success" : "failed";

    await supabaseAdmin
      .from("supplier_dataset_imports")
      .update({
        status,
        records_received: records.length,
        records_imported: imported,
        records_failed: failed,
        source_url: downloadResult.url.replace(config.accessKey, "***"),
        payload_hash: downloadResult.payloadHash,
        raw_payload: downloadResult.payload,
        errors,
        finished_at: new Date().toISOString(),
      })
      .eq("id", importRecord.id);

    return NextResponse.json({
      success: failed === 0,
      dataset: "colors",
      language: config.defaultLanguage,
      received: records.length,
      imported,
      failed,
      errors,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao importar cores Stricker.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    message:
      "Endpoint activo. Usa POST /api/admin/stricker/import/colors para importar cores.",
  });
}