export type StrickerConfig = {
  accessKey: string;
  apiBaseUrl: string;
  downloadBaseUrl: string;
  defaultLanguage: string;
  defaultCountry: string;
  defaultMarginPercentage: number;
  orderTestMode: boolean;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} não está configurada.`);
  }

  return value;
}

function getOptionalEnv(name: string, fallback: string): string {
  const value = process.env[name]?.trim();

  return value && value.length > 0 ? value : fallback;
}

function getOptionalEnvFromNames(names: string[], fallback: string): string {
  for (const name of names) {
    const value = process.env[name]?.trim();

    if (value && value.length > 0) {
      return value;
    }
  }

  return fallback;
}

function getOptionalNumberEnv(name: string, fallback: number): number {
  const value = process.env[name]?.trim();

  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function getOptionalBooleanEnv(name: string, fallback: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();

  if (!value) {
    return fallback;
  }

  return ["true", "1", "yes", "sim"].includes(value);
}

export function getStrickerConfig(): StrickerConfig {
  return {
    accessKey: getRequiredEnv("STRICKER_ACCESS_KEY"),
    apiBaseUrl: getOptionalEnv(
      "STRICKER_API_BASE_URL",
      "https://ws.stricker-europe.com/api/v1SSL",
    ).replace(/\/$/, ""),
    downloadBaseUrl: getOptionalEnv(
      "STRICKER_DOWNLOAD_BASE_URL",
      "https://ws.stricker-europe.com/downloads/v1ssl/file",
    ).replace(/\/$/, ""),
    defaultLanguage: getOptionalEnvFromNames(
      ["STRICKER_DEFAULT_LANGUAGE", "STRICKER_DEFAULT_LANG"],
      "PT",
    ).toUpperCase(),
    defaultCountry: getOptionalEnv(
      "STRICKER_DEFAULT_COUNTRY",
      "PT",
    ).toUpperCase(),
    defaultMarginPercentage: getOptionalNumberEnv(
      "LOJA_CREATIV_DEFAULT_MARGIN_PERCENTAGE",
      35,
    ),
    orderTestMode: getOptionalBooleanEnv("STRICKER_ORDER_TEST_MODE", true),
  };
}