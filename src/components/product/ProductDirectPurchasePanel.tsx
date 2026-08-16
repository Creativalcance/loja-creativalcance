"use client";

import Link from "next/link";
import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Package,
  Palette,
  ShoppingCart,
  Truck,
} from "lucide-react";
import {
  addToCartAction,
  type AddToCartActionState,
} from "@/lib/cart/actions";
import {
  startCustomizationDraftAction,
  type StartCustomizationDraftState,
} from "@/lib/customization/actions";
import { calculateCartItemPricing } from "@/lib/pricing/calculate-cart-item";
import { trackGa4Event } from "@/lib/analytics/ga4-client";

export type ProductPurchaseColor = {
  id: string;
  sku: string;
  color_name: string | null;
  color_hex: string | null;
  size: string | null;
  image_url: string | null;
  high_resolution_image_url: string | null;
};

export type ProductPurchasePrice = {
  variant_id: string | null;
  final_price: number;
  supplier_price: number;
  quantity_min: number;
  quantity_max: number | null;
  currency: string;
};

export type ProductPurchaseStock = {
  variant_id: string | null;
  available_quantity: number;
  incoming_quantity: number;
  expected_restock_date: string | null;
};

export type ProductPurchaseFutureStock = {
  variant_id: string | null;
  warehouse_code: string;
  expected_date: string;
  expected_quantity: number;
};

export type ProductPurchaseCustomizationDraft = {
  id: string;
  variant_id: string | null;
  quantity: number;
  component_name: string | null;
  location_name: string | null;
  technique_name: string | null;
  logo_file_name: string | null;
  technical_preview_url: string | null;
  product_unit_price: number;
  personalization_unit_price: number;
  setup_cost: number;
  extras_total: number;
  estimated_total: number;
  currency: string;
  artwork_status: string;
};

type StockSummary = {
  available: number;
  incoming: number;
  orderable: number;
  nextEntries: ProductPurchaseFutureStock[];
};

type ColorGroup = {
  key: string;
  label: string;
  hex: string | null;
  image_url: string | null;
  high_resolution_image_url: string | null;
  variants: ProductPurchaseColor[];
  stockAvailable: number;
};

type ProductDirectPurchasePanelProps = {
  productId: string;
  productSlug: string;
  productSku: string;
  productName: string;
  shortDescription: string | null;
  productDescription: string | null;
  productImageUrl: string | null;
  productHighResolutionImageUrl: string | null;
  brand: string | null;
  material: string | null;
  dimensions: string | null;
  weight: number | null;
  minimumQuantity: number;
  totalStock: number;
  isCustomizable: boolean;
  customizationDraft:
    | ProductPurchaseCustomizationDraft
    | null;
  prices: ProductPurchasePrice[];
  colors: ProductPurchaseColor[];
  stocks: ProductPurchaseStock[];
  futureStocks: ProductPurchaseFutureStock[];
};

const initialCartState: AddToCartActionState = {
  success: false,
  message: "",
};

const initialCustomizationState: StartCustomizationDraftState =
  {
    success: false,
    message: "",
  };

const SIZE_ORDER = [
  "XXS",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "2XL",
  "3XL",
  "4XL",
  "5XL",
  "6XL",
];

function formatPrice(
  value: number,
  currency: string,
): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency,
  }).format(value);
}

function getColorLabel(
  color: ProductPurchaseColor,
): string {
  return color.color_name ?? "Cor disponível";
}

function getVariantLabel(
  color: ProductPurchaseColor,
): string {
  if (color.color_name && color.size) {
    return `${color.color_name} · ${color.size}`;
  }

  return (
    color.color_name ??
    color.size ??
    "Opção disponível"
  );
}

function getSizeLabel(
  color: ProductPurchaseColor,
): string {
  return color.size ?? "Tamanho único";
}

function getColorKey(
  color: ProductPurchaseColor,
): string {
  const colorName =
    color.color_name?.trim().toLowerCase() ??
    "sem-cor";

  const colorHex =
    color.color_hex?.trim().toLowerCase() ??
    "sem-hex";

  return `${colorName}:${colorHex}`;
}

function getSizeOrderValue(
  size: string | null,
): number {
  if (!size) {
    return 999;
  }

  const normalizedSize =
    size.trim().toUpperCase();

  const index =
    SIZE_ORDER.indexOf(normalizedSize);

  if (index >= 0) {
    return index;
  }

  return (
    500 +
    normalizedSize.localeCompare("ZZZ")
  );
}

function getStockForVariant(params: {
  stocks: ProductPurchaseStock[];
  futureStocks?: ProductPurchaseFutureStock[];
  variantId: string | null;
}): StockSummary {
  const nextEntries = (params.futureStocks ?? [])
    .filter((stock) =>
      params.variantId
        ? stock.variant_id === params.variantId
        : !stock.variant_id,
    )
    .filter((stock) => stock.expected_quantity > 0)
    .sort((a, b) => a.expected_date.localeCompare(b.expected_date));
  const incoming = nextEntries.reduce(
    (total, stock) => total + stock.expected_quantity,
    0,
  );

  if (!params.variantId) {
    const productStocks =
      params.stocks.filter(
        (stock) => !stock.variant_id,
      );

    const available = productStocks.reduce(
        (total, stock) =>
          total + stock.available_quantity,
        0,
      );

    return {
      available,
      incoming,
      orderable: available + incoming,
      nextEntries,
    };
  }

  const variantStocks =
    params.stocks.filter(
      (stock) =>
        stock.variant_id === params.variantId,
    );

  const available = variantStocks.reduce(
      (total, stock) =>
        total + stock.available_quantity,
      0,
    );

  return {
    available,
    incoming,
    orderable: available + incoming,
    nextEntries,
  };
}

function formatStockDate(value: string): string {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatNextEntries(entries: ProductPurchaseFutureStock[]): string {
  if (entries.length === 0) return "—";

  const quantitiesByDate = new Map<string, number>();

  for (const entry of entries) {
    quantitiesByDate.set(
      entry.expected_date,
      (quantitiesByDate.get(entry.expected_date) ?? 0) +
        entry.expected_quantity,
    );
  }

  return [...quantitiesByDate.entries()]
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(
      ([date, quantity]) =>
        `${formatStockDate(date)} · ${quantity.toLocaleString("pt-PT")} un.`,
    )
    .join(" · ");
}

function dedupeVariantsBySize(params: {
  variants: ProductPurchaseColor[];
  stocks: ProductPurchaseStock[];
}): ProductPurchaseColor[] {
  const map =
    new Map<string, ProductPurchaseColor>();

  for (const variant of params.variants) {
    const sizeKey = getSizeLabel(variant)
      .trim()
      .toLowerCase();

    const existingVariant =
      map.get(sizeKey);

    if (!existingVariant) {
      map.set(sizeKey, variant);
      continue;
    }

    const existingStock =
      getStockForVariant({
        stocks: params.stocks,
        variantId: existingVariant.id,
      });

    const currentStock =
      getStockForVariant({
        stocks: params.stocks,
        variantId: variant.id,
      });

    const shouldReplace =
      currentStock.available >
        existingStock.available ||
      (!existingVariant.image_url &&
        Boolean(variant.image_url));

    if (shouldReplace) {
      map.set(sizeKey, variant);
    }
  }

  return Array.from(map.values());
}

function sortVariantsBySize(
  variants: ProductPurchaseColor[],
): ProductPurchaseColor[] {
  return [...variants].sort((a, b) => {
    const sizeComparison =
      getSizeOrderValue(a.size) -
      getSizeOrderValue(b.size);

    if (sizeComparison !== 0) {
      return sizeComparison;
    }

    return getSizeLabel(a).localeCompare(
      getSizeLabel(b),
      "pt-PT",
    );
  });
}

function buildColorGroups(params: {
  colors: ProductPurchaseColor[];
  stocks: ProductPurchaseStock[];
  futureStocks: ProductPurchaseFutureStock[];
}): ColorGroup[] {
  const groups =
    new Map<string, ColorGroup>();

  for (const color of params.colors) {
    const key = getColorKey(color);

    const existingGroup =
      groups.get(key);

    const stock =
      getStockForVariant({
        stocks: params.stocks,
        futureStocks: params.futureStocks,
        variantId: color.id,
      });

    if (!existingGroup) {
      groups.set(key, {
        key,
        label: getColorLabel(color),
        hex: color.color_hex,
        image_url: color.image_url,
        high_resolution_image_url: color.high_resolution_image_url,
        variants: [color],
        stockAvailable: stock.orderable,
      });

      continue;
    }

    existingGroup.variants.push(color);

    existingGroup.stockAvailable +=
      stock.orderable;

    if (
      !existingGroup.image_url &&
      color.image_url
    ) {
      existingGroup.image_url =
        color.image_url;
    }

    if (
      !existingGroup.high_resolution_image_url &&
      color.high_resolution_image_url
    ) {
      existingGroup.high_resolution_image_url =
        color.high_resolution_image_url;
    }

    if (
      !existingGroup.hex &&
      color.color_hex
    ) {
      existingGroup.hex =
        color.color_hex;
    }
  }

  return Array.from(groups.values())
    .map((group) => {
      const uniqueVariants =
        dedupeVariantsBySize({
          variants: group.variants,
          stocks: params.stocks,
        });

      return {
        ...group,
        variants:
          sortVariantsBySize(uniqueVariants),
      };
    })
    .sort((a, b) =>
      a.label.localeCompare(b.label, "pt-PT"),
    );
}

function ProductDetailImage({
  highResolutionUrl,
  fallbackUrl,
  alt,
}: {
  highResolutionUrl: string | null;
  fallbackUrl: string | null;
  alt: string;
}) {
  const [imageUrl, setImageUrl] = useState(
    highResolutionUrl ?? fallbackUrl,
  );

  useEffect(() => {
    setImageUrl(highResolutionUrl ?? fallbackUrl);
  }, [fallbackUrl, highResolutionUrl]);

  if (!imageUrl) {
    return (
      <div className="text-sm text-neutral-400">
        Imagem indisponível
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className="h-full w-full object-contain p-8"
      onError={() => {
        if (fallbackUrl && imageUrl !== fallbackUrl) {
          setImageUrl(fallbackUrl);
          return;
        }

        setImageUrl(null);
      }}
    />
  );
}

function dedupePriceTiers(
  prices: ProductPurchasePrice[],
): ProductPurchasePrice[] {
  const map =
    new Map<string, ProductPurchasePrice>();

  for (const price of prices) {
    const key =
      `${price.quantity_min}-` +
      `${price.quantity_max ?? "plus"}`;

    const existing = map.get(key);

    if (
      !existing ||
      price.final_price < existing.final_price
    ) {
      map.set(key, price);
    }
  }

  return Array.from(map.values()).sort(
    (a, b) =>
      a.quantity_min - b.quantity_min,
  );
}

function getPricesForVariant(params: {
  prices: ProductPurchasePrice[];
  selectedVariantId: string | null;
}): ProductPurchasePrice[] {
  if (!params.selectedVariantId) {
    return dedupePriceTiers(params.prices);
  }

  const variantPrices =
    params.prices.filter(
      (price) =>
        price.variant_id ===
        params.selectedVariantId,
    );

  if (variantPrices.length > 0) {
    return dedupePriceTiers(variantPrices);
  }

  const productPrices =
    params.prices.filter(
      (price) => !price.variant_id,
    );

  if (productPrices.length > 0) {
    return dedupePriceTiers(productPrices);
  }

  return dedupePriceTiers(params.prices);
}

function getLowestPrice(
  prices: ProductPurchasePrice[],
): ProductPurchasePrice | null {
  if (prices.length === 0) {
    return null;
  }

  return (
    [...prices].sort(
      (a, b) =>
        a.final_price - b.final_price,
    )[0] ?? null
  );
}

function getQuantityLabel(
  price: ProductPurchasePrice,
): string {
  if (price.quantity_max) {
    return `${price.quantity_min.toLocaleString(
      "pt-PT",
    )} a ${price.quantity_max.toLocaleString(
      "pt-PT",
    )}`;
  }

  return `${price.quantity_min.toLocaleString(
    "pt-PT",
  )}+`;
}

function formatProductText(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const formatted = value
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();

  return formatted.length > 0 ? formatted : null;
}

export default function ProductDirectPurchasePanel({
  productId,
  productSlug,
  productName,
  shortDescription,
  productDescription,
  productImageUrl,
  productHighResolutionImageUrl,
  brand,
  material,
  dimensions,
  weight,
  minimumQuantity,
  totalStock,
  isCustomizable,
  prices,
  colors,
  stocks,
  futureStocks,
  customizationDraft,
}: ProductDirectPurchasePanelProps) {
  const formattedShortDescription = formatProductText(shortDescription);
  const formattedProductDescription = formatProductText(productDescription);
  const hasSizes = useMemo(
    () =>
      colors.some((color) =>
        Boolean(color.size?.trim()),
      ),
    [colors],
  );

  const colorGroups = useMemo(
    () =>
      buildColorGroups({
        colors,
        stocks,
        futureStocks,
      }),
    [colors, stocks, futureStocks],
  );

  const initialVariantId =
    customizationDraft?.variant_id ??
    colors[0]?.id ??
    null;

  const initialVariant =
    colors.find(
      (color) =>
        color.id === initialVariantId,
    ) ??
    colors[0] ??
    null;

  const initialColorGroupKey =
    initialVariant
      ? getColorKey(initialVariant)
      : colorGroups[0]?.key ?? null;

  const [
    selectedColorGroupKey,
    setSelectedColorGroupKey,
  ] = useState<string | null>(
    initialColorGroupKey,
  );

  const [
    selectedVariantId,
    setSelectedVariantId,
  ] = useState<string | null>(
    initialVariantId,
  );

  const [
    quantitiesByVariant,
    setQuantitiesByVariant,
  ] = useState<Record<string, number>>(() => {
    if (!customizationDraft?.variant_id) {
      return {};
    }

    return {
      [customizationDraft.variant_id]:
        customizationDraft.quantity,
    };
  });

  const [
    activeCustomizationDraft,
    setActiveCustomizationDraft,
  ] =
    useState<ProductPurchaseCustomizationDraft | null>(
      customizationDraft,
    );

  const [
    cartState,
    cartFormAction,
    isAddingToCart,
  ] = useActionState(
    addToCartAction,
    initialCartState,
  );

  const pendingCartAnalyticsRef = useRef<Record<string, unknown> | null>(null);

  const [
    customizationState,
    startCustomizationAction,
    isStartingCustomization,
  ] = useActionState(
    startCustomizationDraftAction,
    initialCustomizationState,
  );

  const selectedColorGroup = useMemo(
    () =>
      colorGroups.find(
        (group) =>
          group.key === selectedColorGroupKey,
      ) ??
      colorGroups[0] ??
      null,
    [
      colorGroups,
      selectedColorGroupKey,
    ],
  );

  const visibleVariants = useMemo(() => {
    if (!hasSizes) {
      return colors;
    }

    return (
      selectedColorGroup?.variants ?? []
    );
  }, [
    colors,
    hasSizes,
    selectedColorGroup,
  ]);

  const selectedVariant = useMemo(() => {
    const variantInVisibleGroup =
      visibleVariants.find(
        (variant) =>
          variant.id === selectedVariantId,
      ) ?? null;

    if (variantInVisibleGroup) {
      return variantInVisibleGroup;
    }

    return (
      visibleVariants[0] ??
      colors[0] ??
      null
    );
  }, [
    colors,
    selectedVariantId,
    visibleVariants,
  ]);

  const selectedStock = useMemo(
    () =>
      getStockForVariant({
        stocks,
        futureStocks,
        variantId:
          selectedVariant?.id ?? null,
      }),
    [stocks, futureStocks, selectedVariant],
  );

  const activePrices = useMemo(
    () =>
      getPricesForVariant({
        prices,
        selectedVariantId:
          selectedVariant?.id ?? null,
      }),
    [prices, selectedVariant],
  );

  const lowestPrice =
    getLowestPrice(activePrices);

  const selectedQuantity =
    selectedVariant &&
    quantitiesByVariant[selectedVariant.id]
      ? quantitiesByVariant[
          selectedVariant.id
        ]
      : selectedStock.orderable > 0
        ? minimumQuantity
        : 0;

  const pricing = useMemo(
    () =>
      calculateCartItemPricing({
        quantity: selectedQuantity,
        prices: activePrices,
        selectedPrintingTechnique: null,
      }),
    [
      selectedQuantity,
      activePrices,
    ],
  );

  const customizationPersonalizationTotal =
    activeCustomizationDraft
      ? Number(
          (
            activeCustomizationDraft.personalization_unit_price *
            selectedQuantity
          ).toFixed(2),
        )
      : 0;

  const customizationSetupCost =
    activeCustomizationDraft?.setup_cost ??
    0;

  const customizationExtrasTotal =
    activeCustomizationDraft?.extras_total ??
    0;

  const displayedTotal = Number(
    (
      pricing.subtotal +
      customizationPersonalizationTotal +
      customizationSetupCost +
      customizationExtrasTotal
    ).toFixed(2),
  );

  useEffect(() => {
    if (
      !isAddingToCart ||
      !selectedVariant ||
      selectedQuantity <= 0
    ) {
      return;
    }

    pendingCartAnalyticsRef.current = {
      currency: activeCustomizationDraft?.currency ?? pricing.currency,
      value: displayedTotal,
      items: [
        {
          item_id: selectedVariant.sku || productSku,
          item_name: productName,
          item_brand: brand ?? undefined,
          item_variant: getVariantLabel(selectedVariant),
          price: pricing.unitPrice,
          quantity: selectedQuantity,
        },
      ],
    };
  }, [
    activeCustomizationDraft?.currency,
    brand,
    displayedTotal,
    isAddingToCart,
    pricing.currency,
    pricing.unitPrice,
    productName,
    productSku,
    selectedQuantity,
    selectedVariant,
  ]);

  useEffect(() => {
    if (
      isAddingToCart ||
      !cartState.success ||
      !pendingCartAnalyticsRef.current
    ) {
      return;
    }

    trackGa4Event("add_to_cart", pendingCartAnalyticsRef.current);
    pendingCartAnalyticsRef.current = null;
  }, [cartState.success, isAddingToCart]);

  const displayImageUrl =
    selectedColorGroup?.image_url ??
    selectedVariant?.image_url ??
    productImageUrl;

  const displayHighResolutionImageUrl =
    selectedColorGroup?.high_resolution_image_url ??
    selectedVariant?.high_resolution_image_url ??
    productHighResolutionImageUrl;

  const canProceed =
    Boolean(selectedVariant?.id) &&
    selectedStock.orderable > 0 &&
    selectedQuantity >= minimumQuantity;

  function selectColorGroup(
    group: ColorGroup,
  ) {
    setActiveCustomizationDraft(null);
    setSelectedColorGroupKey(group.key);

    const firstAvailableVariant =
      group.variants.find((variant) => {
        const stock =
          getStockForVariant({
            stocks,
            futureStocks,
            variantId: variant.id,
          });

        return stock.orderable > 0;
      }) ??
      group.variants[0] ??
      null;

    setSelectedVariantId(
      firstAvailableVariant?.id ?? null,
    );
  }

  function selectVariant(
    variant: ProductPurchaseColor,
  ) {
    if (
      variant.id !==
      activeCustomizationDraft?.variant_id
    ) {
      setActiveCustomizationDraft(null);
    }

    setSelectedVariantId(variant.id);

    if (hasSizes) {
      setSelectedColorGroupKey(
        getColorKey(variant),
      );
    }
  }

  function updateVariantQuantity(params: {
    variantId: string;
    quantity: number;
    stockAvailable: number;
  }) {
    setSelectedVariantId(params.variantId);

    if (
      activeCustomizationDraft &&
      (params.variantId !==
        activeCustomizationDraft.variant_id ||
        params.quantity !==
          activeCustomizationDraft.quantity)
    ) {
      setActiveCustomizationDraft(null);
    }

    const variant = colors.find(
      (color) =>
        color.id === params.variantId,
    );

    if (variant && hasSizes) {
      setSelectedColorGroupKey(
        getColorKey(variant),
      );
    }

    const safeQuantity =
      params.stockAvailable > 0 &&
      Number.isFinite(params.quantity)
        ? Math.max(0, params.quantity)
        : 0;

    setQuantitiesByVariant((current) => ({
      ...current,
      [params.variantId]: safeQuantity,
    }));
  }

  return (
    <div className="mt-8 grid min-w-0 max-w-full items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(460px,0.85fr)] lg:gap-10">
      <div className="min-w-0 max-w-full space-y-6">
        <div className="h-fit rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="mx-auto flex aspect-[4/3] max-h-[560px] items-center justify-center overflow-hidden rounded-3xl bg-neutral-50">
            <ProductDetailImage
              highResolutionUrl={displayHighResolutionImageUrl}
              fallbackUrl={displayImageUrl}
              alt={productName}
            />
          </div>

          {colorGroups.length > 0 ? (
            <div className="mt-6 space-y-6">
              <div>
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-neutral-500" />

                  <p className="text-sm font-semibold text-neutral-950">
                    Cores disponíveis
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {colorGroups.map(
                    (group) => {
                      const isSelected =
                        group.key ===
                        selectedColorGroup?.key;

                      return (
                        <button
                          key={group.key}
                          type="button"
                          onClick={() =>
                            selectColorGroup(
                              group,
                            )
                          }
                          className={`inline-flex items-center rounded-full border px-3 py-2 text-sm font-medium transition ${
                            isSelected
                              ? "border-neutral-950 bg-neutral-950 text-white"
                              : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
                          }`}
                          title={group.label}
                        >
                          {group.hex ? (
                            <span
                              className="mr-2 h-4 w-4 rounded-full border border-neutral-300"
                              style={{
                                backgroundColor:
                                  group.hex,
                              }}
                            />
                          ) : (
                            <span className="mr-2 h-4 w-4 rounded-full border border-neutral-300 bg-white" />
                          )}

                          {group.label}

                          {group.stockAvailable <=
                          0 ? (
                            <span
                              className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                                isSelected
                                  ? "bg-white/15 text-white"
                                  : "bg-neutral-100 text-neutral-500"
                              }`}
                            >
                              Brevemente
                            </span>
                          ) : null}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              {hasSizes &&
              selectedColorGroup ? (
                <div>
                  <p className="text-sm font-semibold text-neutral-950">
                    Tamanhos disponíveis em{" "}
                    {selectedColorGroup.label}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedColorGroup.variants.map(
                      (variant) => {
                        const stock =
                          getStockForVariant({
                            stocks,
                            futureStocks,
                            variantId:
                              variant.id,
                          });

                        const isSelected =
                          variant.id ===
                          selectedVariant?.id;

                        return (
                          <button
                            key={variant.id}
                            type="button"
                            onClick={() =>
                              selectVariant(
                                variant,
                              )
                            }
                            disabled={
                              stock.orderable <=
                              0
                            }
                            className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition ${
                              isSelected
                                ? "border-neutral-950 bg-neutral-950 text-white"
                                : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
                            } disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400`}
                          >
                            {getSizeLabel(
                              variant,
                            )}

                            {stock.orderable <=
                            0 ? (
                              <span
                                className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                                  isSelected
                                    ? "bg-white/15 text-white"
                                    : "bg-white text-neutral-400"
                                }`}
                              >
                                Brevemente
                              </span>
                            ) : null}
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-neutral-950">
            Informação adicional
          </h2>

          <p className="mt-4 whitespace-pre-line break-words leading-8 text-neutral-600 [overflow-wrap:anywhere]">
            {formattedProductDescription ??
              formattedShortDescription ??
              "Produto disponível para encomenda online."}
          </p>

          <dl className="mt-8 grid gap-4 text-sm sm:grid-cols-2">
            <div className="rounded-2xl bg-neutral-50 p-4">
              <dt className="text-neutral-500">
                Marca
              </dt>
              <dd className="mt-1 font-medium text-neutral-950">
                {brand ?? "—"}
              </dd>
            </div>

            <div className="rounded-2xl bg-neutral-50 p-4">
              <dt className="text-neutral-500">
                Material
              </dt>
              <dd className="mt-1 font-medium text-neutral-950">
                {material ?? "—"}
              </dd>
            </div>

            <div className="rounded-2xl bg-neutral-50 p-4">
              <dt className="text-neutral-500">
                Dimensões
              </dt>
              <dd className="mt-1 font-medium text-neutral-950">
                {dimensions ?? "—"}
              </dd>
            </div>

            <div className="rounded-2xl bg-neutral-50 p-4">
              <dt className="text-neutral-500">
                Peso
              </dt>
              <dd className="mt-1 font-medium text-neutral-950">
                {weight
                  ? `${weight} g`
                  : "—"}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <div className="min-w-0 max-w-full">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
          {brand ?? "Produto"}
        </p>

        <h1 className="mt-4 break-words text-3xl font-semibold tracking-tight text-neutral-950 [overflow-wrap:anywhere] sm:text-4xl">
          {productName}
        </h1>

        {formattedShortDescription ? (
          <p className="mt-5 whitespace-pre-line break-words text-base leading-7 text-neutral-600 [overflow-wrap:anywhere] sm:text-lg sm:leading-8">
            {formattedShortDescription}
          </p>
        ) : null}

        {lowestPrice ? (
          <p className="mt-6 text-sm text-neutral-500">
            Desde{" "}
            <span className="text-2xl font-semibold text-neutral-950">
              {formatPrice(
                lowestPrice.final_price,
                lowestPrice.currency,
              )}
            </span>{" "}
            / un.
          </p>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
            <Package className="h-5 w-5 text-neutral-500" />

            <p className="mt-4 text-sm text-neutral-500">
              Quantidade mín.
            </p>

            <p className="mt-1 font-semibold text-neutral-950">
              {minimumQuantity.toLocaleString(
                "pt-PT",
              )}{" "}
              un.
            </p>
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
            <Truck className="h-5 w-5 text-neutral-500" />

            <p className="mt-4 text-sm text-neutral-500">
              Stock disponível
            </p>

            <p className="mt-1 font-semibold text-neutral-950">
              {totalStock.toLocaleString(
                "pt-PT",
              )}{" "}
              un.
            </p>
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
            <Palette className="h-5 w-5 text-neutral-500" />

            <p className="mt-4 text-sm text-neutral-500">
              Personalização
            </p>

            <p className="mt-1 font-semibold text-neutral-950">
              {isCustomizable
                ? "Disponível"
                : "Não incluída"}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-neutral-950">
            Escalões de preço
          </h2>

          {activePrices.length > 0 ? (
            <div className="mt-5 w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain">
              <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th className="border-b border-neutral-200 px-4 py-3 text-left font-semibold text-neutral-500">
                      Quantidade
                    </th>

                    {activePrices
                      .slice(0, 8)
                      .map(
                        (
                          price,
                          index,
                        ) => (
                          <th
                            key={`${price.variant_id ?? "product"}-${price.quantity_min}-${price.quantity_max ?? "plus"}-${index}`}
                            className="border-b border-neutral-200 px-4 py-3 text-center font-semibold text-neutral-950"
                          >
                            {getQuantityLabel(
                              price,
                            )}
                          </th>
                        ),
                      )}
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td className="border-b border-neutral-100 px-4 py-3 text-left font-medium text-neutral-500">
                      Preço / un.
                    </td>

                    {activePrices
                      .slice(0, 8)
                      .map(
                        (
                          price,
                          index,
                        ) => (
                          <td
                            key={`${price.variant_id ?? "product"}-${price.quantity_min}-${price.final_price}-${index}`}
                            className="border-b border-neutral-100 px-4 py-3 text-center font-semibold text-neutral-950"
                          >
                            {formatPrice(
                              price.final_price,
                              price.currency,
                            )}
                          </td>
                        ),
                      )}
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 text-sm text-neutral-600">
              O preço será apresentado antes da
              conclusão da encomenda.
            </p>
          )}
        </div>

        <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-neutral-950">
            Faça a sua encomenda
          </h2>

          <p className="mt-2 text-sm leading-6 text-neutral-600">
            {hasSizes
              ? "Escolha primeiro a cor e indique a quantidade no tamanho pretendido."
              : "Indique a quantidade pretendida na cor desejada. Pode adicionar diretamente ao carrinho ou continuar para personalização."}
          </p>

          {hasSizes &&
          selectedColorGroup ? (
            <div className="mt-5 rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600">
              Cor selecionada:{" "}
              <span className="font-semibold text-neutral-950">
                {selectedColorGroup.label}
              </span>
            </div>
          ) : null}

          {activeCustomizationDraft ? (
            <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-emerald-950">
                    Maquete preparada
                  </p>

                  <p className="mt-1 text-sm leading-6 text-emerald-800">
                    A personalização será associada a esta
                    linha da encomenda.
                  </p>
                </div>

                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  Guardada
                </span>
              </div>

              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-emerald-700">
                    Localização
                  </dt>

                  <dd className="mt-1 font-semibold text-emerald-950">
                    {activeCustomizationDraft.location_name ??
                      "A confirmar"}
                  </dd>
                </div>

                <div>
                  <dt className="text-emerald-700">
                    Técnica
                  </dt>

                  <dd className="mt-1 font-semibold text-emerald-950">
                    {activeCustomizationDraft.technique_name ??
                      "A confirmar"}
                  </dd>
                </div>

                <div>
                  <dt className="text-emerald-700">
                    Logótipo
                  </dt>

                  <dd className="mt-1 font-semibold text-emerald-950">
                    {activeCustomizationDraft.logo_file_name ??
                      "Ainda não carregado"}
                  </dd>
                </div>

                <div>
                  <dt className="text-emerald-700">
                    Quantidade
                  </dt>

                  <dd className="mt-1 font-semibold text-emerald-950">
                    {activeCustomizationDraft.quantity.toLocaleString(
                      "pt-PT",
                    )}{" "}
                    un.
                  </dd>
                </div>
              </dl>

              <Link
                href={`/produto/${productSlug}/personalizar?cor=${encodeURIComponent(
                  activeCustomizationDraft.variant_id ??
                    "",
                )}&quantidade=${encodeURIComponent(
                  String(
                    activeCustomizationDraft.quantity,
                  ),
                )}`}
                className="mt-5 inline-flex text-sm font-semibold text-emerald-950 underline-offset-4 hover:underline"
              >
                Editar ou criar nova maquete
              </Link>
            </div>
          ) : customizationDraft ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              A cor, o tamanho ou a quantidade foram
              alterados. A maquete anterior deixou de estar
              associada. Cria uma nova maquete antes de
              adicionar a personalização ao carrinho.
            </div>
          ) : null}

          <form
            action={cartFormAction}
            className="mt-6 space-y-5"
          >
            <input
              type="hidden"
              name="productId"
              value={productId}
            />

            <input
              type="hidden"
              name="productSlug"
              value={productSlug}
            />

            <input
              type="hidden"
              name="variantId"
              value={selectedVariant?.id ?? ""}
            />

            <input
              type="hidden"
              name="customizationDraftId"
              value={
                activeCustomizationDraft?.id ?? ""
              }
            />

            <input
              type="hidden"
              name="quantity"
              value={selectedQuantity}
            />

            <input
              type="hidden"
              name="printingTechniqueId"
              value=""
            />

            <input
              type="hidden"
              name="personalizationNotes"
              value=""
            />

            {visibleVariants.length > 0 ? (
              <div className="w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-2xl border border-neutral-200">
                <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="border-b border-neutral-200 px-4 py-3 text-left font-semibold text-neutral-500">
                        {hasSizes
                          ? "Tamanho"
                          : "Cor"}
                      </th>

                      <th className="border-b border-neutral-200 px-4 py-3 text-right font-semibold text-neutral-500">
                        Stock atual
                      </th>

                      <th className="border-b border-neutral-200 px-4 py-3 text-left font-semibold text-neutral-500">
                        Próxima entrada
                      </th>

                      <th className="border-b border-neutral-200 px-4 py-3 text-right font-semibold text-neutral-500">
                        Quantidade
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {visibleVariants.map(
                      (variant) => {
                        const stock =
                          getStockForVariant({
                            stocks,
                            futureStocks,
                            variantId:
                              variant.id,
                          });

                        const quantity =
                          stock.orderable > 0
                            ? quantitiesByVariant[
                                variant.id
                              ] ??
                              (variant.id ===
                              selectedVariant?.id
                                ? minimumQuantity
                                : 0)
                            : 0;

                        const isSelected =
                          variant.id ===
                          selectedVariant?.id;

                        return (
                          <tr
                            key={variant.id}
                            className={`cursor-pointer transition ${
                              isSelected
                                ? "bg-neutral-950/[0.03]"
                                : "bg-white"
                            }`}
                            onClick={() =>
                              selectVariant(
                                variant,
                              )
                            }
                          >
                            <td className="border-b border-neutral-100 px-4 py-3">
                              <div className="flex items-center gap-2">
                                {variant.color_hex ? (
                                  <span
                                    className="h-4 w-4 rounded-sm border border-neutral-300"
                                    style={{
                                      backgroundColor:
                                        variant.color_hex,
                                    }}
                                  />
                                ) : (
                                  <span className="h-4 w-4 rounded-sm border border-neutral-300 bg-white" />
                                )}

                                <span className="font-medium text-neutral-950">
                                  {hasSizes
                                    ? getSizeLabel(
                                        variant,
                                      )
                                    : getVariantLabel(
                                        variant,
                                      )}
                                </span>
                              </div>
                            </td>

                            <td className="border-b border-neutral-100 px-4 py-3 text-right text-neutral-700">
                              {stock.available.toLocaleString("pt-PT")}
                            </td>

                            <td className="border-b border-neutral-100 px-4 py-3 text-left text-neutral-700">
                              {formatNextEntries(stock.nextEntries)}
                            </td>

                            <td className="border-b border-neutral-100 px-4 py-3 text-right">
                              <input
                                type="number"
                                min={0}
                                max={
                                  stock.orderable >
                                  0
                                    ? stock.orderable
                                    : undefined
                                }
                                value={quantity}
                                disabled={
                                  stock.orderable <=
                                  0
                                }
                                onClick={(
                                  event,
                                ) =>
                                  event.stopPropagation()
                                }
                                onFocus={() =>
                                  selectVariant(
                                    variant,
                                  )
                                }
                                onChange={(
                                  event,
                                ) => {
                                  updateVariantQuantity(
                                    {
                                      variantId:
                                        variant.id,

                                      quantity:
                                        Number(
                                          event
                                            .target
                                            .value,
                                        ),

                                      stockAvailable:
                                        stock.orderable,
                                    },
                                  );
                                }}
                                className="w-28 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-right text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400"
                              />
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div>
                <label
                  htmlFor="quantity"
                  className="block text-sm font-medium text-neutral-700"
                >
                  Quantidade
                </label>

                <input
                  id="quantity"
                  type="number"
                  min={minimumQuantity}
                  max={
                    selectedStock.orderable > 0
                      ? selectedStock.orderable
                      : undefined
                  }
                  value={selectedQuantity}
                  onChange={(event) => {
                    if (!selectedVariant) {
                      return;
                    }

                    updateVariantQuantity({
                      variantId:
                        selectedVariant.id,

                      quantity: Number(
                        event.target.value,
                      ),

                      stockAvailable:
                        selectedStock.orderable,
                    });
                  }}
                  className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
                />
              </div>
            )}

            {selectedQuantity > selectedStock.available &&
            selectedStock.nextEntries.length > 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                Esta encomenda inclui unidades de reposição futura. Próximas entradas previstas: {formatNextEntries(selectedStock.nextEntries)}.
              </div>
            ) : null}

            <div className="rounded-2xl bg-neutral-50 p-5">
              <p className="text-sm font-semibold text-neutral-950">
                Resumo da encomenda
              </p>

              <div className="mt-4 space-y-2 text-sm text-neutral-600">
                <div className="flex justify-between gap-4">
                  <span>
                    Cor selecionada
                  </span>

                  <span className="font-medium text-neutral-950">
                    {selectedColorGroup?.label ??
                      selectedVariant?.color_name ??
                      "—"}
                  </span>
                </div>

                {hasSizes ? (
                  <div className="flex justify-between gap-4">
                    <span>Tamanho</span>

                    <span className="font-medium text-neutral-950">
                      {selectedVariant
                        ? getSizeLabel(
                            selectedVariant,
                          )
                        : "—"}
                    </span>
                  </div>
                ) : null}

                <div className="flex justify-between gap-4">
                  <span>Quantidade</span>

                  <span className="font-medium text-neutral-950">
                    {selectedQuantity.toLocaleString(
                      "pt-PT",
                    )}{" "}
                    un.
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span>Produto</span>

                  <span className="font-medium text-neutral-950">
                    {formatPrice(
                      pricing.subtotal,
                      pricing.currency,
                    )}
                  </span>
                </div>

                {activeCustomizationDraft ? (
                  <>
                    <div className="flex justify-between gap-4">
                      <span>
                        Personalização
                      </span>

                      <span className="font-medium text-neutral-950">
                        {formatPrice(
                          customizationPersonalizationTotal,

                          activeCustomizationDraft.currency,
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span>
                        Preparação
                      </span>

                      <span className="font-medium text-neutral-950">
                        {formatPrice(
                          customizationSetupCost,

                          activeCustomizationDraft.currency,
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span>Extras</span>

                      <span className="font-medium text-neutral-950">
                        {formatPrice(
                          customizationExtrasTotal,

                          activeCustomizationDraft.currency,
                        )}
                      </span>
                    </div>
                  </>
                ) : null}

                <div className="border-t border-neutral-200 pt-3">
                  <div className="flex justify-between gap-4 text-base">
                    <span className="font-semibold text-neutral-950">
                      Total estimado
                    </span>

                    <span className="font-semibold text-neutral-950">
                      {formatPrice(
                        displayedTotal,

                        activeCustomizationDraft?.currency ??
                          pricing.currency,
                      )}
                    </span>
                  </div>

                  <p className="mt-2 text-xs leading-5 text-neutral-500">
                    Valores sem IVA e sem portes. A
                    disponibilidade, personalização e valor
                    final são confirmados antes da conclusão
                    da encomenda.
                  </p>
                </div>
              </div>
            </div>

            {customizationState.message ? (
              <div
                className={`rounded-2xl px-4 py-3 text-sm ${
                  customizationState.success
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {customizationState.message}
              </div>
            ) : null}

            {cartState.message ? (
              <div
                className={`rounded-2xl px-4 py-3 text-sm ${
                  cartState.success
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {cartState.message}

                {cartState.success ? (
                  <Link
                    href="/carrinho"
                    className="ml-2 font-semibold underline-offset-4 hover:underline"
                  >
                    Ver carrinho
                  </Link>
                ) : null}
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              {isCustomizable &&
              canProceed ? (
                <button
                  type="submit"
                  formAction={
                    startCustomizationAction
                  }
                  disabled={
                    isStartingCustomization
                  }
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-neutral-950 bg-white px-6 py-4 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isStartingCustomization
                    ? "A preparar personalização..."
                    : "Continuar para personalização"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-100 px-6 py-4 text-sm font-semibold text-neutral-400"
                >
                  Continuar para personalização
                </button>
              )}

              <button
                type="submit"
                disabled={
                  isAddingToCart ||
                  !canProceed
                }
                className="inline-flex w-full items-center justify-center rounded-2xl bg-neutral-950 px-6 py-4 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ShoppingCart className="mr-2 h-4 w-4" />

                {isAddingToCart
                  ? "A adicionar..."
                  : activeCustomizationDraft
                    ? "Adicionar encomenda personalizada"
                    : "Adicionar sem personalização"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
