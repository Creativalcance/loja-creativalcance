import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStrickerSupplierId } from "@/lib/stricker/auth";
import {
  buildStrickerPrintingLinesImageUrl,
} from "@/lib/stricker/images";
import { type StrickerLanguage } from "@/lib/stricker/rest/types";
import { type JsonRecord } from "@/lib/stricker/types";
import { assertSyncNotCancelled } from "@/lib/stricker/sync-control";
import { isSupplierServiceCode } from "@/lib/stricker/service-code";
import { hasSupplierPayloadChanged } from "@/lib/stricker/change-detection";
import { customizationFingerprint } from "@/lib/stricker/customization-fingerprint";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

type SupplierDatasetImportRow = {
  id: string;
};

type ProductVariantRow = {
  id: string;
  product_id: string;
  supplier_id: string;
  external_variant_id: string;
  sku: string;
};

type ProductReferenceRow = {
  id: string;
  external_id: string;
};

type StrickerCustomizationOptionRecord = JsonRecord & {
  ProdReference?: string | number | null;
  ServiceCode?: string | number | null;
  Component?: string | number | null;
  Location?: string | number | null;
  TableCode?: string | number | null;
  TableCodeOption?: string | number | null;
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
  component_id: string | null;
  external_location_id: string;
  location_code: string | null;
  location_name: string | null;
  location_index: number | null;
  max_printing_area_mm: string | null;
  max_area_cm2: number | null;
  location_image_url: string | null;
  area_image_url: string | null;
  printing_lines_image_url: string | null;
  raw_payload: JsonRecord | null;
};

type PrintingPriceTableRow = {
  id: string;
  supplier_id: string;
  external_id: string;
  table_code: string;
  table_code_option: string | null;
  technique_code: string | null;
  technique_name: string | null;
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

type FetchLocationsResult = {
  rows: ProductCustomizationLocationRow[];
  total: number;
  lastCursor: string | null;
};

export type SyncRestCustomizationOptionsResult = {
  dataset: "customizationOptions";
  lang: StrickerLanguage;
  recordsReceived: number;
  recordsTotal: number;
  recordsProcessed: number;
  offset: number;
  limit: number;
  nextOffset: number | null;
  nextCursor: string | null;
  hasMore: boolean;
  optionsImported: number;
  optionsFailed: number;
  failedOptionRecords: string[];
  variantsMatched: number;
  componentsMatched: number;
  locationsMatched: number;
  priceTablesMatched: number;
  datasetImportId: string;
  locationsSkipped?: number;
  optionsWritten?: number;
  timingsMs?: Record<string, number>;
};

const QUERY_CHUNK_SIZE = 100;
const UPSERT_CHUNK_SIZE = 50;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function phaseError(phase: string, error: unknown): Error {
  return new Error(`[customizationOptions:${phase}] ${getErrorMessage(error)}`);
}

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

function getInteger(value: unknown): number | null {
  const parsed = getNumber(value);

  if (parsed === null) {
    return null;
  }

  return Math.round(parsed);
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

function getSlotString(
  record: JsonRecord,
  prefix: string,
  index: number,
): string | null {
  const directValue = getNullableString(record[`${prefix}${index}`]);

  if (directValue) {
    return directValue;
  }

  if (prefix === "AreaImage") {
    return getNullableString(record[`Area${index}Image`]);
  }

  if (prefix === "LocationImage") {
    return getNullableString(record[`Location${index}Image`]);
  }

  return null;
}

function getSlotNumber(
  record: JsonRecord,
  prefix: string,
  index: number,
): number | null {
  return getNumber(record[`${prefix}${index}`]);
}

function splitCodes(value: string | null): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(/[,;|]/g)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function getLocationIndex(location: ProductCustomizationLocationRow): number {
  if (location.location_index && location.location_index > 0) {
    return location.location_index;
  }

  const match = location.external_location_id.match(/:L(\d+)$/i);
  const parsed = match?.[1] ? Number(match[1]) : null;

  if (parsed && Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return 1;
}

function getTableCodesForLocation(
  location: ProductCustomizationLocationRow,
): string[] {
  const payload = toJsonRecord(location.raw_payload);
  const index = getLocationIndex(location);

  const slotCodes = splitCodes(getSlotString(payload, "TableCodes", index));

  if (slotCodes.length > 0) {
    return Array.from(new Set(slotCodes));
  }

  return Array.from(
    new Set(
      splitCodes(
        getStringByKeys(payload, [
          "TableCode",
          "tableCode",
          "PrintingTableCode",
          "printingTableCode",
        ]),
      ),
    ),
  );
}

function getTableCodeOptionsForLocation(
  location: ProductCustomizationLocationRow,
): string[] {
  const payload = toJsonRecord(location.raw_payload);
  const index = getLocationIndex(location);

  const slotOptions = splitCodes(
    getSlotString(payload, "TableCodesOptions", index),
  );

  if (slotOptions.length > 0) {
    return Array.from(new Set(slotOptions));
  }

  return Array.from(
    new Set(
      splitCodes(
        getStringByKeys(payload, [
          "TableCodeOption",
          "tableCodeOption",
          "TableFullCode",
          "tableFullCode",
        ]),
      ),
    ),
  );
}

function getCustomizationTypeCode(
  location: ProductCustomizationLocationRow,
  tableCode: string | null,
): string | null {
  const payload = toJsonRecord(location.raw_payload);
  const index = getLocationIndex(location);

  return (
    getSlotString(payload, "CustomizationTypes", index) ??
    getStringByKeys(payload, [
      "CustomizationTypeCode",
      "customizationTypeCode",
      "CustomizationType",
      "customizationType",
    ]) ??
    tableCode
  );
}

function normalizeComparable(value: unknown): string {
  return (getNullableString(value) ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function buildSupplierOptionMap(
  records: StrickerCustomizationOptionRecord[],
): Map<string, StrickerCustomizationOptionRecord[]> {
  const map = new Map<string, StrickerCustomizationOptionRecord[]>();

  for (const record of records) {
    const productReference = getNullableString(record.ProdReference);
    const tableCodeOption = getNullableString(record.TableCodeOption);
    const serviceCode = getNullableString(record.ServiceCode);

    if (!productReference || !tableCodeOption || !isSupplierServiceCode(serviceCode)) {
      continue;
    }

    const key = `${productReference}:${tableCodeOption}`;
    map.set(key, [...(map.get(key) ?? []), record]);
  }

  return map;
}

async function fetchCachedSupplierOptions(params: {
  supabaseAdmin: SupabaseAdminClient;
  supplierId: string;
  lang: StrickerLanguage;
  productReferences: string[];
  sourceCapturedAt?: string;
}): Promise<StrickerCustomizationOptionRecord[]> {
  const records: StrickerCustomizationOptionRecord[] = [];
  const uniqueReferences = Array.from(new Set(params.productReferences));
  const pageSize = 1_000;

  for (const referenceChunk of chunkArray(uniqueReferences, 10)) {
    let page = 0;

    while (true) {
      let query = params.supabaseAdmin
        .from("supplier_customization_options_cache")
        // Generation uses these identifiers only. Avoid transferring each
        // service's complete payload (including repeated pricing metadata).
        .select("ProdReference:product_reference,ServiceCode:service_code,TableCode:table_code,TableCodeOption:table_code_option,Component:component_name,Location:location_name")
        .eq("supplier_id", params.supplierId)
        .eq("language", params.lang)
        .in("product_reference", referenceChunk)
        .order("service_code", { ascending: true });
      if (params.sourceCapturedAt) query = query.eq("last_seen_at", params.sourceCapturedAt);
      const { data, error } = await query
        .range(page * pageSize, (page + 1) * pageSize - 1)
        .returns<StrickerCustomizationOptionRecord[]>();

      if (error) {
        throw new Error(error.message);
      }

      for (const row of data ?? []) {
        records.push(row);
      }

      if (!data || data.length < pageSize) break;
      page += 1;
    }
  }

  return records;
}

function findSupplierOption(params: {
  productReference: string | null;
  tableCodeOption: string | null;
  componentName: string | null;
  locationName: string | null;
  supplierOptionsByProductAndTable: Map<string, StrickerCustomizationOptionRecord[]>;
}): StrickerCustomizationOptionRecord | null {
  if (!params.productReference || !params.tableCodeOption) return null;

  const candidates =
    params.supplierOptionsByProductAndTable.get(
      `${params.productReference}:${params.tableCodeOption}`,
    ) ?? [];

  const componentName = normalizeComparable(params.componentName);
  const locationName = normalizeComparable(params.locationName);
  const exactMatches = candidates.filter((candidate) =>
    (!componentName || normalizeComparable(candidate.Component) === componentName) &&
    (!locationName || normalizeComparable(candidate.Location) === locationName),
  );
  const uniqueServiceCodes = new Set(
    exactMatches.map((candidate) => getNullableString(candidate.ServiceCode)),
  );

  return uniqueServiceCodes.size === 1 ? exactMatches[0] ?? null : null;
}

async function createDatasetImport(params: {
  supabaseAdmin: SupabaseAdminClient;
  supplierId: string;
  lang: StrickerLanguage;
  offset: number;
  limit: number;
  cursor: string | null;
  recordsTotal: number | null;
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
      source_url: "derived-from-optionals",
      raw_payload: {
        offset: params.offset,
        limit: params.limit,
        cursor: params.cursor,
      },
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

async function fetchLocations(params: {
  supabaseAdmin: SupabaseAdminClient;
  supplierId: string;
  offset: number;
  limit: number;
  cursor: string | null;
  recordsTotal: number | null;
}): Promise<FetchLocationsResult> {
  let query = params.supabaseAdmin
    .from("product_customization_locations")
    .select(
      [
        "id",
        "product_id",
        "variant_id",
        "supplier_id",
        "component_id",
        "external_location_id",
        "location_code",
        "location_name",
        "location_index",
        "max_printing_area_mm",
        "max_area_cm2",
        "location_image_url",
        "area_image_url",
        "printing_lines_image_url",
        "raw_payload",
      ].join(","),
      params.recordsTotal === null ? { count: "exact" } : undefined,
    )
    .eq("supplier_id", params.supplierId)
    .not("variant_id", "is", null)
    .order("id", { ascending: true })
    .limit(params.limit);

  if (params.cursor) {
    query = query.gt("id", params.cursor);
  }

  const { data, error, count } =
    await query.returns<ProductCustomizationLocationRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return {
    rows: data ?? [],
    total: params.recordsTotal ?? count ?? data?.length ?? 0,
    lastCursor:
      data && data.length > 0 ? data[data.length - 1]?.id ?? null : null,
  };
}

function getCustomizationPairsForLocation(
  location: ProductCustomizationLocationRow,
): Array<{
  tableCode: string | null;
  tableCodeOption: string | null;
  techniqueName: string | null;
  printingLinesFilename: string | null;
}> {
  const payload = toJsonRecord(location.raw_payload);
  const locationIndex = getLocationIndex(location);
  const tableCodes = getTableCodesForLocation(location);
  const tableCodeOptions = getTableCodeOptionsForLocation(location);
  const techniqueNames = splitCodes(
    getSlotString(payload, "CustomizationTypes", locationIndex),
  );
  const printingLinesFilenames = splitCodes(
    getSlotString(payload, "AreaImage", locationIndex),
  );

  if (tableCodes.length === 0) {
    return [
      {
        tableCode: null,
        tableCodeOption: null,
        techniqueName: techniqueNames[0] ?? null,
        printingLinesFilename: printingLinesFilenames[0] ?? null,
      },
    ];
  }

  // TableCodes lists the representative area for each technique. Options can
  // include other areas of that same technique (e.g. LSR2-02 under LSR2-01).
  // Every TableCodeOption carries its actual table followed by the colour count.
  if (tableCodeOptions.length > 0) {
    return tableCodeOptions.map((option) => {
      const exactIndex = tableCodes.findIndex((code) => option === code || option.startsWith(`${code}-`));
      const family = option.split("-")[0];
      const sourceIndex = exactIndex >= 0 ? exactIndex : tableCodes.findIndex((code) => code.split("-")[0] === family);
      const separator = option.lastIndexOf("-");
      const tableCode = tableCodes.includes(option) ? option : separator > 0 ? option.slice(0, separator) : tableCodes[sourceIndex] ?? null;
      return {
        tableCode, tableCodeOption: option,
        techniqueName: techniqueNames[sourceIndex] ?? null,
        printingLinesFilename: printingLinesFilenames[sourceIndex] ?? null,
      };
    });
  }
  return tableCodes.map((code, index) => ({ tableCode: code, tableCodeOption: null,
    techniqueName: techniqueNames[index] ?? null, printingLinesFilename: printingLinesFilenames[index] ?? null }));
}

async function fetchVariantsByIds(params: {
  supabaseAdmin: SupabaseAdminClient;
  supplierId: string;
  variantIds: string[];
}): Promise<ProductVariantRow[]> {
  if (params.variantIds.length === 0) {
    return [];
  }

  const rows = new Map<string, ProductVariantRow>();
  const uniqueVariantIds = Array.from(new Set(params.variantIds));

  for (const variantIdChunk of chunkArray(uniqueVariantIds, QUERY_CHUNK_SIZE)) {
    const { data, error } = await params.supabaseAdmin
      .from("product_variants")
      .select("id,product_id,supplier_id,external_variant_id,sku")
      .eq("supplier_id", params.supplierId)
      .in("id", variantIdChunk)
      .returns<ProductVariantRow[]>();

    if (error) {
      throw new Error(error.message);
    }

    for (const row of data ?? []) {
      rows.set(row.id, row);
    }
  }

  return Array.from(rows.values());
}

async function fetchProductsByIds(params: {
  supabaseAdmin: SupabaseAdminClient;
  supplierId: string;
  productIds: string[];
}): Promise<ProductReferenceRow[]> {
  const rows = new Map<string, ProductReferenceRow>();

  for (const productIdChunk of chunkArray(
    Array.from(new Set(params.productIds)),
    QUERY_CHUNK_SIZE,
  )) {
    const { data, error } = await params.supabaseAdmin
      .from("products")
      .select("id,external_id")
      .eq("supplier_id", params.supplierId)
      .in("id", productIdChunk)
      .returns<ProductReferenceRow[]>();

    if (error) throw new Error(error.message);
    for (const row of data ?? []) rows.set(row.id, row);
  }

  return Array.from(rows.values());
}

async function fetchComponents(params: {
  supabaseAdmin: SupabaseAdminClient;
  supplierId: string;
  variantIds: string[];
}): Promise<ProductCustomizationComponentRow[]> {
  if (params.variantIds.length === 0) {
    return [];
  }

  const rows = new Map<string, ProductCustomizationComponentRow>();
  const uniqueVariantIds = Array.from(new Set(params.variantIds));

  for (const variantIdChunk of chunkArray(uniqueVariantIds, QUERY_CHUNK_SIZE)) {
    const { data, error } = await params.supabaseAdmin
      .from("product_customization_components")
      .select(
        "id,product_id,variant_id,supplier_id,external_component_id,component_code,component_name",
      )
      .eq("supplier_id", params.supplierId)
      .in("variant_id", variantIdChunk)
      .returns<ProductCustomizationComponentRow[]>();

    if (error) {
      throw new Error(error.message);
    }

    for (const row of data ?? []) {
      rows.set(row.id, row);
    }
  }

  return Array.from(rows.values());
}

async function fetchPrintingPriceTables(params: {
  supabaseAdmin: SupabaseAdminClient;
  supplierId: string;
  tableCodes: string[];
}): Promise<PrintingPriceTableRow[]> {
  if (params.tableCodes.length === 0) {
    return [];
  }

  const rows = new Map<string, PrintingPriceTableRow>();
  const uniqueTableCodes = Array.from(new Set(params.tableCodes));

  for (const tableCodeChunk of chunkArray(uniqueTableCodes, QUERY_CHUNK_SIZE)) {
    const selectColumns = [
      "id",
      "supplier_id",
      "external_id",
      "table_code",
      "table_code_option",
      "technique_code",
      "technique_name",
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

    // The generator only uses the first quantity tier for each code/option.
    // The editor continues reading the full live price catalogue separately.
    for (let page = 0; ; page += 1) {
        const { data, error } = await params.supabaseAdmin
          .rpc("customization_generation_prices", {
            p_supplier_id: params.supplierId, p_table_codes: tableCodeChunk,
          }).select(selectColumns)
          .order("quantity_min", { ascending: true }).order("id", { ascending: true })
          .range(page * 1_000, (page + 1) * 1_000 - 1)
          .returns<PrintingPriceTableRow[]>();
        if (error) throw new Error(error.message);
        for (const row of data ?? []) rows.set(row.id, row);
        if (!data || data.length < 1_000) break;
    }
  }

  return Array.from(rows.values()).sort(
    (a, b) => a.quantity_min - b.quantity_min,
  );
}

function buildVariantMap(
  variants: ProductVariantRow[],
): Map<string, ProductVariantRow> {
  return new Map(variants.map((variant) => [variant.id, variant]));
}

function buildComponentMaps(components: ProductCustomizationComponentRow[]) {
  const byId = new Map<string, ProductCustomizationComponentRow>();
  const byVariantAndCode = new Map<string, ProductCustomizationComponentRow>();
  const byVariantAndName = new Map<string, ProductCustomizationComponentRow>();

  for (const component of components) {
    byId.set(component.id, component);

    if (!component.variant_id) {
      continue;
    }

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
    byId,
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

function findComponent(params: {
  location: ProductCustomizationLocationRow;
  componentMaps: ReturnType<typeof buildComponentMaps>;
}): ProductCustomizationComponentRow | null {
  if (params.location.component_id) {
    const byId = params.componentMaps.byId.get(params.location.component_id);

    if (byId) {
      return byId;
    }
  }

  const variantId = params.location.variant_id;

  if (!variantId) {
    return null;
  }

  const payload = toJsonRecord(params.location.raw_payload);
  const index = getLocationIndex(params.location);

  const componentCode =
    getSlotString(payload, "ComponentCode", index) ?? `C${index}`;

  const componentName = getSlotString(payload, "Component", index);

  if (componentCode) {
    const byCode = params.componentMaps.byVariantAndCode.get(
      `${variantId}:${componentCode}`,
    );

    if (byCode) {
      return byCode;
    }
  }

  if (componentName) {
    const byName = params.componentMaps.byVariantAndName.get(
      `${variantId}:${componentName}`,
    );

    if (byName) {
      return byName;
    }
  }

  return null;
}

function findPriceTable(params: {
  tableCode: string | null;
  tableCodeOption: string | null;
  priceTableMaps: ReturnType<typeof buildPriceTableMaps>;
}): PrintingPriceTableRow | null {
  if (params.tableCodeOption) {
    const byOption = params.priceTableMaps.byOption.get(params.tableCodeOption);

    if (byOption) {
      return byOption;
    }
  }

  if (params.tableCode) {
    const byCode = params.priceTableMaps.byCode.get(params.tableCode);

    if (byCode) {
      return byCode;
    }
  }

  return null;
}

function buildCustomizationOptionRows(params: {
  lang: StrickerLanguage;
  locations: ProductCustomizationLocationRow[];
  variantsById: Map<string, ProductVariantRow>;
  componentMaps: ReturnType<typeof buildComponentMaps>;
  priceTableMaps: ReturnType<typeof buildPriceTableMaps>;
  productReferencesById: Map<string, string>;
  supplierOptionsByProductAndTable: Map<string, StrickerCustomizationOptionRecord[]>;
}): ProductCustomizationOptionUpsertRow[] {
  const rows: ProductCustomizationOptionUpsertRow[] = [];

  for (const location of params.locations) {
    const variantId = location.variant_id;
    const supplierId = location.supplier_id;

    if (!variantId || !supplierId) {
      continue;
    }

    const variant = params.variantsById.get(variantId);

    if (!variant) {
      continue;
    }

    const component = findComponent({
      location,
      componentMaps: params.componentMaps,
    });

    const pairs = getCustomizationPairsForLocation(location);

    for (const pair of pairs) {
      const priceTable = findPriceTable({
        tableCode: pair.tableCode,
        tableCodeOption: pair.tableCodeOption,
        priceTableMaps: params.priceTableMaps,
      });

      const payload = toJsonRecord(location.raw_payload);
      const locationIndex = getLocationIndex(location);
      const customizationTypeCode =
        pair.tableCode ?? getCustomizationTypeCode(location, null);

      const componentName =
        component?.component_name ??
        getSlotString(payload, "Component", locationIndex);
      const locationName =
        location.location_name ??
        getSlotString(payload, "Location", locationIndex) ??
        getSlotString(payload, "ComposedLocation", locationIndex);
      const supplierOption = findSupplierOption({
        productReference: params.productReferencesById.get(variant.product_id) ?? null,
        tableCodeOption: pair.tableCodeOption,
        componentName,
        locationName,
        supplierOptionsByProductAndTable: params.supplierOptionsByProductAndTable,
      });
      const serviceCode = getNullableString(supplierOption?.ServiceCode);

      if (!isSupplierServiceCode(serviceCode)) continue;

      const slotHandlingCost = getSlotNumber(
        payload,
        "HandlingCosts",
        locationIndex,
      );

      rows.push({
        product_id: variant.product_id,
        variant_id: variant.id,
        supplier_id: supplierId,

        component_id: component?.id ?? location.component_id ?? null,
        location_id: location.id,
        printing_price_table_id: priceTable?.id ?? null,

        service_code: serviceCode,
        customization_type_code: customizationTypeCode,
        customization_type_name:
          pair.techniqueName ??
          priceTable?.technique_name ??
          customizationTypeCode,

        table_code: pair.tableCode,
        table_code_option: pair.tableCodeOption,

        component_code: component?.component_code ?? `C${locationIndex}`,
        component_name: componentName,
        location_code: location.location_code ?? `L${locationIndex}`,
        location_name: locationName,

        logo_area: null,
        logo_width: null,
        logo_height: null,

        max_colors: priceTable?.max_colors ??
          (Math.max(0, ...splitCodes(getSlotString(payload, "MaxColors", locationIndex)).map((value) => getInteger(value) ?? 0)) || null),
        max_printing_area_mm: location.max_printing_area_mm,
        table_max_area_cm: priceTable?.area_cm ?? null,
        table_max_area_cm2:
          priceTable?.area_cm2 ?? location.max_area_cm2 ?? null,

        price_by_color: priceTable?.price_by_color ?? false,
        price_by_area: priceTable?.price_by_area ?? false,

        handling_cost: slotHandlingCost ?? priceTable?.handling_cost ?? 0,
        supplier_price: priceTable?.supplier_price ?? 0,
        final_price: priceTable?.final_price ?? slotHandlingCost ?? 0,
        currency: "EUR",

        is_default: locationIndex === 1,
        is_active: priceTable !== null,

        printing_lines_image_url: buildStrickerPrintingLinesImageUrl(
          pair.printingLinesFilename,
        ),
        printing_lines_storage_url: null,

        // The database trigger already discards resolved payloads. Compact them
        // before transport too; geometry remains on the canonical location.
        raw_payload: priceTable ? {} : {
          ...payload,
          supplier_customization_option: supplierOption,
          language: params.lang,
          source: "supplier-customizationOptions",
          variant_id: variant.id,
          component_id: component?.id ?? location.component_id ?? null,
          location_id: location.id,
          printing_price_table_id: null,
          table_code: pair.tableCode,
          table_code_option: pair.tableCodeOption,
          service_code: serviceCode,
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

type GenerationInputs = Parameters<typeof buildCustomizationOptionRows>[0];
type GenerationState = { location_id: string; input_hash: string; options_count: number };

function locationInputHash(inputs: GenerationInputs, location: ProductCustomizationLocationRow): string {
  const variant = inputs.variantsById.get(location.variant_id ?? "");
  const reference = variant ? inputs.productReferencesById.get(variant.product_id) : null;
  const pairs = getCustomizationPairsForLocation(location);
  // Include all official services for this product: removals must also run
  // reconciliation, even when they do not change the selected price table.
  const services = [...inputs.supplierOptionsByProductAndTable.entries()]
    .filter(([key]) => reference && key.startsWith(`${reference}:`))
    .sort(([a], [b]) => a.localeCompare(b));
  return customizationFingerprint({
    language: inputs.lang, location, variant, reference,
    component: findComponent({ location, componentMaps: inputs.componentMaps }),
    prices: pairs.map((pair) => findPriceTable({
      tableCode: pair.tableCode, tableCodeOption: pair.tableCodeOption, priceTableMaps: inputs.priceTableMaps,
    })),
    services,
  });
}

async function readGenerationState(client: SupabaseAdminClient, supplierId: string, language: string, locationIds: string[]) {
  if (locationIds.length === 0) return new Map<string, GenerationState>();
  const { data, error } = await client.from("customization_generation_state")
    .select("location_id,input_hash,options_count").eq("supplier_id", supplierId)
    .eq("language", language).in("location_id", locationIds).returns<GenerationState[]>();
  if (error) throw phaseError("estado-incremental", error);
  return new Map((data ?? []).map((row) => [row.location_id, row]));
}

async function deactivateStaleCustomizationOptions(params: {
  supabaseAdmin: SupabaseAdminClient;
  supplierId: string;
  variants: ProductVariantRow[];
  productReferencesById: Map<string, string>;
  supplierOptions: StrickerCustomizationOptionRecord[];
  generatedServicesByLocation?: Map<string, Set<string>>;
}): Promise<void> {
  const allowed = new Map<string, Set<string>>();
  for (const option of params.supplierOptions) {
    const reference = getNullableString(option.ProdReference);
    const code = getNullableString(option.ServiceCode);
    if (!reference || !isSupplierServiceCode(code)) continue;
    const codes = allowed.get(reference) ?? new Set<string>();
    codes.add(code); allowed.set(reference, codes);
  }
  const variantReferences = new Map(params.variants.map((variant) =>
    [variant.id, params.productReferencesById.get(variant.product_id)]));
  for (const ids of chunkArray(Array.from(variantReferences.keys()), 100)) {
    const staleIds: string[] = [];
    for (let page = 0; ; page += 1) {
      const { data, error } = await params.supabaseAdmin.from("product_customization_options")
        .select("id,variant_id,location_id,service_code").eq("supplier_id", params.supplierId)
        .in("variant_id", ids).eq("is_active", true).order("id", { ascending: true })
        .range(page * 1_000, (page + 1) * 1_000 - 1)
        .returns<{ id: string; variant_id: string; location_id: string | null; service_code: string }[]>();
      if (error) throw new Error(error.message);
      for (const row of data ?? []) {
        const reference = variantReferences.get(row.variant_id);
        const locationServices = row.location_id ? params.generatedServicesByLocation?.get(row.location_id) : undefined;
        if (!reference || !allowed.get(reference)?.has(row.service_code) ||
          (locationServices && !locationServices.has(row.service_code))) staleIds.push(row.id);
      }
      if (!data || data.length < 1_000) break;
    }
    // Read every page before changing the filter used by pagination.
    for (const staleChunk of chunkArray(staleIds, 100)) {
      const { error } = await params.supabaseAdmin.from("product_customization_options")
        .update({ is_active: false }).eq("supplier_id", params.supplierId).in("id", staleChunk);
      if (error) throw new Error(error.message);
    }
  }
}

type UpsertCustomizationOptionsResult = {
  imported: number;
  written: number;
  unchanged: number;
  failedRecords: string[];
};

async function upsertCustomizationOptions(params: {
  supabaseAdmin: SupabaseAdminClient;
  rows: ProductCustomizationOptionUpsertRow[];
}): Promise<UpsertCustomizationOptionsResult> {
  const uniqueRows = dedupeCustomizationOptionRows(params.rows);
  let written = 0;
  const identity = (row: ProductCustomizationOptionUpsertRow) =>
    JSON.stringify([row.product_id, row.variant_id, row.supplier_id, row.service_code]);
  for (const rowChunk of chunkArray(uniqueRows, UPSERT_CHUNK_SIZE)) {
    const columns = Object.keys(rowChunk[0]) as Array<keyof ProductCustomizationOptionUpsertRow>;
    const existing = new Map<string, ProductCustomizationOptionUpsertRow>();
    for (let page = 0; ; page += 1) {
      const { data, error } = await params.supabaseAdmin.from("product_customization_options")
        .select(columns.join(","))
        .in("supplier_id", Array.from(new Set(rowChunk.map((row) => row.supplier_id))))
        .in("variant_id", Array.from(new Set(rowChunk.map((row) => row.variant_id))))
        .in("service_code", Array.from(new Set(rowChunk.map((row) => row.service_code))))
        .order("id", { ascending: true }).range(page * 1_000, (page + 1) * 1_000 - 1)
        .returns<ProductCustomizationOptionUpsertRow[]>();
      if (error) throw new Error(error.message);
      for (const row of data ?? []) existing.set(identity(row), row);
      if (!data || data.length < 1_000) break;
    }
    const changed = rowChunk.filter((row) => {
      const current = existing.get(identity(row));
      return !current || columns.some((key) => hasSupplierPayloadChanged(current[key], row[key]));
    });
    if (changed.length === 0) continue;
    const { error } = await params.supabaseAdmin.from("product_customization_options")
      .upsert(changed, { onConflict: "product_id,variant_id,supplier_id,service_code" });
    // On any error the worker preserves the checkpoint and waits ten minutes.
    // Retrying/splitting chunks here would multiply load on an overloaded DB.
    if (error) throw new Error(error.message);
    written += changed.length;
  }
  return {
    imported: uniqueRows.length,
    written,
    unchanged: uniqueRows.length - written,
    failedRecords: [],
  };
}

export async function syncRestCustomizationOptions(params: {
  lang: StrickerLanguage;
  offset: number;
  limit: number;
  cursor?: string | null;
  recordsTotal?: number | null;
  sourceCapturedAt?: string;
  forceRegenerate?: boolean;
}): Promise<SyncRestCustomizationOptionsResult> {
  const timingsMs: Record<string, number> = {};
  let phaseStartedAt = Date.now();
  function finishPhase(name: string) {
    timingsMs[name] = Date.now() - phaseStartedAt;
    phaseStartedAt = Date.now();
  }
  const supabaseAdmin = createSupabaseAdminClient();
  const supplierId = await getStrickerSupplierId();

  const datasetImportId = await createDatasetImport({
    supabaseAdmin,
    supplierId,
    lang: params.lang,
    offset: params.offset,
    limit: params.limit,
    cursor: params.cursor ?? null,
    recordsTotal: params.recordsTotal ?? null,
  });

  try {
    let locationsResult: FetchLocationsResult;

    try {
      locationsResult = await fetchLocations({
        supabaseAdmin,
        supplierId,
        offset: params.offset,
        limit: params.limit,
        cursor: params.cursor ?? null,
        recordsTotal: params.recordsTotal ?? null,
      });
    } catch (error) {
      throw phaseError("localizacoes", error);
    }

    const locations = locationsResult.rows;
    const recordsTotal = locationsResult.total;
    finishPhase("locations");

    await assertSyncNotCancelled({ supabaseAdmin, datasetImportId });

    const variantIds = locations
      .map((location) => location.variant_id)
      .filter((value): value is string => Boolean(value));

    let variants: ProductVariantRow[];

    try {
      variants = await fetchVariantsByIds({
        supabaseAdmin,
        supplierId,
        variantIds,
      });
    } catch (error) {
      throw phaseError("variantes", error);
    }

    const variantsById = buildVariantMap(variants);

    const products = await fetchProductsByIds({
      supabaseAdmin,
      supplierId,
      productIds: variants.map((variant) => variant.product_id),
    });
    const productReferencesById = new Map(
      products.map((product) => [product.id, product.external_id]),
    );
    finishPhase("variantsAndProducts");

    const supplierOptionRecords = await fetchCachedSupplierOptions({
      supabaseAdmin,
      supplierId,
      lang: params.lang,
      productReferences: Array.from(productReferencesById.values()),
      sourceCapturedAt: params.sourceCapturedAt,
    });

    if (supplierOptionRecords.length === 0 && locations.length > 0 && !params.sourceCapturedAt) {
      throw new Error(
        "A captura local de customizationOptions ainda não está disponível para este lote. Execute primeiro a captura semanal do fornecedor.",
      );
    }
    const supplierOptionsByProductAndTable = buildSupplierOptionMap(
      supplierOptionRecords,
    );
    finishPhase("supplierServices");

    let components: ProductCustomizationComponentRow[];

    try {
      components = await fetchComponents({
        supabaseAdmin,
        supplierId,
        variantIds: variants.map((variant) => variant.id),
      });
    } catch (error) {
      throw phaseError("componentes", error);
    }
    finishPhase("components");

    const tableCodes = locations.flatMap((location) => [
      ...getTableCodesForLocation(location),
      ...getTableCodeOptionsForLocation(location),
    ]);

    let priceTables: PrintingPriceTableRow[];

    try {
      priceTables = await fetchPrintingPriceTables({
        supabaseAdmin,
        supplierId,
        tableCodes,
      });
    } catch (error) {
      throw phaseError("tabelas-precos", error);
    }
    finishPhase("prices");

    const componentMaps = buildComponentMaps(components);
    const priceTableMaps = buildPriceTableMaps(priceTables);

    const inputs: GenerationInputs = {
      lang: params.lang,
      locations,
      variantsById,
      componentMaps,
      priceTableMaps,
      productReferencesById,
      supplierOptionsByProductAndTable,
    };
    const previous = await readGenerationState(supabaseAdmin, supplierId, params.lang, locations.map((row) => row.id));
    const hashes = new Map(locations.map((location) => [location.id, locationInputHash(inputs, location)]));
    const changedLocations = locations.filter((location) => params.forceRegenerate ||
      previous.get(location.id)?.input_hash !== hashes.get(location.id));
    const changedIds = new Set(changedLocations.map((location) => location.id));
    const skipped = locations.filter((location) => !changedIds.has(location.id));
    const skippedOptions = skipped.reduce((total, location) => total + (previous.get(location.id)?.options_count ?? 0), 0);
    const rows = buildCustomizationOptionRows({ ...inputs, locations: changedLocations });
    finishPhase("fingerprintsAndGeneration");

    await assertSyncNotCancelled({ supabaseAdmin, datasetImportId });

    let importedCount = 0;
    let writtenCount = 0;
    let unchangedCount = 0;
    let failedOptionRecords: string[] = [];

    if (rows.length > 0) {
      try {
        const upsertResult = await upsertCustomizationOptions({
          supabaseAdmin,
          rows,
        });
        importedCount = upsertResult.imported;
        writtenCount = upsertResult.written;
        unchangedCount = upsertResult.unchanged;
        failedOptionRecords = upsertResult.failedRecords;
      } catch (error) {
        throw phaseError("gravacao", error);
      }
    }

    if (params.sourceCapturedAt && failedOptionRecords.length === 0) {
      await assertSyncNotCancelled({ supabaseAdmin, datasetImportId });
      const changedVariantIds = new Set(changedLocations.map((location) => location.variant_id));
      const generatedServicesByLocation = new Map(changedLocations.map((location) => [location.id, new Set<string>()]));
      for (const row of rows) if (row.location_id) generatedServicesByLocation.get(row.location_id)?.add(row.service_code);
      await deactivateStaleCustomizationOptions({ supabaseAdmin, supplierId,
        variants: variants.filter((variant) => changedVariantIds.has(variant.id)),
        productReferencesById, supplierOptions: supplierOptionRecords, generatedServicesByLocation });
    }
    finishPhase("writesAndReconciliation");

    // Never publish a signature before all writes/reconciliation succeed. A
    // failed checkpoint can repeat the batch using the saved signatures safely.
    if (changedLocations.length > 0 && failedOptionRecords.length === 0) {
      await assertSyncNotCancelled({ supabaseAdmin, datasetImportId });
      const counts = new Map<string, number>();
      for (const row of dedupeCustomizationOptionRows(rows)) {
        if (row.location_id) counts.set(row.location_id, (counts.get(row.location_id) ?? 0) + 1);
      }
      const { error } = await supabaseAdmin.from("customization_generation_state").upsert(changedLocations.map((location) => ({
        supplier_id: supplierId, language: params.lang, location_id: location.id,
        input_hash: hashes.get(location.id)!, options_count: counts.get(location.id) ?? 0,
        generated_at: new Date().toISOString(),
      })), { onConflict: "supplier_id,language,location_id" });
      if (error) throw phaseError("guardar-estado-incremental", error);
    }
    importedCount += skippedOptions;
    unchangedCount += skippedOptions;
    finishPhase("saveSignatures");

    const nextOffset = params.offset + locations.length;
    const hasMore = locations.length === params.limit;
    const normalizedNextOffset = hasMore ? nextOffset : null;
    const nextCursor = hasMore ? locationsResult.lastCursor : null;
    const status =
      failedOptionRecords.length > 0 || importedCount === 0
        ? "partial_success"
        : "success";

    await assertSyncNotCancelled({ supabaseAdmin, datasetImportId });
    await finishDatasetImport({
      supabaseAdmin,
      datasetImportId,
      status,
      recordsReceived: locations.length,
      recordsImported: importedCount,
      recordsFailed: failedOptionRecords.length,
      rawPayload: {
        Language: params.lang,
        RequestedLanguage: params.lang,
        Source: "supplier-customizationOptions",
        offset: params.offset,
        limit: params.limit,
        nextOffset: normalizedNextOffset,
        nextCursor,
        hasMore,
        recordsTotal,
        locationsMatched: locations.length,
        variantsMatched: variants.length,
        componentsMatched: components.length,
        priceTablesMatched: priceTables.length,
        rowsBuilt: rows.length,
        optionsWritten: writtenCount,
        optionsUnchanged: unchangedCount,
        locationsSkipped: skipped.length,
        timingsMs,
        supplierOptionsReceived: supplierOptionRecords.length,
        failedOptionRecords,
        sampleLocationIds: locations.slice(0, 10).map((location) => location.id),
      },
      errors:
        failedOptionRecords.length > 0
          ? failedOptionRecords.map(
              (identity) => `Falha transitória ao gravar ${identity}.`,
            )
          : importedCount > 0 || locations.length === 0
            ? []
            : [
                "Não foi possível gerar opções de personalização a partir das localizações existentes.",
              ],
    });

    return {
      dataset: "customizationOptions",
      lang: params.lang,
      recordsReceived: locations.length,
      recordsTotal,
      recordsProcessed: locations.length,
      offset: params.offset,
      limit: params.limit,
      nextOffset: normalizedNextOffset,
      nextCursor,
      hasMore,
      optionsImported: importedCount,
      optionsFailed: failedOptionRecords.length,
      failedOptionRecords,
      variantsMatched: variants.length,
      componentsMatched: components.length,
      locationsMatched: locations.length,
      priceTablesMatched: priceTables.length,
      datasetImportId,
      locationsSkipped: skipped.length,
      optionsWritten: writtenCount,
      timingsMs,
    };
  } catch (error) {
    try {
      await finishDatasetImport({
        supabaseAdmin,
        datasetImportId,
        status: "failed",
        recordsReceived: 0,
        recordsImported: 0,
        recordsFailed: 1,
        rawPayload: {
          Source: "supplier-customizationOptions",
          RequestedLanguage: params.lang,
          offset: params.offset,
          limit: params.limit,
          cursor: params.cursor ?? null,
        },
        errors: [
          error instanceof Error
            ? error.message
            : "Erro inesperado na geração de customizationOptions.",
        ],
      });
    } catch {
      // O erro original da sincronização não deve ser ocultado por uma falha
      // ao atualizar o registo de histórico.
    }

    throw error;
  }
}
