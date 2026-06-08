import { getStrickerConfig } from "./config";
import type { StrickerProductsResponse, StrickerRawProduct } from "./types";

type StrickerRequestOptions = {
  method?: "GET" | "POST";
  body?: Record<string, unknown>;
  searchParams?: Record<string, string | number | boolean | undefined>;
};

function buildUrl(
  baseUrl: string,
  endpoint: string,
  searchParams?: Record<string, string | number | boolean | undefined>,
): string {
  const normalizedBaseUrl = baseUrl.endsWith("/")
    ? baseUrl.slice(0, -1)
    : baseUrl;

  const normalizedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  const url = new URL(`${normalizedBaseUrl}${normalizedEndpoint}`);

  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

export async function strickerRequest<T>(
  endpoint: string,
  options: StrickerRequestOptions = {},
): Promise<T> {
  const config = getStrickerConfig();

  const method = options.method ?? "GET";

  const response = await fetch(
    buildUrl(config.apiBaseUrl, endpoint, options.searchParams),
    {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-API-Key": config.apiKey,
        "X-Username": config.username,
        "X-Password": config.password,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(
      `Erro na comunicação com a Stricker. Status: ${response.status}. Resposta: ${errorBody}`,
    );
  }

  return response.json() as Promise<T>;
}

export async function fetchStrickerProducts(params?: {
  page?: number;
  perPage?: number;
}): Promise<StrickerProductsResponse> {
  const config = getStrickerConfig();

  const response = await strickerRequest<unknown>(config.productsEndpoint, {
    method: "GET",
    searchParams: {
      page: params?.page ?? 1,
      per_page: params?.perPage ?? 100,
    },
  });

  if (Array.isArray(response)) {
    return {
      products: response as StrickerRawProduct[],
    };
  }

  const parsed = response as Partial<StrickerProductsResponse>;

  return {
    products: Array.isArray(parsed.products) ? parsed.products : [],
    total: parsed.total,
    page: parsed.page,
    per_page: parsed.per_page,
    next_page: parsed.next_page,
  };
}