import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildRecommendationReasons, calculateMatchScore } from "@/lib/smart-merch/match-score";
import {
  calculateEstimatedDelivery,
  resolveProductionDays,
  type DeliverySla,
  type FulfillmentSetting,
} from "@/lib/smart-merch/delivery";
import type {
  SmartMerchResult,
  SmartMerchSearchResponse,
  SmartQuery,
} from "@/lib/smart-merch/types";

type JsonRecord = Record<string, unknown>;

type CandidateImage = {
  external_url: string | null;
  storage_url: string | null;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
};

type CandidateVariant = {
  id: string;
  sku: string;
  color_name: string | null;
  color_desc_1: string | null;
  color_desc_2: string | null;
  material: string | null;
  is_active: boolean;
};

type CandidatePrice = {
  variant_id: string | null;
  final_price: number | string;
  quantity_min: number;
  quantity_max: number | null;
  currency: string;
  valid_until: string | null;
};

type CandidateStock = {
  variant_id: string | null;
  warehouse_code: string | null;
  available_quantity: number;
};

type CandidateCustomizationOption = {
  product_id?: string;
  table_code_option: string | null;
  is_active: boolean;
};

type CandidateProduct = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  brand: string | null;
  material: string | null;
  type_name: string | null;
  subtype_name: string | null;
  is_featured: boolean;
  is_customizable: boolean;
  min_order_quantity: number;
  lead_time_days: number | null;
  properties: unknown;
  keywords: unknown;
  product_images: CandidateImage[] | null;
  product_variants: CandidateVariant[] | null;
  product_prices: CandidatePrice[] | null;
  product_stocks: CandidateStock[] | null;
  product_customization_options: CandidateCustomizationOption[] | null;
};

type ResolvedVariant = {
  variant: CandidateVariant | null;
  price: CandidatePrice | null;
  stock: number;
  warehouseCode: "PT" | "CZ";
};

type DeliveryContext = {
  slas: DeliverySla[];
  settings: Map<"PT" | "CZ", FulfillmentSetting>;
};

const SEARCH_SYNONYMS: Record<string, string[]> = {
  caneta: ["esferografica", "escrita"],
  canetas: ["esferografica", "escrita"],
  esferografica: ["caneta", "escrita"],
  garrafa: ["garrafas", "cantil", "cantis"],
  garrafas: ["garrafa", "cantil", "cantis"],
  caderno: ["bloco", "notas"],
  cadernos: ["bloco", "notas"],
  tecnologico: ["tecnologia", "electronica"],
  tecnologicos: ["tecnologia", "electronica"],
};

const PRODUCT_SELECT = `
  id, sku, name, slug, short_description, description, brand, material,
  type_name, subtype_name, is_featured, is_customizable, min_order_quantity,
  lead_time_days, properties, keywords,
  product_images (external_url, storage_url, alt_text, is_primary, sort_order),
  product_variants (id, sku, color_name, color_desc_1, color_desc_2, material, is_active),
  product_prices (variant_id, final_price, quantity_min, quantity_max, currency, valid_until),
  product_stocks (variant_id, warehouse_code, available_quantity)
`;

async function attachCustomizationOptions(products: CandidateProduct[]): Promise<CandidateProduct[]> {
  if (products.length === 0) return products;
  const supabase = createSupabaseAdminClient();
  const byProduct = new Map<string, CandidateCustomizationOption[]>();
  const ids = products.map((product) => product.id);
  for (let index = 0; index < ids.length; index += 300) {
    const { data, error } = await supabase
      .from("product_customization_options")
      .select("product_id,table_code_option,is_active")
      .in("product_id", ids.slice(index, index + 300))
      .eq("is_active", true)
      .not("table_code_option", "is", null);
    if (error) throw new Error(`SMART_CUSTOMIZATION_QUERY_FAILED:${error.message}`);
    for (const option of data ?? []) {
      const productId = option.product_id as string;
      const current = byProduct.get(productId) ?? [];
      current.push(option as CandidateCustomizationOption);
      byProduct.set(productId, current);
    }
  }
  return products.map((product) => ({
    ...product,
    product_customization_options: byProduct.get(product.id) ?? [],
  }));
}

function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function uniqueTerms(values: string[]): string[] {
  const baseTerms = Array.from(
    new Set(
      values
        .flatMap((value) => normalize(value).split(" "))
        .filter((value) => value.length >= 3)
        .map((value) => value.slice(0, 50)),
    ),
  );
  const expandedTerms = baseTerms.flatMap((term) => [
    term,
    ...(SEARCH_SYNONYMS[term] ?? []),
  ]);

  return Array.from(new Set(expandedTerms)).slice(0, 12);
}

function getSearchTerms(query: SmartQuery): string[] {
  return uniqueTerms([
    ...query.productTypes,
    ...query.categories,
    ...query.materials,
    ...query.features,
    ...query.keywords,
  ]);
}

function buildDatabaseSearchFilter(terms: string[]): string {
  return terms
    .flatMap((term) => [
      `name.ilike.%${term}%`,
      `short_description.ilike.%${term}%`,
      `material.ilike.%${term}%`,
      `type_name.ilike.%${term}%`,
      `subtype_name.ilike.%${term}%`,
    ])
    .join(",");
}

async function loadCandidates(query: SmartQuery): Promise<CandidateProduct[]> {
  const supabase = createSupabaseAdminClient();
  const terms = getSearchTerms(query);

  const createQuery = () =>
    supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("status", "active")
      .eq("is_active", true)
      .eq("is_purchasable", true)
      .not("slug", "is", null)
      .order("is_featured", { ascending: false })
      .limit(700);

  const filteredQuery = createQuery();
  const filteredResult =
    terms.length > 0
      ? await filteredQuery.or(buildDatabaseSearchFilter(terms))
      : await filteredQuery;

  if (filteredResult.error) {
    throw new Error(`SMART_CATALOG_QUERY_FAILED:${filteredResult.error.message}`);
  }

  if ((filteredResult.data ?? []).length > 0 || terms.length === 0) {
    return (filteredResult.data ?? []) as unknown as CandidateProduct[];
  }

  const fallbackResult = await createQuery();

  if (fallbackResult.error) {
    throw new Error(`SMART_CATALOG_QUERY_FAILED:${fallbackResult.error.message}`);
  }

  return (fallbackResult.data ?? []) as unknown as CandidateProduct[];
}

function getTextValues(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (typeof item === "string") return [item];
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as JsonRecord;
    return [record.name, record.key, record.value]
      .filter((entry): entry is string => typeof entry === "string");
  });
}

function isSustainableProduct(product: CandidateProduct): boolean {
  if (!Array.isArray(product.properties)) return false;

  return product.properties.some((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const record = item as JsonRecord;
    const key = normalize(typeof record.key === "string" ? record.key : "");
    const value = record.value;

    return (
      ["recycled materials", "fsc", "our nature"].includes(key) &&
      (value === true || value === 1 || normalize(String(value)) === "true")
    );
  });
}

function productHaystack(product: CandidateProduct): string {
  return normalize(
    [
      product.name,
      product.short_description,
      product.description,
      product.brand,
      product.material,
      product.type_name,
      product.subtype_name,
      ...getTextValues(product.keywords),
      ...getTextValues(product.properties),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function matchRatio(haystack: string, values: string[]): number | null {
  const terms = uniqueTerms(values);
  if (terms.length === 0) return null;
  const matches = terms.filter((term) => haystack.includes(term)).length;
  return matches / terms.length;
}

function variantMatchesColors(variant: CandidateVariant, colors: string[]): boolean {
  if (colors.length === 0) return true;
  const variantColors = normalize(
    [variant.color_name, variant.color_desc_1, variant.color_desc_2].filter(Boolean).join(" "),
  );
  return uniqueTerms(colors).some((color) => variantColors.includes(color));
}

function getPriceForQuantity(
  prices: CandidatePrice[],
  quantity: number,
  variantId: string | null,
): CandidatePrice | null {
  const now = Date.now();

  return (
    prices
      .filter((price) => price.variant_id === variantId || price.variant_id === null)
      .filter((price) => price.quantity_min <= quantity)
      .filter((price) => price.quantity_max === null || price.quantity_max >= quantity)
      .filter((price) => price.valid_until === null || Date.parse(price.valid_until) > now)
      .sort((a, b) => b.quantity_min - a.quantity_min)[0] ?? null
  );
}

function getVariantStock(stocks: CandidateStock[], variantId: string | null, warehouse: "PT" | "CZ"): number {
  return stocks
    .filter((stock) => stock.variant_id === variantId && stock.warehouse_code === warehouse)
    .reduce((sum, stock) => sum + Math.max(0, stock.available_quantity), 0);
}

function resolveVariant(product: CandidateProduct, query: SmartQuery): ResolvedVariant | null {
  const quantity = query.quantity ?? product.min_order_quantity;
  const prices = product.product_prices ?? [];
  const stocks = product.product_stocks ?? [];
  const variants = (product.product_variants ?? []).filter(
    (variant) => variant.is_active && variantMatchesColors(variant, query.colors),
  );

  const options: ResolvedVariant[] = variants.map((variant) => {
    const price = getPriceForQuantity(prices, quantity, variant.id);
    const ptStock = getVariantStock(stocks, variant.id, "PT");
    const czStock = getVariantStock(stocks, variant.id, "CZ");
    return ptStock >= quantity
      ? { variant, price, stock: ptStock, warehouseCode: "PT" as const }
      : { variant, price, stock: czStock, warehouseCode: "CZ" as const };
  });

  const productPrice = getPriceForQuantity(prices, quantity, null);
  if (productPrice && query.colors.length === 0) {
    options.push({
      variant: null,
      price: productPrice,
      stock: stocks.filter((stock) => stock.warehouse_code === "PT").reduce((sum, stock) => sum + Math.max(0, stock.available_quantity), 0),
      warehouseCode: "PT",
    });
  }

  return (
    options
      .filter((option) => option.stock >= quantity)
      .sort((a, b) => {
        if (a.price && !b.price) return -1;
        if (!a.price && b.price) return 1;
        if (a.price && b.price) {
          return Number(a.price.final_price) - Number(b.price.final_price);
        }
        return b.stock - a.stock;
      })[0] ?? null
  );
}

function getImage(product: CandidateProduct): CandidateImage | null {
  const images = product.product_images ?? [];
  return images.find((image) => image.is_primary) ??
    [...images].sort((a, b) => a.sort_order - b.sort_order)[0] ?? null;
}

function buildResult(product: CandidateProduct, query: SmartQuery, delivery: DeliveryContext): SmartMerchResult | null {
  const quantity = query.quantity ?? product.min_order_quantity;
  if (quantity < product.min_order_quantity) return null;

  const resolved = resolveVariant(product, query);
  if (!resolved) return null;

  const parsedUnitPrice = resolved.price ? Number(resolved.price.final_price) : null;
  const unitPrice =
    parsedUnitPrice !== null && Number.isFinite(parsedUnitPrice) && parsedUnitPrice > 0
      ? parsedUnitPrice
      : null;
  const productTotal = unitPrice === null ? null : unitPrice * quantity;
  const hasBudgetConstraint = query.totalBudget !== null || query.maximumUnitBudget !== null;
  if (hasBudgetConstraint && unitPrice === null) return null;
  const withinBudget = query.totalBudget !== null
    ? productTotal !== null && productTotal <= query.totalBudget
    : query.maximumUnitBudget !== null
      ? unitPrice !== null && unitPrice <= query.maximumUnitBudget
      : null;
  if (withinBudget === false) return null;

  const personalizationRequested = /personali|log[oó]tipo|impress[aã]o|grava[cç][aã]o/i.test(query.originalText);
  const tableCodeOptions = (product.product_customization_options ?? [])
    .filter((option) => option.is_active && option.table_code_option)
    .map((option) => option.table_code_option as string);
  const productionDays = personalizationRequested
    ? resolveProductionDays({
        slas: delivery.slas,
        tableCodeOptions,
        warehouse: resolved.warehouseCode,
        quantity,
      })
    : 0;
  if (personalizationRequested && productionDays === null) return null;
  const fulfillmentSetting = delivery.settings.get(resolved.warehouseCode);
  if (!fulfillmentSetting) return null;
  const estimatedDeliveryDate = calculateEstimatedDelivery({
    start: new Date(),
    productionDays: productionDays ?? 0,
    setting: fulfillmentSetting,
  });
  const deadlineMatch = query.deadline === null
    ? null
    : estimatedDeliveryDate <= query.deadline;
  if (deadlineMatch === false) return null;

  const haystack = productHaystack(product);
  const intentScore = matchRatio(haystack, [
    ...query.productTypes,
    ...query.categories,
    ...query.materials,
    ...query.features,
    ...query.keywords,
  ]) ?? 0;
  const useScore = matchRatio(haystack, [...query.uses, ...query.occasions]);
  const sustainable = isSustainableProduct(product);
  const sustainableScore = query.sustainable === null
    ? null
    : query.sustainable === sustainable
      ? 1
      : 0;
  if (query.sustainable === true && !sustainable) return null;

  const matchScore = calculateMatchScore([
    { weight: 25, value: intentScore },
    { weight: 20, value: withinBudget === null ? null : withinBudget ? 1 : 0 },
    { weight: 20, value: 1 },
    { weight: 15, value: deadlineMatch === null ? null : deadlineMatch ? 1 : 0 },
    { weight: 10, value: useScore },
    { weight: 5, value: sustainableScore },
    { weight: 5, value: null },
  ]);
  const image = getImage(product);

  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    slug: product.slug,
    shortDescription: product.short_description,
    material: product.material,
    typeName: product.type_name,
    subtypeName: product.subtype_name,
    imageUrl: image?.storage_url ?? image?.external_url ?? null,
    imageAlt: image?.alt_text ?? product.name,
    isCustomizable: product.is_customizable,
    isSustainable: sustainable,
    quantity,
    minimumOrderQuantity: product.min_order_quantity,
    unitPrice,
    productTotal,
    currency: resolved.price?.currency ?? "EUR",
    variantId: resolved.variant?.id ?? null,
    variantSku: resolved.variant?.sku ?? null,
    variantColor: resolved.variant?.color_name ?? null,
    availableStock: resolved.stock,
    warehouseCode: resolved.warehouseCode,
    estimatedDeliveryDate,
    deliveryIncludesPersonalization: personalizationRequested,
    matchScore,
    reasons: buildRecommendationReasons({
      withinBudget,
      hasStock: true,
      intentScore,
      useScore,
      sustainableMatch: query.sustainable === true ? sustainable : null,
      deadlineMatch,
    }),
    unavailableCriteria: [
      "popularity" as const,
    ],
  };
}

function sortResults(results: SmartMerchResult[], query: SmartQuery): SmartMerchResult[] {
  return [...results].sort((a, b) => {
    if (query.sort === "lowest_price") return (a.unitPrice ?? Number.POSITIVE_INFINITY) - (b.unitPrice ?? Number.POSITIVE_INFINITY);
    if (query.sort === "sustainable") return Number(b.isSustainable) - Number(a.isSustainable) || b.matchScore - a.matchScore;
    if (query.sort === "best_value") {
      const valueA = a.unitPrice ? a.matchScore / a.unitPrice : -1;
      const valueB = b.unitPrice ? b.matchScore / b.unitPrice : -1;
      return valueB - valueA;
    }
    return b.matchScore - a.matchScore || (a.unitPrice ?? Number.POSITIVE_INFINITY) - (b.unitPrice ?? Number.POSITIVE_INFINITY);
  });
}

export async function searchSmartMerchProducts(query: SmartQuery): Promise<SmartMerchSearchResponse> {
  const supabase = createSupabaseAdminClient();
  const [{ data: slaData, error: slaError }, { data: settingData, error: settingError }] = await Promise.all([
    supabase.from("supplier_printing_slas").select("table_code_option,warehouse_code,quantity_min,quantity_max,production_days,is_available"),
    supabase.from("supplier_fulfillment_settings").select("warehouse_code,preparation_business_days,transport_business_days").eq("is_active", true),
  ]);
  if (slaError) throw new Error(`SMART_DELIVERY_SLA_QUERY_FAILED:${slaError.message}`);
  if (settingError) throw new Error(`SMART_DELIVERY_SETTINGS_QUERY_FAILED:${settingError.message}`);
  const delivery: DeliveryContext = {
    slas: (slaData ?? []) as DeliverySla[],
    settings: new Map((settingData ?? []).map((setting) => [setting.warehouse_code as "PT" | "CZ", setting as FulfillmentSetting])),
  };
  const candidates = await attachCustomizationOptions(await loadCandidates(query));
  const results = sortResults(
    candidates.flatMap((product) => {
      const result = buildResult(product, query, delivery);
      return result ? [result] : [];
    }),
    query,
  ).slice(0, 48);

  return {
    query,
    results,
    calculatedUnitBudget:
      query.quantity && query.totalBudget !== null
        ? query.totalBudget / query.quantity
        : query.maximumUnitBudget,
    pricingNotice:
      "Os valores apresentados incluem apenas o produto para a quantidade indicada. Personalização, setup, portes e IVA são calculados quando existirem dados suficientes ou no checkout.",
    deadlineNotice: query.deadline
      ? "A seleção apresenta apenas produtos cuja entrega estimada é compatível com a data pretendida."
      : null,
    earliestAvailableDate: results.length > 0
      ? results.map((result) => result.estimatedDeliveryDate).sort()[0]
      : null,
  };
}
