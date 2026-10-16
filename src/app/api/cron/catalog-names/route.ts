import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret ?? ""}`);
  if (!secret || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const { data, error } = await createSupabaseAdminClient().rpc("generate_commercial_name_drafts", { p_limit: 100 });
  if (error) return NextResponse.json({ error: "Não foi possível preparar os nomes. A tarefa será repetida." }, { status: 500 });
  return NextResponse.json({ success: true, ...data });
}
