import {
  type StrickerAuthenticateResponse,
  type StrickerCloseSessionResponse,
  type StrickerCountry,
  type StrickerDatasetName,
  type StrickerDatasetRequest,
  type StrickerDatasetResponse,
  type StrickerFetchOptions,
  type StrickerLanguage,
  type StrickerValidateSessionResponse,
} from "./types";

const DEFAULT_BASE_URL = "https://ws.stricker-europe.com/api/v1SSL";
const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_RETRIES = 2;
const RETRY_DELAY_MS = 2_000;
const DEFAULT_LANGUAGE: StrickerLanguage = "PT";

type RequestMethod = "GET" | "POST";

const ALLOWED_LANGUAGES: StrickerLanguage[] = [
  "BG",
  "CZ",
  "DE",
  "DK",
  "EN",
  "ES",
  "FI",
  "FR",
  "GR",
  "HR",
  "HU",
  "IT",
  "NL",
  "NO",
  "PL",
  "PT",
  "RO",
  "RS",
  "RU",
  "SE",
  "SK",
  "UA",
];

function getBaseUrl(): string {
  const configured = process.env.STRICKER_API_BASE_URL?.trim();

  if (!configured) {
    return DEFAULT_BASE_URL;
  }

  return configured.replace(/\/+$/g, "");
}

export function getDefaultStrickerLanguage(): StrickerLanguage {
  const configured = process.env.STRICKER_DEFAULT_LANGUAGE?.trim().toUpperCase();

  if (configured && ALLOWED_LANGUAGES.includes(configured as StrickerLanguage)) {
    return configured as StrickerLanguage;
  }

  return DEFAULT_LANGUAGE;
}

function getAccessKey(): string {
  const accessKey = process.env.STRICKER_ACCESS_KEY?.trim();

  if (!accessKey) {
    throw new Error("Variável STRICKER_ACCESS_KEY em falta.");
  }

  return accessKey;
}

function buildUrl(pathname: string, params: Record<string, string>): string {
  const baseUrl = getBaseUrl();
  const normalizedPathname = pathname.replace(/^\/+/g, "");
  const url = new URL(`${baseUrl}/${normalizedPathname}`);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

function getErrorMessageFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const maybeRecord = payload as {
    ErrorCode?: unknown;
    ErrorMessage?: unknown;
  };

  const errorCode = maybeRecord.ErrorCode;
  const errorMessage = maybeRecord.ErrorMessage;

  if (
    errorCode !== null &&
    errorCode !== undefined &&
    String(errorCode).trim().length > 0
  ) {
    return typeof errorMessage === "string" && errorMessage.trim().length > 0
      ? `Erro Stricker ${String(errorCode)}: ${errorMessage}`
      : `Erro Stricker ${String(errorCode)}.`;
  }

  if (typeof errorMessage === "string" && errorMessage.trim().length > 0) {
    return errorMessage;
  }

  return null;
}

function isRetryableFetchError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }

  if (error instanceof TypeError) {
    return true;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    return (
      message.includes("fetch failed") ||
      message.includes("terminated") ||
      message.includes("timeout") ||
      message.includes("econnreset") ||
      message.includes("socket") ||
      message.includes("network")
    );
  }

  return false;
}

function getReadableFetchError(error: unknown, timeoutMs: number): Error {
  if (error instanceof DOMException && error.name === "AbortError") {
    return new Error(`Timeout ao contactar a Stricker após ${timeoutMs}ms.`);
  }

  if (error instanceof TypeError && error.message === "fetch failed") {
    return new Error(
      "Falha de rede ao contactar a Stricker. O endpoint pode ter fechado a ligação durante a transferência do dataset.",
    );
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error("Erro inesperado ao contactar a Stricker.");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchJsonOnce<TResponse>(
  pathname: string,
  params: Record<string, string>,
  options: StrickerFetchOptions & {
    method?: RequestMethod;
    body?: unknown;
  } = {},
): Promise<TResponse> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(buildUrl(pathname, params), {
      method: options.method ?? "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(
        `Erro HTTP Stricker ${response.status}: ${
          text.trim().length > 0 ? text.slice(0, 500) : response.statusText
        }`,
      );
    }

    if (text.trim().length === 0) {
      return {} as TResponse;
    }

    const payload = JSON.parse(text) as TResponse;
    const apiError = getErrorMessageFromPayload(payload);

    if (apiError) {
      throw new Error(apiError);
    }

    return payload;
  } catch (error) {
    throw getReadableFetchError(error, timeoutMs);
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson<TResponse>(
  pathname: string,
  params: Record<string, string>,
  options: StrickerFetchOptions & {
    method?: RequestMethod;
    body?: unknown;
  } = {},
): Promise<TResponse> {
  const maxRetries = DEFAULT_RETRIES;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await fetchJsonOnce<TResponse>(pathname, params, options);
    } catch (error) {
      lastError = error;

      if (!isRetryableFetchError(error) || attempt === maxRetries) {
        throw error;
      }

      await sleep(RETRY_DELAY_MS * (attempt + 1));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Erro inesperado ao contactar a Stricker.");
}

function getDatasetPathname(dataset: StrickerDatasetName): string {
  if (dataset === "productsTree") {
    return "productsTree";
  }

  if (dataset === "products") {
    return "products";
  }

  if (dataset === "productTypes") {
    return "productTypes";
  }

  if (dataset === "optionals") {
    return "optionals";
  }

  if (dataset === "optionalsPrice") {
    return "optionalsPrice";
  }

  if (dataset === "optionalsComplete") {
    return "optionalsComplete";
  }

  if (dataset === "customizationOptions") {
    return "customizationOptions";
  }

  if (dataset === "customizationTables") {
    return "customizationTables";
  }

  if (dataset === "colors") {
    return "colors";
  }

  if (dataset === "stocks") {
    return "Stocks";
  }

  if (dataset === "stocksByCountry") {
    return "StocksByCountry";
  }

  if (dataset === "canceledProducts") {
    return "canceledProducts";
  }

  if (dataset === "restrictedProducts") {
    return "RestrictedProducts";
  }

  if (dataset === "printingSlas") {
    return "printingslas";
  }

  throw new Error(`Dataset Stricker não suportado: ${dataset}`);
}

export async function authenticateStrickerClient(
  options: StrickerFetchOptions = {},
): Promise<StrickerAuthenticateResponse> {
  return fetchJson<StrickerAuthenticateResponse>(
    "AuthenticateClient",
    {
      accessKey: getAccessKey(),
    },
    options,
  );
}

export async function validateStrickerSession(
  token: string,
  options: StrickerFetchOptions = {},
): Promise<StrickerValidateSessionResponse> {
  return fetchJson<StrickerValidateSessionResponse>(
    "ValidateSession",
    {
      token,
    },
    options,
  );
}

export async function closeStrickerSession(
  token: string,
  options: StrickerFetchOptions = {},
): Promise<StrickerCloseSessionResponse> {
  return fetchJson<StrickerCloseSessionResponse>(
    "CloseSession",
    {
      token,
    },
    options,
  );
}

export async function fetchStrickerDataset(
  request: StrickerDatasetRequest,
  options: StrickerFetchOptions = {},
): Promise<StrickerDatasetResponse> {
  const params: Record<string, string> = {
    token: request.token,
  };

  if (
    request.dataset !== "canceledProducts" &&
    request.dataset !== "restrictedProducts"
  ) {
    params.lang = request.lang ?? getDefaultStrickerLanguage();
  }

  if (request.dataset === "stocksByCountry") {
    params.country = request.country ?? "PT";
  }

  return fetchJson<StrickerDatasetResponse>(
    getDatasetPathname(request.dataset),
    params,
    options,
  );
}

export async function fetchStrickerProducts(
  token: string,
  lang: StrickerLanguage = getDefaultStrickerLanguage(),
): Promise<StrickerDatasetResponse> {
  return fetchStrickerDataset({
    dataset: "products",
    token,
    lang,
  });
}

export async function fetchStrickerProductsTree(
  token: string,
  lang: StrickerLanguage = getDefaultStrickerLanguage(),
): Promise<StrickerDatasetResponse> {
  return fetchStrickerDataset({
    dataset: "productsTree",
    token,
    lang,
  });
}

export async function fetchStrickerProductTypes(
  token: string,
  lang: StrickerLanguage = getDefaultStrickerLanguage(),
): Promise<StrickerDatasetResponse> {
  return fetchStrickerDataset({
    dataset: "productTypes",
    token,
    lang,
  });
}

export async function fetchStrickerOptionals(
  token: string,
  lang: StrickerLanguage = getDefaultStrickerLanguage(),
): Promise<StrickerDatasetResponse> {
  return fetchStrickerDataset({
    dataset: "optionals",
    token,
    lang,
  });
}

export async function fetchStrickerOptionalsPrice(
  token: string,
  lang: StrickerLanguage = getDefaultStrickerLanguage(),
): Promise<StrickerDatasetResponse> {
  return fetchStrickerDataset({
    dataset: "optionalsPrice",
    token,
    lang,
  });
}

export async function fetchStrickerOptionalsComplete(
  token: string,
  lang: StrickerLanguage = getDefaultStrickerLanguage(),
): Promise<StrickerDatasetResponse> {
  return fetchStrickerDataset({
    dataset: "optionalsComplete",
    token,
    lang,
  });
}

export async function fetchStrickerCustomizationTables(
  token: string,
  lang: StrickerLanguage = getDefaultStrickerLanguage(),
): Promise<StrickerDatasetResponse> {
  return fetchStrickerDataset({
    dataset: "customizationTables",
    token,
    lang,
  });
}

export async function fetchStrickerCustomizationOptions(
  token: string,
  lang: StrickerLanguage = getDefaultStrickerLanguage(),
): Promise<StrickerDatasetResponse> {
  return fetchStrickerDataset({
    dataset: "customizationOptions",
    token,
    lang,
  });
}

export async function fetchStrickerColors(
  token: string,
  lang: StrickerLanguage = getDefaultStrickerLanguage(),
): Promise<StrickerDatasetResponse> {
  return fetchStrickerDataset({
    dataset: "colors",
    token,
    lang,
  });
}

export async function fetchStrickerStocks(
  token: string,
  lang: StrickerLanguage = getDefaultStrickerLanguage(),
): Promise<StrickerDatasetResponse> {
  return fetchStrickerDataset({
    dataset: "stocks",
    token,
    lang,
  });
}

export async function fetchStrickerStocksByCountry(
  token: string,
  country: StrickerCountry = "PT",
  lang: StrickerLanguage = getDefaultStrickerLanguage(),
): Promise<StrickerDatasetResponse> {
  return fetchStrickerDataset({
    dataset: "stocksByCountry",
    token,
    country,
    lang,
  });
}

export async function fetchStrickerCanceledProducts(
  token: string,
): Promise<StrickerDatasetResponse> {
  return fetchStrickerDataset({
    dataset: "canceledProducts",
    token,
  });
}

export async function fetchStrickerRestrictedProducts(
  token: string,
): Promise<StrickerDatasetResponse> {
  return fetchStrickerDataset({
    dataset: "restrictedProducts",
    token,
  });
}

export async function fetchStrickerPrintingSlas(
  token: string,
  lang: StrickerLanguage = getDefaultStrickerLanguage(),
): Promise<StrickerDatasetResponse> {
  return fetchStrickerDataset({
    dataset: "printingSlas",
    token,
    lang,
  });
}