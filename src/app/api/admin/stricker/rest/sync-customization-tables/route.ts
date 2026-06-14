import { NextRequest, NextResponse } from "next/server";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { getDefaultStrickerLanguage } from "@/lib/stricker/rest/client";
import { syncRestCustomizationTables } from "@/lib/stricker/rest/sync-customization-tables";
import { type StrickerLanguage } from "@/lib/stricker/rest/types";

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

function isAllowedLanguage(value: string): value is StrickerLanguage {
  return ALLOWED_LANGUAGES.includes(value as StrickerLanguage);
}

function normalizeLanguage(value: unknown): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim().toUpperCase();
  }

  return getDefaultStrickerLanguage();
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await assertAdminAccess();

    const body = (await request.json().catch(() => ({}))) as {
      lang?: unknown;
    };

    const langRaw = normalizeLanguage(body.lang);

    if (!isAllowedLanguage(langRaw)) {
      return NextResponse.json(
        {
          success: false,
          message: "Idioma Stricker inválido.",
        },
        { status: 400 },
      );
    }

    const result = await syncRestCustomizationTables({
      lang: langRaw,
    });

    return NextResponse.json({
      success: true,
      message: "Tabelas de personalização Stricker sincronizadas com sucesso.",
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Erro inesperado na sincronização REST de customizationTables.",
      },
      { status: 500 },
    );
  }
}