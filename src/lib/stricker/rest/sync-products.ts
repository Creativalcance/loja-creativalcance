import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStrickerSupplierId } from "@/lib/stricker/auth";
import { hasSupplierPayloadChanged } from "@/lib/stricker/change-detection";
import { buildStrickerProductImageUrl } from "@/lib/stricker/images";
import { fetchStrickerDataset } from "@/lib/stricker/rest/client";
import { getValidStrickerSessionToken } from "@/lib/stricker/rest/session";
import { type StrickerLanguage } from "@/lib/stricker/rest/types";
import { type JsonRecord } from "@/lib/stricker/types";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

type SupplierDatasetImportRow = {
  id: string;
};

type StrickerProductRecord = {
  ProdReference?: string | number | null;
  Name?: string | number | null;
  SEOName?: string | number | null;
  Description?: string | null;
  ShortDescription?: string | null;
  SEOShortDescription?: string | null;
  Type?: string | null;
  TypeCode?: string | number | null;
  SubType?: string | null;
  SubTypeCode?: string | number | null;
  MainImage?: string | null;
  BoxImage?: string | null;
  AllImageList?: string | null;
  Brand?: string | null;
  CountryOfOrigin?: string | null;
  Materials?: string | null;
  Material?: string | null;
  CombinedSizes?: string | null;
  BoxSizeM?: string | null;
  WeightGr?: string | number | null;
  Weight?: string | number | null;
  BoxWeightKG?: string | number | null;
  Multiplier?: string | number | null;
  Taric?: string | number | null;
  ProductCare?: string | null;
  Composition?: string | null;
  Packing?: string | null;
  Certificates?: string | null;
  CertificateFiles?: string | null;
  Properties?: string | null;
  RelatedReferences?: string | null;
  KeyWords?: string | null;
  IsStockOut?: boolean | string | number | null;
  OnlineExclusive?: boolean | string | number | null;
  Novelties?: boolean | string | number | null;
  CustomizationTypes?: string | null;
  CO2?: string | number | null;
  H2O?: string | number | null;
  Recycled_Materials?: boolean | string | number | null;
  FSC?: boolean | string | number | null;
  OurNature?: boolean | string | number | null;
};

type ProductUpsertRow = {
  supplier_id: string;
  external_id: string;
  sku: string;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  brand: string | null;
  material: string | null;
  dimensions: string | null;
  weight: number | null;
  country_of_origin: string | null;
  status: string;
  is_active: boolean;
  is_featured: boolean;
  is_customizable: boolean;
  min_order_quantity: number;
  lead_time_days: number | null;
  seo_title: string | null;
  seo_description: string | null;
  supplier_payload: JsonRecord;
  type_code: string | null;
  type_name: string | null;
  subtype_code: string | null;
  subtype_name: string | null;
  taric: string | null;
  is_stockout: boolean;
  online_exclusive: boolean;
  product_care: string | null;
  composition: string | null;
  packing: string | null;
  certificates: JsonRecord[];
  properties: JsonRecord[];
  related_references: string[];
  keywords: string[];
};

type ProductTranslationUpsertRow = {
  product_id: string;
  supplier_id: string;
  language: StrickerLanguage;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  seo_title: string | null;
  seo_description: string | null;
  material: string | null;
  type_name: string | null;
  subtype_name: string | null;
  supplier_payload: JsonRecord;
};

type ImportedProductRow = {
  id: string;
  supplier_id: string;
  external_id: string;
  sku: string;
  name: string;
};

type ProductImageInsertRow = {
  product_id: string;
  variant_id: string | null;
  supplier_id: string;
  external_url: string;
  storage_url: string | null;
  alt_text: string | null;
  sort_order: number;
  image_type: string;
  is_primary: boolean;
};

export type SyncRestProductsResult = {
  dataset: "products";
  lang: StrickerLanguage;
  recordsReceived: number;
  productsImported: number;
  productsUnchanged: number;
  productTranslationsImported: number;
  imagesImported: number;
  datasetImportId: string;
};

const UPSERT_CHUNK_SIZE = 500;
const QUERY_CHUNK_SIZE = 400;

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

function getNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value.replace(",", ".").replace(/[^\d.-]/g, ""));

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function getInteger(value: unknown, fallback: number): number {
  const parsed = getNumber(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(1, Math.round(parsed ?? fallback));
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

function splitTextList(value: unknown): string[] {
  const rawValue = getNullableString(value);

  if (!rawValue) {
    return [];
  }

  return rawValue
    .split(/[,;|]/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toNamedJsonList(value: unknown): JsonRecord[] {
  return splitTextList(value).map((name) => ({
    name,
  }));
}

function getProductReference(record: StrickerProductRecord): string | null {
  return getNullableString(record.ProdReference);
}

function getProductDisplayName(record: StrickerProductRecord): string | null {
  return getNullableString(record.Name) ?? getNullableString(record.SEOName);
}

function getProductShortDescription(
  record: StrickerProductRecord,
): string | null {
  return (
    getNullableString(record.ShortDescription) ??
    getNullableString(record.SEOShortDescription)
  );
}

function getProductMaterial(record: StrickerProductRecord): string | null {
  return getNullableString(record.Materials) ?? getNullableString(record.Material);
}

async function filterChangedProductRecords(params: {
  supabaseAdmin: SupabaseAdminClient;
  supplierId: string;
  records: StrickerProductRecord[];
}): Promise<StrickerProductRecord[]> {
  const recordsByReference = new Map<string, StrickerProductRecord>();

  for (const record of params.records) {
    const reference = getProductReference(record);
    if (reference) recordsByReference.set(reference, record);
  }

  const changedReferences = new Set(recordsByReference.keys());

  for (const referenceChunk of chunkArray([...recordsByReference.keys()], QUERY_CHUNK_SIZE)) {
    const { data, error } = await params.supabaseAdmin
      .from("products")
      .select("external_id,supplier_payload")
      .eq("supplier_id", params.supplierId)
      .in("external_id", referenceChunk)
      .returns<Array<{ external_id: string; supplier_payload: JsonRecord | null }>>();

    if (error) throw new Error(error.message);

    for (const existing of data ?? []) {
      const nextRecord = recordsByReference.get(existing.external_id);
      if (nextRecord && !hasSupplierPayloadChanged(existing.supplier_payload, nextRecord)) {
        changedReferences.delete(existing.external_id);
      }
    }
  }

  return params.records.filter((record) => {
    const reference = getProductReference(record);
    return Boolean(reference && changedReferences.has(reference));
  });
}

function buildProductRows(params: {
  supplierId: string;
  records: StrickerProductRecord[];
}): ProductUpsertRow[] {
  return params.records.flatMap((record) => {
    const externalId = getProductReference(record);

    if (!externalId) {
      return [];
    }

    const name = getProductDisplayName(record) ?? externalId;
    const shortDescription = getProductShortDescription(record);
    const description = getNullableString(record.Description);
    const material = getProductMaterial(record);

    const dimensions =
      getNullableString(record.CombinedSizes) ?? getNullableString(record.BoxSizeM);

    const weight =
      getNumber(record.WeightGr) ??
      getNumber(record.Weight) ??
      getNumber(record.BoxWeightKG);

    const slug = createSlug(`${name}-${externalId}`);

    const isStockout = getBoolean(record.IsStockOut, false);
    const onlineExclusive = getBoolean(record.OnlineExclusive, false);

    return [
      {
        supplier_id: params.supplierId,
        external_id: externalId,
        sku: externalId,
        name,
        slug,
        short_description: shortDescription,
        description,
        brand: getNullableString(record.Brand),
        material,
        dimensions,
        weight,
        country_of_origin: getNullableString(record.CountryOfOrigin),
        status: "active",
        is_active: true,
        is_featured: getBoolean(record.Novelties, false),
        is_customizable: Boolean(getNullableString(record.CustomizationTypes)),
        min_order_quantity: getInteger(record.Multiplier, 1),
        lead_time_days: null,
        seo_title: name,
        seo_description: shortDescription ?? description,
        supplier_payload: toJsonRecord(record),
        type_code: getNullableString(record.TypeCode),
        type_name: getNullableString(record.Type),
        subtype_code: getNullableString(record.SubTypeCode),
        subtype_name: getNullableString(record.SubType),
        taric: getNullableString(record.Taric),
        is_stockout: isStockout,
        online_exclusive: onlineExclusive,
        product_care: getNullableString(record.ProductCare),
        composition: getNullableString(record.Composition),
        packing: getNullableString(record.Packing),
        certificates: toNamedJsonList(record.Certificates).concat(
          toNamedJsonList(record.CertificateFiles),
        ),
        properties: [
          ...toNamedJsonList(record.Properties),
          {
            key: "co2",
            value: getNumber(record.CO2),
          },
          {
            key: "h2o",
            value: getNumber(record.H2O),
          },
          {
            key: "recycled_materials",
            value: getBoolean(record.Recycled_Materials, false),
          },
          {
            key: "fsc",
            value: getBoolean(record.FSC, false),
          },
          {
            key: "our_nature",
            value: getBoolean(record.OurNature, false),
          },
        ],
        related_references: splitTextList(record.RelatedReferences),
        keywords: splitTextList(record.KeyWords),
      },
    ];
  });
}

function buildProductTranslationRows(params: {
  lang: StrickerLanguage;
  records: StrickerProductRecord[];
  products: ImportedProductRow[];
}): ProductTranslationUpsertRow[] {
  const productsByExternalId = new Map(
    params.products.map((product) => [product.external_id, product]),
  );

  const rows: ProductTranslationUpsertRow[] = [];

  for (const record of params.records) {
    const externalId = getProductReference(record);

    if (!externalId) {
      continue;
    }

    const product = productsByExternalId.get(externalId);

    if (!product) {
      continue;
    }

    const name = getProductDisplayName(record) ?? product.name ?? externalId;
    const shortDescription = getProductShortDescription(record);
    const description = getNullableString(record.Description);
    const material = getProductMaterial(record);
    const slug = createSlug(`${name}-${externalId}`);

    rows.push({
      product_id: product.id,
      supplier_id: product.supplier_id,
      language: params.lang,
      name,
      slug,
      short_description: shortDescription,
      description,
      seo_title: name,
      seo_description: shortDescription ?? description,
      material,
      type_name: getNullableString(record.Type),
      subtype_name: getNullableString(record.SubType),
      supplier_payload: toJsonRecord(record),
    });
  }

  return rows;
}

function buildImageRows(params: {
  records: StrickerProductRecord[];
  products: ImportedProductRow[];
}): ProductImageInsertRow[] {
  const productsByExternalId = new Map(
    params.products.map((product) => [product.external_id, product]),
  );

  const rows: ProductImageInsertRow[] = [];

  for (const record of params.records) {
    const externalId = getProductReference(record);

    if (!externalId) {
      continue;
    }

    const product = productsByExternalId.get(externalId);

    if (!product) {
      continue;
    }

    const translatedName = getProductDisplayName(record) ?? product.name;
    const mainImageUrl = buildStrickerProductImageUrl(record.MainImage);
    const boxImageUrl = buildStrickerProductImageUrl(record.BoxImage);

    if (mainImageUrl) {
      rows.push({
        product_id: product.id,
        variant_id: null,
        supplier_id: product.supplier_id,
        external_url: mainImageUrl,
        storage_url: null,
        alt_text: translatedName,
        sort_order: 0,
        image_type: "main",
        is_primary: true,
      });
    }

    if (boxImageUrl) {
      rows.push({
        product_id: product.id,
        variant_id: null,
        supplier_id: product.supplier_id,
        external_url: boxImageUrl,
        storage_url: null,
        alt_text: `${translatedName} - embalagem`,
        sort_order: 1,
        image_type: "box",
        is_primary: false,
      });
    }
  }

  return rows;
}

async function createDatasetImport(params: {
  supabaseAdmin: SupabaseAdminClient;
  supplierId: string;
  lang: StrickerLanguage;
}): Promise<string> {
  const { data, error } = await params.supabaseAdmin
    .from("supplier_dataset_imports")
    .insert({
      supplier_id: params.supplierId,
      dataset_name: "products",
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

async function upsertProducts(params: {
  supabaseAdmin: SupabaseAdminClient;
  rows: ProductUpsertRow[];
}): Promise<ImportedProductRow[]> {
  const importedProducts: ImportedProductRow[] = [];

  for (const rowChunk of chunkArray(params.rows, UPSERT_CHUNK_SIZE)) {
    const { data, error } = await params.supabaseAdmin
      .from("products")
      .upsert(rowChunk, {
        onConflict: "supplier_id,external_id",
      })
      .select("id,supplier_id,external_id,sku,name")
      .returns<ImportedProductRow[]>();

    if (error) {
      throw new Error(error.message);
    }

    importedProducts.push(...(data ?? []));
  }

  return importedProducts;
}

async function upsertProductTranslations(params: {
  supabaseAdmin: SupabaseAdminClient;
  rows: ProductTranslationUpsertRow[];
}): Promise<number> {
  let importedCount = 0;

  for (const rowChunk of chunkArray(params.rows, UPSERT_CHUNK_SIZE)) {
    const { error } = await params.supabaseAdmin
      .from("product_translations")
      .upsert(rowChunk, {
        onConflict: "product_id,language",
      });

    if (error) {
      throw new Error(error.message);
    }

    importedCount += rowChunk.length;
  }

  return importedCount;
}

async function deleteProductImages(params: {
  supabaseAdmin: SupabaseAdminClient;
  productIds: string[];
}): Promise<void> {
  const uniqueProductIds = Array.from(new Set(params.productIds));

  for (const productIdChunk of chunkArray(uniqueProductIds, QUERY_CHUNK_SIZE)) {
    const { error } = await params.supabaseAdmin
      .from("product_images")
      .delete()
      .in("product_id", productIdChunk)
      .in("image_type", ["main", "box"]);

    if (error) {
      throw new Error(error.message);
    }
  }
}

async function insertProductImages(params: {
  supabaseAdmin: SupabaseAdminClient;
  rows: ProductImageInsertRow[];
}): Promise<void> {
  for (const rowChunk of chunkArray(params.rows, UPSERT_CHUNK_SIZE)) {
    const { error } = await params.supabaseAdmin
      .from("product_images")
      .insert(rowChunk);

    if (error) {
      throw new Error(error.message);
    }
  }
}

export async function syncRestProducts(params: {
  lang: StrickerLanguage;
}): Promise<SyncRestProductsResult> {
  const supabaseAdmin = createSupabaseAdminClient();
  const supplierId = await getStrickerSupplierId();

  const datasetImportId = await createDatasetImport({
    supabaseAdmin,
    supplierId,
    lang: params.lang,
  });

  try {
    const token = await getValidStrickerSessionToken();

    const payload = await fetchStrickerDataset(
      {
        dataset: "products",
        token,
        lang: params.lang,
      },
      {
        timeoutMs: 240_000,
      },
    );

    const records = Array.isArray(payload.Products)
      ? (payload.Products as StrickerProductRecord[])
      : [];

    const changedRecords = await filterChangedProductRecords({
      supabaseAdmin,
      supplierId,
      records,
    });

    const productRows = buildProductRows({
      supplierId,
      records: changedRecords,
    });

    const importedProducts =
      productRows.length > 0
        ? await upsertProducts({
            supabaseAdmin,
            rows: productRows,
          })
        : [];

    const productTranslationRows = buildProductTranslationRows({
      lang: params.lang,
      records: changedRecords,
      products: importedProducts,
    });

    const productTranslationsImported =
      productTranslationRows.length > 0
        ? await upsertProductTranslations({
            supabaseAdmin,
            rows: productTranslationRows,
          })
        : 0;

    if (importedProducts.length > 0) {
      await deleteProductImages({
        supabaseAdmin,
        productIds: importedProducts.map((product) => product.id),
      });
    }

    const imageRows = buildImageRows({
      records: changedRecords,
      products: importedProducts,
    });

    if (imageRows.length > 0) {
      await insertProductImages({
        supabaseAdmin,
        rows: imageRows,
      });
    }

    await finishDatasetImport({
      supabaseAdmin,
      datasetImportId,
      status: "success",
      recordsReceived: records.length,
      recordsImported: importedProducts.length,
      recordsFailed: 0,
      rawPayload: {
        Count: payload.Count ?? records.length,
        Currency: payload.Currency ?? null,
        Language: payload.Language ?? params.lang,
        productTranslationsImported,
        recordsUnchanged: records.length - changedRecords.length,
        sample: records.slice(0, 5),
      },
      errors: [],
    });

    return {
      dataset: "products",
      lang: params.lang,
      recordsReceived: records.length,
      productsImported: importedProducts.length,
      productsUnchanged: records.length - changedRecords.length,
      productTranslationsImported,
      imagesImported: imageRows.length,
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
          : "Erro inesperado na sincronização REST de produtos.",
      ],
    });

    throw error;
  }
}
