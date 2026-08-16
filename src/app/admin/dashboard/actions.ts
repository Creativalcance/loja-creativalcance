"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizeWeekStart } from "@/lib/admin/dashboard/weekly-dashboard";
import { syncWeeklyMarketingMetrics } from "@/lib/marketing-integrations/sync-weekly";

function nullableNumber(formData: FormData, field: string): number | null {
  const raw = String(formData.get(field) ?? "").trim().replace(",", ".");

  if (!raw) {
    return null;
  }

  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`O campo ${field} tem um valor inválido.`);
  }

  return value;
}

function nullableInteger(formData: FormData, field: string): number | null {
  const value = nullableNumber(formData, field);

  if (value === null) {
    return null;
  }

  return Math.round(value);
}

export async function saveWeeklyMarketingMetrics(formData: FormData) {
  const { userId } = await assertAdminAccess("/admin/dashboard");
  const weekStart = normalizeWeekStart(String(formData.get("weekStart") ?? ""));
  const supabase = createSupabaseAdminClient();

  const payload = {
    week_start: weekStart,
    sessions: nullableInteger(formData, "sessions"),
    users: nullableInteger(formData, "users"),
    new_users: nullableInteger(formData, "newUsers"),
    add_to_cart_sessions: nullableInteger(formData, "addToCartSessions"),
    begin_checkout_sessions: nullableInteger(formData, "beginCheckoutSessions"),
    purchase_sessions: nullableInteger(formData, "purchaseSessions"),
    organic_sessions: nullableInteger(formData, "organicSessions"),
    seo_clicks: nullableInteger(formData, "seoClicks"),
    seo_impressions: nullableInteger(formData, "seoImpressions"),
    google_ads_spend: nullableNumber(formData, "googleAdsSpend"),
    google_ads_clicks: nullableInteger(formData, "googleAdsClicks"),
    google_ads_impressions: nullableInteger(formData, "googleAdsImpressions"),
    google_ads_revenue: nullableNumber(formData, "googleAdsRevenue"),
    meta_ads_spend: nullableNumber(formData, "metaAdsSpend"),
    meta_ads_clicks: nullableInteger(formData, "metaAdsClicks"),
    meta_ads_impressions: nullableInteger(formData, "metaAdsImpressions"),
    meta_ads_revenue: nullableNumber(formData, "metaAdsRevenue"),
    paid_new_customers: nullableInteger(formData, "paidNewCustomers"),
    email_revenue: nullableNumber(formData, "emailRevenue"),
    notes: String(formData.get("notes") ?? "").trim() || null,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("marketing_weekly_metrics")
    .upsert(payload, { onConflict: "week_start" });

  if (error) {
    if (error.code === "42P01") {
      redirect(`/admin/dashboard?week=${weekStart}&erro=metricas-externas-nao-configuradas`);
    }

    throw new Error(`Não foi possível guardar as métricas semanais: ${error.message}`);
  }

  revalidatePath("/admin/dashboard");
  redirect(`/admin/dashboard?week=${weekStart}&guardado=1`);
}

export async function syncWeeklyMarketingMetricsAction(formData: FormData) {
  const { userId } = await assertAdminAccess("/admin/dashboard");
  const weekStart = normalizeWeekStart(String(formData.get("weekStart") ?? ""));
  let destination = `/admin/dashboard?week=${weekStart}&syncerro=1`;

  try {
    const requestHeaders = await headers();
    const result = await syncWeeklyMarketingMetrics({
      weekStart,
      updatedBy: userId,
      vercelOidcToken: requestHeaders.get("x-vercel-oidc-token"),
    });
    const errors = result.sources.filter((source) => source.status === "error").length;
    const successes = result.sources.filter((source) => source.status === "success").length;

    revalidatePath("/admin/dashboard");

    if (successes === 0 && errors === 0) {
      destination = `/admin/dashboard?week=${weekStart}&sincronizado=sem-fontes`;
    } else if (errors > 0) {
      destination = `/admin/dashboard?week=${weekStart}&sincronizado=parcial`;
    } else {
      destination = `/admin/dashboard?week=${weekStart}&sincronizado=1`;
    }
  } catch (error) {
    console.error("Falha ao sincronizar métricas externas:", error);
  }

  redirect(destination);
}
