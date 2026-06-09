import { NextRequest, NextResponse } from "next/server";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { getDefaultStrickerLanguage } from "@/lib/stricker/rest/client";
import { syncRestCatalogDataset } from "@/lib/stricker/rest/sync-catalog-datasets";
import {
  type StrickerDatasetName,
  type StrickerLanguage,
} from "@/lib/stricker/rest/types";

export const runtime = "nodejs";

type SyncableRestCatalogDataset = Extract<
  StrickerDatasetName,
  "colors" | "productTypes"
>;

const ALLOWED_DATASETS: SyncableRestCatalogDataset[] = [
  "colors",
  "productTypes",
];

const ALLOWED_LANGUAGES: StrickerLanguage[] = [
  "BG",
  "CZ",
  "DE",
  "DK",
  "EN",
  "ES",
  "FI",
  "FR",
  "GR",
  "HR",
  "HU",
  "IT",
  "NL",
  "NO",
  "PL",
  "PT",
  "RO",
  "RS",
  "RU",
  "SE",
  "SK",
  "UA",
];

function isAllowedDataset(value: string): value is SyncableRestCatalogDataset {
  return ALLOWED_DATASETS.includes(value as SyncableRestCatalogDataset);
}

function isAllowedLanguage(value: string): value is StrickerLanguage {
  return ALLOWED_LANGUAGES.includes(value as StrickerLanguage);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await assertAdminAccess();

    const body = (await request.json().catch(() => ({}))) as {
      dataset?: unknown;
      lang?: unknown;
    };

    const datasetRaw =
      typeof body.dataset === "string" ? body.dataset : "productTypes";

    const langRaw =
      typeof body.lang === "string" ? body.lang : getDefaultStrickerLanguage();

    if (!isAllowedDataset(datasetRaw)) {
      return NextResponse.json(
        {
          success: false,
          message: "Dataset não suportado para sincronização REST de catálogo.",
        },
        { status: 400 },
      );
    }

    if (!isAllowedLanguage(langRaw)) {
      return NextResponse.json(
        {
          success: false,
          message: "Idioma Stricker inválido.",
        },
        { status: 400 },
      );
    }

    const result = await syncRestCatalogDataset({
      dataset: datasetRaw,
      lang: langRaw,
    });

    return NextResponse.json({
      success: true,
      message: "Dataset Stricker sincronizado com o catálogo.",
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Erro inesperado na sincronização REST de catálogo.",
      },
      { status: 500 },
    );
  }
}