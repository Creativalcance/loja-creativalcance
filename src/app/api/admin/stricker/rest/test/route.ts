import { NextRequest, NextResponse } from "next/server";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import {
  fetchStrickerDataset,
  getDefaultStrickerLanguage,
} from "@/lib/stricker/rest/client";
import { getValidStrickerSessionToken } from "@/lib/stricker/rest/session";
import {
  type StrickerCountry,
  type StrickerDatasetName,
  type StrickerDatasetResponse,
  type StrickerLanguage,
} from "@/lib/stricker/rest/types";

export const runtime = "nodejs";

const ALLOWED_DATASETS: StrickerDatasetName[] = [
  "productsTree",
  "products",
  "productTypes",
  "optionals",
  "optionalsPrice",
  "optionalsComplete",
  "customizationOptions",
  "customizationTables",
  "colors",
  "stocks",
  "stocksByCountry",
  "canceledProducts",
  "restrictedProducts",
  "printingSlas",
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

const ALLOWED_COUNTRIES: StrickerCountry[] = ["PT", "CZ"];

function isAllowedDataset(value: string): value is StrickerDatasetName {
  return ALLOWED_DATASETS.includes(value as StrickerDatasetName);
}

function isAllowedLanguage(value: string): value is StrickerLanguage {
  return ALLOWED_LANGUAGES.includes(value as StrickerLanguage);
}

function isAllowedCountry(value: string): value is StrickerCountry {
  return ALLOWED_COUNTRIES.includes(value as StrickerCountry);
}

function getDatasetRecords(payload: StrickerDatasetResponse): unknown[] {
  if (Array.isArray(payload.ProductsTree)) {
    return payload.ProductsTree;
  }

  if (Array.isArray(payload.Products)) {
    return payload.Products;
  }

  if (Array.isArray(payload.Types)) {
    return payload.Types;
  }

  if (Array.isArray(payload.Optionals)) {
    return payload.Optionals;
  }

  if (Array.isArray(payload.OptionalsPrice)) {
    return payload.OptionalsPrice;
  }

  if (Array.isArray(payload.OptionalsComplete)) {
    return payload.OptionalsComplete;
  }

  if (Array.isArray(payload.CustomizationOptions)) {
    return payload.CustomizationOptions;
  }

  if (Array.isArray(payload.CustomizationTables)) {
    return payload.CustomizationTables;
  }

  if (Array.isArray(payload.Colors)) {
    return payload.Colors;
  }

  if (Array.isArray(payload.Stocks)) {
    return payload.Stocks;
  }

  if (Array.isArray(payload.CanceledProducts)) {
    return payload.CanceledProducts;
  }

  if (Array.isArray(payload.RestrictedProducts)) {
    return payload.RestrictedProducts;
  }

  if (Array.isArray(payload.PrintingSlas)) {
    return payload.PrintingSlas;
  }

  return [];
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await assertAdminAccess();

    const searchParams = request.nextUrl.searchParams;

    const datasetRaw = searchParams.get("dataset") ?? "productTypes";
    const langRaw = searchParams.get("lang") ?? getDefaultStrickerLanguage();
    const countryRaw = searchParams.get("country") ?? "PT";

    if (!isAllowedDataset(datasetRaw)) {
      return NextResponse.json(
        {
          success: false,
          message: "Dataset do fornecedor inválido.",
        },
        { status: 400 },
      );
    }

    if (!isAllowedLanguage(langRaw)) {
      return NextResponse.json(
        {
          success: false,
          message: "Idioma do fornecedor inválido.",
        },
        { status: 400 },
      );
    }

    if (!isAllowedCountry(countryRaw)) {
      return NextResponse.json(
        {
          success: false,
          message: "País do fornecedor inválido.",
        },
        { status: 400 },
      );
    }

    const token = await getValidStrickerSessionToken();

    const payload = await fetchStrickerDataset(
      {
        dataset: datasetRaw,
        token,
        lang: langRaw,
        country: countryRaw,
      },
      {
        timeoutMs: 180_000,
      },
    );

    const records = getDatasetRecords(payload);

    return NextResponse.json({
      success: true,
      message: "Ligação REST ao fornecedor testada com sucesso.",
      dataset: datasetRaw,
      lang: langRaw,
      country: datasetRaw === "stocksByCountry" ? countryRaw : null,
      count: payload.Count ?? records.length,
      currency: payload.Currency ?? null,
      language: payload.Language ?? null,
      sample: records.slice(0, 3),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Erro inesperado no teste REST do fornecedor.",
      },
      { status: 500 },
    );
  }
}
