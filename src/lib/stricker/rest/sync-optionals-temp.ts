import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStrickerSupplierId } from "@/lib/stricker/auth";
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
  final_price: number;
  catalog_price: number | null;
  your_price: number | null;
  price_source: string;
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
  pricesImported: number;
  imagesImported: number;
  componentsImported: number;
  locationsImported: number;
  datasetImportId: string;
};

const UPSERT_CHUNK_SIZE = 500;
const QUERY_CHUNK_SIZE = 400;
const MAX_CUSTOMIZATION_SLOTS = 8;

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

function getOptionalSku(record: StrickerOptionalRecord): string | null {
  return getNullableString(record.WebSku) ?? getNullableString(record.Sku);
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
      .select("id,supplier_id,external_id,material")
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
  return new Map(variants.map((variant) => [variant.external_variant_id, variant]));
}

function buildPriceRows(params: {
  records: StrickerOptionalRecord[];
  variantsBySku: Map<string, ImportedVariantRow>;
}): ProductPriceInsertRow[] {
  const rows: ProductPriceInsertRow[] = [];

  for (const record of params.records) {
    const sku = getOptionalSku(record);

    if (!sku) {
      continue;
    }

    const variant = params.variantsBySku.get(sku);

    if (!variant) {
      continue;
    }

    const tiers: {
      quantityMin: number;
      supplierPrice: number;
    }[] = [];

    for (let index = 1; index <= 10; index += 1) {
      const quantityMin = getRecordSlotNumber(record, "MinQt", index);
      const price = getRecordSlotNumber(record, "Price", index);

      if (!quantityMin || quantityMin <= 0 || price === null || price < 0) {
        continue;
      }

      tiers.push({
        quantityMin: Math.round(quantityMin),
        supplierPrice: price,
      });
    }

    if (tiers.length === 0) {
      const yourPrice = getNumber(record.YourPrice);

      if (yourPrice !== null && yourPrice >= 0) {
        tiers.push({
          quantityMin: 1,
          supplierPrice: yourPrice,
        });
      }
    }

    tiers.sort((a, b) => a.quantityMin - b.quantityMin);

    for (let index = 0; index < tiers.length; index += 1) {
      const currentTier = tiers[index];
      const nextTier = tiers[index + 1] ?? null;
      const quantityMax = nextTier ? nextTier.quantityMin - 1 : null;

      rows.push({
        product_id: variant.product_id,
        variant_id: variant.id,
        supplier_id: variant.supplier_id,
        currency: "EUR",
        quantity_min: currentTier.quantityMin,
        quantity_max: quantityMax,
        supplier_price: currentTier.supplierPrice,
        base_price: currentTier.supplierPrice,
        margin_percentage: 0,
        final_price: currentTier.supplierPrice,
        catalog_price: currentTier.supplierPrice,
        your_price: getNumber(record.YourPrice),
        price_source: "your_price",
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
      const componentImage = getRecordSlotString(record, "Component", index)
        ? getRecordSlotString(record, "Component", index)
        : null;
      const componentImageFile = getRecordSlotString(
        record,
        "Component",
        index,
      );

      const actualComponentImageFile =
        getNullableString(
          record[`Component${index}Image` as keyof StrickerOptionalRecord],
        ) ?? componentImageFile;

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
        image_url: buildStrickerComponentImageUrl(actualComponentImageFile),
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

  for (const rowChunk of chunkArray(params.rows, UPSERT_CHUNK_SIZE)) {
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

      const locationImage = getNullableString(
        record[`Location${index}Image` as keyof StrickerOptionalRecord],
      );

      const areaImage = getNullableString(
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
        max_area_cm: area.width && area.height ? null : null,
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
  for (const rowChunk of chunkArray(params.rows, UPSERT_CHUNK_SIZE)) {
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

    const references = records
      .map((record) => getProdReference(record))
      .filter((value): value is string => Boolean(value));

    const products = await fetchProductsByReferences({
      supabaseAdmin,
      supplierId,
      references,
    });

    const productsByReference = buildProductMap(products);

    const variantRows = buildVariantRows({
      records,
      productsByReference,
    });

    const importedVariants = await upsertVariants({
      supabaseAdmin,
      rows: variantRows,
    });

    const variantsBySku = buildVariantMap(importedVariants);
    const variantIds = importedVariants.map((variant) => variant.id);

    if (variantIds.length > 0) {
      await deleteExistingVariantRelatedRows({
        supabaseAdmin,
        variantIds,
      });
    }

    const priceRows = buildPriceRows({
      records,
      variantsBySku,
    });

    if (priceRows.length > 0) {
      await insertPrices({
        supabaseAdmin,
        rows: priceRows,
      });
    }

    const imageRows = buildImageRows({
      records,
      variantsBySku,
    });

    if (imageRows.length > 0) {
      await insertImages({
        supabaseAdmin,
        rows: imageRows,
      });
    }

    const componentRows = buildComponentRows({
      records,
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
      records,
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
      importedVariants.length > 0 ? "success" : "partial_success";

    const errors =
      importedVariants.length > 0
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
      recordsFailed: Math.max(records.length - importedVariants.length, 0),
      rawPayload: {
        Count: payload.Count ?? records.length,
        Currency: payload.Currency ?? null,
        Language: payload.Language ?? params.lang,
        sample: records.slice(0, 5),
      },
      errors,
    });

    return {
      dataset: "optionals",
      lang: params.lang,
      recordsReceived: records.length,
      variantsImported: importedVariants.length,
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