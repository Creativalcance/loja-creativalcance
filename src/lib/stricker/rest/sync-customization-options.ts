import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStrickerSupplierId } from "@/lib/stricker/auth";
import {
  buildStrickerLocationImageUrl,
  buildStrickerPrintingLinesImageUrl,
} from "@/lib/stricker/images";
import { fetchStrickerDataset } from "@/lib/stricker/rest/client";
import { getValidStrickerSessionToken } from "@/lib/stricker/rest/session";
import { type StrickerLanguage } from "@/lib/stricker/rest/types";
import { type JsonRecord } from "@/lib/stricker/types";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

type SupplierDatasetImportRow = {
  id: string;
};

type ProductRow = {
  id: string;
  supplier_id: string;
  external_id: string;
};

type ProductVariantRow = {
  id: string;
  product_id: string;
  supplier_id: string;
  external_variant_id: string;
  sku: string;
};

type ProductCustomizationComponentRow = {
  id: string;
  product_id: string;
  variant_id: string | null;
  supplier_id: string | null;
  external_component_id: string;
  component_code: string | null;
  component_name: string | null;
};

type ProductCustomizationLocationRow = {
  id: string;
  product_id: string;
  variant_id: string | null;
  supplier_id: string | null;
  external_location_id: string;
  location_code: string | null;
  location_name: string | null;
};

type PrintingPriceTableRow = {
  id: string;
  supplier_id: string;
  external_id: string;
  table_code: string;
  table_code_option: string | null;
  quantity_min: number;
  supplier_price: number;
  final_price: number;
  handling_cost: number;
  price_by_color: boolean;
  price_by_area: boolean;
  max_colors: number | null;
  area_cm: number | null;
  area_cm2: number | null;
};

type ProductCustomizationOptionUpsertRow = {
  product_id: string;
  variant_id: string;
  supplier_id: string;

  component_id: string | null;
  location_id: string | null;
  printing_price_table_id: string | null;

  service_code: string;
  customization_type_code: string | null;
  customization_type_name: string | null;

  table_code: string | null;
  table_code_option: string | null;

  component_code: string | null;
  component_name: string | null;
  location_code: string | null;
  location_name: string | null;

  logo_area: number | null;
  logo_width: number | null;
  logo_height: number | null;

  max_colors: number | null;
  max_printing_area_mm: string | null;
  table_max_area_cm: number | null;
  table_max_area_cm2: number | null;

  price_by_color: boolean;
  price_by_area: boolean;

  handling_cost: number;
  supplier_price: number;
  final_price: number;
  currency: string;

  is_default: boolean;
  is_active: boolean;

  printing_lines_image_url: string | null;
  printing_lines_storage_url: string | null;

  raw_payload: JsonRecord;
};

export type SyncRestCustomizationOptionsResult = {
  dataset: "customizationOptions";
  lang: StrickerLanguage;
  recordsReceived: number;
  optionsImported: number;
  variantsMatched: number;
  componentsMatched: number;
  locationsMatched: number;
  priceTablesMatched: number;
  datasetImportId: string;
};

const PAGE_SIZE = 1000;
const QUERY_CHUNK_SIZE = 100;
const UPSERT_CHUNK_SIZE = 500;

function chunkArray<TValue>(values: TValue[], size: number): TValue[][] {
  const chunks: TValue[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

function toJsonRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as JsonRecord;
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

function getStringByKeys(record: JsonRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = getNullableString(record[key]);

    if (value) {
      return value;
    }
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

function getNumberByKeys(record: JsonRecord, keys: string[]): number | null {
  for (const key of keys) {
    const value = getNumber(record[key]);

    if (value !== null) {
      return value;
    }
  }

  return null;
}

function getIntegerByKeys(record: JsonRecord, keys: string[]): number | null {
  const value = getNumberByKeys(record, keys);

  if (value === null) {
    return null;
  }

  return Math.round(value);
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

function getBooleanByKeys(
  record: JsonRecord,
  keys: string[],
  fallback: boolean,
): boolean {
  for (const key of keys) {
    const value = record[key];

    if (value !== undefined && value !== null && value !== "") {
      return getBoolean(value, fallback);
    }
  }

  return fallback;
}

function getSku(record: JsonRecord): string | null {
  return getStringByKeys(record, [
    "WebSku",
    "WebSKU",
    "webSku",
    "webSKU",
    "web_sku",
    "SKU",
    "Sku",
    "sku",
    "OptionalSku",
    "optionalSku",
    "ProductSku",
    "productSku",
  ]);
}

function getProdReference(record: JsonRecord): string | null {
  return getStringByKeys(record, [
    "ProdReference",
    "prodReference",
    "ProductReference",
    "productReference",
    "Reference",
    "reference",
  ]);
}

function getTableCode(record: JsonRecord): string | null {
  return getStringByKeys(record, [
    "TableCode",
    "tableCode",
    "table_code",
    "PrintingTableCode",
    "printingTableCode",
  ]);
}

function getTableCodeOption(record: JsonRecord): string | null {
  return getStringByKeys(record, [
    "TableCodeOption",
    "tableCodeOption",
    "table_code_option",
    "TableFullCode",
    "TableFullcode",
    "tableFullCode",
    "tableFullcode",
  ]);
}

function getServiceCode(record: JsonRecord, variant: ProductVariantRow): string {
  const serviceCode = getStringByKeys(record, [
    "ServiceCode",
    "serviceCode",
    "service_code",
    "Code",
    "code",
  ]);

  if (serviceCode) {
    return serviceCode;
  }

  return `${variant.external_variant_id}:${
    getComponentCode(record) ?? "C"
  }:${getLocationCode(record) ?? "L"}:${
    getStringByKeys(record, [
      "CustomizationTypeCode",
      "customizationTypeCode",
      "CustomizationType",
      "customizationType",
    ]) ??
    getTableCode(record) ??
    "T"
  }`;
}

function getComponentCode(record: JsonRecord): string | null {
  return getStringByKeys(record, [
    "ComponentCode",
    "componentCode",
    "component_code",
    "ComponentID",
    "componentID",
    "component_id",
  ]);
}

function getComponentName(record: JsonRecord): string | null {
  return getStringByKeys(record, [
    "ComponentName",
    "componentName",
    "component_name",
    "ComponentDescription",
    "componentDescription",
    "Component",
    "component",
  ]);
}

function getLocationCode(record: JsonRecord): string | null {
  return getStringByKeys(record, [
    "LocationCode",
    "locationCode",
    "location_code",
    "LocationID",
    "locationID",
    "location_id",
  ]);
}

function getLocationName(record: JsonRecord): string | null {
  return getStringByKeys(record, [
    "LocationName",
    "locationName",
    "location_name",
    "LocationDescription",
    "locationDescription",
    "Location",
    "location",
  ]);
}

function getComponentExternalCandidates(params: {
  variant: ProductVariantRow;
  record: JsonRecord;
}): string[] {
  const candidates = new Set<string>();
  const componentCode = getComponentCode(params.record);
  const componentName = getComponentName(params.record);

  if (componentCode) {
    candidates.add(`${params.variant.external_variant_id}:${componentCode}`);
    candidates.add(`${params.variant.sku}:${componentCode}`);
    candidates.add(`${params.variant.external_variant_id}:C${componentCode}`);
    candidates.add(`${params.variant.sku}:C${componentCode}`);
  }

  if (componentName) {
    for (let index = 1; index <= 8; index += 1) {
      candidates.add(`${params.variant.external_variant_id}:C${index}`);
      candidates.add(`${params.variant.sku}:C${index}`);
    }
  }

  return Array.from(candidates);
}

function getLocationExternalCandidates(params: {
  variant: ProductVariantRow;
  record: JsonRecord;
}): string[] {
  const candidates = new Set<string>();
  const componentCode = getComponentCode(params.record);
  const locationCode = getLocationCode(params.record);

  if (componentCode && locationCode) {
    candidates.add(
      `${params.variant.external_variant_id}:${componentCode}:${locationCode}`,
    );
    candidates.add(`${params.variant.sku}:${componentCode}:${locationCode}`);
    candidates.add(
      `${params.variant.external_variant_id}:C${componentCode}:L${locationCode}`,
    );
    candidates.add(`${params.variant.sku}:C${componentCode}:L${locationCode}`);
  }

  for (let index = 1; index <= 8; index += 1) {
    candidates.add(`${params.variant.external_variant_id}:C${index}:L${index}`);
    candidates.add(`${params.variant.sku}:C${index}:L${index}`);
  }

  return Array.from(candidates);
}

function getPriceTableExternalCandidates(record: JsonRecord): string[] {
  const candidates = new Set<string>();
  const tableCode = getTableCode(record);
  const tableCodeOption = getTableCodeOption(record);

  if (tableCodeOption) {
    candidates.add(tableCodeOption);
  }

  if (tableCode) {
    candidates.add(tableCode);
  }

  return Array.from(candidates);
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
      dataset_name: "customizationOptions",
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

async function fetchProducts(params: {
  supabaseAdmin: SupabaseAdminClient;
  supplierId: string;
  references: string[];
}): Promise<ProductRow[]> {
  const rows = new Map<string, ProductRow>();
  const uniqueReferences = Array.from(new Set(params.references));

  for (const referenceChunk of chunkArray(uniqueReferences, QUERY_CHUNK_SIZE)) {
    const { data, error } = await params.supabaseAdmin
      .from("products")
      .select("id,supplier_id,external_id")
      .eq("supplier_id", params.supplierId)
      .in("external_id", referenceChunk)
      .returns<ProductRow[]>();

    if (error) {
      throw new Error(error.message);
    }

    for (const row of data ?? []) {
      rows.set(row.id, row);
    }
  }

  return Array.from(rows.values());
}

async function fetchVariants(params: {
  supabaseAdmin: SupabaseAdminClient;
  supplierId: string;
  skus: string[];
  productIds: string[];
}): Promise<ProductVariantRow[]> {
  const rows = new Map<string, ProductVariantRow>();

  const uniqueSkus = Array.from(new Set(params.skus));
  const uniqueProductIds = Array.from(new Set(params.productIds));

  for (const skuChunk of chunkArray(uniqueSkus, QUERY_CHUNK_SIZE)) {
    const { data: bySku, error: skuError } = await params.supabaseAdmin
      .from("product_variants")
      .select("id,product_id,supplier_id,external_variant_id,sku")
      .eq("supplier_id", params.supplierId)
      .in("sku", skuChunk)
      .returns<ProductVariantRow[]>();

    if (skuError) {
      throw new Error(skuError.message);
    }

    for (const row of bySku ?? []) {
      rows.set(row.id, row);
    }

    const { data: byExternalId, error: externalIdError } =
      await params.supabaseAdmin
        .from("product_variants")
        .select("id,product_id,supplier_id,external_variant_id,sku")
        .eq("supplier_id", params.supplierId)
        .in("external_variant_id", skuChunk)
        .returns<ProductVariantRow[]>();

    if (externalIdError) {
      throw new Error(externalIdError.message);
    }

    for (const row of byExternalId ?? []) {
      rows.set(row.id, row);
    }
  }

  for (const productIdChunk of chunkArray(uniqueProductIds, QUERY_CHUNK_SIZE)) {
    const { data: byProduct, error: productError } = await params.supabaseAdmin
      .from("product_variants")
      .select("id,product_id,supplier_id,external_variant_id,sku")
      .eq("supplier_id", params.supplierId)
      .in("product_id", productIdChunk)
      .returns<ProductVariantRow[]>();

    if (productError) {
      throw new Error(productError.message);
    }

    for (const row of byProduct ?? []) {
      rows.set(row.id, row);
    }
  }

  return Array.from(rows.values());
}

async function fetchComponents(params: {
  supabaseAdmin: SupabaseAdminClient;
  supplierId: string;
  variantIds: string[];
}): Promise<ProductCustomizationComponentRow[]> {
  const rows: ProductCustomizationComponentRow[] = [];
  const allowedVariantIds = new Set(params.variantIds);
  let page = 0;

  while (true) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await params.supabaseAdmin
      .from("product_customization_components")
      .select(
        "id,product_id,variant_id,supplier_id,external_component_id,component_code,component_name",
      )
      .eq("supplier_id", params.supplierId)
      .range(from, to)
      .returns<ProductCustomizationComponentRow[]>();

    if (error) {
      throw new Error(error.message);
    }

    for (const row of data ?? []) {
      if (row.variant_id && allowedVariantIds.has(row.variant_id)) {
        rows.push(row);
      }
    }

    if (!data || data.length < PAGE_SIZE) {
      break;
    }

    page += 1;
  }

  return rows;
}

async function fetchLocations(params: {
  supabaseAdmin: SupabaseAdminClient;
  supplierId: string;
  variantIds: string[];
}): Promise<ProductCustomizationLocationRow[]> {
  const rows: ProductCustomizationLocationRow[] = [];
  const allowedVariantIds = new Set(params.variantIds);
  let page = 0;

  while (true) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await params.supabaseAdmin
      .from("product_customization_locations")
      .select(
        "id,product_id,variant_id,supplier_id,external_location_id,location_code,location_name",
      )
      .eq("supplier_id", params.supplierId)
      .range(from, to)
      .returns<ProductCustomizationLocationRow[]>();

    if (error) {
      throw new Error(error.message);
    }

    for (const row of data ?? []) {
      if (row.variant_id && allowedVariantIds.has(row.variant_id)) {
        rows.push(row);
      }
    }

    if (!data || data.length < PAGE_SIZE) {
      break;
    }

    page += 1;
  }

  return rows;
}

async function fetchPrintingPriceTables(params: {
  supabaseAdmin: SupabaseAdminClient;
  supplierId: string;
  tableCodes: string[];
}): Promise<PrintingPriceTableRow[]> {
  const rows = new Map<string, PrintingPriceTableRow>();
  const uniqueTableCodes = Array.from(new Set(params.tableCodes));

  for (const tableCodeChunk of chunkArray(uniqueTableCodes, QUERY_CHUNK_SIZE)) {
    const selectColumns = [
      "id",
      "supplier_id",
      "external_id",
      "table_code",
      "table_code_option",
      "quantity_min",
      "supplier_price",
      "final_price",
      "handling_cost",
      "price_by_color",
      "price_by_area",
      "max_colors",
      "area_cm",
      "area_cm2",
    ].join(",");

    const { data: byCode, error: codeError } = await params.supabaseAdmin
      .from("printing_price_tables")
      .select(selectColumns)
      .eq("supplier_id", params.supplierId)
      .in("table_code", tableCodeChunk)
      .returns<PrintingPriceTableRow[]>();

    if (codeError) {
      throw new Error(codeError.message);
    }

    for (const row of byCode ?? []) {
      rows.set(row.id, row);
    }

    const { data: byOption, error: optionError } = await params.supabaseAdmin
      .from("printing_price_tables")
      .select(selectColumns)
      .eq("supplier_id", params.supplierId)
      .in("table_code_option", tableCodeChunk)
      .returns<PrintingPriceTableRow[]>();

    if (optionError) {
      throw new Error(optionError.message);
    }

    for (const row of byOption ?? []) {
      rows.set(row.id, row);
    }
  }

  return Array.from(rows.values());
}

function buildProductReferenceMap(products: ProductRow[]): Map<string, ProductRow> {
  return new Map(products.map((product) => [product.external_id, product]));
}

function buildVariantsByProductId(
  variants: ProductVariantRow[],
): Map<string, ProductVariantRow[]> {
  const map = new Map<string, ProductVariantRow[]>();

  for (const variant of variants) {
    const current = map.get(variant.product_id) ?? [];
    current.push(variant);
    map.set(variant.product_id, current);
  }

  return map;
}

function buildVariantBySkuMap(
  variants: ProductVariantRow[],
): Map<string, ProductVariantRow> {
  const map = new Map<string, ProductVariantRow>();

  for (const variant of variants) {
    map.set(variant.sku, variant);
    map.set(variant.external_variant_id, variant);
  }

  return map;
}

function buildComponentMaps(components: ProductCustomizationComponentRow[]) {
  const byExternalId = new Map<string, ProductCustomizationComponentRow>();
  const byVariantAndCode = new Map<string, ProductCustomizationComponentRow>();
  const byVariantAndName = new Map<string, ProductCustomizationComponentRow>();

  for (const component of components) {
    if (!component.variant_id) {
      continue;
    }

    byExternalId.set(
      `${component.variant_id}:${component.external_component_id}`,
      component,
    );

    if (component.component_code) {
      byVariantAndCode.set(
        `${component.variant_id}:${component.component_code}`,
        component,
      );
    }

    if (component.component_name) {
      byVariantAndName.set(
        `${component.variant_id}:${component.component_name}`,
        component,
      );
    }
  }

  return {
    byExternalId,
    byVariantAndCode,
    byVariantAndName,
  };
}

function buildLocationMaps(locations: ProductCustomizationLocationRow[]) {
  const byExternalId = new Map<string, ProductCustomizationLocationRow>();
  const byVariantAndCode = new Map<string, ProductCustomizationLocationRow>();
  const byVariantAndName = new Map<string, ProductCustomizationLocationRow>();

  for (const location of locations) {
    if (!location.variant_id) {
      continue;
    }

    byExternalId.set(
      `${location.variant_id}:${location.external_location_id}`,
      location,
    );

    if (location.location_code) {
      byVariantAndCode.set(
        `${location.variant_id}:${location.location_code}`,
        location,
      );
    }

    if (location.location_name) {
      byVariantAndName.set(
        `${location.variant_id}:${location.location_name}`,
        location,
      );
    }
  }

  return {
    byExternalId,
    byVariantAndCode,
    byVariantAndName,
  };
}

function buildPriceTableMaps(tables: PrintingPriceTableRow[]) {
  const byCode = new Map<string, PrintingPriceTableRow>();
  const byOption = new Map<string, PrintingPriceTableRow>();

  for (const table of tables) {
    if (!byCode.has(table.table_code)) {
      byCode.set(table.table_code, table);
    }

    if (table.table_code_option && !byOption.has(table.table_code_option)) {
      byOption.set(table.table_code_option, table);
    }
  }

  return {
    byCode,
    byOption,
  };
}

function getTargetVariants(params: {
  record: JsonRecord;
  productsByReference: Map<string, ProductRow>;
  variantsByProductId: Map<string, ProductVariantRow[]>;
  variantsBySku: Map<string, ProductVariantRow>;
}): ProductVariantRow[] {
  const sku = getSku(params.record);

  if (sku) {
    const variant = params.variantsBySku.get(sku);

    if (variant) {
      return [variant];
    }
  }

  const prodReference = getProdReference(params.record);

  if (!prodReference) {
    return [];
  }

  const product = params.productsByReference.get(prodReference);

  if (!product) {
    return [];
  }

  return params.variantsByProductId.get(product.id) ?? [];
}

function findComponent(params: {
  variant: ProductVariantRow;
  record: JsonRecord;
  componentMaps: ReturnType<typeof buildComponentMaps>;
}): ProductCustomizationComponentRow | null {
  const componentCode = getComponentCode(params.record);
  const componentName = getComponentName(params.record);

  for (const externalId of getComponentExternalCandidates({
    variant: params.variant,
    record: params.record,
  })) {
    const found = params.componentMaps.byExternalId.get(
      `${params.variant.id}:${externalId}`,
    );

    if (found) {
      return found;
    }
  }

  if (componentCode) {
    const found = params.componentMaps.byVariantAndCode.get(
      `${params.variant.id}:${componentCode}`,
    );

    if (found) {
      return found;
    }
  }

  if (componentName) {
    const found = params.componentMaps.byVariantAndName.get(
      `${params.variant.id}:${componentName}`,
    );

    if (found) {
      return found;
    }
  }

  return null;
}

function findLocation(params: {
  variant: ProductVariantRow;
  record: JsonRecord;
  locationMaps: ReturnType<typeof buildLocationMaps>;
}): ProductCustomizationLocationRow | null {
  const locationCode = getLocationCode(params.record);
  const locationName = getLocationName(params.record);

  for (const externalId of getLocationExternalCandidates({
    variant: params.variant,
    record: params.record,
  })) {
    const found = params.locationMaps.byExternalId.get(
      `${params.variant.id}:${externalId}`,
    );

    if (found) {
      return found;
    }
  }

  if (locationCode) {
    const found = params.locationMaps.byVariantAndCode.get(
      `${params.variant.id}:${locationCode}`,
    );

    if (found) {
      return found;
    }
  }

  if (locationName) {
    const found = params.locationMaps.byVariantAndName.get(
      `${params.variant.id}:${locationName}`,
    );

    if (found) {
      return found;
    }
  }

  return null;
}

function findPriceTable(params: {
  record: JsonRecord;
  priceTableMaps: ReturnType<typeof buildPriceTableMaps>;
}): PrintingPriceTableRow | null {
  const tableCodeOption = getTableCodeOption(params.record);
  const tableCode = getTableCode(params.record);

  if (tableCodeOption) {
    const found = params.priceTableMaps.byOption.get(tableCodeOption);

    if (found) {
      return found;
    }
  }

  if (tableCode) {
    const found = params.priceTableMaps.byCode.get(tableCode);

    if (found) {
      return found;
    }
  }

  return null;
}

function buildCustomizationOptionRows(params: {
  lang: StrickerLanguage;
  records: JsonRecord[];
  productsByReference: Map<string, ProductRow>;
  variantsByProductId: Map<string, ProductVariantRow[]>;
  variantsBySku: Map<string, ProductVariantRow>;
  componentMaps: ReturnType<typeof buildComponentMaps>;
  locationMaps: ReturnType<typeof buildLocationMaps>;
  priceTableMaps: ReturnType<typeof buildPriceTableMaps>;
}): ProductCustomizationOptionUpsertRow[] {
  const rows: ProductCustomizationOptionUpsertRow[] = [];

  for (const record of params.records) {
    const variants = getTargetVariants({
      record,
      productsByReference: params.productsByReference,
      variantsByProductId: params.variantsByProductId,
      variantsBySku: params.variantsBySku,
    });

    for (const variant of variants) {
      const serviceCode = getServiceCode(record, variant);

      const component = findComponent({
        variant,
        record,
        componentMaps: params.componentMaps,
      });

      const location = findLocation({
        variant,
        record,
        locationMaps: params.locationMaps,
      });

      const priceTable = findPriceTable({
        record,
        priceTableMaps: params.priceTableMaps,
      });

      const locationImage = getStringByKeys(record, [
        "PrintingLinesImage",
        "printingLinesImage",
        "AreaImage",
        "areaImage",
        "LocationImage",
        "locationImage",
      ]);

      rows.push({
        product_id: variant.product_id,
        variant_id: variant.id,
        supplier_id: variant.supplier_id,

        component_id: component?.id ?? null,
        location_id: location?.id ?? null,
        printing_price_table_id: priceTable?.id ?? null,

        service_code: serviceCode,
        customization_type_code: getStringByKeys(record, [
          "CustomizationTypeCode",
          "customizationTypeCode",
          "CustomizationType",
          "customizationType",
        ]),
        customization_type_name: getStringByKeys(record, [
          "CustomizationTypeName",
          "customizationTypeName",
          "CustomizationTypeDescription",
          "customizationTypeDescription",
        ]),

        table_code: getTableCode(record),
        table_code_option: getTableCodeOption(record),

        component_code: getComponentCode(record) ?? component?.component_code ?? null,
        component_name: getComponentName(record) ?? component?.component_name ?? null,
        location_code: getLocationCode(record) ?? location?.location_code ?? null,
        location_name: getLocationName(record) ?? location?.location_name ?? null,

        logo_area: getNumberByKeys(record, ["LogoArea", "logoArea"]),
        logo_width: getNumberByKeys(record, ["LogoWidth", "logoWidth"]),
        logo_height: getNumberByKeys(record, ["LogoHeight", "logoHeight"]),

        max_colors:
          getIntegerByKeys(record, ["MaxColors", "maxColors"]) ??
          priceTable?.max_colors ??
          null,
        max_printing_area_mm: getStringByKeys(record, [
          "MaxPrintingAreaMM",
          "maxPrintingAreaMM",
          "LocationMaxPrintingAreaMM",
          "locationMaxPrintingAreaMM",
        ]),
        table_max_area_cm:
          getNumberByKeys(record, ["TableMaxAreaCM", "tableMaxAreaCM"]) ??
          priceTable?.area_cm ??
          null,
        table_max_area_cm2:
          getNumberByKeys(record, ["TableMaxAreaCM2", "tableMaxAreaCM2"]) ??
          priceTable?.area_cm2 ??
          null,

        price_by_color: getBooleanByKeys(
          record,
          ["PriceByColor", "priceByColor"],
          priceTable?.price_by_color ?? false,
        ),
        price_by_area: getBooleanByKeys(
          record,
          ["PriceByArea", "priceByArea"],
          priceTable?.price_by_area ?? false,
        ),

        handling_cost:
          getNumberByKeys(record, ["HandlingCost", "handlingCost"]) ??
          priceTable?.handling_cost ??
          0,
        supplier_price:
          getNumberByKeys(record, ["Price1", "Price", "price", "YourPrice"]) ??
          priceTable?.supplier_price ??
          0,
        final_price:
          getNumberByKeys(record, ["Price1", "FinalPrice", "finalPrice"]) ??
          priceTable?.final_price ??
          0,
        currency: "EUR",

        is_default: getBooleanByKeys(record, ["IsDefault", "isDefault"], false),
        is_active: true,

        printing_lines_image_url:
          buildStrickerPrintingLinesImageUrl(locationImage) ??
          buildStrickerLocationImageUrl(locationImage),
        printing_lines_storage_url: null,

        raw_payload: {
          ...record,
          language: params.lang,
          component_id: component?.id ?? null,
          location_id: location?.id ?? null,
          printing_price_table_id: priceTable?.id ?? null,
        },
      });
    }
  }

  return rows;
}

function dedupeCustomizationOptionRows(
  rows: ProductCustomizationOptionUpsertRow[],
): ProductCustomizationOptionUpsertRow[] {
  const map = new Map<string, ProductCustomizationOptionUpsertRow>();

  for (const row of rows) {
    const key = [
      row.product_id,
      row.variant_id,
      row.supplier_id,
      row.service_code,
    ].join(":");

    map.set(key, row);
  }

  return Array.from(map.values());
}

async function upsertCustomizationOptions(params: {
  supabaseAdmin: SupabaseAdminClient;
  rows: ProductCustomizationOptionUpsertRow[];
}): Promise<number> {
  const uniqueRows = dedupeCustomizationOptionRows(params.rows);

  for (const rowChunk of chunkArray(uniqueRows, UPSERT_CHUNK_SIZE)) {
    const { error } = await params.supabaseAdmin
      .from("product_customization_options")
      .upsert(rowChunk, {
        onConflict: "product_id,variant_id,supplier_id,service_code",
      });

    if (error) {
      throw new Error(error.message);
    }
  }

  return uniqueRows.length;
}

export async function syncRestCustomizationOptions(params: {
  lang: StrickerLanguage;
}): Promise<SyncRestCustomizationOptionsResult> {
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
        dataset: "customizationOptions",
        token,
        lang: params.lang,
      },
      {
        timeoutMs: 300_000,
      },
    );

    const records = Array.isArray(payload.CustomizationOptions)
      ? payload.CustomizationOptions.map((record) => toJsonRecord(record))
      : [];

    const skus = records
      .map((record) => getSku(record))
      .filter((value): value is string => Boolean(value));

    const references = records
      .map((record) => getProdReference(record))
      .filter((value): value is string => Boolean(value));

    const products = await fetchProducts({
      supabaseAdmin,
      supplierId,
      references,
    });

    const productsByReference = buildProductReferenceMap(products);

    const variants = await fetchVariants({
      supabaseAdmin,
      supplierId,
      skus,
      productIds: products.map((product) => product.id),
    });

    const variantsByProductId = buildVariantsByProductId(variants);
    const variantsBySku = buildVariantBySkuMap(variants);
    const variantIds = variants.map((variant) => variant.id);

    const components = await fetchComponents({
      supabaseAdmin,
      supplierId,
      variantIds,
    });

    const locations = await fetchLocations({
      supabaseAdmin,
      supplierId,
      variantIds,
    });

    const tableCodes = records.flatMap((record) =>
      getPriceTableExternalCandidates(record),
    );

    const priceTables = await fetchPrintingPriceTables({
      supabaseAdmin,
      supplierId,
      tableCodes,
    });

    const componentMaps = buildComponentMaps(components);
    const locationMaps = buildLocationMaps(locations);
    const priceTableMaps = buildPriceTableMaps(priceTables);

    const rows = buildCustomizationOptionRows({
      lang: params.lang,
      records,
      productsByReference,
      variantsByProductId,
      variantsBySku,
      componentMaps,
      locationMaps,
      priceTableMaps,
    });

    const importedCount =
      rows.length > 0
        ? await upsertCustomizationOptions({
            supabaseAdmin,
            rows,
          })
        : 0;

    const status = importedCount > 0 ? "success" : "partial_success";

    await finishDatasetImport({
      supabaseAdmin,
      datasetImportId,
      status,
      recordsReceived: records.length,
      recordsImported: importedCount,
      recordsFailed: Math.max(records.length - importedCount, 0),
      rawPayload: {
        Count: payload.Count ?? records.length,
        Currency: payload.Currency ?? null,
        Language: payload.Language ?? params.lang,
        RequestedLanguage: params.lang,
        sample: records.slice(0, 5),
        sampleKeys: records[0] ? Object.keys(records[0]) : [],
        matchedSkuSample: skus.slice(0, 10),
        matchedReferenceSample: references.slice(0, 10),
        productsMatched: products.length,
        variantsMatched: variants.length,
        componentsMatched: components.length,
        locationsMatched: locations.length,
        priceTablesMatched: priceTables.length,
        rowsBuilt: rows.length,
      },
      errors:
        rows.length > 0
          ? []
          : [
              "CustomizationOptions recebidas da Stricker, mas nenhuma opção foi associada a variantes existentes.",
            ],
    });

    return {
      dataset: "customizationOptions",
      lang: params.lang,
      recordsReceived: records.length,
      optionsImported: importedCount,
      variantsMatched: variants.length,
      componentsMatched: components.length,
      locationsMatched: locations.length,
      priceTablesMatched: priceTables.length,
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
          : "Erro inesperado na sincronização REST de customizationOptions.",
      ],
    });

    throw error;
  }
}