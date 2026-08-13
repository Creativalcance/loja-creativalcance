


import { NextRequest, NextResponse } from "next/server";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { getDefaultStrickerLanguage } from "@/lib/stricker/rest/client";
import { syncRestOptionals } from "@/lib/stricker/rest/sync-optionals";
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

const DEFAULT_BATCH_LIMIT = 500;
const MAX_BATCH_LIMIT = 1_000;

function normalizeInteger(params: {
  value: unknown;
  fallback: number;
  min: number;
  max: number;
}): number {
  const parsed =
    typeof params.value === "number"
      ? params.value
      : typeof params.value === "string"
        ? Number(params.value)
        : Number.NaN;

  return Number.isFinite(parsed)
    ? Math.min(params.max, Math.max(params.min, Math.floor(parsed)))
    : params.fallback;
}

function isAllowedLanguage(value: string): value is StrickerLanguage {
  return ALLOWED_LANGUAGES.includes(value as StrickerLanguage);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await assertAdminAccess();

    const body = (await request.json().catch(() => ({}))) as {
      lang?: unknown;
      offset?: unknown;
      limit?: unknown;
    };

    const langRaw =
      typeof body.lang === "string" && body.lang.trim().length > 0
        ? body.lang.trim().toUpperCase()
        : getDefaultStrickerLanguage();

    if (!isAllowedLanguage(langRaw)) {
      return NextResponse.json(
        {
          success: false,
          message: "Idioma Stricker inválido.",
        },
        { status: 400 },
      );
    }

    const offset = normalizeInteger({
      value: body.offset,
      fallback: 0,
      min: 0,
      max: 1_000_000,
    });
    const limit = normalizeInteger({
      value: body.limit,
      fallback: DEFAULT_BATCH_LIMIT,
      min: 1,
      max: MAX_BATCH_LIMIT,
    });

    const result = await syncRestOptionals({
      lang: langRaw,
      offset,
      limit,
    });

    return NextResponse.json({
      success: true,
      message: result.hasMore
        ? "Lote de variantes e preços Stricker sincronizado."
        : "Variantes e preços Stricker sincronizados com sucesso.",
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Erro inesperado na sincronização REST de variantes e preços.",
      },
      { status: 500 },
    );
  }
}
