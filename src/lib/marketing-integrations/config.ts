export const GA4_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID?.trim() || "G-MN8VQ0D7FL";

export const GA4_PROPERTY_ID =
  process.env.GA4_PROPERTY_ID?.trim() || "550073737";

export const SEARCH_CONSOLE_SITE_URL =
  process.env.SEARCH_CONSOLE_SITE_URL?.trim() || "sc-domain:360-merchandising.com";

export const GOOGLE_ADS_CUSTOMER_ID =
  process.env.GOOGLE_ADS_CUSTOMER_ID?.trim() || "283-772-8944";

// Identificadores públicos da federação Vercel -> Google Cloud.
// Podem ser substituídos por variáveis de ambiente sem alterar o código.
export const GCP_PROJECT_NUMBER =
  process.env.GCP_PROJECT_NUMBER?.trim() || "437281673081";

export const GCP_WORKLOAD_IDENTITY_POOL_ID =
  process.env.GCP_WORKLOAD_IDENTITY_POOL_ID?.trim() || "vercel-360-merchandising";

export const GCP_WORKLOAD_IDENTITY_PROVIDER_ID =
  process.env.GCP_WORKLOAD_IDENTITY_PROVIDER_ID?.trim() || "vercel-360-merchandising";

export const GOOGLE_SERVICE_ACCOUNT_EMAIL =
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() ||
  "id-60-merchandising@merchandising-505713.iam.gserviceaccount.com";

export function getSearchConsoleSiteUrl(): string {
  return SEARCH_CONSOLE_SITE_URL;
}
