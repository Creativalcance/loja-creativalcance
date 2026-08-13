import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildRecommendationReasons, calculateMatchScore } from "@/lib/smart-merch/match-score";
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
};

type ResolvedVariant = {
  variant: CandidateVariant | null;
  price: CandidatePrice;
  stock: number;
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

function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function uniqueTerms(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .flatMap((value) => normalize(value).split(" "))
        .filter((value) => value.length >= 3)
        .map((value) => value.slice(0, 50)),
    ),
  ).slice(0, 8);
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

function getVariantStock(stocks: CandidateStock[], variantId: string | null): number {
  return stocks
    .filter((stock) => stock.variant_id === variantId)
    .reduce((sum, stock) => sum + Math.max(0, stock.available_quantity), 0);
}

function resolveVariant(product: CandidateProduct, query: SmartQuery): ResolvedVariant | null {
  const quantity = query.quantity ?? product.min_order_quantity;
  const prices = product.product_prices ?? [];
  const stocks = product.product_stocks ?? [];
  const variants = (product.product_variants ?? []).filter(
    (variant) => variant.is_active && variantMatchesColors(variant, query.colors),
  );

  const options: ResolvedVariant[] = variants.flatMap((variant) => {
    const price = getPriceForQuantity(prices, quantity, variant.id);
    if (!price) return [];
    return [{ variant, price, stock: getVariantStock(stocks, variant.id) }];
  });

  const productPrice = getPriceForQuantity(prices, quantity, null);
  if (productPrice && query.colors.length === 0) {
    options.push({
      variant: null,
      price: productPrice,
      stock: stocks.reduce((sum, stock) => sum + Math.max(0, stock.available_quantity), 0),
    });
  }

  return (
    options
      .filter((option) => option.stock >= quantity)
      .sort((a, b) => Number(a.price.final_price) - Number(b.price.final_price))[0] ?? null
  );
}

function getImage(product: CandidateProduct): CandidateImage | null {
  const images = product.product_images ?? [];
  return images.find((image) => image.is_primary) ??
    [...images].sort((a, b) => a.sort_order - b.sort_order)[0] ?? null;
}

function buildResult(product: CandidateProduct, query: SmartQuery): SmartMerchResult | null {
  const quantity = query.quantity ?? product.min_order_quantity;
  if (quantity < product.min_order_quantity) return null;

  const resolved = resolveVariant(product, query);
  if (!resolved) return null;

  const unitPrice = Number(resolved.price.final_price);
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) return null;
  const productTotal = unitPrice * quantity;
  const withinBudget = query.totalBudget !== null
    ? productTotal <= query.totalBudget
    : query.maximumUnitBudget !== null
      ? unitPrice <= query.maximumUnitBudget
      : null;
  if (withinBudget === false) return null;

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
    { weight: 15, value: null },
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
    currency: resolved.price.currency,
    variantId: resolved.variant?.id ?? null,
    variantSku: resolved.variant?.sku ?? null,
    variantColor: resolved.variant?.color_name ?? null,
    availableStock: resolved.stock,
    matchScore,
    reasons: buildRecommendationReasons({
      withinBudget,
      hasStock: true,
      intentScore,
      useScore,
      sustainableMatch: query.sustainable === true ? sustainable : null,
    }),
    unavailableCriteria: [
      ...(query.deadline ? (["deadline"] as const) : []),
      "popularity" as const,
    ],
  };
}

function sortResults(results: SmartMerchResult[], query: SmartQuery): SmartMerchResult[] {
  return [...results].sort((a, b) => {
    if (query.sort === "lowest_price") return a.unitPrice - b.unitPrice;
    if (query.sort === "sustainable") return Number(b.isSustainable) - Number(a.isSustainable) || b.matchScore - a.matchScore;
    if (query.sort === "best_value") return b.matchScore / b.unitPrice - a.matchScore / a.unitPrice;
    return b.matchScore - a.matchScore || a.unitPrice - b.unitPrice;
  });
}

export async function searchSmartMerchProducts(query: SmartQuery): Promise<SmartMerchSearchResponse> {
  const candidates = await loadCandidates(query);
  const results = sortResults(
    candidates.flatMap((product) => {
      const result = buildResult(product, query);
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
      ? "A data pretendida foi registada, mas ainda não é usada para prometer a entrega enquanto os SLA de produção e transporte não estiverem totalmente integrados."
      : null,
  };
}
