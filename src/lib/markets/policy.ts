import { normalizeCountryCode, normalizePortuguesePostalCode } from "./countries";

// Phase 1: preserve the existing Portuguese standard-rate product regime.
// This is NOT an OSS, chain-transaction, customs or exemption engine.
// Country selection never grants an exemption or enables another market.
export const MARKET_POLICY_VERSION = "pt-standard-postal-v1";
export type ReviewReason = "invalidCountry" | "internationalReview" | "invalidPostal" | "currencyReview";
export type TaxDecision =
  | { status: "review"; reason: ReviewReason }
  | { status: "ready"; rate: number; region: "continental" | "madeira" | "acores"; label: string; country: "PT"; postalCode: string };
export function assessCheckoutDestination(address: { country_code: string; postal_code: string }, currency = "EUR"): TaxDecision {
  const country = normalizeCountryCode(address.country_code);
  if (!country) return { status: "review", reason: "invalidCountry" };
  if (country !== "PT") return { status: "review", reason: "internationalReview" };
  const postalCode = normalizePortuguesePostalCode(address.postal_code);
  if (!postalCode) return { status: "review", reason: "invalidPostal" };
  if (currency.toUpperCase() !== "EUR") return { status: "review", reason: "currencyReview" };
  const prefix = Number(postalCode.slice(0, 4));
  const common = { status: "ready" as const, country: "PT" as const, postalCode };
  if (prefix >= 9500) return { ...common, rate: 0.16, region: "acores", label: "Açores" };
  if (prefix >= 9000) return { ...common, rate: 0.22, region: "madeira", label: "Madeira" };
  return { ...common, rate: 0.23, region: "continental", label: "Portugal Continental" };
}
