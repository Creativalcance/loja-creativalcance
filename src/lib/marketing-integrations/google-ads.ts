import { GOOGLE_ADS_CUSTOMER_ID } from "@/lib/marketing-integrations/config";
import { getGoogleAccessToken } from "@/lib/marketing-integrations/google-service-account";

const GOOGLE_ADS_SCOPE = "https://www.googleapis.com/auth/adwords";
const DEFAULT_API_VERSION = "v25";

type GoogleAdsRow = {
  customer?: {
    currencyCode?: string;
  };
  metrics?: {
    costMicros?: string | number;
    clicks?: string | number;
    impressions?: string | number;
    conversionsValue?: string | number;
  };
};

type GoogleAdsSearchResponse = {
  results?: GoogleAdsRow[];
  error?: {
    message?: string;
    status?: string;
  };
};

export type GoogleAdsWeeklyMetrics = {
  spend: number;
  clicks: number;
  impressions: number;
  revenue: number;
};

function normalizeCustomerId(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} não está configurado.`);
  }
  return value;
}

function apiVersion(): string {
  const configured = process.env.GOOGLE_ADS_API_VERSION?.trim();
  if (!configured) {
    return DEFAULT_API_VERSION;
  }
  return configured.startsWith("v") ? configured : `v${configured}`;
}

async function runGoogleAdsQuery(
  query: string,
  vercelOidcToken?: string | null,
): Promise<GoogleAdsRow[]> {
  const customerId = normalizeCustomerId(GOOGLE_ADS_CUSTOMER_ID);
  const developerToken = requiredEnv("GOOGLE_ADS_DEVELOPER_TOKEN");
  const loginCustomerRaw = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.trim();
  const token = await getGoogleAccessToken([GOOGLE_ADS_SCOPE], {
    vercelOidcToken,
  });
  const headers: Record<string, string> = {
    authorization: `Bearer ${token}`,
    "developer-token": developerToken,
    "content-type": "application/json",
  };

  if (loginCustomerRaw) {
    headers["login-customer-id"] = normalizeCustomerId(loginCustomerRaw);
  }

  const response = await fetch(
    `https://googleads.googleapis.com/${apiVersion()}/customers/${customerId}/googleAds:search`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ query }),
      cache: "no-store",
    },
  );

  const payload = (await response.json().catch(() => null)) as GoogleAdsSearchResponse | null;

  if (!response.ok) {
    const requestId = response.headers.get("request-id");
    const requestSuffix = requestId ? ` · request-id ${requestId}` : "";
    throw new Error(
      `Google Ads respondeu com erro: ${payload?.error?.message ?? `HTTP ${response.status}`}${requestSuffix}`,
    );
  }

  return payload?.results ?? [];
}

export function isGoogleAdsConfigured(): boolean {
  return Boolean(
    GOOGLE_ADS_CUSTOMER_ID &&
      process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim(),
  );
}

export async function fetchGoogleAdsWeeklyMetrics(params: {
  startDate: string;
  endDate: string;
  vercelOidcToken?: string | null;
}): Promise<GoogleAdsWeeklyMetrics> {
  const performanceRows = await runGoogleAdsQuery(`
    SELECT
      customer.currency_code,
      metrics.cost_micros,
      metrics.clicks,
      metrics.impressions
    FROM customer
    WHERE segments.date BETWEEN '${params.startDate}' AND '${params.endDate}'
  `, params.vercelOidcToken);

  const purchaseRows = await runGoogleAdsQuery(`
    SELECT
      metrics.conversions_value
    FROM customer
    WHERE segments.date BETWEEN '${params.startDate}' AND '${params.endDate}'
      AND segments.conversion_action_category = 'PURCHASE'
  `, params.vercelOidcToken);

  const performance = performanceRows[0];
  const currency = performance?.customer?.currencyCode;

  if (currency && currency.toUpperCase() !== "EUR") {
    throw new Error(
      `A conta Google Ads usa ${currency}, mas o dashboard está configurado em EUR.`,
    );
  }

  const spend = numberValue(performance?.metrics?.costMicros) / 1_000_000;
  const clicks = numberValue(performance?.metrics?.clicks);
  const impressions = numberValue(performance?.metrics?.impressions);
  const revenue = purchaseRows.reduce(
    (total, row) => total + numberValue(row.metrics?.conversionsValue),
    0,
  );

  return {
    spend,
    clicks,
    impressions,
    revenue,
  };
}
