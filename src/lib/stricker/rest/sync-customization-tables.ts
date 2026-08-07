import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { findBestPricingRule } from "@/lib/pricing/apply-pricing-rule";
import { calculateProductSellingPrice } from "@/lib/pricing/calculate-product-price";
import { type PricingRule } from "@/lib/pricing/types";
import { getStrickerSupplierId } from "@/lib/stricker/auth";
import { fetchStrickerDataset } from "@/lib/stricker/rest/client";
import { getValidStrickerSessionToken } from "@/lib/stricker/rest/session";
import { type StrickerLanguage } from "@/lib/stricker/rest/types";
import { type JsonRecord } from "@/lib/stricker/types";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

type SupplierDatasetImportRow = {
  id: string;
};

type StrickerCustomizationTableRecord = {
  CustomizationTypeCode?: string | number | null;
  CustomizationTypeName?: string | number | null;
  TableCode?: string | number | null;
  TableCodeOption?: string | number | null;
  TableFullCode?: string | number | null;
  PriceByColor?: boolean | string | number | null;
  PriceByArea?: boolean | string | number | null;
  PriceByStitches?: boolean | string | number | null;
  AllowFullColor?: boolean | string | number | null;
  MaxColors?: string | number | null;
  MaxArea?: string | number | null;
  AreaCM?: string | number | null;
  AreaCM2?: string | number | null;
  TableMaxAreaCM?: string | number | null;
  TableMaxAreaCM2?: string | number | null;
  Stitches?: string | number | null;
  AdditionalStitches?: string | number | null;
  HandlingCostCode?: string | number | null;
  HandlingCost?: string | number | null;
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
};

type PrintingPriceTableUpsertRow = {
  supplier_id: string;
  external_id: string;
  table_code: string;
  table_code_option: string | null;
  technique_code: string | null;
  technique_name: string | null;
  price_by_color: boolean;
  price_by_area: boolean;
  price_by_stitches: boolean;
  allow_full_color: boolean;
  max_colors: number | null;
  max_area: number | null;
  area_cm: number | null;
  area_cm2: number | null;
  stitches: number | null;
  additional_stitches: number | null;
  handling_cost_code: string | null;
  handling_cost: number;
  supplier_handling_cost: number;
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
  handling_margin_rate: number | null;
  handling_markup_rate: number | null;
  handling_pricing_rule_id: string | null;
  final_price: number;
  price_source: string;
  source_price_field: string | null;
  source_updated_at: string;
  calculated_at: string;
  is_active: boolean;
  raw_payload: JsonRecord;
};

export type SyncRestCustomizationTablesResult = {
  dataset: "customizationTables";
  lang: StrickerLanguage;
  recordsReceived: number;
  tablesImported: number;
  techniqueTranslationsImported: number;
  datasetImportId: string;
};

const UPSERT_CHUNK_SIZE = 500;
const DEFAULT_PERSONALIZATION_MARGIN_RATE = 0.5;
const DEFAULT_SETUP_MARGIN_RATE = 0.3;

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

function getInteger(value: unknown): number | null {
  const parsed = getNumber(value);

  if (parsed === null) {
    return null;
  }

  return Math.round(parsed);
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

function getSlotNumber(
  record: StrickerCustomizationTableRecord,
  prefix: "MinQt" | "Price",
  index: number,
): number | null {
  return getNumber(
    record[`${prefix}${index}` as keyof StrickerCustomizationTableRecord],
  );
}

function getTechniqueCode(tableCode: string): string | null {
  const firstPart = tableCode.split("-")[0]?.trim();

  return firstPart && firstPart.length > 0 ? firstPart : null;
}

function buildExternalId(params: {
  tableCode: string;
  tableCodeOption: string | null;
  tableFullCode: string | null;
  quantityMin: number;
}): string {
  const base = params.tableFullCode ?? params.tableCodeOption ?? params.tableCode;

  return `${base}:q:${params.quantityMin}`;
}

function buildRawPayload(params: {
  record: StrickerCustomizationTableRecord;
  lang: StrickerLanguage;
  techniqueCode: string | null;
  techniqueName: string | null;
  supplierHandlingCost: number;
  finalHandlingCost: number;
  supplierPrice: number;
  finalPrice: number;
  priceRuleId: string | null;
  handlingRuleId: string | null;
}): JsonRecord {
  return {
    ...toJsonRecord(params.record),
    language: params.lang,
    technique_code: params.techniqueCode,
    technique_name: params.techniqueName,
    supplier_handling_cost: params.supplierHandlingCost,
    final_handling_cost: params.finalHandlingCost,
    supplier_price: params.supplierPrice,
    final_price: params.finalPrice,
    pricing_rule_id: params.priceRuleId,
    handling_pricing_rule_id: params.handlingRuleId,
  };
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
    .eq("is_active", true)
    .returns<PricingRule[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

function calculateFinalHandlingCost(params: {
  supplierId: string;
  supplierHandlingCost: number;
  quantity: number;
  pricingRules: PricingRule[];
}): {
  finalHandlingCost: number;
  marginRate: number | null;
  markupRate: number | null;
  pricingRuleId: string | null;
} {
  if (params.supplierHandlingCost <= 0) {
    return {
      finalHandlingCost: 0,
      marginRate: null,
      markupRate: null,
      pricingRuleId: null,
    };
  }

  const pricingRule = findBestPricingRule(params.pricingRules, {
    supplierId: params.supplierId,
    customerGroup: "default",
    priceType: "setup",
    quantity: params.quantity,
  });

  const calculatedPrice = calculateProductSellingPrice({
    supplierPrice: params.supplierHandlingCost,
    marginRate: pricingRule?.margin_rate ?? DEFAULT_SETUP_MARGIN_RATE,
    markupRate: pricingRule?.markup_rate ?? null,
    fixedFee: pricingRule?.fixed_fee ?? 0,
    minimumProfit: pricingRule?.minimum_profit ?? 0,
    roundingMode: pricingRule?.rounding_mode ?? "commercial_05",
  });

  return {
    finalHandlingCost: calculatedPrice.finalPrice,
    marginRate: calculatedPrice.marginRate,
    markupRate: calculatedPrice.markupRate,
    pricingRuleId: pricingRule?.id ?? null,
  };
}

function buildPrintingPriceTableRows(params: {
  supplierId: string;
  lang: StrickerLanguage;
  records: StrickerCustomizationTableRecord[];
  pricingRules: PricingRule[];
}): PrintingPriceTableUpsertRow[] {
  const rows: PrintingPriceTableUpsertRow[] = [];
  const calculatedAt = new Date().toISOString();

  for (const record of params.records) {
    const tableCode = getNullableString(record.TableCode);
    const tableCodeOption = getNullableString(record.TableCodeOption);
    const tableFullCode = getNullableString(record.TableFullCode);

    if (!tableCode) {
      continue;
    }

    const techniqueCode =
      getNullableString(record.CustomizationTypeCode) ??
      getTechniqueCode(tableCode);

    const techniqueName = getNullableString(record.CustomizationTypeName);
    const supplierHandlingCost = getNumber(record.HandlingCost) ?? 0;

    const tiers: {
      quantityMin: number;
      supplierPrice: number;
      sourcePriceField: string;
    }[] = [];

    for (let index = 1; index <= 10; index += 1) {
      const quantityMin = getSlotNumber(record, "MinQt", index);
      const price = getSlotNumber(record, "Price", index);

      if (!quantityMin || quantityMin <= 0 || price === null || price < 0) {
        continue;
      }

      tiers.push({
        quantityMin: Math.round(quantityMin),
        supplierPrice: price,
        sourcePriceField: `Price${index}`,
      });
    }

    if (tiers.length === 0) {
      continue;
    }

    tiers.sort((a, b) => a.quantityMin - b.quantityMin);

    for (let index = 0; index < tiers.length; index += 1) {
      const currentTier = tiers[index];
      const nextTier = tiers[index + 1] ?? null;
      const quantityMax = nextTier
        ? Math.max(currentTier.quantityMin, nextTier.quantityMin - 1)
        : null;

      const personalizationRule = findBestPricingRule(params.pricingRules, {
        supplierId: params.supplierId,
        customerGroup: "default",
        priceType: "personalization",
        quantity: currentTier.quantityMin,
      });

      const calculatedPersonalizationPrice = calculateProductSellingPrice({
        supplierPrice: currentTier.supplierPrice,
        marginRate:
          personalizationRule?.margin_rate ??
          DEFAULT_PERSONALIZATION_MARGIN_RATE,
        markupRate: personalizationRule?.markup_rate ?? null,
        fixedFee: personalizationRule?.fixed_fee ?? 0,
        minimumProfit: personalizationRule?.minimum_profit ?? 0,
        roundingMode: personalizationRule?.rounding_mode ?? "commercial_05",
      });

      const calculatedHandlingCost = calculateFinalHandlingCost({
        supplierId: params.supplierId,
        supplierHandlingCost,
        quantity: currentTier.quantityMin,
        pricingRules: params.pricingRules,
      });

      rows.push({
        supplier_id: params.supplierId,
        external_id: buildExternalId({
          tableCode,
          tableCodeOption,
          tableFullCode,
          quantityMin: currentTier.quantityMin,
        }),
        table_code: tableCode,
        table_code_option: tableCodeOption,
        technique_code: techniqueCode,
        technique_name: techniqueName,
        price_by_color: getBoolean(record.PriceByColor, false),
        price_by_area: getBoolean(record.PriceByArea, false),
        price_by_stitches: getBoolean(record.PriceByStitches, false),
        allow_full_color: getBoolean(record.AllowFullColor, false),
        max_colors: getInteger(record.MaxColors),
        max_area: getNumber(record.MaxArea),
        area_cm: getNumber(record.AreaCM) ?? getNumber(record.TableMaxAreaCM),
        area_cm2: getNumber(record.AreaCM2) ?? getNumber(record.TableMaxAreaCM2),
        stitches: getInteger(record.Stitches),
        additional_stitches: getInteger(record.AdditionalStitches),
        handling_cost_code: getNullableString(record.HandlingCostCode),
        supplier_handling_cost: supplierHandlingCost,
        handling_cost: calculatedHandlingCost.finalHandlingCost,
        currency: "EUR",
        quantity_min: currentTier.quantityMin,
        quantity_max: quantityMax,
        supplier_price: currentTier.supplierPrice,
        base_price: currentTier.supplierPrice,
        margin_percentage: calculatedPersonalizationPrice.marginRate
          ? Number((calculatedPersonalizationPrice.marginRate * 100).toFixed(4))
          : 0,
        margin_rate: calculatedPersonalizationPrice.marginRate,
        markup_rate: calculatedPersonalizationPrice.markupRate,
        fixed_fee: calculatedPersonalizationPrice.fixedFee,
        minimum_profit: calculatedPersonalizationPrice.minimumProfit,
        pricing_rule_id: personalizationRule?.id ?? null,
        handling_margin_rate: calculatedHandlingCost.marginRate,
        handling_markup_rate: calculatedHandlingCost.markupRate,
        handling_pricing_rule_id: calculatedHandlingCost.pricingRuleId,
        final_price: calculatedPersonalizationPrice.finalPrice,
        price_source: "stricker_customization_tables",
        source_price_field: currentTier.sourcePriceField,
        source_updated_at: calculatedAt,
        calculated_at: calculatedAt,
        is_active: true,
        raw_payload: buildRawPayload({
          record,
          lang: params.lang,
          techniqueCode,
          techniqueName,
          supplierHandlingCost,
          finalHandlingCost: calculatedHandlingCost.finalHandlingCost,
          supplierPrice: currentTier.supplierPrice,
          finalPrice: calculatedPersonalizationPrice.finalPrice,
          priceRuleId: personalizationRule?.id ?? null,
          handlingRuleId: calculatedHandlingCost.pricingRuleId,
        }),
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
      dataset_name: "customizationTables",
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

async function upsertPrintingPriceTables(params: {
  supabaseAdmin: SupabaseAdminClient;
  rows: PrintingPriceTableUpsertRow[];
}): Promise<void> {
  for (const rowChunk of chunkArray(params.rows, UPSERT_CHUNK_SIZE)) {
    const { data: existingOverrides, error: existingOverridesError } =
      await params.supabaseAdmin
        .from("printing_price_tables")
        .select(
          "external_id,pricing_mode,margin_percentage,margin_rate,markup_rate,fixed_fee,manual_price,final_price,is_manual_override,override_reason,override_updated_at,override_updated_by,handling_cost,handling_margin_rate,handling_markup_rate,handling_pricing_mode,handling_manual_price,handling_is_manual_override,handling_override_reason,handling_override_updated_at,handling_override_updated_by",
        )
        .in(
          "external_id",
          rowChunk.map((row) => row.external_id),
        )
        .or("is_manual_override.eq.true,handling_is_manual_override.eq.true");

    if (existingOverridesError) {
      throw new Error(existingOverridesError.message);
    }

    const overridesByExternalId = new Map(
      (existingOverrides ?? []).map((row) => [row.external_id, row]),
    );

    const rowsToUpsert = rowChunk.map((row) => {
      const override = overridesByExternalId.get(row.external_id);
      if (!override) return row;

      return {
        ...row,
        ...(override.is_manual_override
          ? {
              pricing_mode: override.pricing_mode,
              margin_percentage: override.margin_percentage,
              margin_rate: override.margin_rate,
              markup_rate: override.markup_rate,
              fixed_fee: override.fixed_fee,
              manual_price: override.manual_price,
              final_price: override.final_price,
              is_manual_override: true,
              override_reason: override.override_reason,
              override_updated_at: override.override_updated_at,
              override_updated_by: override.override_updated_by,
            }
          : {}),
        ...(override.handling_is_manual_override
          ? {
              handling_cost: override.handling_cost,
              handling_margin_rate: override.handling_margin_rate,
              handling_markup_rate: override.handling_markup_rate,
              handling_pricing_mode: override.handling_pricing_mode,
              handling_manual_price: override.handling_manual_price,
              handling_is_manual_override: true,
              handling_override_reason: override.handling_override_reason,
              handling_override_updated_at: override.handling_override_updated_at,
              handling_override_updated_by: override.handling_override_updated_by,
            }
          : {}),
      };
    });

    const { error } = await params.supabaseAdmin
      .from("printing_price_tables")
      .upsert(rowsToUpsert, {
        onConflict: "supplier_id,external_id",
      });

    if (error) {
      throw new Error(error.message);
    }
  }
}

function countUniqueTechniqueTranslations(
  records: StrickerCustomizationTableRecord[],
): number {
  const techniques = new Set<string>();

  for (const record of records) {
    const tableCode = getNullableString(record.TableCode);
    const techniqueCode =
      getNullableString(record.CustomizationTypeCode) ??
      (tableCode ? getTechniqueCode(tableCode) : null);
    const techniqueName = getNullableString(record.CustomizationTypeName);

    if (techniqueCode && techniqueName) {
      techniques.add(`${techniqueCode}:${techniqueName}`);
    }
  }

  return techniques.size;
}

export async function syncRestCustomizationTables(params: {
  lang: StrickerLanguage;
}): Promise<SyncRestCustomizationTablesResult> {
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
        dataset: "customizationTables",
        token,
        lang: params.lang,
      },
      {
        timeoutMs: 600_000,
      },
    );

    const records = Array.isArray(payload.CustomizationTables)
      ? (payload.CustomizationTables as StrickerCustomizationTableRecord[])
      : [];

    const pricingRules = await fetchPricingRules({
      supabaseAdmin,
    });

    const rows = buildPrintingPriceTableRows({
      supplierId,
      lang: params.lang,
      records,
      pricingRules,
    });

    if (rows.length > 0) {
      await upsertPrintingPriceTables({
        supabaseAdmin,
        rows,
      });
    }

    const techniqueTranslationsImported =
      countUniqueTechniqueTranslations(records);
    const status = rows.length > 0 ? "success" : "partial_success";

    await finishDatasetImport({
      supabaseAdmin,
      datasetImportId,
      status,
      recordsReceived: records.length,
      recordsImported: rows.length,
      recordsFailed: Math.max(records.length - rows.length, 0),
      rawPayload: {
        Count: payload.Count ?? records.length,
        Currency: payload.Currency ?? null,
        Language: payload.Language ?? params.lang,
        pricingRulesLoaded: pricingRules.length,
        techniqueTranslationsImported,
        sample: records.slice(0, 5),
      },
      errors:
        rows.length > 0
          ? []
          : [
              "CustomizationTables recebidas da Stricker, mas nenhuma tabela válida foi importada.",
            ],
    });

    return {
      dataset: "customizationTables",
      lang: params.lang,
      recordsReceived: records.length,
      tablesImported: rows.length,
      techniqueTranslationsImported,
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
          : "Erro inesperado na sincronização REST de customizationTables.",
      ],
    });

    throw error;
  }
}
