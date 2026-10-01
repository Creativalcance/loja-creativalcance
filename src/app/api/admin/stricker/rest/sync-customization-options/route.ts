import { NextRequest, NextResponse } from "next/server";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { getDefaultStrickerLanguage } from "@/lib/stricker/rest/client";
import { getCustomizationJob, startCustomizationJob } from "@/lib/stricker/customization-jobs";
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

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await assertAdminAccess();
    const lang = normalizeLanguage(request.nextUrl.searchParams.get("lang"));
    if (!isAllowedLanguage(lang)) return NextResponse.json({ success: false, message: "Idioma inválido." }, { status: 400 });
    const latest = await getCustomizationJob();
    const job = latest && ["pending", "running"].includes(latest.status) ? latest : await getCustomizationJob(lang);
    return NextResponse.json({ success: true, job });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Não foi possível consultar o progresso." }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await assertAdminAccess();
    const body = await request.json().catch(() => ({})) as { lang?: unknown };
    const lang = normalizeLanguage(body.lang);
    if (!isAllowedLanguage(lang)) return NextResponse.json({ success: false, message: "Idioma inválido." }, { status: 400 });
    // Technical options use the same canonical language as variants/locations.
    // Display translations are independent; matching translated location names
    // against the canonical catalogue would silently lose supplier services.
    const job = await startCustomizationJob("PT");
    return NextResponse.json({ success: true, job, lang: job.language,
      message: "Geração agendada em segundo plano. Pode fechar esta página; o progresso fica guardado." }, { status: 202 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Não foi possível agendar a geração." }, { status: 500 });
  }
}
