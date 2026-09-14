import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { localizePath, type SiteLocale } from "@/lib/i18n/config";
import { salesCopy, salesMoney } from "./i18n";
import type { SalesAgent } from "./types";
const htmlEscape = (s: string) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
const siteUrl = () =>
  (process.env.NEXT_PUBLIC_SITE_URL || "https://360-merchandising.com").replace(
    /\/$/,
    "",
  );
export async function sendSalesEmail(params: {
  key: string;
  to: string;
  locale: SiteLocale;
  subject: string;
  body: string;
  url: string;
  button: string;
}) {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) throw new Error("Envio de emails não configurado.");
  const configured =
    process.env.RESEND_FROM_EMAIL?.trim() || "info@360-merchandising.com";
  const address = configured.match(/<([^>]+)>/)?.[1] || configured;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "Idempotency-Key": params.key,
    },
    body: JSON.stringify({
      from: `360 Merchandising <${address}>`,
      to: [params.to],
      subject: params.subject,
      text: `${params.body}\n\n${params.button}: ${params.url}\n\n360 Merchandising\n360 Smart Merch`,
      html: `<!doctype html><html lang="${params.locale}"><body style="background:#f5f6f8;font-family:Arial,sans-serif;color:#162334;padding:32px"><main style="max-width:600px;background:white;padding:32px;margin:auto;border-radius:20px"><p style="color:#ee6500;font-weight:bold">360 Merchandising</p><h1 style="font-size:24px">${htmlEscape(params.subject)}</h1><p style="line-height:1.7;white-space:pre-line">${htmlEscape(params.body)}</p><p style="margin:28px 0"><a href="${htmlEscape(params.url)}" style="display:inline-block;background:#162334;color:white;padding:14px 20px;border-radius:12px;text-decoration:none">${htmlEscape(params.button)}</a></p><p>360 Merchandising<br><strong>360 Smart Merch</strong></p></main></body></html>`,
      tags: [
        { name: "event", value: "sales_network" },
        { name: "locale", value: params.locale },
      ],
    }),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.id)
    throw new Error(
      `Não foi possível enviar o email (HTTP ${response.status}).`,
    );
  return String(result.id);
}
export async function sendSalesInvitation(agent: SalesAgent) {
  if (
    agent.account_kind === "existing_account" ||
    !agent.user_id ||
    agent.status !== "invited"
  )
    throw new Error("A conta não está disponível para convite.");
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: agent.email,
  });
  if (
    error ||
    !data.properties?.hashed_token ||
    data.user?.id !== agent.user_id
  )
    throw new Error("Não foi possível gerar o convite. Tenta novamente.");
  const url = new URL("/auth/comercial", siteUrl());
  url.searchParams.set("token_hash", data.properties.hashed_token);
  url.searchParams.set("type", "recovery");
  url.searchParams.set("locale", agent.locale);
  const t = salesCopy(agent.locale);
  // Tokens are only sent to the verified account email. Never persisted in logs/outbox.
  await sendSalesEmail({
    key: `sales-invite:${agent.id}:${crypto.randomUUID()}`,
    to: agent.email,
    locale: agent.locale,
    subject: t.inviteSubject,
    body: `${agent.full_name},\n\n${t.inviteBody}`,
    url: url.toString(),
    button: t.setPassword,
  });
  const saved = await admin
    .from("sales_agents")
    .update({
      invitation_sent_at: new Date().toISOString(),
      invitation_error: null,
    })
    .eq("id", agent.id);
  if (saved.error)
    throw new Error("Convite enviado; não foi possível atualizar o registo.");
}
export async function retrySalesEmails(limit = 10, agentId?: string) {
  const admin = createSupabaseAdminClient();
  await admin
    .from("sales_email_notifications")
    .update({ status: "failed" })
    .eq("status", "sending")
    .lt("attempted_at", new Date(Date.now() - 600000).toISOString());
  let pending = admin
    .from("sales_email_notifications")
    .select("*")
    .in("status", ["pending", "failed"])
    .lt("attempts", 5)
    .order("created_at")
    .limit(limit);
  if (agentId) pending = pending.eq("agent_id", agentId).eq("kind", "access");
  const { data, error } = await pending;
  if (error) throw new Error(error.message);
  let sent = 0;
  let failed = 0;
  for (const n of data ?? []) {
    const claim = await admin
      .from("sales_email_notifications")
      .update({
        status: "sending",
        attempts: n.attempts + 1,
        attempted_at: new Date().toISOString(),
      })
      .eq("id", n.id)
      .eq("attempts", n.attempts)
      .in("status", ["pending", "failed"])
      .select("id")
      .maybeSingle();
    if (claim.error || !claim.data) continue;
    try {
      const t = salesCopy(n.locale as SiteLocale);
      const p = n.payload;
      const accessNotice = n.kind === "access";
      if (accessNotice) {
        const { data: agent } = await admin
          .from("sales_agents")
          .select("user_id,status")
          .eq("id", n.agent_id)
          .maybeSingle();
        const identity = agent?.user_id
          ? await admin.auth.admin.getUserById(agent.user_id)
          : null;
        const profile = agent?.user_id
          ? await admin
              .from("profiles")
              .select("is_active")
              .eq("id", agent.user_id)
              .maybeSingle()
          : null;
        if (
          agent?.status !== "active" ||
          agent.user_id !== p.user_id ||
          !profile?.data?.is_active ||
          identity?.error ||
          identity?.data.user?.email?.toLowerCase() !==
            n.email_to.toLowerCase() ||
          !identity?.data.user?.email_confirmed_at
        )
          throw new Error("O acesso ou o email da conta mudou.");
      }
      const providerId = await sendSalesEmail({
        key: `sales-${accessNotice ? "access" : "payout"}:${n.id}`,
        to: n.email_to,
        locale: n.locale,
        subject: accessNotice ? t.accessSubject : t.paymentSubject,
        body: accessNotice
          ? `${p.name},\n\n${t.accessBody}`
          : `${p.name},\n\n${t.paymentBody}\n\n${salesMoney(p.amount_cents, p.currency, n.locale)}\n${t.reference}: ${p.reference}`,
        url:
          siteUrl() +
          (accessNotice
            ? localizePath("/login", n.locale) +
              "?next=" +
              encodeURIComponent(localizePath("/area-comercial", n.locale))
            : localizePath("/area-comercial", n.locale) + "#pagamentos"),
        button: accessNotice ? t.title : t.payouts,
      });
      const saved = await admin
        .from("sales_email_notifications")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          provider_id: providerId,
          error: null,
        })
        .eq("id", n.id);
      if (saved.error) throw new Error(saved.error.message);
      if (accessNotice)
        await admin
          .from("sales_agents")
          .update({
            invitation_sent_at: new Date().toISOString(),
            invitation_error: null,
          })
          .eq("id", n.agent_id);
      sent++;
    } catch {
      await admin
        .from("sales_email_notifications")
        .update({
          status: "failed",
          error: "Não foi possível confirmar o envio. Será tentado novamente.",
        })
        .eq("id", n.id);
      failed++;
    }
  }
  return { sent, failed };
}
