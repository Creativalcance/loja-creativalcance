import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStrickerSupplierId } from "@/lib/stricker/auth";
import {
  buildStrickerLocationImageUrl,
  buildStrickerPrintingLinesImageUrl,
} from "@/lib/stricker/images";
import { type StrickerLanguage } from "@/lib/stricker/rest/types";
import { type JsonRecord } from "@/lib/stricker/types";

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
  hasMore: boolean;
  optionsImported: number;
  variantsMatched: number;
  componentsMatched: number;
  locationsMatched: number;
  priceTablesMatched: number;
  datasetImportId: string;
};

const QUERY_CHUNK_SIZE = 400;
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
  return getNullableString(record[`${prefix}${index}`]);
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

function getLocationImage(location: ProductCustomizationLocationRow): string | null {
  return (
    location.printing_lines_image_url ??
    location.area_image_url ??
    location.location_image_url ??
    null
  );
}

function buildServiceCode(params: {
  variant: ProductVariantRow;
  component: ProductCustomizationComponentRow | null;
  location: ProductCustomizationLocationRow;
  tableCode: string | null;
  tableCodeOption: string | null;
  customizationTypeCode: string | null;
}): string {
  const componentCode =
    params.component?.component_code ??
    `C${getLocationIndex(params.location)}`;

  const locationCode =
    params.location.location_code ??
    `L${getLocationIndex(params.location)}`;

  const tableReference =
    params.tableCodeOption ??
    params.tableCode ??
    params.customizationTypeCode ??
    "T";

  return `${params.variant.external_variant_id}:${componentCode}:${locationCode}:${tableReference}`;
}

async function createDatasetImport(params: {
  supabaseAdmin: SupabaseAdminClient;
  supplierId: string;
  lang: StrickerLanguage;
  offset: number;
  limit: number;
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
    .eq("id", params.datasetImportId);

  if (error) {
    throw new Error(error.message);
  }
}

async function fetchLocations(params: {
  supabaseAdmin: SupabaseAdminClient;
  supplierId: string;
  offset: number;
  limit: number;
}): Promise<FetchLocationsResult> {
  const from = params.offset;
  const to = params.offset + params.limit - 1;

  const { data, error, count } = await params.supabaseAdmin
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
      { count: "exact" },
    )
    .eq("supplier_id", params.supplierId)
    .not("variant_id", "is", null)
    .order("id", { ascending: true })
    .range(from, to)
    .returns<ProductCustomizationLocationRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return {
    rows: data ?? [],
    total: count ?? data?.length ?? 0,
  };
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

async function fetchComponents(params: {
  supabaseAdmin: SupabaseAdminClient;
  supplierId: string;
  variantIds: string[];
}): Promise<ProductCustomizationComponentRow[]> {
  if (params.variantIds.length === 0) {
    return [];
  }

  const rows: ProductCustomizationComponentRow[] = [];
  const allowedVariantIds = new Set(params.variantIds);
  let page = 0;

  while (true) {
    const from = page * QUERY_CHUNK_SIZE;
    const to = from + QUERY_CHUNK_SIZE - 1;

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

    if (!data || data.length < QUERY_CHUNK_SIZE) {
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

    const { data: byCode, error: codeError } = await params.supabaseAdmin
      .from("printing_price_tables")
      .select(selectColumns)
      .eq("supplier_id", params.supplierId)
      .in("table_code", tableCodeChunk)
      .order("quantity_min", { ascending: true })
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
      .order("quantity_min", { ascending: true })
      .returns<PrintingPriceTableRow[]>();

    if (optionError) {
      throw new Error(optionError.message);
    }

    for (const row of byOption ?? []) {
      rows.set(row.id, row);
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

    const tableCodes = getTableCodesForLocation(location);
    const tableCodeOptions = getTableCodeOptionsForLocation(location);

    const pairs =
      tableCodeOptions.length > 0
        ? tableCodeOptions.map((tableCodeOption, index) => ({
            tableCode: tableCodes[index] ?? tableCodes[0] ?? null,
            tableCodeOption,
          }))
        : tableCodes.length > 0
          ? tableCodes.map((tableCode) => ({
              tableCode,
              tableCodeOption: null,
            }))
          : [
              {
                tableCode: null,
                tableCodeOption: null,
              },
            ];

    for (const pair of pairs) {
      const priceTable = findPriceTable({
        tableCode: pair.tableCode,
        tableCodeOption: pair.tableCodeOption,
        priceTableMaps: params.priceTableMaps,
      });

      const payload = toJsonRecord(location.raw_payload);
      const locationIndex = getLocationIndex(location);
      const customizationTypeCode = getCustomizationTypeCode(
        location,
        pair.tableCode,
      );

      const serviceCode = buildServiceCode({
        variant,
        component,
        location,
        tableCode: pair.tableCode,
        tableCodeOption: pair.tableCodeOption,
        customizationTypeCode,
      });

      const locationImage = getLocationImage(location);
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
        customization_type_name: priceTable?.technique_name ?? customizationTypeCode,

        table_code: pair.tableCode,
        table_code_option: pair.tableCodeOption,

        component_code: component?.component_code ?? `C${locationIndex}`,
        component_name:
          component?.component_name ??
          getSlotString(payload, "Component", locationIndex),
        location_code: location.location_code ?? `L${locationIndex}`,
        location_name:
          location.location_name ??
          getSlotString(payload, "Location", locationIndex) ??
          getSlotString(payload, "ComposedLocation", locationIndex),

        logo_area: null,
        logo_width: null,
        logo_height: null,

        max_colors:
          getInteger(getSlotString(payload, "MaxColors", locationIndex)) ??
          priceTable?.max_colors ??
          null,
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
        is_active: true,

        printing_lines_image_url:
          buildStrickerPrintingLinesImageUrl(locationImage) ??
          buildStrickerLocationImageUrl(locationImage),
        printing_lines_storage_url: null,

        raw_payload: {
          ...payload,
          language: params.lang,
          source: "derived-from-product_customization_locations",
          variant_id: variant.id,
          component_id: component?.id ?? location.component_id ?? null,
          location_id: location.id,
          printing_price_table_id: priceTable?.id ?? null,
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
  offset: number;
  limit: number;
}): Promise<SyncRestCustomizationOptionsResult> {
  const supabaseAdmin = createSupabaseAdminClient();
  const supplierId = await getStrickerSupplierId();

  const datasetImportId = await createDatasetImport({
    supabaseAdmin,
    supplierId,
    lang: params.lang,
    offset: params.offset,
    limit: params.limit,
  });

  try {
    const locationsResult = await fetchLocations({
      supabaseAdmin,
      supplierId,
      offset: params.offset,
      limit: params.limit,
    });

    const locations = locationsResult.rows;
    const recordsTotal = locationsResult.total;

    const variantIds = locations
      .map((location) => location.variant_id)
      .filter((value): value is string => Boolean(value));

    const variants = await fetchVariantsByIds({
      supabaseAdmin,
      supplierId,
      variantIds,
    });

    const variantsById = buildVariantMap(variants);

    const components = await fetchComponents({
      supabaseAdmin,
      supplierId,
      variantIds: variants.map((variant) => variant.id),
    });

    const tableCodes = locations.flatMap((location) => [
      ...getTableCodesForLocation(location),
      ...getTableCodeOptionsForLocation(location),
    ]);

    const priceTables = await fetchPrintingPriceTables({
      supabaseAdmin,
      supplierId,
      tableCodes,
    });

    const componentMaps = buildComponentMaps(components);
    const priceTableMaps = buildPriceTableMaps(priceTables);

    const rows = buildCustomizationOptionRows({
      lang: params.lang,
      locations,
      variantsById,
      componentMaps,
      priceTableMaps,
    });

    const importedCount =
      rows.length > 0
        ? await upsertCustomizationOptions({
            supabaseAdmin,
            rows,
          })
        : 0;

    const nextOffset = params.offset + params.limit;
    const hasMore = nextOffset < recordsTotal;
    const normalizedNextOffset = hasMore ? nextOffset : null;
    const status = importedCount > 0 ? "success" : "partial_success";

    await finishDatasetImport({
      supabaseAdmin,
      datasetImportId,
      status,
      recordsReceived: locations.length,
      recordsImported: importedCount,
      recordsFailed: Math.max(locations.length - importedCount, 0),
      rawPayload: {
        Language: params.lang,
        RequestedLanguage: params.lang,
        Source: "derived-from-optionals",
        offset: params.offset,
        limit: params.limit,
        nextOffset: normalizedNextOffset,
        hasMore,
        recordsTotal,
        locationsMatched: locations.length,
        variantsMatched: variants.length,
        componentsMatched: components.length,
        priceTablesMatched: priceTables.length,
        rowsBuilt: rows.length,
        sampleLocationIds: locations.slice(0, 10).map((location) => location.id),
      },
      errors:
        importedCount > 0 || locations.length === 0
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
      hasMore,
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
      rawPayload: {
        Source: "derived-from-optionals",
        RequestedLanguage: params.lang,
        offset: params.offset,
        limit: params.limit,
      },
      errors: [
        error instanceof Error
          ? error.message
          : "Erro inesperado na geração de customizationOptions.",
      ],
    });

    throw error;
  }
}