import { NextRequest, NextResponse } from "next/server";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { expireStaleSupplierSyncs } from "@/lib/stricker/sync-control";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    await assertAdminAccess("/admin/sincronizacao");
    const supabase = createSupabaseAdminClient();
    await expireStaleSupplierSyncs({ supabaseAdmin: supabase });
    const { data, error } = await supabase
      .from("supplier_dataset_imports")
      .select("id,dataset_name,language,country,status,records_received,records_imported,started_at,created_at")
      .eq("status", "running")
      .order("started_at", { ascending: false });
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true, items: data ?? [] });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Erro ao carregar sincronizações." }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await assertAdminAccess("/admin/sincronizacao");
    const body = await request.json().catch(() => ({})) as { id?: unknown };
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ success: false, message: "Sincronização inválida." }, { status: 400 });
    }
    const supabase = createSupabaseAdminClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("supplier_dataset_imports")
      .update({
        status: "canceled",
        cancel_requested_at: now,
        cancel_requested_by: userId,
        finished_at: now,
        errors: ["Sincronização cancelada pelo administrador."],
      })
      .eq("id", id)
      .eq("status", "running")
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json({ success: false, message: "A sincronização já não está em execução." }, { status: 409 });
    return NextResponse.json({ success: true, message: "Cancelamento solicitado. Os dados já importados serão mantidos." });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Erro ao cancelar sincronização." }, { status: 500 });
  }
}
