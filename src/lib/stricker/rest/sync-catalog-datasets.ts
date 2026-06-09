import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStrickerSupplierId } from "@/lib/stricker/auth";
import { fetchStrickerDataset } from "@/lib/stricker/rest/client";
import { getValidStrickerSessionToken } from "@/lib/stricker/rest/session";
import {
  type StrickerDatasetName,
  type StrickerLanguage,
} from "@/lib/stricker/rest/types";
import { type JsonRecord } from "@/lib/stricker/types";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

type SyncableRestCatalogDataset = Extract<
  StrickerDatasetName,
  "colors" | "productTypes"
>;

type SupplierDatasetImportRow = {
  id: string;
};

type StrickerColorRecord = {
  ColorCode?: string | number | null;
  Description?: string | number | null;
  HexCode?: string | null;
  Hex?: string | null;
  IsActive?: boolean | number | string | null;
};

type StrickerProductSubtypeRecord = {
  SubTypeCode?: string | number | null;
  SubTypeDescription?: string | number | null;
};

type StrickerProductTypeRecord = {
  TypeCode?: string | number | null;
  TypeDescription?: string | number | null;
  SubTypes?: StrickerProductSubtypeRecord[] | null;
};

type SupplierColorUpsertRow = {
  supplier_id: string;
  external_id: string;
  code: string;
  name: string;
  hex_code: string | null;
  language: string;
  is_active: boolean;
  raw_payload: JsonRecord;
};

type SupplierCatalogCategoryUpsertRow = {
  supplier_id: string;
  external_id: string;
  parent_external_id: string | null;
  type_code: string | null;
  type_name: string | null;
  subtype_code: string | null;
  subtype_name: string | null;
  language: string;
  is_active: boolean;
  raw_payload: JsonRecord;
};

export type SyncRestCatalogDatasetResult = {
  dataset: SyncableRestCatalogDataset;
  lang: StrickerLanguage;
  recordsReceived: number;
  recordsImported: number;
  datasetImportId: string;
};

function createSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
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

function getBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "1", "yes", "sim", "s"].includes(normalized)) {
      return true;
    }

    if (["false", "0", "no", "não", "nao", "n"].includes(normalized)) {
      return false;
    }
  }

  return fallback;
}

function toJsonRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as JsonRecord;
}

async function createDatasetImport(params: {
  supabaseAdmin: SupabaseAdminClient;
  supplierId: string;
  dataset: SyncableRestCatalogDataset;
  lang: StrickerLanguage;
}): Promise<string> {
  const { data, error } = await params.supabaseAdmin
    .from("supplier_dataset_imports")
    .insert({
      supplier_id: params.supplierId,
      dataset_name: params.dataset,
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
    .single<SupplierDatasetImportRow>();

  if (error || !data) {
    throw new Error(
      error?.message ?? "Não foi possível criar o registo de sincronização.",
    );
  }

  return data.id;
}

async function finishDatasetImport(params: {
  supabaseAdmin: SupabaseAdminClient;
  datasetImportId: string;
  status: "success" | "failed" | "partial_success";
  recordsReceived: number;
  recordsImported: number;
  recordsFailed: number;
  rawPayload: JsonRecord;
  errors: string[];
}): Promise<void> {
  const { error } = await params.supabaseAdmin
    .from("supplier_dataset_imports")
    .update({
      status: params.status,
      records_received: params.recordsReceived,
      records_imported: params.recordsImported,
      records_failed: params.recordsFailed,
      raw_payload: params.rawPayload,
      errors: params.errors,
      finished_at: new Date().toISOString(),
    })
    .eq("id", params.datasetImportId);

  if (error) {
    throw new Error(error.message);
  }
}

function buildColorRows(params: {
  supplierId: string;
  lang: StrickerLanguage;
  records: StrickerColorRecord[];
}): SupplierColorUpsertRow[] {
  return params.records.flatMap((record) => {
    const code = getNullableString(record.ColorCode);
    const name = getNullableString(record.Description) ?? code;

    if (!code || !name) {
      return [];
    }

    return [
      {
        supplier_id: params.supplierId,
        external_id: code,
        code,
        name,
        hex_code:
          getNullableString(record.HexCode) ?? getNullableString(record.Hex),
        language: params.lang,
        is_active: getBoolean(record.IsActive, true),
        raw_payload: toJsonRecord(record),
      },
    ];
  });
}

function buildProductTypeCategoryRows(params: {
  supplierId: string;
  lang: StrickerLanguage;
  records: StrickerProductTypeRecord[];
}): SupplierCatalogCategoryUpsertRow[] {
  const rows = new Map<string, SupplierCatalogCategoryUpsertRow>();

  for (const record of params.records) {
    const typeCode = getNullableString(record.TypeCode);
    const typeName = getNullableString(record.TypeDescription);

    if (!typeCode && !typeName) {
      continue;
    }

    const typeExternalId = `type:${typeCode ?? createSlug(typeName ?? "")}`;

    rows.set(`${params.supplierId}:${typeExternalId}:${params.lang}`, {
      supplier_id: params.supplierId,
      external_id: typeExternalId,
      parent_external_id: null,
      type_code: typeCode,
      type_name: typeName,
      subtype_code: null,
      subtype_name: null,
      language: params.lang,
      is_active: true,
      raw_payload: toJsonRecord(record),
    });

    const subTypes = Array.isArray(record.SubTypes) ? record.SubTypes : [];

    for (const subtype of subTypes) {
      const subtypeCode = getNullableString(subtype.SubTypeCode);
      const subtypeName = getNullableString(subtype.SubTypeDescription);

      if (!subtypeCode && !subtypeName) {
        continue;
      }

      const subtypeExternalId = `subtype:${
        typeCode ?? createSlug(typeName ?? "sem-tipo")
      }:${subtypeCode ?? createSlug(subtypeName ?? "")}`;

      rows.set(`${params.supplierId}:${subtypeExternalId}:${params.lang}`, {
        supplier_id: params.supplierId,
        external_id: subtypeExternalId,
        parent_external_id: typeExternalId,
        type_code: typeCode,
        type_name: typeName,
        subtype_code: subtypeCode,
        subtype_name: subtypeName,
        language: params.lang,
        is_active: true,
        raw_payload: toJsonRecord({
          ...subtype,
          TypeCode: typeCode,
          TypeDescription: typeName,
        }),
      });
    }
  }

  return Array.from(rows.values());
}

export async function syncRestCatalogDataset(params: {
  dataset: SyncableRestCatalogDataset;
  lang: StrickerLanguage;
}): Promise<SyncRestCatalogDatasetResult> {
  const supabaseAdmin = createSupabaseAdminClient();
  const supplierId = await getStrickerSupplierId();

  const datasetImportId = await createDatasetImport({
    supabaseAdmin,
    supplierId,
    dataset: params.dataset,
    lang: params.lang,
  });

  try {
    const token = await getValidStrickerSessionToken();

    const payload = await fetchStrickerDataset(
      {
        dataset: params.dataset,
        token,
        lang: params.lang,
      },
      {
        timeoutMs: 180_000,
      },
    );

    if (params.dataset === "colors") {
      const records = Array.isArray(payload.Colors)
        ? (payload.Colors as StrickerColorRecord[])
        : [];

      const rows = buildColorRows({
        supplierId,
        lang: params.lang,
        records,
      });

      if (rows.length > 0) {
        const { error } = await supabaseAdmin
          .from("supplier_colors")
          .upsert(rows, {
            onConflict: "supplier_id,external_id,language",
          });

        if (error) {
          throw new Error(error.message);
        }
      }

      await finishDatasetImport({
        supabaseAdmin,
        datasetImportId,
        status: "success",
        recordsReceived: records.length,
        recordsImported: rows.length,
        recordsFailed: Math.max(records.length - rows.length, 0),
        rawPayload: {
          Count: payload.Count ?? records.length,
          Currency: payload.Currency ?? null,
          Language: payload.Language ?? params.lang,
          sample: records.slice(0, 5),
        },
        errors: [],
      });

      return {
        dataset: params.dataset,
        lang: params.lang,
        recordsReceived: records.length,
        recordsImported: rows.length,
        datasetImportId,
      };
    }

    const records = Array.isArray(payload.Types)
      ? (payload.Types as StrickerProductTypeRecord[])
      : [];

    const rows = buildProductTypeCategoryRows({
      supplierId,
      lang: params.lang,
      records,
    });

    if (rows.length > 0) {
      const { error } = await supabaseAdmin
        .from("supplier_catalog_categories")
        .upsert(rows, {
          onConflict: "supplier_id,external_id,language",
        });

      if (error) {
        throw new Error(error.message);
      }
    }

    await finishDatasetImport({
      supabaseAdmin,
      datasetImportId,
      status: "success",
      recordsReceived: records.length,
      recordsImported: rows.length,
      recordsFailed: 0,
      rawPayload: {
        Count: payload.Count ?? records.length,
        Currency: payload.Currency ?? null,
        Language: payload.Language ?? params.lang,
        sample: records.slice(0, 5),
      },
      errors: [],
    });

    return {
      dataset: params.dataset,
      lang: params.lang,
      recordsReceived: records.length,
      recordsImported: rows.length,
      datasetImportId,
    };
  } catch (error) {
    await finishDatasetImport({
      supabaseAdmin,
      datasetImportId,
      status: "failed",
      recordsReceived: 0,
      recordsImported: 0,
      recordsFailed: 1,
      rawPayload: {},
      errors: [
        error instanceof Error
          ? error.message
          : "Erro inesperado na sincronização REST Stricker.",
      ],
    });

    throw error;
  }
}