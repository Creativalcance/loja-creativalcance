import "server-only";
import type Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createStripeServerClient } from "@/lib/stripe/server";
export async function observeSalesRefund(
  charge: Stripe.Charge,
  observedAt: string,
) {
  const intent =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;
  if (!intent) return;
  const admin = createSupabaseAdminClient();
  const { data: payment, error } = await admin
    .from("payments")
    .select("id,order_id")
    .eq("provider", "stripe")
    .eq("provider_payment_intent_id", intent)
    .maybeSingle();
  if (error) throw new Error("Não foi possível verificar o pagamento.");
  if (!payment) return;
  const attribution = await admin
    .from("sales_order_attributions")
    .select("order_id")
    .eq("order_id", payment.order_id)
    .maybeSingle();
  if (attribution.error) throw new Error(attribution.error.message);
  if (!attribution.data) return;
  const decimals =
    new Intl.NumberFormat("en", {
      style: "currency",
      currency: charge.currency,
    }).resolvedOptions().maximumFractionDigits ?? 2;
  const factor = 10 ** decimals;
  const saved = await admin.rpc("sales_observe_refund", {
    p_payment_id: payment.id,
    p_refund_cents: Math.round((charge.amount_refunded * 100) / factor),
    p_amount_cents: Math.round((charge.amount * 100) / factor),
    p_currency: charge.currency,
    p_observed_at: observedAt,
  });
  if (saved.error) throw new Error(saved.error.message);
}
export async function checkSalesRefunds(
  agentId: string,
  orderId?: string,
  periodic = false,
) {
  const deadline = Date.now() + 12000;
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("sales_order_attributions")
    .select("order_id")
    .eq("agent_id", agentId);
  if (orderId) query = query.eq("order_id", orderId);
  // Page through the entire attributed portfolio; no financial balance is silently truncated.
  for (let offset = 0; ; offset += 100) {
    const attrs = await query.order("order_id").range(offset, offset + 99);
    if (attrs.error)
      throw new Error("Não foi possível verificar as encomendas.");
    if (!attrs.data?.length) break;
    const payments = await admin
      .from("payments")
      .select("id,provider_charge_id,provider_payment_intent_id")
      .eq("provider", "stripe")
      .in(
        "order_id",
        attrs.data.map((a) => a.order_id),
      )
      .in("status", ["paid", "partially_refunded", "refunded"]);
    if (payments.error)
      throw new Error("Não foi possível verificar os pagamentos.");
    if (payments.data?.length) {
      let candidates = payments.data;
      if (periodic) {
        const checks = await admin
          .from("sales_payment_checks")
          .select("payment_id")
          .in(
            "payment_id",
            candidates.map((p) => p.id),
          )
          .gte("observed_at", new Date(Date.now() - 3600000).toISOString());
        if (checks.error) throw new Error(checks.error.message);
        const recent = new Set((checks.data ?? []).map((c) => c.payment_id));
        candidates = candidates.filter((p) => !recent.has(p.id));
      }
      const stripe = createStripeServerClient();
      for (let i = 0; i < candidates.length; i += 3) {
        if (periodic && Date.now() > deadline) return;
        await Promise.all(
          candidates.slice(i, i + 3).map(async (p) => {
            const observedAt = new Date().toISOString();
            let charge: Stripe.Charge | null = null;
            if (p.provider_charge_id)
              charge = await stripe.charges.retrieve(
                p.provider_charge_id,
                {},
                { timeout: 5000, maxNetworkRetries: 0 },
              );
            else if (p.provider_payment_intent_id) {
              const intent = await stripe.paymentIntents.retrieve(
                p.provider_payment_intent_id,
                { expand: ["latest_charge"] },
                { timeout: 5000, maxNetworkRetries: 0 },
              );
              charge =
                typeof intent.latest_charge === "object"
                  ? intent.latest_charge
                  : null;
            }
            if (!charge)
              throw new Error(
                "O comprovativo do pagamento Stripe ainda não está disponível.",
              );
            await observeSalesRefund(charge, observedAt);
          }),
        );
      }
    }
    if (attrs.data.length < 100) break;
  }
}
export async function reconcileSalesNetwork(limit = 5) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("sales_agents")
    .select("id")
    .not("user_id", "is", null)
    .order("last_reconciled_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  let processed = 0;
  for (const agent of data ?? []) {
    try {
      await checkSalesRefunds(agent.id, undefined, true);
      const result = await admin.rpc("sales_refresh_commissions", {
        p_agent_id: agent.id,
      });
      if (result.error) throw result.error;
      processed++;
    } catch (e) {
      console.error("Sales reconciliation failed", {
        agentId: agent.id,
        message: e instanceof Error ? e.message : "Database error",
      });
    } finally {
      await admin
        .from("sales_agents")
        .update({ last_reconciled_at: new Date().toISOString() })
        .eq("id", agent.id);
    }
  }
  return { processed };
}
