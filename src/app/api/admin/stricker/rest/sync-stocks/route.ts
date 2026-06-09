import { NextRequest, NextResponse } from "next/server";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { syncRestStocksByCountry } from "@/lib/stricker/rest/sync-stocks-by-country";
import {
  type StrickerCountry,
  type StrickerLanguage,
} from "@/lib/stricker/rest/types";

export const runtime = "nodejs";

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

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await assertAdminAccess();

    const body = (await request.json().catch(() => ({}))) as {
      lang?: unknown;
      country?: unknown;
    };

    const langRaw = typeof body.lang === "string" ? body.lang : "EN";
    const countryRaw = typeof body.country === "string" ? body.country : "PT";

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