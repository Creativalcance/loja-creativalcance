import { NextRequest, NextResponse } from "next/server";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { getDefaultStrickerLanguage } from "@/lib/stricker/rest/client";
import { syncRestStocksByCountry } from "@/lib/stricker/rest/sync-stocks-by-country";
import {
  type StrickerCountry,
  type StrickerLanguage,
} from "@/lib/stricker/rest/types";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

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

function isAllowedLanguage(value: string): value is StrickerLanguage {
  return ALLOWED_LANGUAGES.includes(value as StrickerLanguage);
}

function isAllowedCountry(value: string): value is StrickerCountry {
  return ALLOWED_COUNTRIES.includes(value as StrickerCountry);
}

function normalizeLanguage(value: unknown): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim().toUpperCase();
  }

  return getDefaultStrickerLanguage();
}

function normalizeCountry(value: unknown): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim().toUpperCase();
  }

  return "PT";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await assertAdminAccess();

    const body = (await request.json().catch(() => ({}))) as {
      lang?: unknown;
      country?: unknown;
    };

    const langRaw = normalizeLanguage(body.lang);
    const countryRaw = normalizeCountry(body.country);

    if (!isAllowedLanguage(langRaw)) {
      return NextResponse.json(
        {
          success: false,
          message: "Idioma Stricker inválido.",
        },
        { status: 400 },
      );
    }

    if (!isAllowedCountry(countryRaw)) {
      return NextResponse.json(
        {
          success: false,
          message: "País Stricker inválido.",
        },
        { status: 400 },
      );
    }

    const result = await syncRestStocksByCountry({
      lang: langRaw,
      country: countryRaw,
    });

    return NextResponse.json({
      success: true,
      message: "Stocks Stricker sincronizados com sucesso.",
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Erro inesperado na sincronização REST de stocks.",
      },
      { status: 500 },
    );
  }
}