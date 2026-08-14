import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStrickerSupplierId } from "@/lib/stricker/auth";
import { fetchStrickerDataset } from "@/lib/stricker/rest/client";
import { getValidStrickerSessionToken } from "@/lib/stricker/rest/session";
import type { StrickerLanguage } from "@/lib/stricker/rest/types";
import { assertSyncNotCancelled } from "@/lib/stricker/sync-control";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

type DatasetImportRow = {
  id: string;
};

type PrintingSlaRecord = {
  TableCodeOption?: unknown;
  Options?: unknown;
};

type SlaRow = {
  supplier_id: string;
  table_code_option: string;
  warehouse_code: "PT" | "CZ";
  quantity_min: number;
  quantity_max: number | null;
  production_days: number;
  is_available: boolean;
  raw_payload: Record<string, unknown>;
  source_updated_at: string;
  updated_at: string;
};

type ExistingRow = {
  id: string;
  table_code_option: string;
  warehouse_code: "PT" | "CZ";
  quantity_min: number;
  quantity_max: number | null;
  production_days: number;
  is_available: boolean;
};

const CHUNK_SIZE = 500;

async function createDatasetImport(params: {
  supabase: SupabaseAdminClient;
  supplierId: string;
  lang: StrickerLanguage;
}): Promise<string> {
  const { data, error } = await params.supabase
    .from("supplier_dataset_imports")
    .insert({
      supplier_id: params.supplierId,
      dataset_name: "printingSlas",
      language: params.lang,
      country: null,
      extension: "json",
      status: "running",
      records_received: 0,
      records_imported: 0,
      records_failed: 0,
      source_url: "stricker-rest",
      raw_payload: {},
      errors: [],
      started_at: new Date().toISOString(),
      finished_at: null,
    })
    .select("id")
    .single<DatasetImportRow>();

  if (error || !data) {
    throw new Error(error?.message ?? "Não foi possível criar o registo de sincronização.");
  }

  return data.id;
}

async function finishDatasetImport(params: {
  supabase: SupabaseAdminClient;
  datasetImportId: string;
  status: "success" | "failed";
  recordsReceived: number;
  recordsImported: number;
  errors: string[];
}): Promise<void> {
  const { error } = await params.supabase
    .from("supplier_dataset_imports")
    .update({
      status: params.status,
      records_received: params.recordsReceived,
      records_imported: params.recordsImported,
      records_failed: params.status === "failed" ? 1 : 0,
      errors: params.errors,
      finished_at: new Date().toISOString(),
    })
    .eq("id", params.datasetImportId)
    .eq("status", "running");

  if (error) throw new Error(error.message);
}

function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function positiveInteger(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
}

function key(row: Pick<SlaRow, "table_code_option" | "warehouse_code" | "quantity_min">): string {
  return `${row.table_code_option}:${row.warehouse_code}:${row.quantity_min}`;
}

function buildRows(records: PrintingSlaRecord[], supplierId: string): SlaRow[] {
  const now = new Date().toISOString();
  const rows: SlaRow[] = [];

  for (const record of records) {
    const tableCodeOption = text(record.TableCodeOption);
    if (!tableCodeOption || !Array.isArray(record.Options)) continue;

    for (const rawOption of record.Options) {
      if (!rawOption || typeof rawOption !== "object" || Array.isArray(rawOption)) continue;
      const option = rawOption as Record<string, unknown>;
      const warehouse = text(option.Warehouse);
      if ((warehouse !== "PT" && warehouse !== "CZ") || !Array.isArray(option.Slas)) continue;

      const tiers = option.Slas.flatMap((rawSla) => {
        if (!rawSla || typeof rawSla !== "object" || Array.isArray(rawSla)) return [];
        const sla = rawSla as Record<string, unknown>;
        const quantityMin = positiveInteger(sla.MinQuantity);
        const days = positiveInteger(sla.Days);
        return quantityMin && days ? [{ quantityMin, days, raw: sla }] : [];
      }).sort((left, right) => left.quantityMin - right.quantityMin);

      tiers.forEach((tier, index) => {
        const next = tiers[index + 1];
        rows.push({
          supplier_id: supplierId,
          table_code_option: tableCodeOption,
          warehouse_code: warehouse,
          quantity_min: tier.quantityMin,
          quantity_max: next ? next.quantityMin - 1 : null,
          production_days: tier.days,
          is_available: tier.days < 99,
          raw_payload: { TableCodeOption: tableCodeOption, Warehouse: warehouse, ...tier.raw },
          source_updated_at: now,
          updated_at: now,
        });
      });
    }
  }

  return rows;
}

export async function syncRestPrintingSlas(params: { lang: StrickerLanguage }) {
  const supabase = createSupabaseAdminClient();
  const supplierId = await getStrickerSupplierId();
  const datasetImportId = await createDatasetImport({ supabase, supplierId, lang: params.lang });

  try {
    const token = await getValidStrickerSessionToken();
    const payload = await fetchStrickerDataset(
      { dataset: "printingSlas", token, lang: params.lang },
      { timeoutMs: 180_000 },
    );
    const records = Array.isArray(payload.PrintingSlas)
      ? payload.PrintingSlas as PrintingSlaRecord[]
      : [];
    const incoming = buildRows(records, supplierId);

    await assertSyncNotCancelled({ supabaseAdmin: supabase, datasetImportId });

    const { data, error } = await supabase
      .from("supplier_printing_slas")
      .select("id,table_code_option,warehouse_code,quantity_min,quantity_max,production_days,is_available")
      .eq("supplier_id", supplierId)
      .returns<ExistingRow[]>();
    if (error) throw new Error(error.message);

    const existingByKey = new Map((data ?? []).map((row) => [key(row), row]));
    const incomingKeys = new Set(incoming.map(key));
    const changed = incoming.filter((row) => {
      const current = existingByKey.get(key(row));
      return !current || current.quantity_max !== row.quantity_max ||
        current.production_days !== row.production_days || current.is_available !== row.is_available;
    });
    const removedIds = (data ?? []).filter((row) => !incomingKeys.has(key(row))).map((row) => row.id);

    for (const batch of chunks(changed, CHUNK_SIZE)) {
      await assertSyncNotCancelled({ supabaseAdmin: supabase, datasetImportId });
      const { error: upsertError } = await supabase
        .from("supplier_printing_slas")
        .upsert(batch, { onConflict: "supplier_id,table_code_option,warehouse_code,quantity_min" });
      if (upsertError) throw new Error(upsertError.message);
    }
    for (const batch of chunks(removedIds, CHUNK_SIZE)) {
      await assertSyncNotCancelled({ supabaseAdmin: supabase, datasetImportId });
      const { error: deleteError } = await supabase.from("supplier_printing_slas").delete().in("id", batch);
      if (deleteError) throw new Error(deleteError.message);
    }

    await assertSyncNotCancelled({ supabaseAdmin: supabase, datasetImportId });
    await finishDatasetImport({
      supabase,
      datasetImportId,
      status: "success",
      recordsReceived: records.length,
      recordsImported: changed.length,
      errors: [],
    });

    return {
      dataset: "printingSlas" as const,
      lang: params.lang,
      recordsReceived: records.length,
      tiersReceived: incoming.length,
      tiersChanged: changed.length,
      tiersRemoved: removedIds.length,
      datasetImportId,
    };
  } catch (error) {
    await finishDatasetImport({
      supabase,
      datasetImportId,
      status: "failed",
      recordsReceived: 0,
      recordsImported: 0,
      errors: [error instanceof Error ? error.message : "Erro ao sincronizar SLA de produção."],
    });
    throw error;
  }
}
