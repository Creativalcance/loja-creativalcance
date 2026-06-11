import { getStrickerConfig } from "@/lib/stricker/config";
import { getValidStrickerSessionToken } from "@/lib/stricker/auth";
import {
  type JsonRecord,
  type StrickerProductsResponse,
  type StrickerProductRaw,
  type StrickerSyncProductsParams,
} from "@/lib/stricker/types";

type StrickerRestMethod =
  | "ProductsTree"
  | "Products"
  | "Optionals"
  | "OptionalsPrice"
  | "OptionalsComplete"
  | "CustomizationOptions"
  | "CustomizationTables"
  | "Colors"
  | "Stocks"
  | "StocksByCountry"
  | "ProductTypes"
  | "CanceledProducts"
  | "RestrictedProducts";

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractArrayFromPayload(
  payload: unknown,
  candidateKeys: string[],
): JsonRecord[] {
  if (Array.isArray(payload)) {
    return payload.filter(isJsonRecord);
  }

  if (!isJsonRecord(payload)) {
    return [];
  }

  for (const key of candidateKeys) {
    const value = payload[key];

    if (Array.isArray(value)) {
      return value.filter(isJsonRecord);
    }
  }

  return [payload];
}

function extractCount(payload: unknown, fallback: number): number | null {
  if (!isJsonRecord(payload)) {
    return fallback;
  }

  const count = payload.Count ?? payload.count ?? payload.Total ?? payload.total;

  if (typeof count === "number" && Number.isFinite(count)) {
    return count;
  }

  if (typeof count === "string") {
    const parsed = Number(count);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function getForcedStrickerLanguage(): string {
  const config = getStrickerConfig();

  return config.defaultLanguage.trim().toUpperCase() || "PT";
}

async function callStrickerRestMethod(
  method: StrickerRestMethod,
  params: Record<string, string> = {},
): Promise<unknown> {
  const config = getStrickerConfig();
  const token = await getValidStrickerSessionToken();

  const forcedLanguage = getForcedStrickerLanguage();

  const url = new URL(`${config.apiBaseUrl}/${method}`);
  url.searchParams.set("token", token);

  for (const [key, value] of Object.entries(params)) {
    if (key === "lang") {
      url.searchParams.set("lang", forcedLanguage);
    } else {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const responseText = await response.text();

    throw new Error(
      `Erro Stricker ${method}: ${response.status} ${
        responseText || response.statusText
      }`,
    );
  }

  return response.json();
}

export async function fetchStrickerProducts(
  params: StrickerSyncProductsParams = {},
): Promise<StrickerProductsResponse> {
  const payload = await callStrickerRestMethod("Products", {
    lang: getForcedStrickerLanguage(),
  });

  const products = extractArrayFromPayload(payload, [
    "Products",
    "products",
    "Data",
    "data",
    "Items",
    "items",
  ]) as StrickerProductRaw[];

  return {
    products,
    total: extractCount(payload, products.length),
    page: params.page ?? null,
    limit: params.limit ?? null,
  };
}

export async function fetchStrickerProductsTree(
  _lang?: string,
): Promise<JsonRecord[]> {
  const payload = await callStrickerRestMethod("ProductsTree", {
    lang: getForcedStrickerLanguage(),
  });

  return extractArrayFromPayload(payload, [
    "ProductsTree",
    "productsTree",
    "Products",
    "products",
    "Data",
    "data",
  ]);
}

export async function fetchStrickerOptionals(
  _lang?: string,
): Promise<JsonRecord[]> {
  const payload = await callStrickerRestMethod("Optionals", {
    lang: getForcedStrickerLanguage(),
  });

  return extractArrayFromPayload(payload, [
    "Optionals",
    "optionals",
    "Data",
    "data",
  ]);
}

export async function fetchStrickerOptionalsComplete(
  _lang?: string,
): Promise<JsonRecord[]> {
  const payload = await callStrickerRestMethod("OptionalsComplete", {
    lang: getForcedStrickerLanguage(),
  });

  return extractArrayFromPayload(payload, [
    "OptionalsComplete",
    "optionalsComplete",
    "Optionals",
    "optionals",
    "Data",
    "data",
  ]);
}

export async function fetchStrickerStocksByCountry(
  country?: string,
  _lang?: string,
): Promise<JsonRecord[]> {
  const config = getStrickerConfig();

  const payload = await callStrickerRestMethod("StocksByCountry", {
    country: country ?? config.defaultCountry,
    lang: getForcedStrickerLanguage(),
  });

  return extractArrayFromPayload(payload, [
    "Stocks",
    "stocks",
    "Data",
    "data",
  ]);
}

export async function fetchStrickerColors(_lang?: string): Promise<JsonRecord[]> {
  const payload = await callStrickerRestMethod("Colors", {
    lang: getForcedStrickerLanguage(),
  });

  return extractArrayFromPayload(payload, [
    "Colors",
    "colors",
    "Colours",
    "colours",
    "Data",
    "data",
  ]);
}