import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { orderInvoiceUrl } from "@/lib/orders/invoice-access";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await assertAdminAccess("/admin/encomendas");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("orders").select("id,invoice_storage_path,invoice_url")
    .eq("id", id).is("deleted_at", null).maybeSingle();
  if (error) throw new Error("Não foi possível consultar a fatura.");
  if (!data) notFound();
  const url = await orderInvoiceUrl(admin, data);
  if (!url) notFound();
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
