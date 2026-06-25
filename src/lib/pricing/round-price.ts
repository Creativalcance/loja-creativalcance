import type { PricingRoundingMode } from "@/lib/pricing/types";

const EPSILON = 0.0000001;

function toMoney(value: number): number {
  return Number((Math.round((value + EPSILON) * 100) / 100).toFixed(2));
}

function ceilToStep(value: number, step: number): number {
  return toMoney(Math.ceil((value - EPSILON) / step) * step);
}

function ceilToCommercialEnding(value: number, cents: number): number {
  const safeValue = Math.max(0, value);
  const integerPart = Math.floor(safeValue);
  const firstCandidate = integerPart + cents;

  if (firstCandidate + EPSILON >= safeValue) {
    return toMoney(firstCandidate);
  }

  return toMoney(integerPart + 1 + cents);
}

export function roundBusinessPrice(
  value: number,
  mode: PricingRoundingMode = "commercial_05",
): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  if (mode === "none") {
    return toMoney(value);
  }

  if (mode === "ceil_01") {
    return ceilToStep(value, 0.01);
  }

  if (mode === "ceil_05" || mode === "commercial_05") {
    return ceilToStep(value, 0.05);
  }

  if (mode === "ceil_10") {
    return ceilToStep(value, 0.1);
  }

  if (mode === "commercial_09") {
    return ceilToCommercialEnding(value, 0.09);
  }

  if (mode === "commercial_49") {
    return ceilToCommercialEnding(value, 0.49);
  }

  if (mode === "commercial_90") {
    return ceilToCommercialEnding(value, 0.9);
  }

  return ceilToStep(value, 0.05);
}