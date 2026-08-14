import { getStrickerConfig } from "@/lib/stricker/config";
import { getValidStrickerSessionToken } from "@/lib/stricker/auth";
import {
  type JsonRecord,
  type StrickerOrderApiResponse,
  type StrickerOrderDetails,
  type StrickerPlaceOrderPayload,
  type StrickerServiceOrderApiResponse,
  type StrickerServiceOrderPayload,
} from "@/lib/stricker/orders/types";

const DEFAULT_TIMEOUT_MS = 120_000;

type StrickerOrderRequestOptions = {
  testMode: boolean;
  timeoutMs?: number;
};

function isJsonRecord(value: unknown): value is JsonRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getNullableString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function getResponseErrorCode(
  response: StrickerOrderApiResponse,
): string | null {
  return (
    getNullableString(response.ErrorCode) ??
    getNullableString(response.errorCode)
  );
}

function getResponseErrorMessage(
  response: StrickerOrderApiResponse,
): string | null {
  return (
    getNullableString(response.ErrorMessage) ??
    getNullableString(response.errorMessage)
  );
}

function assertSuccessfulResponse(
  response: StrickerOrderApiResponse,
  method: string,
): void {
  const errorCode = getResponseErrorCode(response);
  const errorMessage = getResponseErrorMessage(response);

  if (errorCode || errorMessage) {
    throw new Error(
      [
        `Erro do fornecedor ${method}`,
        errorCode ? `código ${errorCode}` : null,
        errorMessage,
      ]
        .filter(Boolean)
        .join(": "),
    );
  }
}

function unwrapMethodResult(
  response: JsonRecord,
  resultKey:
    | "OrderV1Result"
    | "ServiceOrderV1Result"
    | "OrderDetailsV1Result",
): StrickerOrderApiResponse {
  const wrappedResult = response[resultKey];

  if (isJsonRecord(wrappedResult)) {
    return wrappedResult as StrickerOrderApiResponse;
  }

  return response as StrickerOrderApiResponse;
}

function extractOrderDetailsValue(
  response: StrickerOrderApiResponse,
): StrickerOrderDetails | null {
  const value =
    response.OrderDetails ??
    response.orderDetails ??
    null;

  if (Array.isArray(value)) {
    const firstRecord = value.find(
      (item): item is StrickerOrderDetails =>
        isJsonRecord(item),
    );

    return firstRecord ?? null;
  }

  if (isJsonRecord(value)) {
    return value as StrickerOrderDetails;
  }

  /*
   * Algumas versões do serviço devolvem diretamente os campos
   * da encomenda na raiz da resposta.
   */
  const rootStamp =
    getNullableString(response.OrderStamp) ??
    getNullableString(response.orderStamp);

  if (rootStamp) {
    return response as unknown as StrickerOrderDetails;
  }

  return null;
}

function getApiBaseUrl(): string {
  const config = getStrickerConfig();

  const configuredBaseUrl =
    process.env.STRICKER_ORDER_API_BASE_URL?.trim() ??
    config.apiBaseUrl?.trim() ??
    "https://ws.stricker-europe.com/api/v1SSL";

  return configuredBaseUrl.replace(/\/$/, "");
}

async function readJsonResponse(
  response: Response,
  method: string,
): Promise<JsonRecord> {
  const responseText = await response.text();
  const trimmedResponse = responseText.trim();

  if (!response.ok) {
    throw new Error(
      `Erro HTTP do fornecedor ${method}: ${response.status} ${
        trimmedResponse || response.statusText
      }`,
    );
  }

  if (!trimmedResponse) {
    throw new Error(
      `O fornecedor devolveu uma resposta vazia em ${method}.`,
    );
  }

  try {
    const parsed = JSON.parse(trimmedResponse) as unknown;

    if (!isJsonRecord(parsed)) {
      throw new Error(
        `A resposta do fornecedor ${method} não é um objeto JSON.`,
      );
    }

    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        `A resposta do fornecedor ${method} não pôde ser convertida para JSON: ${trimmedResponse.slice(
          0,
          500,
        )}`,
      );
    }

    throw error;
  }
}

async function callStrickerOrderMethod(params: {
  method: "OrderV1" | "ServiceOrderV1" | "OrderDetailsV1";
  payload: JsonRecord;
  testMode: boolean;
  timeoutMs?: number;
}): Promise<JsonRecord> {
  const token = await getValidStrickerSessionToken();
  const baseUrl = getApiBaseUrl();

  const url = new URL(`${baseUrl}/${params.method}`);

  url.searchParams.set("token", token);
  url.searchParams.set(
    "test",
    params.testMode ? "true" : "false",
  );
  if (params.method === "OrderDetailsV1") {
    url.searchParams.set("orderStamp", String(params.payload.OrderStamp ?? ""));
  }

  const abortController = new AbortController();

  const timeout = setTimeout(() => {
    abortController.abort();
  }, params.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      method: params.method === "OrderDetailsV1" ? "GET" : "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: params.method === "OrderDetailsV1" ? undefined : JSON.stringify(params.payload),
      cache: "no-store",
      signal: abortController.signal,
    });

    return await readJsonResponse(response, params.method);
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw new Error(
        `A ligação ao fornecedor excedeu o limite de ${
          params.timeoutMs ?? DEFAULT_TIMEOUT_MS
        } ms.`,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function submitStrickerProductOrder(
  payload: StrickerPlaceOrderPayload,
  options: StrickerOrderRequestOptions,
): Promise<{
  response: StrickerOrderApiResponse;
  orderDetails: StrickerOrderDetails;
}> {
  const rawResponse = await callStrickerOrderMethod({
    method: "OrderV1",
    payload: payload as unknown as JsonRecord,
    testMode: options.testMode,
    timeoutMs: options.timeoutMs,
  });

  const response = unwrapMethodResult(
    rawResponse,
    "OrderV1Result",
  );

  assertSuccessfulResponse(response, "OrderV1");

  const orderDetails =
    extractOrderDetailsValue(response);

  if (!orderDetails) {
    throw new Error(
      "O fornecedor aceitou o pedido, mas não devolveu os detalhes da encomenda.",
    );
  }

  return {
    response,
    orderDetails,
  };
}

export async function submitStrickerServiceOrder(
  payload: StrickerServiceOrderPayload,
  options: StrickerOrderRequestOptions,
): Promise<{
  response: StrickerServiceOrderApiResponse;
  orderDetails: StrickerOrderDetails | null;
}> {
  const rawResponse = await callStrickerOrderMethod({
    method: "ServiceOrderV1",
    payload: payload as unknown as JsonRecord,
    testMode: options.testMode,
    timeoutMs: options.timeoutMs,
  });

  const response = unwrapMethodResult(
    rawResponse,
    "ServiceOrderV1Result",
  ) as StrickerServiceOrderApiResponse;

  assertSuccessfulResponse(response, "ServiceOrderV1");

  return {
    response,
    orderDetails:
      extractOrderDetailsValue(response),
  };
}

export async function getStrickerOrderDetails(
  orderStamp: string,
  options: StrickerOrderRequestOptions,
): Promise<{ response: StrickerOrderApiResponse; orderDetails: StrickerOrderDetails }> {
  const rawResponse = await callStrickerOrderMethod({
    method: "OrderDetailsV1",
    payload: { OrderStamp: orderStamp },
    testMode: options.testMode,
    timeoutMs: options.timeoutMs,
  });
  const response = unwrapMethodResult(
    rawResponse,
    "OrderDetailsV1Result",
  );
  assertSuccessfulResponse(response, "OrderDetailsV1");
  const orderDetails = extractOrderDetailsValue(response);
  if (!orderDetails) throw new Error("O fornecedor não devolveu os detalhes da encomenda.");
  return { response, orderDetails };
}

export function extractStrickerOrderStamp(
  orderDetails: StrickerOrderDetails,
): string | null {
  return (
    getNullableString(orderDetails.OrderStamp) ??
    getNullableString(orderDetails.orderStamp)
  );
}

export function extractStrickerOrderStatus(
  orderDetails: StrickerOrderDetails,
): string | null {
  return (
    getNullableString(orderDetails.Status) ??
    getNullableString(orderDetails.status)
  );
}

export function extractStrickerTrackingNumber(
  orderDetails: StrickerOrderDetails,
): string | null {
  return (
    getNullableString(orderDetails.TrackingID) ??
    getNullableString(orderDetails.Tracking) ??
    getNullableString(orderDetails.tracking)
  );
}

export function extractStrickerTrackingUrl(
  orderDetails: StrickerOrderDetails,
): string | null {
  return (
    getNullableString(orderDetails.TrackingLink) ??
    getNullableString(orderDetails.trackingLink)
  );
}

export function extractStrickerShippingDate(orderDetails: StrickerOrderDetails): string | null {
  return getNullableString(orderDetails.ShippingDate) ?? getNullableString(orderDetails.shippingDate);
}

export function extractStrickerOrderLines(
  orderDetails: StrickerOrderDetails,
) {
  const lines =
    orderDetails.OrderLines ??
    orderDetails.orderLines ??
    [];

  return Array.isArray(lines) ? lines : [];
}

export function extractStrickerOrderLineStamp(
  line: JsonRecord,
): string | null {
  return (
    getNullableString(line.OrderLineStamp) ??
    getNullableString(line.LineStamp) ??
    getNullableString(line.Stamp) ??
    getNullableString(line.orderLineStamp) ??
    getNullableString(line.lineStamp)
  );
}

export function extractStrickerLineSku(
  line: JsonRecord,
): string | null {
  return (
    getNullableString(line.Sku) ??
    getNullableString(line.SKU) ??
    getNullableString(line.ProductReference) ??
    getNullableString(line.productReference)
  );
}
