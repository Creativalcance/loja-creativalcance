// @ts-nocheck

// import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";

type StrickerRawProduct = {
  id?: string | number;
  product_id?: string | number;
  code?: string;
  sku?: string;
  reference?: string;
  name?: string;
  title?: string;
  description?: string;
  short_description?: string;
  brand?: string;
  material?: string;
  dimensions?: string;
  weight?: string | number;
  category?: string;
  category_id?: string | number;
  images?: unknown[];
  variants?: unknown[];
  prices?: unknown[];
  stocks?: unknown[];
  printing_techniques?: unknown[];
  [key: string]: unknown;
};

type StrickerProductsResponse = {
  products?: StrickerRawProduct[];
  total?: number;
  page?: number;
  per_page?: number;
  next_page?: number | null;
};

type SyncResult = {
  success: boolean;
  supplierId: string | null;
  syncBatchId: string | null;
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  message: string;
};

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`${name} não está configurado.`);
  }

  return value;
}

function createSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "e")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const stringValue = String(value).trim();

  return stringValue.length > 0 ? stringValue : null;
}

function toRequiredString(value: unknown, fallback: string): string {
  return toNullableString(value) ?? fallback;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "sim", "s"].includes(normalized)) return true;
    if (["false", "0", "no", "não", "nao", "n"].includes(normalized)) return false;
  }
  return fallback;
}

function createPayloadHash(payload: unknown): string {
  const json = JSON.stringify(payload);

  let hash = 0;

  for (let index = 0; index < json.length; index += 1) {
    const character = json.charCodeAt(index);
    hash = (hash << 5) - hash + character;
    hash |= 0;
  }

  return Math.abs(hash).toString(16);
}

function buildStrickerUrl(baseUrl: string, endpoint: string): string {
  const normalizedBaseUrl = baseUrl.endsWith("/")
    ? baseUrl.slice(0, -1)
    : baseUrl;

  const normalizedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  return `${normalizedBaseUrl}${normalizedEndpoint}`;
}

async function fetchStrickerProducts(): Promise<StrickerRawProduct[]> {
  const apiBaseUrl = getRequiredEnv("STRICKER_API_BASE_URL");
  const apiUsername = getRequiredEnv("STRICKER_API_USERNAME");
  const apiPassword = getRequiredEnv("STRICKER_API_PASSWORD");
  const apiKey = getRequiredEnv("STRICKER_API_KEY");
  const productsEndpoint = getRequiredEnv("STRICKER_PRODUCTS_ENDPOINT");

  const response = await fetch(buildStrickerUrl(apiBaseUrl, productsEndpoint), {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
      "X-Username": apiUsername,
      "X-Password": apiPassword,
    },
  });

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Erro ao obter produtos da Stricker. Status: ${response.status}. Resposta: ${body}`,
    );
  }

  const data = (await response.json()) as
    | StrickerProductsResponse
    | StrickerRawProduct[];

  if (Array.isArray(data)) {
    return data;
  }

  return Array.isArray(data.products) ? data.products : [];
}

Deno.serve(async () => {
  const supabaseUrl = getRequiredEnv("SUPABASE_URL");
  const supabaseServiceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  let supplierId: string | null = null;
  let syncBatchId: string | null = null;
  let totalRecords = 0;
  let successfulRecords = 0;
  let failedRecords = 0;

  try {
    const { data: supplier, error: supplierError } = await supabase
      .from("suppliers")
      .select("id")
      .eq("slug", "stricker")
      .single();

    if (supplierError || !supplier) {
      throw new Error(
        supplierError?.message ?? "Fornecedor Stricker não encontrado.",
      );
    }

    supplierId = supplier.id as string;

    const { data: syncBatch, error: syncBatchError } = await supabase
      .from("sync_batches")
      .insert({
        supplier_id: supplierId,
        sync_type: "products",
        status: "running",
        total_records: 0,
        successful_records: 0,
        failed_records: 0,
      })
      .select("id")
      .single();

    if (syncBatchError || !syncBatch) {
      throw new Error(
        syncBatchError?.message ?? "Não foi possível criar o batch.",
      );
    }

    syncBatchId = syncBatch.id as string;

    const rawProducts = await fetchStrickerProducts();

    totalRecords = rawProducts.length;

    for (const rawProduct of rawProducts) {
      try {
        const externalId = toRequiredString(
          rawProduct.id ??
            rawProduct.product_id ??
            rawProduct.code ??
            rawProduct.sku,
          crypto.randomUUID(),
        );

        const sku = toRequiredString(
          rawProduct.sku ?? rawProduct.code ?? rawProduct.reference ?? externalId,
          externalId,
        );

        const name = toRequiredString(
          rawProduct.name ?? rawProduct.title,
          `Produto ${sku}`,
        );

        const payloadHash = createPayloadHash(rawProduct);

        const { error: rawError } = await supabase
          .from("supplier_products_raw")
          .upsert(
            {
              supplier_id: supplierId,
              external_product_id: externalId,
              payload: rawProduct,
              payload_hash: payloadHash,
              sync_batch_id: syncBatchId,
              status: "processed",
              processed_at: new Date().toISOString(),
            },
            {
              onConflict: "supplier_id,external_product_id,payload_hash",
            },
          );

        if (rawError) {
          throw new Error(rawError.message);
        }

        const { error: productError } = await supabase.from("products").upsert(
          {
            supplier_id: supplierId,
            external_id: externalId,
            sku,
            name,
            slug: createSlug(`${name}-${sku}`),
            short_description: toNullableString(rawProduct.short_description),
            description: toNullableString(rawProduct.description),
            brand: toNullableString(rawProduct.brand),
            material: toNullableString(rawProduct.material),
            dimensions: toNullableString(rawProduct.dimensions),
            weight: toNullableNumber(rawProduct.weight),
            status: "active",
            is_active: true,
            is_featured: toBoolean(
              rawProduct.Novelties ??
                rawProduct.novelties ??
                rawProduct.IsFeatured ??
                rawProduct.is_featured,
              false,
            ),
            is_customizable: true,
            min_order_quantity: 1,
            supplier_payload: rawProduct,
          },
          {
            onConflict: "supplier_id,external_id",
          },
        );

        if (productError) {
          throw new Error(productError.message);
        }

        successfulRecords += 1;
      } catch (productError) {
        failedRecords += 1;

        await supabase.from("integration_logs").insert({
          supplier_id: supplierId,
          sync_batch_id: syncBatchId,
          level: "error",
          event_type: "product_sync_error",
          message:
            productError instanceof Error
              ? productError.message
              : "Erro desconhecido ao sincronizar produto.",
          payload: {
            rawProduct,
          },
        });
      }
    }

    const finalStatus =
      failedRecords === 0
        ? "success"
        : successfulRecords > 0
          ? "partial_success"
          : "failed";

    await supabase
      .from("sync_batches")
      .update({
        status: finalStatus,
        finished_at: new Date().toISOString(),
        total_records: totalRecords,
        successful_records: successfulRecords,
        failed_records: failedRecords,
      })
      .eq("id", syncBatchId);

    await supabase
      .from("suppliers")
      .update({
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", supplierId);

    const result: SyncResult = {
      success: finalStatus !== "failed",
      supplierId,
      syncBatchId,
      totalRecords,
      successfulRecords,
      failedRecords,
      message: "Sincronização de produtos Stricker concluída.",
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro desconhecido na sincronização Stricker.";

    if (syncBatchId) {
      await supabase
        .from("sync_batches")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          total_records: totalRecords,
          successful_records: successfulRecords,
          failed_records: failedRecords,
          error_message: message,
        })
        .eq("id", syncBatchId);
    }

    if (supplierId) {
      await supabase.from("integration_logs").insert({
        supplier_id: supplierId,
        sync_batch_id: syncBatchId,
        level: "critical",
        event_type: "stricker_sync_failed",
        message,
        payload: {},
      });
    }

    const result: SyncResult = {
      success: false,
      supplierId,
      syncBatchId,
      totalRecords,
      successfulRecords,
      failedRecords,
      message,
    };

    return new Response(JSON.stringify(result), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
});
