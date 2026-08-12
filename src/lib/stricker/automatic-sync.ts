import { randomUUID, timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStrickerSupplierId } from "@/lib/stricker/auth";
import { syncRestCatalogDataset } from "@/lib/stricker/rest/sync-catalog-datasets";
import {
  reconcileCommercialAvailability,
  syncCommercialDataset,
} from "@/lib/stricker/rest/sync-commercial-status";
import { syncRestCustomizationOptions } from "@/lib/stricker/rest/sync-customization-options";
import { syncRestCustomizationTables } from "@/lib/stricker/rest/sync-customization-tables";
import { syncRestOptionals } from "@/lib/stricker/rest/sync-optionals";
import { syncRestProducts } from "@/lib/stricker/rest/sync-products";
import { syncRestStocksByCountry } from "@/lib/stricker/rest/sync-stocks-by-country";

export const STRICKER_AUTOMATIC_SYNC_JOBS = [
  "stocks-pt",
  "stocks-cz",
  "availability",
  "colors",
  "product-types",
  "products-tree",
  "products",
  "optionals",
  "customization-tables",
  "customization-options",
  "canceled-products",
  "restricted-products",
] as const;

export type StrickerAutomaticSyncJob =
  (typeof STRICKER_AUTOMATIC_SYNC_JOBS)[number];

type JsonResult = Record<string, unknown>;

const LOCK_TTL_SECONDS = 330;
const CUSTOMIZATION_BATCH_SIZE = 50;

type CustomizationCursorPayload = {
  hasMore?: unknown;
  nextOffset?: unknown;
  nextCursor?: unknown;
  recordsTotal?: unknown;
};

function safeSecretEquals(received: string, expected: string): boolean {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);

  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

export function assertVercelCronRequest(request: NextRequest): void {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    throw new Error("CRON_SECRET não está configurado.");
  }

  const authorization = request.headers.get("authorization") ?? "";
  const expectedAuthorization = `Bearer ${cronSecret}`;

  if (!safeSecretEquals(authorization, expectedAuthorization)) {
    throw new Error("Pedido de sincronização automática não autorizado.");
  }
}

export function isStrickerAutomaticSyncJob(
  value: string,
): value is StrickerAutomaticSyncJob {
  return STRICKER_AUTOMATIC_SYNC_JOBS.includes(
    value as StrickerAutomaticSyncJob,
  );
}

async function acquireLock(params: {
  lockKey: string;
  ownerToken: string;
}): Promise<boolean> {
  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error } = await supabaseAdmin.rpc(
    "try_acquire_integration_sync_lock",
    {
      target_lock_key: params.lockKey,
      target_owner_token: params.ownerToken,
      target_ttl_seconds: LOCK_TTL_SECONDS,
    },
  );

  if (error) {
    throw new Error(`Não foi possível obter o bloqueio: ${error.message}`);
  }

  return data === true;
}

async function releaseLock(params: {
  lockKey: string;
  ownerToken: string;
}): Promise<void> {
  const supabaseAdmin = createSupabaseAdminClient();
  const { error } = await supabaseAdmin.rpc("release_integration_sync_lock", {
    target_lock_key: params.lockKey,
    target_owner_token: params.ownerToken,
  });

  if (error) {
    console.error("Falha ao libertar bloqueio de sincronização:", error.message);
  }
}

function getPositiveInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

function isSameUtcDay(left: string, right: Date): boolean {
  const parsed = new Date(left);

  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === right.toISOString().slice(0, 10)
  );
}

async function syncNextCustomizationOptionsBatch(): Promise<JsonResult> {
  const supabaseAdmin = createSupabaseAdminClient();
  const supplierId = await getStrickerSupplierId();
  const { data, error } = await supabaseAdmin
    .from("supplier_dataset_imports")
    .select("status, raw_payload, finished_at")
    .eq("dataset_name", "customizationOptions")
    .eq("supplier_id", supplierId)
    .in("status", ["success", "partial_success"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Não foi possível recuperar o progresso das personalizações: ${error.message}`,
    );
  }

  const rawPayload = (data?.raw_payload ?? {}) as CustomizationCursorPayload;
  const previousCycleCompleted = rawPayload.hasMore === false;

  if (
    previousCycleCompleted &&
    data?.finished_at &&
    isSameUtcDay(data.finished_at, new Date())
  ) {
    return {
      dataset: "customizationOptions",
      cycleComplete: true,
      message: "O ciclo diário de personalizações já foi concluído.",
    };
  }

  const continuingCycle = rawPayload.hasMore === true;
  const offset = continuingCycle
    ? (getPositiveInteger(rawPayload.nextOffset) ?? 0)
    : 0;
  const cursor =
    continuingCycle && typeof rawPayload.nextCursor === "string"
      ? rawPayload.nextCursor
      : null;
  const recordsTotal = continuingCycle
    ? getPositiveInteger(rawPayload.recordsTotal)
    : null;

  return syncRestCustomizationOptions({
    lang: "PT",
    offset,
    limit: CUSTOMIZATION_BATCH_SIZE,
    cursor,
    recordsTotal,
  });
}

async function runJob(job: StrickerAutomaticSyncJob): Promise<JsonResult> {
  switch (job) {
    case "stocks-pt":
      return syncRestStocksByCountry({ lang: "PT", country: "PT" });
    case "stocks-cz":
      return syncRestStocksByCountry({ lang: "PT", country: "CZ" });
    case "availability":
      return reconcileCommercialAvailability();
    case "colors":
      return syncRestCatalogDataset({ dataset: "colors", lang: "PT" });
    case "product-types":
      return syncRestCatalogDataset({ dataset: "productTypes", lang: "PT" });
    case "products-tree":
      return syncRestCatalogDataset({ dataset: "productsTree", lang: "PT" });
    case "products":
      return syncRestProducts({ lang: "PT" });
    case "optionals":
      return syncRestOptionals({ lang: "PT" });
    case "customization-tables":
      return syncRestCustomizationTables({ lang: "PT" });
    case "customization-options":
      return syncNextCustomizationOptionsBatch();
    case "canceled-products":
      return syncCommercialDataset({ dataset: "canceledProducts" });
    case "restricted-products":
      return syncCommercialDataset({ dataset: "restrictedProducts" });
  }
}

export async function runStrickerAutomaticSync(
  job: StrickerAutomaticSyncJob,
): Promise<
  | { skipped: true; reason: string }
  | { skipped: false; result: JsonResult }
> {
  const ownerToken = randomUUID();
  const lockKey = `stricker:${job}`;
  const acquired = await acquireLock({ lockKey, ownerToken });

  if (!acquired) {
    return {
      skipped: true,
      reason: "Já existe uma sincronização equivalente em execução.",
    };
  }

  try {
    return {
      skipped: false,
      result: await runJob(job),
    };
  } finally {
    await releaseLock({ lockKey, ownerToken });
  }
}
