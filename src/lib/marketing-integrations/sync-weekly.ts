import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  addDaysToDateOnly,
  buildWeekRange,
  getCurrentLisbonWeekStart,
  normalizeWeekStart,
} from "@/lib/admin/dashboard/weekly-dashboard";
import {
  fetchGa4WeeklyMetrics,
  isGa4Configured,
} from "@/lib/marketing-integrations/ga4";
import {
  fetchSearchConsoleWeeklyMetrics,
  isSearchConsoleConfigured,
} from "@/lib/marketing-integrations/search-console";
import {
  fetchGoogleAdsWeeklyMetrics,
  isGoogleAdsConfigured,
} from "@/lib/marketing-integrations/google-ads";
import { isGoogleServiceAccountConfigured } from "@/lib/marketing-integrations/google-service-account";

export type MarketingIntegrationKey =
  | "ga4"
  | "searchConsole"
  | "googleAds";

export type MarketingIntegrationState = {
  key: MarketingIntegrationKey;
  label: string;
  configured: boolean;
  requiresGoogleServiceAccount: true;
};

export type WeeklyMarketingSyncSourceResult = {
  source: MarketingIntegrationKey;
  status: "success" | "not_configured" | "error";
  message: string | null;
};

export type WeeklyMarketingSyncResult = {
  weekStart: string;
  startDate: string;
  endDate: string;
  updated: boolean;
  sources: WeeklyMarketingSyncSourceResult[];
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erro inesperado.";
}

export function getMarketingIntegrationStates(): MarketingIntegrationState[] {
  const googleAuth = isGoogleServiceAccountConfigured();

  return [
    {
      key: "ga4",
      label: "Google Analytics 4",
      configured: googleAuth && isGa4Configured(),
      requiresGoogleServiceAccount: true,
    },
    {
      key: "searchConsole",
      label: "Google Search Console",
      configured: googleAuth && isSearchConsoleConfigured(),
      requiresGoogleServiceAccount: true,
    },
    {
      key: "googleAds",
      label: "Google Ads",
      configured: googleAuth && isGoogleAdsConfigured(),
      requiresGoogleServiceAccount: true,
    },
  ];
}

export async function syncWeeklyMarketingMetrics(params: {
  weekStart: string;
  updatedBy?: string | null;
  vercelOidcToken?: string | null;
}): Promise<WeeklyMarketingSyncResult> {
  const weekStart = normalizeWeekStart(params.weekStart);
  const range = buildWeekRange(weekStart);
  const startDate = range.weekStart;
  const endDate = addDaysToDateOnly(weekStart, 6);
  const nowIso = new Date().toISOString();
  const states = getMarketingIntegrationStates();
  const stateByKey = new Map(states.map((state) => [state.key, state]));
  const sourceResults: WeeklyMarketingSyncSourceResult[] = [];
  const payload: Record<string, unknown> = {
    week_start: weekStart,
    updated_at: nowIso,
    last_integration_sync_at: nowIso,
  };

  if (params.updatedBy) {
    payload.updated_by = params.updatedBy;
  }

  const syncErrors: Record<string, string> = {};

  async function runSource(
    source: MarketingIntegrationKey,
    execute: () => Promise<Record<string, unknown>>,
    syncedAtColumn: string,
  ): Promise<void> {
    const state = stateByKey.get(source);

    if (!state?.configured) {
      sourceResults.push({
        source,
        status: "not_configured",
        message: null,
      });
      return;
    }

    try {
      Object.assign(payload, await execute());
      payload[syncedAtColumn] = nowIso;
      sourceResults.push({
        source,
        status: "success",
        message: null,
      });
    } catch (error) {
      const message = errorMessage(error);
      syncErrors[source] = message;
      sourceResults.push({
        source,
        status: "error",
        message,
      });
    }
  }

  await runSource(
    "ga4",
    async () => {
      const metrics = await fetchGa4WeeklyMetrics({
        startDate,
        endDate,
        vercelOidcToken: params.vercelOidcToken,
      });
      return {
        sessions: metrics.sessions,
        users: metrics.users,
        new_users: metrics.newUsers,
        organic_sessions: metrics.organicSessions,
        add_to_cart_sessions: metrics.addToCartSessions,
        begin_checkout_sessions: metrics.beginCheckoutSessions,
        purchase_sessions: metrics.purchaseSessions,
      };
    },
    "ga4_synced_at",
  );

  await runSource(
    "searchConsole",
    async () => {
      const metrics = await fetchSearchConsoleWeeklyMetrics({
        startDate,
        endDate,
        vercelOidcToken: params.vercelOidcToken,
      });
      return {
        seo_clicks: metrics.clicks,
        seo_impressions: metrics.impressions,
      };
    },
    "search_console_synced_at",
  );

  await runSource(
    "googleAds",
    async () => {
      const metrics = await fetchGoogleAdsWeeklyMetrics({
        startDate,
        endDate,
        vercelOidcToken: params.vercelOidcToken,
      });
      return {
        google_ads_spend: metrics.spend,
        google_ads_clicks: metrics.clicks,
        google_ads_impressions: metrics.impressions,
        google_ads_revenue: metrics.revenue,
      };
    },
    "google_ads_synced_at",
  );

  payload.sync_errors = syncErrors;

  const successfulSources = sourceResults.filter((result) => result.status === "success");
  const configuredSources = sourceResults.filter((result) => result.status !== "not_configured");

  if (configuredSources.length === 0) {
    return {
      weekStart,
      startDate,
      endDate,
      updated: false,
      sources: sourceResults,
    };
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("marketing_weekly_metrics")
    .upsert(payload, { onConflict: "week_start" });

  if (error) {
    if (error.code === "42703") {
      throw new Error(
        "A migration 20260816_marketing_automatic_google_integrations.sql ainda não foi aplicada.",
      );
    }

    if (error.code === "42P01") {
      throw new Error(
        "A migration 20260816_marketing_weekly_dashboard.sql ainda não foi aplicada.",
      );
    }

    throw new Error(`Não foi possível guardar a sincronização de marketing: ${error.message}`);
  }

  return {
    weekStart,
    startDate,
    endDate,
    updated: successfulSources.length > 0,
    sources: sourceResults,
  };
}

export async function syncRecentMarketingWeeks(params?: {
  weeks?: number;
  vercelOidcToken?: string | null;
}): Promise<WeeklyMarketingSyncResult[]> {
  const count = Math.max(1, Math.min(params?.weeks ?? 4, 8));
  const currentWeekStart = getCurrentLisbonWeekStart();
  const weekStarts = Array.from({ length: count }, (_, index) =>
    addDaysToDateOnly(currentWeekStart, -index * 7),
  );
  const results: WeeklyMarketingSyncResult[] = [];

  for (const weekStart of weekStarts) {
    results.push(
      await syncWeeklyMarketingMetrics({
        weekStart,
        vercelOidcToken: params?.vercelOidcToken,
      }),
    );
  }

  return results;
}
