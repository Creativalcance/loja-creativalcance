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
    await getValidStrickerSessionToken();

    return {
      success: true,
      message: "Autenticação REST Stricker validada com sucesso.",
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

    const [rest, directDownload] = await Promise.all([
      testRestAuthentication(),
      testDirectDownload(),
    ]);
    const success = rest.success && directDownload.success;

    return NextResponse.json({
      success,
      message:
        success
          ? "Todas as vias de ligação Stricker foram validadas."
          : "Uma ou mais vias de ligação Stricker falharam.",
      rest,
      direct_download: directDownload,
      recommendation:
        rest.success && !directDownload.success
          ? "A autenticação REST funciona; confirme a AccessKey do direct download."
          : !rest.success && directDownload.success
            ? "O direct download funciona; confirme as credenciais da autenticação REST."
            : !success
              ? "Confirme as credenciais e a configuração das duas vias Stricker."
              : "As duas vias estão operacionais.",
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