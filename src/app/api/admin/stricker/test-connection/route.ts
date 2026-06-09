import { NextResponse } from "next/server";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { getValidStrickerSessionToken } from "@/lib/stricker/auth";
import {
  downloadStrickerDataset,
  extractDatasetRecords,
} from "@/lib/stricker/download-client";
import { getStrickerConfig } from "@/lib/stricker/config";

export const runtime = "nodejs";

type TestResult = {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
};

async function testRestAuthentication(): Promise<TestResult> {
  try {
    const token = await getValidStrickerSessionToken();

    return {
      success: true,
      message: "Autenticação REST Stricker validada com sucesso.",
      details: {
        token_preview: `${token.slice(0, 6)}...${token.slice(-6)}`,
      },
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Erro inesperado na autenticação REST Stricker.",
    };
  }
}

async function testDirectDownload(): Promise<TestResult> {
  try {
    const config = getStrickerConfig();

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

    return {
      success: true,
      message: "Direct download Stricker validado com sucesso.",
      details: {
        dataset: "colors",
        language: config.defaultLanguage,
        records_detected: records.length,
        source_url: downloadResult.url.replace(config.accessKey, "***"),
        payload_hash: downloadResult.payloadHash,
      },
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Erro inesperado no direct download Stricker.",
    };
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    await assertAdminAccess();

    const rest = await testRestAuthentication();
    const directDownload = await testDirectDownload();

    return NextResponse.json({
      success: rest.success || directDownload.success,
      message:
        rest.success || directDownload.success
          ? "Ligação Stricker testada."
          : "Não foi possível validar nenhuma via de ligação Stricker.",
      rest,
      direct_download: directDownload,
      recommendation: directDownload.success
        ? "Usar direct download para importação de catálogo."
        : "Confirmar AccessKey com a Stricker.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao testar ligação Stricker.",
      },
      {
        status: 500,
      },
    );
  }
}