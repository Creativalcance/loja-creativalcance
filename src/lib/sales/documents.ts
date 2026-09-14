import "server-only";
import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
export async function payoutDocument(id: string, agentId?: string) {
  if (!/^[\da-f-]{36}$/i.test(id)) notFound();
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("sales_payouts")
    .select("proof_path,agent_id")
    .eq("id", id);
  if (agentId) query = query.eq("agent_id", agentId);
  const { data, error } = await query.maybeSingle();
  if (error || !data?.proof_path) notFound();
  if (!data.proof_path.startsWith(data.agent_id + "/")) notFound();
  const signed = await admin.storage
    .from("sales-documents")
    .createSignedUrl(data.proof_path, 60);
  if (signed.error || !signed.data?.signedUrl) notFound();
  const response = NextResponse.redirect(signed.data.signedUrl);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
