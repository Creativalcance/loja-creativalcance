import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { reconcileSalesNetwork } from "@/lib/sales/reconcile";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const actual = Buffer.from(request.headers.get("authorization") || "");
  const expected = Buffer.from(`Bearer ${secret || ""}`);
  if (
    !secret ||
    actual.length !== expected.length ||
    !timingSafeEqual(actual, expected)
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({
      success: true,
      ...(await reconcileSalesNetwork(3)),
    });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
