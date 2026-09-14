import "server-only";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { salesCopy } from "./i18n";
import { csvCell } from "./validation";
import type { SalesAgent, SalesCommission, SalesPayout } from "./types";
export async function salesStatement(agent: SalesAgent, month: string) {
  if (!/^(20\d{2})-(0[1-9]|1[0-2])$/.test(month))
    return new NextResponse("Invalid month", { status: 400 });
  const from = month + "-01";
  const end = new Date(from + "T00:00:00Z");
  end.setUTCMonth(end.getUTCMonth() + 1);
  const until = end.toISOString();
  const admin = createSupabaseAdminClient();
  const t = salesCopy(agent.locale);
  const lines: string[][] = [
    [t.order, t.date, t.customer, "ISO", t.basis, t.amount, t.paid, t.status],
  ];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await admin
      .from("sales_commissions")
      .select(
        "order_number,customer_name,currency,supplier_base_cents,manual_base_cents,earned_cents,paid_cents,state,review_required,approved_at,created_at",
      )
      .eq("agent_id", agent.id)
      .gte("created_at", from)
      .lt("created_at", until)
      .order("created_at")
      .order("order_id")
      .range(offset, offset + 499)
      .returns<SalesCommission[]>();
    if (error) throw new Error(t.error);
    for (const c of data ?? [])
      lines.push([
        c.order_number,
        c.created_at,
        c.customer_name,
        c.currency,
        ((c.supplier_base_cents + c.manual_base_cents) / 100).toFixed(2),
        (c.earned_cents / 100).toFixed(2),
        (c.paid_cents / 100).toFixed(2),
        c.review_required
          ? t.review
          : c.approved_at
            ? t.approvedState
            : c.state === "eligible"
              ? t.eligibleState
              : c.state === "cancelled"
                ? t.cancelled
                : c.state === "forecast"
                  ? t.forecastState
                  : t.unconfigured,
      ]);
    if ((data?.length ?? 0) < 500) break;
  }
  lines.push([], [t.payouts, t.date, t.reference, "ISO", t.paid]);
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await admin
      .from("sales_payouts")
      .select("id,paid_at,reference,currency,amount_cents")
      .eq("agent_id", agent.id)
      .eq("period", from)
      .order("paid_at")
      .order("id")
      .range(offset, offset + 499)
      .returns<SalesPayout[]>();
    if (error) throw new Error(t.error);
    for (const p of data ?? [])
      lines.push([
        p.id,
        p.paid_at,
        p.reference,
        p.currency,
        (p.amount_cents / 100).toFixed(2),
      ]);
    if ((data?.length ?? 0) < 500) break;
  }
  return new NextResponse(
    "\uFEFF" + lines.map((row) => row.map(csvCell).join(";")).join("\r\n"),
    {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="360-comissoes-${month}.csv"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
