import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { syncRecentMarketingWeeks } from "@/lib/marketing-integrations/sync-weekly";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function safeSecretEquals(received: string, expected: string): boolean {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);

  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

function assertCronRequest(request: NextRequest): void {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    throw new Error("CRON_SECRET não está configurado.");
  }

  const authorization = request.headers.get("authorization") ?? "";
  if (!safeSecretEquals(authorization, `Bearer ${cronSecret}`)) {
    throw new Error("Pedido de sincronização automática não autorizado.");
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    assertCronRequest(request);
    const results = await syncRecentMarketingWeeks({
      weeks: 4,
      vercelOidcToken: request.headers.get("x-vercel-oidc-token"),
    });

    return NextResponse.json({
      success: true,
      executedAt: new Date().toISOString(),
      weeks: results,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro inesperado na sincronização automática de marketing.";
    const status = message.includes("não autorizado") ? 401 : 500;

    return NextResponse.json(
      { success: false, message, executedAt: new Date().toISOString() },
      { status },
    );
  }
}
