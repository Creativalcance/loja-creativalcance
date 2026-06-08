export function createSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "e")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const stringValue = String(value).trim();

  return stringValue.length > 0 ? stringValue : null;
}

export function toRequiredString(value: unknown, fallback: string): string {
  const stringValue = toNullableString(value);

  return stringValue ?? fallback;
}

export function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

export function toRequiredNumber(value: unknown, fallback: number): number {
  const numberValue = toNullableNumber(value);

  return numberValue ?? fallback;
}

export function createPayloadHash(payload: unknown): string {
  const json = JSON.stringify(payload);

  let hash = 0;

  for (let index = 0; index < json.length; index += 1) {
    const character = json.charCodeAt(index);
    hash = (hash << 5) - hash + character;
    hash |= 0;
  }

  return Math.abs(hash).toString(16);
}