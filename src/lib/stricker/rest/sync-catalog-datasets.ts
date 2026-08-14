import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStrickerSupplierId } from "@/lib/stricker/auth";
import { hasSupplierPayloadChanged } from "@/lib/stricker/change-detection";
import { fetchStrickerDataset } from "@/lib/stricker/rest/client";
import { getValidStrickerSessionToken } from "@/lib/stricker/rest/session";
import {
  type StrickerDatasetName,
  type StrickerLanguage,
} from "@/lib/stricker/rest/types";
import { type JsonRecord } from "@/lib/stricker/types";
import { assertSyncNotCancelled } from "@/lib/stricker/sync-control";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

type SyncableRestCatalogDataset = Extract<
  StrickerDatasetName,
  "colors" | "productTypes" | "productsTree"
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

type StrickerProductsTreeRecord = {
  Type?: string | number | null;
  TypeCode?: string | number | null;
  TypeName?: string | number | null;
  ProductType?: string | number | null;
  SubType?: string | number | null;
  Subtype?: string | number | null;
  SubTypeCode?: string | number | null;
  SubTypeName?: string | number | null;
  SubtypeName?: string | number | null;
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

type ImportedCategoryRow = {
  id: string;
  supplier_id: string;
  external_id: string;
  parent_external_id: string | null;
  type_code: string | null;
  type_name: string | null;
  subtype_code: string | null;
  subtype_name: string | null;
  language: string;
  raw_payload: JsonRecord | null;
};

type CategoryTranslationUpsertRow = {
  category_id: string;
  supplier_id: string;
  language: StrickerLanguage;
  name: string;
  slug: string;
  description: string | null;
  seo_title: string | null;
  seo_description: string | null;
  supplier_payload: JsonRecord;
};

export type SyncRestCatalogDatasetResult = {
  dataset: SyncableRestCatalogDataset;
  lang: StrickerLanguage;
  recordsReceived: number;
  recordsImported: number;
  recordsUnchanged: number;
  translationsImported: number;
  datasetImportId: string;
};

const UPSERT_CHUNK_SIZE = 500;

function chunkArray<TValue>(values: TValue[], size: number): TValue[][] {
  const chunks: TValue[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

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
    .eq("id", params.datasetImportId)
    .eq("status", "running");

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

function buildProductsTreeCategoryRows(params: {
  supplierId: string;
  lang: StrickerLanguage;
  records: StrickerProductsTreeRecord[];
}): SupplierCatalogCategoryUpsertRow[] {
  const rows = new Map<string, SupplierCatalogCategoryUpsertRow>();

  for (const record of params.records) {
    const typeCode =
      getNullableString(record.TypeCode) ?? getNullableString(record.Type);
    const typeName =
      getNullableString(record.TypeName) ??
      getNullableString(record.ProductType) ??
      typeCode;
    const subtypeCode =
      getNullableString(record.SubTypeCode) ??
      getNullableString(record.SubType) ??
      getNullableString(record.Subtype);
    const subtypeName =
      getNullableString(record.SubTypeName) ??
      getNullableString(record.SubtypeName) ??
      subtypeCode;

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
      raw_payload: toJsonRecord(record),
    });
  }

  return Array.from(rows.values());
}

function buildCategoryTranslationRows(params: {
  lang: StrickerLanguage;
  categories: ImportedCategoryRow[];
}): CategoryTranslationUpsertRow[] {
  return params.categories.flatMap((category) => {
    const name =
      category.subtype_name ??
      category.type_name ??
      category.subtype_code ??
      category.type_code ??
      category.external_id;

    if (!name) {
      return [];
    }

    const slugBase = category.subtype_name
      ? `${category.type_name ?? category.type_code ?? "categoria"}-${category.subtype_name}`
      : name;

    return [
      {
        category_id: category.id,
        supplier_id: category.supplier_id,
        language: params.lang,
        name,
        slug: createSlug(slugBase),
        description: null,
        seo_title: name,
        seo_description: null,
        supplier_payload: category.raw_payload ?? {},
      },
    ];
  });
}

async function upsertSupplierColors(params: {
  supabaseAdmin: SupabaseAdminClient;
  rows: SupplierColorUpsertRow[];
}): Promise<number> {
  let importedCount = 0;

  for (const rowChunk of chunkArray(params.rows, UPSERT_CHUNK_SIZE)) {
    const { error } = await params.supabaseAdmin
      .from("supplier_colors")
      .upsert(rowChunk, {
        onConflict: "supplier_id,external_id,language",
      });

    if (error) {
      throw new Error(error.message);
    }

    importedCount += rowChunk.length;
  }

  return importedCount;
}

async function upsertSupplierCatalogCategories(params: {
  supabaseAdmin: SupabaseAdminClient;
  rows: SupplierCatalogCategoryUpsertRow[];
}): Promise<ImportedCategoryRow[]> {
  const importedCategories: ImportedCategoryRow[] = [];

  for (const rowChunk of chunkArray(params.rows, UPSERT_CHUNK_SIZE)) {
    const { data, error } = await params.supabaseAdmin
      .from("supplier_catalog_categories")
      .upsert(rowChunk, {
        onConflict: "supplier_id,external_id,language",
      })
      .select(
        [
          "id",
          "supplier_id",
          "external_id",
          "parent_external_id",
          "type_code",
          "type_name",
          "subtype_code",
          "subtype_name",
          "language",
          "raw_payload",
        ].join(","),
      )
      .returns<ImportedCategoryRow[]>();

    if (error) {
      throw new Error(error.message);
    }

    importedCategories.push(...(data ?? []));
  }

  return importedCategories;
}

async function upsertCategoryTranslations(params: {
  supabaseAdmin: SupabaseAdminClient;
  rows: CategoryTranslationUpsertRow[];
}): Promise<number> {
  let importedCount = 0;

  for (const rowChunk of chunkArray(params.rows, UPSERT_CHUNK_SIZE)) {
    const { error } = await params.supabaseAdmin
      .from("category_translations")
      .upsert(rowChunk, {
        onConflict: "category_id,language",
      });

    if (error) {
      throw new Error(error.message);
    }

    importedCount += rowChunk.length;
  }

  return importedCount;
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

    await assertSyncNotCancelled({ supabaseAdmin, datasetImportId });

    if (params.dataset === "colors") {
      const records = Array.isArray(payload.Colors)
        ? (payload.Colors as StrickerColorRecord[])
        : [];

      const rows = buildColorRows({
        supplierId,
        lang: params.lang,
        records,
      });

      const changedRows = await filterChangedRows({
        supabaseAdmin,
        supplierId,
        table: "supplier_colors",
        rows,
      });

      const recordsImported =
        changedRows.length > 0
          ? await upsertSupplierColors({
              supabaseAdmin,
              rows: changedRows,
            })
          : 0;

      await finishDatasetImport({
        supabaseAdmin,
        datasetImportId,
        status: "success",
        recordsReceived: records.length,
        recordsImported,
        recordsFailed: 0,
        rawPayload: {
          Count: payload.Count ?? records.length,
          Currency: payload.Currency ?? null,
          Language: payload.Language ?? params.lang,
          translationsImported: 0,
          recordsUnchanged: rows.length - changedRows.length,
          sample: records.slice(0, 5),
        },
        errors: [],
      });

      return {
        dataset: params.dataset,
        lang: params.lang,
        recordsReceived: records.length,
        recordsImported,
        recordsUnchanged: rows.length - changedRows.length,
        translationsImported: 0,
        datasetImportId,
      };
    }

    const isProductsTree = params.dataset === "productsTree";
    const records = isProductsTree
      ? Array.isArray(payload.ProductsTree)
        ? (payload.ProductsTree as StrickerProductsTreeRecord[])
        : []
      : Array.isArray(payload.Types)
        ? (payload.Types as StrickerProductTypeRecord[])
        : [];

    const rows = isProductsTree
      ? buildProductsTreeCategoryRows({
          supplierId,
          lang: params.lang,
          records: records as StrickerProductsTreeRecord[],
        })
      : buildProductTypeCategoryRows({
          supplierId,
          lang: params.lang,
          records: records as StrickerProductTypeRecord[],
        });

    const changedRows = await filterChangedRows({
      supabaseAdmin,
      supplierId,
      table: "supplier_catalog_categories",
      rows,
    });

    const importedCategories =
      changedRows.length > 0
        ? await upsertSupplierCatalogCategories({
            supabaseAdmin,
            rows: changedRows,
          })
        : [];

    const translationRows = buildCategoryTranslationRows({
      lang: params.lang,
      categories: importedCategories,
    });

    const translationsImported =
      translationRows.length > 0
        ? await upsertCategoryTranslations({
            supabaseAdmin,
            rows: translationRows,
          })
        : 0;

    await assertSyncNotCancelled({ supabaseAdmin, datasetImportId });
    await finishDatasetImport({
      supabaseAdmin,
      datasetImportId,
      status: "success",
      recordsReceived: records.length,
      recordsImported: importedCategories.length,
      recordsFailed: 0,
      rawPayload: {
        Count: payload.Count ?? records.length,
        Currency: payload.Currency ?? null,
        Language: payload.Language ?? params.lang,
        translationsImported,
        recordsUnchanged: rows.length - changedRows.length,
        sample: records.slice(0, 5),
      },
      errors: [],
    });

    return {
      dataset: params.dataset,
      lang: params.lang,
      recordsReceived: records.length,
      recordsImported: importedCategories.length,
      recordsUnchanged: rows.length - changedRows.length,
      translationsImported,
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

async function filterChangedRows<TRow extends {
  external_id: string;
  language: string;
  raw_payload: JsonRecord;
}>(params: {
  supabaseAdmin: SupabaseAdminClient;
  supplierId: string;
  table: "supplier_colors" | "supplier_catalog_categories";
  rows: TRow[];
}): Promise<TRow[]> {
  const rowsByKey = new Map(
    params.rows.map((row) => [`${row.external_id}:${row.language}`, row]),
  );
  const changedKeys = new Set(rowsByKey.keys());

  for (const rowChunk of chunkArray(params.rows, UPSERT_CHUNK_SIZE)) {
    const externalIds = [...new Set(rowChunk.map((row) => row.external_id))];
    const { data, error } = await params.supabaseAdmin
      .from(params.table)
      .select("external_id,language,raw_payload")
      .eq("supplier_id", params.supplierId)
      .in("external_id", externalIds)
      .returns<Array<{ external_id: string; language: string; raw_payload: JsonRecord | null }>>();

    if (error) throw new Error(error.message);

    for (const existing of data ?? []) {
      const key = `${existing.external_id}:${existing.language}`;
      const nextRow = rowsByKey.get(key);
      if (nextRow && !hasSupplierPayloadChanged(existing.raw_payload, nextRow.raw_payload)) {
        changedKeys.delete(key);
      }
    }
  }

  return params.rows.filter((row) => changedKeys.has(`${row.external_id}:${row.language}`));
}
