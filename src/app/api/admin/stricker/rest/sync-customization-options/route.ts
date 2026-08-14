import { NextRequest, NextResponse } from "next/server";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { getDefaultStrickerLanguage } from "@/lib/stricker/rest/client";
import { syncRestCustomizationOptions } from "@/lib/stricker/rest/sync-customization-options";
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

const DEFAULT_BATCH_LIMIT = 25;
const MAX_BATCH_LIMIT = 50;

function normalizeCursor(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const cursor = value.trim();

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    cursor,
  )
    ? cursor
    : null;
}

function isAllowedLanguage(value: string): value is StrickerLanguage {
  return ALLOWED_LANGUAGES.includes(value as StrickerLanguage);
}

function normalizeLanguage(value: unknown): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim().toUpperCase();
  }

  return getDefaultStrickerLanguage();
}

function normalizePositiveInteger(params: {
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

  if (!Number.isFinite(parsed)) {
    return params.fallback;
  }

  return Math.min(params.max, Math.max(params.min, Math.floor(parsed)));
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await assertAdminAccess();

    const body = (await request.json().catch(() => ({}))) as {
      lang?: unknown;
      offset?: unknown;
      limit?: unknown;
      cursor?: unknown;
      recordsTotal?: unknown;
    };

    const langRaw = normalizeLanguage(body.lang);

    if (!isAllowedLanguage(langRaw)) {
      return NextResponse.json(
        {
          success: false,
          message: "Idioma do fornecedor inválido.",
        },
        { status: 400 },
      );
    }

    const offset = normalizePositiveInteger({
      value: body.offset,
      fallback: 0,
      min: 0,
      max: 1_000_000,
    });

    const limit = normalizePositiveInteger({
      value: body.limit,
      fallback: DEFAULT_BATCH_LIMIT,
      min: 1,
      max: MAX_BATCH_LIMIT,
    });

    const cursor = normalizeCursor(body.cursor);
    const recordsTotal = normalizePositiveInteger({
      value: body.recordsTotal,
      fallback: 0,
      min: 0,
      max: 10_000_000,
    });

    const result = await syncRestCustomizationOptions({
      lang: langRaw,
      offset,
      limit,
      cursor,
      recordsTotal: recordsTotal > 0 ? recordsTotal : null,
    });

    const hasPendingRecords = result.optionsFailed > 0;

    return NextResponse.json({
      success: true,
      message: hasPendingRecords
        ? `Sincronização concluída com ${result.optionsFailed} opção pendente neste lote.`
        : "Opções de personalização do fornecedor sincronizadas com sucesso.",
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Erro inesperado na sincronização REST de customizationOptions.",
      },
      { status: 500 },
    );
  }
}
