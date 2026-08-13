type JsonValue = null | boolean | number | string | JsonValue[] | {
  [key: string]: JsonValue;
};

function normalize(value: unknown): JsonValue {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : String(value);
  }

  if (Array.isArray(value)) {
    return value.map(normalize);
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entryValue]) => [key, normalize(entryValue)]),
    );
  }

  return String(value);
}

export function hasSupplierPayloadChanged(
  currentPayload: unknown,
  nextPayload: unknown,
): boolean {
  return JSON.stringify(normalize(currentPayload)) !== JSON.stringify(normalize(nextPayload));
}
