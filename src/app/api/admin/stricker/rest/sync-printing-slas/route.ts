import { NextRequest, NextResponse } from "next/server";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { syncRestPrintingSlas } from "@/lib/stricker/rest/sync-printing-slas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await assertAdminAccess();
    const body = await request.json().catch(() => ({})) as { lang?: unknown };
    const lang = typeof body.lang === "string" ? body.lang.toUpperCase() : "PT";
    if (lang !== "PT") {
      return NextResponse.json({ success: false, message: "Idioma inválido." }, { status: 400 });
    }
    const result = await syncRestPrintingSlas({ lang: "PT" });
    return NextResponse.json({ success: true, message: "SLA de produção sincronizados.", ...result });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "Erro ao sincronizar SLA de produção.",
    }, { status: 500 });
  }
}
