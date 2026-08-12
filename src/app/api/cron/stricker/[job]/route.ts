import { NextRequest, NextResponse } from "next/server";
import {
  assertVercelCronRequest,
  isStrickerAutomaticSyncJob,
  runStrickerAutomaticSync,
} from "@/lib/stricker/automatic-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ job: string }> },
): Promise<NextResponse> {
  try {
    assertVercelCronRequest(request);

    const { job } = await context.params;

    if (!isStrickerAutomaticSyncJob(job)) {
      return NextResponse.json(
        { success: false, message: "Sincronização automática desconhecida." },
        { status: 404 },
      );
    }

    const execution = await runStrickerAutomaticSync(job);

    return NextResponse.json({
      success: true,
      job,
      executedAt: new Date().toISOString(),
      ...execution,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro inesperado na sincronização automática Stricker.";
    const status = message.includes("não autorizado") ? 401 : 500;

    return NextResponse.json(
      { success: false, message, executedAt: new Date().toISOString() },
      { status },
    );
  }
}

