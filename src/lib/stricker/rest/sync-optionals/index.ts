import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  findBestPricingRule,
} from "@/lib/pricing/apply-pricing-rule";
import { calculateProductSellingPrice } from "@/lib/pricing/calculate-product-price";
import { type PricingRule } from "@/lib/pricing/types";
import { getStrickerSupplierId } from "@/lib/stricker/auth";
import { hasSupplierPayloadChanged } from "@/lib/stricker/change-detection";
import {
  buildStrickerComponentImageUrl,
  buildStrickerLocationImageUrl,
  buildStrickerPrintingLinesImageUrl,
  buildStrickerProductImageUrl,
} from "@/lib/stricker/images";
import { fetchStrickerDataset } from "@/lib/stricker/rest/client";
import { getValidStrickerSessionToken } from "@/lib/stricker/rest/session";
import { type StrickerLanguage } from "@/lib/stricker/rest/types";
import { type JsonRecord } from "@/lib/stricker/types";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

type SupplierDatasetImportRow = {
  id: string;
};

type StrickerOptionalRecord = {
  Sku?: string | number | null;
  WebSku?: string | number | null;
  ProdReference?: string | number | null;
  Size?: string | number | null;
  Capacity?: string | number | null;
  ColorDesc1?: string | null;
  ColorHex1?: string | null;
  ColorDesc2?: string | null;
  ColorHex2?: string | null;
  ColorCode?: string | number | null;
  OptionalImage1?: string | null;
  OptionalImage2?: string | null;
  YourPrice?: string | number | null;
  NoReplenishment?: boolean | string | number | null;
  SizeLengthCM?: string | number | null;
  SizeWidthCM?: string | number | null;
  MinQt1?: string | number | null;
  Price1?: string | number | null;
  MinQt2?: string | number | null;
  Price2?: string | number | null;
  MinQt3?: string | number | null;
  Price3?: string | number | null;
  MinQt4?: string | number | null;
  Price4?: string | number | null;
  MinQt5?: string | number | null;
  Price5?: string | number | null;
  MinQt6?: string | number | null;
  Price6?: string | number | null;
  MinQt7?: string | number | null;
  Price7?: string | number | null;
  MinQt8?: string | number | null;
  Price8?: string | number | null;
  MinQt9?: string | number | null;
  Price9?: string | number | null;
  MinQt10?: string | number | null;
  Price10?: string | number | null;
  Component1?: string | null;
  Component1Image?: string | null;
  Location1?: string | null;
  ComposedLocation1?: string | null;
  Location1Image?: string | null;
  Area1?: string | null;
  Area1Image?: string | null;
  TableCodes1?: string | null;
  TableCodesOptions1?: string | null;
  MaxColors1?: string | number | null;
  CustomizationTypes1?: string | null;
  HandlingCosts1?: string | number | null;
  Component2?: string | null;
  Component2Image?: string | null;
  Location2?: string | null;
  ComposedLocation2?: string | null;
  Location2Image?: string | null;
  Area2?: string | null;
  Area2Image?: string | null;
  TableCodes2?: string | null;
  TableCodesOptions2?: string | null;
  MaxColors2?: string | number | null;
  CustomizationTypes2?: string | null;
  HandlingCosts2?: string | number | null;
  Component3?: string | null;
  Component3Image?: string | null;
  Location3?: string | null;
  ComposedLocation3?: string | null;
  Location3Image?: string | null;
  Area3?: string | null;
  Area3Image?: string | null;
  TableCodes3?: string | null;
  TableCodesOptions3?: string | null;
  MaxColors3?: string | number | null;
  CustomizationTypes3?: string | null;
  HandlingCosts3?: string | number | null;
  Component4?: string | null;
  Component4Image?: string | null;
  Location4?: string | null;
  ComposedLocation4?: string | null;
  Location4Image?: string | null;
  Area4?: string | null;
  Area4Image?: string | null;
  TableCodes4?: string | null;
  TableCodesOptions4?: string | null;
  MaxColors4?: string | number | null;
  CustomizationTypes4?: string | null;
  HandlingCosts4?: string | number | null;
  Component5?: string | null;
  Component5Image?: string | null;
  Location5?: string | null;
  ComposedLocation5?: string | null;
  Location5Image?: string | null;
  Area5?: string | null;
  Area5Image?: string | null;
  TableCodes5?: string | null;
  TableCodesOptions5?: string | null;
  MaxColors5?: string | number | null;
  CustomizationTypes5?: string | null;
  HandlingCosts5?: string | number | null;
  Component6?: string | null;
  Component6Image?: string | null;
  Location6?: string | null;
  ComposedLocation6?: string | null;
  Location6Image?: string | null;
  Area6?: string | null;
  Area6Image?: string | null;
  TableCodes6?: string | null;
  TableCodesOptions6?: string | null;
  MaxColors6?: string | number | null;
  CustomizationTypes6?: string | null;
  HandlingCosts6?: string | number | null;
  Component7?: string | null;
  Component7Image?: string | null;
  Location7?: string | null;
  ComposedLocation7?: string | null;
  Location7Image?: string | null;
  Area7?: string | null;
  Area7Image?: string | null;
  TableCodes7?: string | null;
  TableCodesOptions7?: string | null;
  MaxColors7?: string | number | null;
  CustomizationTypes7?: string | null;
  HandlingCosts7?: string | number | null;
  Component8?: string | null;
  Component8Image?: string | null;
  Location8?: string | null;
  ComposedLocation8?: string | null;
  Location8Image?: string | null;
  Area8?: string | null;
  Area8Image?: string | null;
  TableCodes8?: string | null;
  TableCodesOptions8?: string | null;
  MaxColors8?: string | number | null;
  CustomizationTypes8?: string | null;
  HandlingCosts8?: string | number | null;
};

type ProductRow = {
  id: string;
  supplier_id: string;
  external_id: string;
  material: string | null;
  type_name: string | null;
};

type ProductVariantUpsertRow = {
  product_id: string;
  supplier_id: string;
  external_variant_id: string;
  sku: string;
  color_name: string | null;
  color_hex: string | null;
  size: string | null;
  capacity: string | null;
  material: string | null;
  barcode: string | null;
  is_active: boolean;
  supplier_payload: JsonRecord;
  color_code: string | null;
  color_desc_1: string | null;
  color_hex_1: string | null;
  color_desc_2: string | null;
  color_hex_2: string | null;
  optional_image_1_url: string | null;
  optional_image_2_url: string | null;
  optional_image_1_storage_url: string | null;
  optional_image_2_storage_url: string | null;
};

type ImportedVariantRow = {
  id: string;
  product_id: string;
  supplier_id: string;
  external_variant_id: string;
  sku: string;
};

type ProductVariantTranslationUpsertRow = {
  variant_id: string;
  product_id: string;
  supplier_id: string;
  language: StrickerLanguage;
  color_name: string | null;
  color_desc_1: string | null;
  color_desc_2: string | null;
  size_label: string | null;
  capacity_label: string | null;
  supplier_payload: JsonRecord;
};

type ProductPriceInsertRow = {
  product_id: string;
  variant_id: string;
  supplier_id: string;
  currency: string;
  quantity_min: number;
  quantity_max: number | null;
  supplier_price: number;
  base_price: number;
  margin_percentage: number;
  margin_rate: number | null;
  markup_rate: number | null;
  fixed_fee: number;
  minimum_profit: number;
  pricing_rule_id: string | null;
  final_price: number;
  catalog_price: number | null;
  your_price: number | null;
  price_source: string;
  source_sku: string | null;
  source_web_sku: string | null;
  source_price_field: string | null;
  source_updated_at: string;
  calculated_at: string;
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

type ProductCustomizationComponentUpsertRow = {
  product_id: string;
  variant_id: string;
  supplier_id: string;
  external_component_id: string;
  component_code: string | null;
  component_name: string | null;
  component_index: number;
  image_url: string | null;
  storage_url: string | null;
  is_default: boolean;
  is_customizable: boolean;
  raw_payload: JsonRecord;
};

type ImportedComponentRow = {
  id: string;
  product_id: string;
  variant_id: string | null;
  supplier_id: string | null;
  external_component_id: string;
};

type ProductCustomizationLocationUpsertRow = {
  product_id: string;
  variant_id: string;
  supplier_id: string;
  component_id: string | null;
  external_location_id: string;
  location_code: string | null;
  location_name: string | null;
  location_index: number;
  max_printing_area_mm: string | null;
  max_area_cm: number | null;
  max_area_cm2: number | null;
  location_image_url: string | null;
  location_storage_url: string | null;
  area_image_url: string | null;
  area_storage_url: string | null;
  printing_lines_image_url: string | null;
  printing_lines_storage_url: string | null;
  is_default: boolean;
  is_active: boolean;
  raw_payload: JsonRecord;
};

export type SyncRestOptionalsResult = {
  dataset: "optionals";
  lang: StrickerLanguage;
  recordsReceived: number;
  variantsImported: number;
  variantsUnchanged: number;
  variantTranslationsImported: number;
  pricesImported: number;
  imagesImported: number;
  componentsImported: number;
  locationsImported: number;
  datasetImportId: string;
};

const UPSERT_CHUNK_SIZE = 500;
const CUSTOMIZATION_UPSERT_CHUNK_SIZE = 100;
const QUERY_CHUNK_SIZE = 400;
const MAX_CUSTOMIZATION_SLOTS = 8;
const DEFAULT_MARGIN_RATE = 0.35;

function chunkArray<TValue>(values: TValue[], size: number): TValue[][] {
  const chunks: TValue[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
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

function getFirstListValue(value: unknown): string | null {
  const text = getNullableString(value);

  if (!text) {
    return null;
  }

  return (
    text
      .split(/[,;|]/g)
      .map((item) => item.trim())
      .find((item) => item.length > 0) ?? null
  );
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

function getOptionalSku(record: StrickerOptionalRecord): string | null {
  return getNullableString(record.WebSku) ?? getNullableString(record.Sku);
}

function getSourceSku(record: StrickerOptionalRecord): string | null {
  return getNullableString(record.Sku);
}

function getSourceWebSku(record: StrickerOptionalRecord): string | null {
  return getNullableString(record.WebSku);
}

function getProdReference(record: StrickerOptionalRecord): string | null {
  return getNullableString(record.ProdReference);
}

function getRecordSlotString(
  record: StrickerOptionalRecord,
  prefix: string,
  index: number,
): string | null {
  return getNullableString(
    record[`${prefix}${index}` as keyof StrickerOptionalRecord],
  );
}

function getRecordSlotNumber(
  record: StrickerOptionalRecord,
  prefix: string,
  index: number,
): number | null {
  return getNumber(record[`${prefix}${index}` as keyof StrickerOptionalRecord]);
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
      dataset_name: "optionals",
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

async function fetchPricingRules(params: {
  supabaseAdmin: SupabaseAdminClient;
}): Promise<PricingRule[]> {
  const { data, error } = await params.supabaseAdmin
    .from("pricing_rules")
    .select(
      `
        id,
        supplier_id,
        scope,
        price_type,
        category_name,
        product_id,
        variant_id,
        customer_group,
        min_quantity,
        max_quantity,
        margin_rate,
        markup_rate,
        fixed_fee,
        minimum_profit,
        rounding_mode,
        priority,
        is_active
      `,
    )
    .eq("price_type", "product")
    .eq("is_active", true)
    .returns<PricingRule[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

async function fetchProductsByReferences(params: {
  supabaseAdmin: SupabaseAdminClient;
  supplierId: string;
  references: string[];
}): Promise<ProductRow[]> {
  const uniqueReferences = Array.from(new Set(params.references));
  const products = new Map<string, ProductRow>();

  for (const referenceChunk of chunkArray(uniqueReferences, QUERY_CHUNK_SIZE)) {
    const { data, error } = await params.supabaseAdmin
      .from("products")
      .select("id,supplier_id,external_id,material,type_name")
      .eq("supplier_id", params.supplierId)
      .in("external_id", referenceChunk)
      .returns<ProductRow[]>();

    if (error) {
      throw new Error(error.message);
    }

    for (const product of data ?? []) {
      products.set(product.external_id, product);
    }
  }

  return Array.from(products.values());
}

function buildProductMap(products: ProductRow[]): Map<string, ProductRow> {
  return new Map(products.map((product) => [product.external_id, product]));
}

function buildProductIdMap(products: ProductRow[]): Map<string, ProductRow> {
  return new Map(products.map((product) => [product.id, product]));
}

async function filterChangedOptionalRecords(params: {
  supabaseAdmin: SupabaseAdminClient;
  supplierId: string;
  records: StrickerOptionalRecord[];
}): Promise<StrickerOptionalRecord[]> {
  const recordsBySku = new Map<string, StrickerOptionalRecord>();

  for (const record of params.records) {
    const sku = getOptionalSku(record);
    if (sku) recordsBySku.set(sku, record);
  }

  const changedSkus = new Set(recordsBySku.keys());
  const existingVariants = new Map<
    string,
    { id: string; external_variant_id: string; supplier_payload: JsonRecord | null }
  >();

  for (const skuChunk of chunkArray([...recordsBySku.keys()], QUERY_CHUNK_SIZE)) {
    const { data, error } = await params.supabaseAdmin
      .from("product_variants")
      .select("id,external_variant_id,supplier_payload")
      .eq("supplier_id", params.supplierId)
      .in("external_variant_id", skuChunk)
      .returns<Array<{ id: string; external_variant_id: string; supplier_payload: JsonRecord | null }>>();

    if (error) throw new Error(error.message);

    for (const existing of data ?? []) {
      existingVariants.set(existing.external_variant_id, existing);
    }
  }

  const variantsWithPrices = new Set<string>();
  const existingVariantIds = [...existingVariants.values()].map((variant) => variant.id);

  for (const variantIdChunk of chunkArray(existingVariantIds, QUERY_CHUNK_SIZE)) {
    const { data, error } = await params.supabaseAdmin
      .from("product_prices")
      .select("variant_id")
      .in("variant_id", variantIdChunk)
      .returns<Array<{ variant_id: string | null }>>();

    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      if (row.variant_id) variantsWithPrices.add(row.variant_id);
    }
  }

  for (const existing of existingVariants.values()) {
    const nextRecord = recordsBySku.get(existing.external_variant_id);
    const unchanged =
      nextRecord &&
      !hasSupplierPayloadChanged(existing.supplier_payload, nextRecord) &&
      variantsWithPrices.has(existing.id);

    if (unchanged) {
      changedSkus.delete(existing.external_variant_id);
    }
  }

  return params.records.filter((record) => {
    const sku = getOptionalSku(record);
    return Boolean(sku && changedSkus.has(sku));
  });
}

function buildVariantRows(params: {
  records: StrickerOptionalRecord[];
  productsByReference: Map<string, ProductRow>;
}): ProductVariantUpsertRow[] {
  return params.records.flatMap((record) => {
    const sku = getOptionalSku(record);
    const reference = getProdReference(record);

    if (!sku || !reference) {
      return [];
    }

    const product = params.productsByReference.get(reference);

    if (!product) {
      return [];
    }

    const optionalImage1Url = buildStrickerProductImageUrl(record.OptionalImage1);
    const optionalImage2Url = buildStrickerProductImageUrl(record.OptionalImage2);

    return [
      {
        product_id: product.id,
        supplier_id: product.supplier_id,
        external_variant_id: sku,
        sku,
        color_name: getNullableString(record.ColorDesc1),
        color_hex: getNullableString(record.ColorHex1),
        size: getNullableString(record.Size),
        capacity: getNullableString(record.Capacity),
        material: product.material,
        barcode: null,
        is_active: !getBoolean(record.NoReplenishment, false),
        supplier_payload: toJsonRecord(record),
        color_code: getNullableString(record.ColorCode),
        color_desc_1: getNullableString(record.ColorDesc1),
        color_hex_1: getNullableString(record.ColorHex1),
        color_desc_2: getNullableString(record.ColorDesc2),
        color_hex_2: getNullableString(record.ColorHex2),
        optional_image_1_url: optionalImage1Url,
        optional_image_2_url: optionalImage2Url,
        optional_image_1_storage_url: null,
        optional_image_2_storage_url: null,
      },
    ];
  });
}

async function upsertVariants(params: {
  supabaseAdmin: SupabaseAdminClient;
  rows: ProductVariantUpsertRow[];
}): Promise<ImportedVariantRow[]> {
  const variants: ImportedVariantRow[] = [];

  for (const rowChunk of chunkArray(params.rows, UPSERT_CHUNK_SIZE)) {
    const { data, error } = await params.supabaseAdmin
      .from("product_variants")
      .upsert(rowChunk, {
        onConflict: "supplier_id,external_variant_id",
      })
      .select("id,product_id,supplier_id,external_variant_id,sku")
      .returns<ImportedVariantRow[]>();

    if (error) {
      throw new Error(error.message);
    }

    variants.push(...(data ?? []));
  }

  return variants;
}

function buildVariantMap(
  variants: ImportedVariantRow[],
): Map<string, ImportedVariantRow> {
  return new Map(
    variants.map((variant) => [variant.external_variant_id, variant]),
  );
}

function buildVariantTranslationRows(params: {
  lang: StrickerLanguage;
  records: StrickerOptionalRecord[];
  variantsBySku: Map<string, ImportedVariantRow>;
}): ProductVariantTranslationUpsertRow[] {
  const rows: ProductVariantTranslationUpsertRow[] = [];

  for (const record of params.records) {
    const sku = getOptionalSku(record);

    if (!sku) {
      continue;
    }

    const variant = params.variantsBySku.get(sku);

    if (!variant) {
      continue;
    }

    rows.push({
      variant_id: variant.id,
      product_id: variant.product_id,
      supplier_id: variant.supplier_id,
      language: params.lang,
      color_name: getNullableString(record.ColorDesc1),
      color_desc_1: getNullableString(record.ColorDesc1),
      color_desc_2: getNullableString(record.ColorDesc2),
      size_label: getNullableString(record.Size),
      capacity_label: getNullableString(record.Capacity),
      supplier_payload: toJsonRecord(record),
    });
  }

  return rows;
}

async function upsertVariantTranslations(params: {
  supabaseAdmin: SupabaseAdminClient;
  rows: ProductVariantTranslationUpsertRow[];
}): Promise<number> {
  let importedCount = 0;

  for (const rowChunk of chunkArray(params.rows, UPSERT_CHUNK_SIZE)) {
    const { error } = await params.supabaseAdmin
      .from("product_variant_translations")
      .upsert(rowChunk, {
        onConflict: "variant_id,language",
      });

    if (error) {
      throw new Error(error.message);
    }

    importedCount += rowChunk.length;
  }

  return importedCount;
}

function buildPriceRows(params: {
  records: StrickerOptionalRecord[];
  variantsBySku: Map<string, ImportedVariantRow>;
  productsById: Map<string, ProductRow>;
  pricingRules: PricingRule[];
}): ProductPriceInsertRow[] {
  const rows: ProductPriceInsertRow[] = [];
  const calculatedAt = new Date().toISOString();

  for (const record of params.records) {
    const sku = getOptionalSku(record);

    if (!sku) {
      continue;
    }

    const variant = params.variantsBySku.get(sku);

    if (!variant) {
      continue;
    }

    const product = params.productsById.get(variant.product_id);
    const sourceSku = getSourceSku(record);
    const sourceWebSku = getSourceWebSku(record);
    const yourPrice = getNumber(record.YourPrice);

    const tiers: {
      quantityMin: number;
      quantityMax: number | null;
      supplierPrice: number;
      sourcePriceField: string;
    }[] = [];

    if (yourPrice !== null && yourPrice > 0) {
      tiers.push({
        quantityMin: 1,
        quantityMax: null,
        supplierPrice: yourPrice,
        sourcePriceField: "YourPrice",
      });
    } else {
      for (let index = 1; index <= 10; index += 1) {
        const quantityMin = getRecordSlotNumber(record, "MinQt", index);
        const price = getRecordSlotNumber(record, "Price", index);

        if (!quantityMin || quantityMin <= 0 || price === null || price <= 0) {
          continue;
        }

        tiers.push({
          quantityMin: Math.round(quantityMin),
          quantityMax: null,
          supplierPrice: price,
          sourcePriceField: `Price${index}`,
        });
      }
    }

    tiers.sort((a, b) => a.quantityMin - b.quantityMin);

    for (let index = 0; index < tiers.length; index += 1) {
      const currentTier = tiers[index];
      const nextTier = tiers[index + 1] ?? null;
      const quantityMax = nextTier
        ? Math.max(currentTier.quantityMin, nextTier.quantityMin - 1)
        : null;

      const pricingRule = findBestPricingRule(params.pricingRules, {
        supplierId: variant.supplier_id,
        categoryName: product?.type_name ?? null,
        productId: variant.product_id,
        variantId: variant.id,
        customerGroup: "default",
        quantity: currentTier.quantityMin,
      });

      const calculatedPrice = calculateProductSellingPrice({
        supplierPrice: currentTier.supplierPrice,
        marginRate: pricingRule?.margin_rate ?? DEFAULT_MARGIN_RATE,
        markupRate: pricingRule?.markup_rate ?? null,
        fixedFee: pricingRule?.fixed_fee ?? 0,
        minimumProfit: pricingRule?.minimum_profit ?? 0,
        roundingMode: pricingRule?.rounding_mode ?? "commercial_05",
      });

      rows.push({
        product_id: variant.product_id,
        variant_id: variant.id,
        supplier_id: variant.supplier_id,
        currency: "EUR",
        quantity_min: currentTier.quantityMin,
        quantity_max: quantityMax,
        supplier_price: currentTier.supplierPrice,
        base_price: currentTier.supplierPrice,
        margin_percentage: calculatedPrice.marginRate
          ? Number((calculatedPrice.marginRate * 100).toFixed(4))
          : 0,
        margin_rate: calculatedPrice.marginRate,
        markup_rate: calculatedPrice.markupRate,
        fixed_fee: calculatedPrice.fixedFee,
        minimum_profit: calculatedPrice.minimumProfit,
        pricing_rule_id: pricingRule?.id ?? null,
        final_price: calculatedPrice.finalPrice,
        catalog_price: currentTier.supplierPrice,
        your_price: yourPrice,
        price_source:
          currentTier.sourcePriceField === "YourPrice"
            ? "your_price"
            : "price",
        source_sku: sourceSku,
        source_web_sku: sourceWebSku,
        source_price_field: currentTier.sourcePriceField,
        source_updated_at: calculatedAt,
        calculated_at: calculatedAt,
      });
    }
  }

  return rows;
}

function buildImageRows(params: {
  records: StrickerOptionalRecord[];
  variantsBySku: Map<string, ImportedVariantRow>;
}): ProductImageInsertRow[] {
  const rows: ProductImageInsertRow[] = [];

  for (const record of params.records) {
    const sku = getOptionalSku(record);

    if (!sku) {
      continue;
    }

    const variant = params.variantsBySku.get(sku);

    if (!variant) {
      continue;
    }

    const image1 = buildStrickerProductImageUrl(record.OptionalImage1);
    const image2 = buildStrickerProductImageUrl(record.OptionalImage2);

    if (image1) {
      rows.push({
        product_id: variant.product_id,
        variant_id: variant.id,
        supplier_id: variant.supplier_id,
        external_url: image1,
        storage_url: null,
        alt_text: sku,
        sort_order: 0,
        image_type: "variant",
        is_primary: true,
      });
    }

    if (image2) {
      rows.push({
        product_id: variant.product_id,
        variant_id: variant.id,
        supplier_id: variant.supplier_id,
        external_url: image2,
        storage_url: null,
        alt_text: `${sku} - imagem alternativa`,
        sort_order: 1,
        image_type: "variant",
        is_primary: false,
      });
    }
  }

  return rows;
}

function buildComponentRows(params: {
  records: StrickerOptionalRecord[];
  variantsBySku: Map<string, ImportedVariantRow>;
}): ProductCustomizationComponentUpsertRow[] {
  const rows = new Map<string, ProductCustomizationComponentUpsertRow>();

  for (const record of params.records) {
    const sku = getOptionalSku(record);

    if (!sku) {
      continue;
    }

    const variant = params.variantsBySku.get(sku);

    if (!variant) {
      continue;
    }

    for (let index = 1; index <= MAX_CUSTOMIZATION_SLOTS; index += 1) {
      const componentName = getRecordSlotString(record, "Component", index);
      const componentImageFile = getNullableString(
        record[`Component${index}Image` as keyof StrickerOptionalRecord],
      );

      if (!componentName) {
        continue;
      }

      const externalComponentId = `${sku}:C${index}`;

      rows.set(`${variant.id}:${externalComponentId}`, {
        product_id: variant.product_id,
        variant_id: variant.id,
        supplier_id: variant.supplier_id,
        external_component_id: externalComponentId,
        component_code: `C${index}`,
        component_name: componentName,
        component_index: index,
        image_url: buildStrickerComponentImageUrl(componentImageFile),
        storage_url: null,
        is_default: index === 1,
        is_customizable: true,
        raw_payload: toJsonRecord(record),
      });
    }
  }

  return Array.from(rows.values());
}

function buildComponentKey(params: {
  variantId: string;
  externalComponentId: string;
}): string {
  return `${params.variantId}:${params.externalComponentId}`;
}

async function upsertComponents(params: {
  supabaseAdmin: SupabaseAdminClient;
  rows: ProductCustomizationComponentUpsertRow[];
}): Promise<ImportedComponentRow[]> {
  const components: ImportedComponentRow[] = [];

  for (const rowChunk of chunkArray(params.rows, CUSTOMIZATION_UPSERT_CHUNK_SIZE)) {
    const { data, error } = await params.supabaseAdmin
      .from("product_customization_components")
      .upsert(rowChunk, {
        onConflict: "product_id,variant_id,supplier_id,external_component_id",
      })
      .select("id,product_id,variant_id,supplier_id,external_component_id")
      .returns<ImportedComponentRow[]>();

    if (error) {
      throw new Error(error.message);
    }

    components.push(...(data ?? []));
  }

  return components;
}

function buildComponentMap(
  components: ImportedComponentRow[],
): Map<string, ImportedComponentRow> {
  const map = new Map<string, ImportedComponentRow>();

  for (const component of components) {
    if (!component.variant_id) {
      continue;
    }

    map.set(
      buildComponentKey({
        variantId: component.variant_id,
        externalComponentId: component.external_component_id,
      }),
      component,
    );
  }

  return map;
}

function parseArea(value: string | null): {
  areaText: string | null;
  width: number | null;
  height: number | null;
  areaCm2: number | null;
} {
  if (!value) {
    return {
      areaText: null,
      width: null,
      height: null,
      areaCm2: null,
    };
  }

  const numbers = value
    .replace(",", ".")
    .match(/\d+(\.\d+)?/g)
    ?.map((item) => Number(item))
    .filter((item) => Number.isFinite(item));

  if (!numbers || numbers.length < 2) {
    return {
      areaText: value,
      width: null,
      height: null,
      areaCm2: null,
    };
  }

  const width = numbers[0];
  const height = numbers[1];

  return {
    areaText: value,
    width,
    height,
    areaCm2: Number(((width * height) / 100).toFixed(4)),
  };
}

function buildLocationRows(params: {
  records: StrickerOptionalRecord[];
  variantsBySku: Map<string, ImportedVariantRow>;
  componentsByKey: Map<string, ImportedComponentRow>;
}): ProductCustomizationLocationUpsertRow[] {
  const rows = new Map<string, ProductCustomizationLocationUpsertRow>();

  for (const record of params.records) {
    const sku = getOptionalSku(record);

    if (!sku) {
      continue;
    }

    const variant = params.variantsBySku.get(sku);

    if (!variant) {
      continue;
    }

    for (let index = 1; index <= MAX_CUSTOMIZATION_SLOTS; index += 1) {
      const locationName =
        getRecordSlotString(record, "Location", index) ??
        getRecordSlotString(record, "ComposedLocation", index);

      if (!locationName) {
        continue;
      }

      const externalComponentId = `${sku}:C${index}`;
      const component = params.componentsByKey.get(
        buildComponentKey({
          variantId: variant.id,
          externalComponentId,
        }),
      );

      const locationImage = getFirstListValue(
        record[`Location${index}Image` as keyof StrickerOptionalRecord],
      );

      const areaImage = getFirstListValue(
        record[`Area${index}Image` as keyof StrickerOptionalRecord],
      );

      const area = parseArea(getRecordSlotString(record, "Area", index));
      const externalLocationId = `${sku}:C${index}:L${index}`;

      rows.set(`${variant.id}:${externalLocationId}`, {
        product_id: variant.product_id,
        variant_id: variant.id,
        supplier_id: variant.supplier_id,
        component_id: component?.id ?? null,
        external_location_id: externalLocationId,
        location_code: `L${index}`,
        location_name: locationName,
        location_index: index,
        max_printing_area_mm: area.areaText,
        max_area_cm: null,
        max_area_cm2: area.areaCm2,
        location_image_url: buildStrickerLocationImageUrl(locationImage),
        location_storage_url: null,
        area_image_url: buildStrickerPrintingLinesImageUrl(areaImage),
        area_storage_url: null,
        printing_lines_image_url: buildStrickerPrintingLinesImageUrl(areaImage),
        printing_lines_storage_url: null,
        is_default: index === 1,
        is_active: true,
        raw_payload: toJsonRecord(record),
      });
    }
  }

  return Array.from(rows.values());
}

async function deleteExistingVariantRelatedRows(params: {
  supabaseAdmin: SupabaseAdminClient;
  variantIds: string[];
}): Promise<void> {
  const uniqueVariantIds = Array.from(new Set(params.variantIds));

  for (const variantIdChunk of chunkArray(uniqueVariantIds, QUERY_CHUNK_SIZE)) {
    const { error: pricesError } = await params.supabaseAdmin
      .from("product_prices")
      .delete()
      .in("variant_id", variantIdChunk);

    if (pricesError) {
      throw new Error(pricesError.message);
    }

    const { error: imagesError } = await params.supabaseAdmin
      .from("product_images")
      .delete()
      .in("variant_id", variantIdChunk)
      .eq("image_type", "variant");

    if (imagesError) {
      throw new Error(imagesError.message);
    }
  }
}

async function insertPrices(params: {
  supabaseAdmin: SupabaseAdminClient;
  rows: ProductPriceInsertRow[];
}): Promise<void> {
  for (const rowChunk of chunkArray(params.rows, UPSERT_CHUNK_SIZE)) {
    const { error } = await params.supabaseAdmin
      .from("product_prices")
      .insert(rowChunk);

    if (error) {
      throw new Error(error.message);
    }
  }
}

async function insertImages(params: {
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

async function upsertLocations(params: {
  supabaseAdmin: SupabaseAdminClient;
  rows: ProductCustomizationLocationUpsertRow[];
}): Promise<void> {
  for (const rowChunk of chunkArray(params.rows, CUSTOMIZATION_UPSERT_CHUNK_SIZE)) {
    const { error } = await params.supabaseAdmin
      .from("product_customization_locations")
      .upsert(rowChunk, {
        onConflict: "product_id,variant_id,supplier_id,external_location_id",
      });

    if (error) {
      throw new Error(error.message);
    }
  }
}

export async function syncRestOptionals(params: {
  lang: StrickerLanguage;
}): Promise<SyncRestOptionalsResult> {
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
        dataset: "optionals",
        token,
        lang: params.lang,
      },
      {
        timeoutMs: 300_000,
      },
    );

    const records = Array.isArray(payload.Optionals)
      ? (payload.Optionals as StrickerOptionalRecord[])
      : [];

    const changedRecords = await filterChangedOptionalRecords({
      supabaseAdmin,
      supplierId,
      records,
    });

    const references = changedRecords
      .map((record) => getProdReference(record))
      .filter((value): value is string => Boolean(value));

    const products = await fetchProductsByReferences({
      supabaseAdmin,
      supplierId,
      references,
    });

    const productsByReference = buildProductMap(products);
    const productsById = buildProductIdMap(products);

    const pricingRules = await fetchPricingRules({
      supabaseAdmin,
    });

    const variantRows = buildVariantRows({
      records: changedRecords,
      productsByReference,
    });

    const importedVariants = await upsertVariants({
      supabaseAdmin,
      rows: variantRows,
    });

    const variantsBySku = buildVariantMap(importedVariants);

    const variantTranslationRows = buildVariantTranslationRows({
      lang: params.lang,
      records: changedRecords,
      variantsBySku,
    });

    const variantTranslationsImported =
      variantTranslationRows.length > 0
        ? await upsertVariantTranslations({
            supabaseAdmin,
            rows: variantTranslationRows,
          })
        : 0;

    const variantIds = importedVariants.map((variant) => variant.id);

    if (variantIds.length > 0) {
      await deleteExistingVariantRelatedRows({
        supabaseAdmin,
        variantIds,
      });
    }

    const priceRows = buildPriceRows({
      records: changedRecords,
      variantsBySku,
      productsById,
      pricingRules,
    });

    if (priceRows.length > 0) {
      await insertPrices({
        supabaseAdmin,
        rows: priceRows,
      });
    }

    const imageRows = buildImageRows({
      records: changedRecords,
      variantsBySku,
    });

    if (imageRows.length > 0) {
      await insertImages({
        supabaseAdmin,
        rows: imageRows,
      });
    }

    const componentRows = buildComponentRows({
      records: changedRecords,
      variantsBySku,
    });

    const importedComponents =
      componentRows.length > 0
        ? await upsertComponents({
            supabaseAdmin,
            rows: componentRows,
          })
        : [];

    const componentsByKey = buildComponentMap(importedComponents);

    const locationRows = buildLocationRows({
      records: changedRecords,
      variantsBySku,
      componentsByKey,
    });

    if (locationRows.length > 0) {
      await upsertLocations({
        supabaseAdmin,
        rows: locationRows,
      });
    }

    const status =
      changedRecords.length === 0 || importedVariants.length > 0
        ? "success"
        : "partial_success";

    const errors =
      changedRecords.length === 0 || importedVariants.length > 0
        ? []
        : [
            "Optionals recebidos da Stricker, mas nenhum produto correspondente foi encontrado em products.",
          ];

    await finishDatasetImport({
      supabaseAdmin,
      datasetImportId,
      status,
      recordsReceived: records.length,
      recordsImported: importedVariants.length,
      recordsFailed: Math.max(changedRecords.length - importedVariants.length, 0),
      rawPayload: {
        Count: payload.Count ?? records.length,
        Currency: payload.Currency ?? null,
        Language: payload.Language ?? params.lang,
        variantTranslationsImported,
        pricesImported: priceRows.length,
        pricingRulesLoaded: pricingRules.length,
        recordsUnchanged: records.length - changedRecords.length,
        sample: records.slice(0, 5),
      },
      errors,
    });

    return {
      dataset: "optionals",
      lang: params.lang,
      recordsReceived: records.length,
      variantsImported: importedVariants.length,
      variantsUnchanged: records.length - changedRecords.length,
      variantTranslationsImported,
      pricesImported: priceRows.length,
      imagesImported: imageRows.length,
      componentsImported: importedComponents.length,
      locationsImported: locationRows.length,
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
          : "Erro inesperado na sincronização REST de optionals.",
      ],
    });

    throw error;
  }
}
