import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  SalesAgent,
  SalesAssignment,
  SalesCommission,
  SalesContact,
  SalesPayout,
} from "./types";
export type SalesSummary = {
  agent_id: string;
  currency: string;
  forecast_cents: number;
  eligible_cents: number;
  approved_cents: number;
  paid_cents: number;
  adjustment_cents: number;
  review_count: number;
  month_sales_cents: number;
};
export async function getSalesData(agent: SalesAgent, page = 1) {
  const admin = createSupabaseAdminClient();
  const refresh = await admin.rpc("sales_refresh_commissions", {
    p_agent_id: agent.id,
  });
  if (refresh.error)
    throw new Error("Não foi possível atualizar as comissões.");
  const start = (page - 1) * 50;
  const [assignments, contacts, commissions, payouts, summary] =
    await Promise.all([
      admin
        .from("sales_customer_assignments")
        .select("*", { count: "exact" })
        .eq("agent_id", agent.id)
        .is("ended_at", null)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("created_at", { ascending: false })
        .range(start, start + 49)
        .returns<SalesAssignment[]>(),
      admin
        .from("sales_contacts")
        .select("*", { count: "exact" })
        .eq("agent_id", agent.id)
        .order("updated_at", { ascending: false })
        .range(start, start + 49)
        .returns<SalesContact[]>(),
      admin
        .from("sales_commissions")
        .select("*", { count: "exact" })
        .eq("agent_id", agent.id)
        .order("created_at", { ascending: false })
        .range(start, start + 49)
        .returns<SalesCommission[]>(),
      admin
        .from("sales_payouts")
        .select("*", { count: "exact" })
        .eq("agent_id", agent.id)
        .order("paid_at", { ascending: false })
        .range(start, start + 49)
        .returns<SalesPayout[]>(),
      admin.rpc("sales_summary", { p_agent_id: agent.id }),
    ]);
  for (const result of [assignments, contacts, commissions, payouts, summary])
    if (result.error)
      throw new Error("Não foi possível carregar a área comercial.");
  return {
    assignments: assignments.data ?? [],
    assignmentCount: assignments.count ?? 0,
    contacts: contacts.data ?? [],
    contactCount: contacts.count ?? 0,
    commissions: commissions.data ?? [],
    commissionCount: commissions.count ?? 0,
    payouts: payouts.data ?? [],
    payoutCount: payouts.count ?? 0,
    summary: (summary.data ?? []) as SalesSummary[],
  };
}
