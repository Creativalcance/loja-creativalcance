import { createHash } from "node:crypto";

// Bump when generation or reconciliation rules change. A previous signature
// must never suppress regeneration under new business rules.
export const CUSTOMIZATION_GENERATION_VERSION = 1;

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
  }
  return value;
}

export function customizationFingerprint(input: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(canonical({ version: CUSTOMIZATION_GENERATION_VERSION, input })))
    .digest("hex");
}
