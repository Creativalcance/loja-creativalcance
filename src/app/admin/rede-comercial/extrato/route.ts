import { NextRequest } from "next/server";
import { notFound } from "next/navigation";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { salesStatement } from "@/lib/sales/statement";
import type { SalesAgent } from "@/lib/sales/types";
export async function GET(request: NextRequest) {
  await assertAdminAccess("/admin/rede-comercial");
  const id = request.nextUrl.searchParams.get("comercial");
  if (!id || !/^[\da-f-]{36}$/i.test(id)) notFound();
  const { data } = await createSupabaseAdminClient()
    .from("sales_agents")
    .select("*")
    .eq("id", id)
    .maybeSingle<SalesAgent>();
  if (!data) notFound();
  return salesStatement(
    data,
    request.nextUrl.searchParams.get("mes") ||
      new Date().toISOString().slice(0, 7),
  );
}
