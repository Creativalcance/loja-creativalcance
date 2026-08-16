import { getGoogleAccessToken } from "@/lib/marketing-integrations/google-service-account";
import { GA4_PROPERTY_ID } from "@/lib/marketing-integrations/config";

const GA4_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

type Ga4MetricValue = { value?: string };
type Ga4DimensionValue = { value?: string };
type Ga4Row = {
  dimensionValues?: Ga4DimensionValue[];
  metricValues?: Ga4MetricValue[];
};
type Ga4Report = { rows?: Ga4Row[] };
type Ga4BatchResponse = { reports?: Ga4Report[] };

export type Ga4WeeklyMetrics = {
  sessions: number;
  users: number;
  newUsers: number;
  organicSessions: number;
  addToCartSessions: number | null;
  beginCheckoutSessions: number | null;
  purchaseSessions: number | null;
};

function numberFromMetric(value: unknown): number {
  if (typeof value !== "string" && typeof value !== "number") {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function firstMetric(report: Ga4Report | undefined, index: number): number {
  return numberFromMetric(report?.rows?.[0]?.metricValues?.[index]?.value);
}

function eventSessions(report: Ga4Report | undefined, eventName: string): number | null {
  const row = report?.rows?.find(
    (candidate) => candidate.dimensionValues?.[0]?.value === eventName,
  );

  if (!row) {
    return null;
  }

  return numberFromMetric(row.metricValues?.[0]?.value);
}

export function isGa4Configured(): boolean {
  return Boolean(GA4_PROPERTY_ID);
}

export async function fetchGa4WeeklyMetrics(params: {
  startDate: string;
  endDate: string;
  vercelOidcToken?: string | null;
}): Promise<Ga4WeeklyMetrics> {
  const propertyId = GA4_PROPERTY_ID;

  if (!propertyId) {
    throw new Error("GA4_PROPERTY_ID não está configurado.");
  }

  const token = await getGoogleAccessToken([GA4_SCOPE], {
    vercelOidcToken: params.vercelOidcToken,
  });
  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:batchRunReports`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            dateRanges: [{ startDate: params.startDate, endDate: params.endDate }],
            metrics: [
              { name: "sessions" },
              { name: "totalUsers" },
              { name: "newUsers" },
            ],
          },
          {
            dateRanges: [{ startDate: params.startDate, endDate: params.endDate }],
            dimensions: [{ name: "sessionDefaultChannelGroup" }],
            metrics: [{ name: "sessions" }],
            dimensionFilter: {
              filter: {
                fieldName: "sessionDefaultChannelGroup",
                stringFilter: {
                  matchType: "EXACT",
                  value: "Organic Search",
                  caseSensitive: false,
                },
              },
            },
          },
          {
            dateRanges: [{ startDate: params.startDate, endDate: params.endDate }],
            dimensions: [{ name: "eventName" }],
            metrics: [{ name: "sessions" }],
            dimensionFilter: {
              filter: {
                fieldName: "eventName",
                inListFilter: {
                  values: ["add_to_cart", "begin_checkout", "purchase"],
                  caseSensitive: true,
                },
              },
            },
          },
        ],
      }),
      cache: "no-store",
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | (Ga4BatchResponse & { error?: { message?: string } })
    | null;

  if (!response.ok) {
    throw new Error(
      `GA4 respondeu com erro: ${payload?.error?.message ?? `HTTP ${response.status}`}`,
    );
  }

  const reports = payload?.reports ?? [];

  return {
    sessions: firstMetric(reports[0], 0),
    users: firstMetric(reports[0], 1),
    newUsers: firstMetric(reports[0], 2),
    organicSessions: firstMetric(reports[1], 0),
    addToCartSessions: eventSessions(reports[2], "add_to_cart"),
    beginCheckoutSessions: eventSessions(reports[2], "begin_checkout"),
    purchaseSessions: eventSessions(reports[2], "purchase"),
  };
}
