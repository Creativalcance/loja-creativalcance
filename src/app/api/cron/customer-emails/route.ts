import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { retryPendingCustomerEmails } from "@/lib/notifications/customer-email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const received = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  const actual = Buffer.from(received);
  const expected = Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!authorized(request)) {
    return NextResponse.json({ success: false, message: "Pedido não autorizado." }, { status: 401 });
  }
  try {
    const result = await retryPendingCustomerEmails();
    return NextResponse.json({ success: true, executedAt: new Date().toISOString(), ...result });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "Erro inesperado no reenvio de emails.",
    }, { status: 500 });
  }
}
