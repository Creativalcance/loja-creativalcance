import "server-only";
import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { localizePath } from "@/lib/i18n/config";
import { hasCommercialAccess } from "@/lib/auth/commercial-access";
import type { SalesAgent } from "./types";

export const assertSalesAccess = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/login?next=%2Farea-comercial");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role,is_active")
    .eq("id", user.id)
    .maybeSingle();
  const { data: agent, error: agentError } = await supabase
    .from("sales_agents")
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["invited", "active"])
    .maybeSingle<SalesAgent>();
  if (agentError || !agent || !hasCommercialAccess(profile, agent))
    redirect("/login?erro=sem-acesso-comercial");
  return { userId: user.id, agent, supabase, role: profile!.role };
});

export async function assertSalesOrder(orderId: string) {
  const access = await assertSalesAccess();
  if (!/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(orderId)) notFound();
  const { data, error } = await access.supabase
    .from("sales_order_attributions")
    .select("order_id")
    .eq("order_id", orderId)
    .eq("agent_id", access.agent.id)
    .maybeSingle();
  if (error || !data) notFound();
  return { ...access, admin: createSupabaseAdminClient() };
}
export async function activateSalesAccount(userId: string) {
  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role,is_active")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.is_active || !["customer", "admin"].includes(profile.role))
    return;
  const { error } = await admin
    .from("sales_agents")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("status", "invited")
    .eq("account_kind", "new_account");
  if (error) throw new Error("Não foi possível ativar a conta comercial.");
}
export function salesHome(agent: SalesAgent) {
  return localizePath("/area-comercial", agent.locale);
}
