import { getGoogleAccessToken } from "@/lib/marketing-integrations/google-service-account";
import { getSearchConsoleSiteUrl } from "@/lib/marketing-integrations/config";

const SEARCH_CONSOLE_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

type SearchConsoleResponse = {
  rows?: Array<{
    clicks?: number;
    impressions?: number;
  }>;
};

export type SearchConsoleWeeklyMetrics = {
  clicks: number;
  impressions: number;
};

export function isSearchConsoleConfigured(): boolean {
  return Boolean(getSearchConsoleSiteUrl());
}

export async function fetchSearchConsoleWeeklyMetrics(params: {
  startDate: string;
  endDate: string;
  vercelOidcToken?: string | null;
}): Promise<SearchConsoleWeeklyMetrics> {
  const siteUrl = getSearchConsoleSiteUrl();

  if (!siteUrl) {
    throw new Error("SEARCH_CONSOLE_SITE_URL não está configurado.");
  }

  const token = await getGoogleAccessToken([SEARCH_CONSOLE_SCOPE], {
    vercelOidcToken: params.vercelOidcToken,
  });
  const response = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        startDate: params.startDate,
        endDate: params.endDate,
        type: "web",
        dataState: "all",
        rowLimit: 1,
      }),
      cache: "no-store",
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | (SearchConsoleResponse & { error?: { message?: string } })
    | null;

  if (!response.ok) {
    throw new Error(
      `Search Console respondeu com erro: ${payload?.error?.message ?? `HTTP ${response.status}`}`,
    );
  }

  const row = payload?.rows?.[0];

  return {
    clicks: Number.isFinite(Number(row?.clicks)) ? Number(row?.clicks) : 0,
    impressions: Number.isFinite(Number(row?.impressions)) ? Number(row?.impressions) : 0,
  };
}
