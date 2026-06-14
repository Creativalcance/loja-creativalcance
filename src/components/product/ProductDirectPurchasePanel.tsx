"use client";

import Link from "next/link";
import { useMemo, useState, useActionState } from "react";
import { Package, Palette, ShoppingCart, Truck } from "lucide-react";
import { addToCartAction, type AddToCartActionState } from "@/lib/cart/actions";
import { calculateCartItemPricing } from "@/lib/pricing/calculate-cart-item";

export type ProductPurchaseColor = {
  id: string;
  sku: string;
  color_name: string | null;
  color_hex: string | null;
  size: string | null;
  image_url: string | null;
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

type StockSummary = {
  available: number;
  incoming: number;
  expectedDate: string | null;
};

type ProductDirectPurchasePanelProps = {
  productId: string;
  productSlug: string;
  productSku: string;
  productName: string;
  shortDescription: string | null;
  productImageUrl: string | null;
  minimumQuantity: number;
  totalStock: number;
  isCustomizable: boolean;
  prices: ProductPurchasePrice[];
  colors: ProductPurchaseColor[];
  stocks: ProductPurchaseStock[];
};

const initialState: AddToCartActionState = {
  success: false,
  message: "",
};

function formatPrice(value: number, currency: string): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency,
  }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function getColorLabel(color: ProductPurchaseColor): string {
  if (color.color_name && color.size) {
    return `${color.color_name} · ${color.size}`;
  }

  return color.color_name ?? color.size ?? color.sku;
}

function dedupePriceTiers(
  prices: ProductPurchasePrice[],
): ProductPurchasePrice[] {
  const map = new Map<string, ProductPurchasePrice>();

  for (const price of prices) {
    const key = `${price.quantity_min}-${price.quantity_max ?? "plus"}`;
    const existing = map.get(key);

    if (!existing || price.final_price < existing.final_price) {
      map.set(key, price);
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => a.quantity_min - b.quantity_min,
  );
}

function getPricesForColor(params: {
  prices: ProductPurchasePrice[];
  selectedColorId: string | null;
}): ProductPurchasePrice[] {
  if (!params.selectedColorId) {
    return dedupePriceTiers(params.prices);
  }

  const colorPrices = params.prices.filter(
    (price) => price.variant_id === params.selectedColorId,
  );

  if (colorPrices.length > 0) {
    return dedupePriceTiers(colorPrices);
  }

  const productPrices = params.prices.filter((price) => !price.variant_id);

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

  return [...prices].sort((a, b) => a.final_price - b.final_price)[0] ?? null;
}

function getStockForColor(params: {
  stocks: ProductPurchaseStock[];
  colorId: string | null;
}): StockSummary {
  const colorStocks = params.stocks.filter(
    (stock) => stock.variant_id === params.colorId,
  );

  const activeStocks =
    colorStocks.length > 0
      ? colorStocks
      : params.stocks.filter((stock) => !stock.variant_id);

  const expectedDates = activeStocks
    .map((stock) => stock.expected_restock_date)
    .filter((value): value is string => Boolean(value))
    .sort();

  return {
    available: activeStocks.reduce(
      (total, stock) => total + stock.available_quantity,
      0,
    ),
    incoming: activeStocks.reduce(
      (total, stock) => total + stock.incoming_quantity,
      0,
    ),
    expectedDate: expectedDates[0] ?? null,
  };
}

function getQuantityLabel(price: ProductPurchasePrice): string {
  if (price.quantity_max) {
    return `${price.quantity_min.toLocaleString(
      "pt-PT",
    )} a ${price.quantity_max.toLocaleString("pt-PT")}`;
  }

  return `${price.quantity_min.toLocaleString("pt-PT")}+`;
}

export default function ProductDirectPurchasePanel({
  productId,
  productSlug,
  productSku,
  productName,
  shortDescription,
  productImageUrl,
  minimumQuantity,
  totalStock,
  isCustomizable,
  prices,
  colors,
  stocks,
}: ProductDirectPurchasePanelProps) {
  const firstColorId = colors[0]?.id ?? null;

  const [selectedColorId, setSelectedColorId] = useState<string | null>(
    firstColorId,
  );

  const [quantitiesByColor, setQuantitiesByColor] = useState<
    Record<string, number>
  >({});

  const [state, formAction, isPending] = useActionState(
    addToCartAction,
    initialState,
  );

  const selectedColor = useMemo(
    () =>
      colors.find((color) => color.id === selectedColorId) ?? colors[0] ?? null,
    [colors, selectedColorId],
  );

  const activePrices = useMemo(
    () =>
      getPricesForColor({
        prices,
        selectedColorId,
      }),
    [prices, selectedColorId],
  );

  const lowestPrice = getLowestPrice(activePrices);

  const selectedQuantity =
    selectedColorId && quantitiesByColor[selectedColorId]
      ? quantitiesByColor[selectedColorId]
      : minimumQuantity;

  const pricing = useMemo(
    () =>
      calculateCartItemPricing({
        quantity: selectedQuantity,
        prices: activePrices,
        selectedPrintingTechnique: null,
      }),
    [selectedQuantity, activePrices],
  );

  const displayImageUrl = selectedColor?.image_url ?? productImageUrl;

  const canProceed =
    Boolean(selectedColorId) && selectedQuantity >= minimumQuantity;

  const personalizeHref = `/produto/${productSlug}/personalizar?cor=${encodeURIComponent(
    selectedColorId ?? "",
  )}&quantidade=${encodeURIComponent(String(selectedQuantity))}`;

  function updateColorQuantity(colorId: string, quantity: number) {
    setSelectedColorId(colorId);
    setQuantitiesByColor((current) => ({
      ...current,
      [colorId]: Number.isFinite(quantity) ? quantity : 0,
    }));
  }

  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(460px,0.85fr)]">
      <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="mx-auto flex aspect-[4/3] max-h-[560px] items-center justify-center overflow-hidden rounded-3xl bg-neutral-50">
          {displayImageUrl ? (
            <img
              src={displayImageUrl}
              alt={productName}
              className="h-full w-full object-contain p-8"
            />
          ) : (
            <div className="text-sm text-neutral-400">Imagem indisponível</div>
          )}
        </div>

        {colors.length > 0 ? (
          <div className="mt-6">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-neutral-500" />

              <p className="text-sm font-semibold text-neutral-950">
                Cores disponíveis
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {colors.map((color) => {
                const isSelected = color.id === selectedColorId;

                return (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => {
                      setSelectedColorId(color.id);
                    }}
                    className={`inline-flex items-center rounded-full border px-3 py-2 text-sm font-medium transition ${
                      isSelected
                        ? "border-neutral-950 bg-neutral-950 text-white"
                        : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
                    }`}
                    title={getColorLabel(color)}
                  >
                    {color.color_hex ? (
                      <span
                        className="mr-2 h-4 w-4 rounded-full border border-neutral-300"
                        style={{ backgroundColor: color.color_hex }}
                      />
                    ) : null}

                    {getColorLabel(color)}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
          {productSku}
        </p>

        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950">
          {productName}
        </h1>

        {shortDescription ? (
          <p className="mt-5 text-lg leading-8 text-neutral-600">
            {shortDescription}
          </p>
        ) : null}

        {lowestPrice ? (
          <p className="mt-6 text-sm text-neutral-500">
            Desde{" "}
            <span className="text-2xl font-semibold text-neutral-950">
              {formatPrice(lowestPrice.final_price, lowestPrice.currency)}
            </span>{" "}
            / un.
          </p>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
            <Package className="h-5 w-5 text-neutral-500" />

            <p className="mt-4 text-sm text-neutral-500">Quantidade mín.</p>

            <p className="mt-1 font-semibold text-neutral-950">
              {minimumQuantity.toLocaleString("pt-PT")} un.
            </p>
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
            <Truck className="h-5 w-5 text-neutral-500" />

            <p className="mt-4 text-sm text-neutral-500">Stock disponível</p>

            <p className="mt-1 font-semibold text-neutral-950">
              {totalStock.toLocaleString("pt-PT")} un.
            </p>
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
            <Palette className="h-5 w-5 text-neutral-500" />

            <p className="mt-4 text-sm text-neutral-500">Personalização</p>

            <p className="mt-1 font-semibold text-neutral-950">
              {isCustomizable ? "Disponível" : "Não incluída"}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-neutral-950">
            Escalões de preço
          </h2>

          {activePrices.length > 0 ? (
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th className="border-b border-neutral-200 px-4 py-3 text-left font-semibold text-neutral-500">
                      Quantidade
                    </th>

                    {activePrices.slice(0, 8).map((price, index) => (
                      <th
                        key={`${price.variant_id ?? "product"}-${
                          price.quantity_min
                        }-${price.quantity_max ?? "plus"}-${index}`}
                        className="border-b border-neutral-200 px-4 py-3 text-center font-semibold text-neutral-950"
                      >
                        {getQuantityLabel(price)}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td className="border-b border-neutral-100 px-4 py-3 text-left font-medium text-neutral-500">
                      Preço / un.
                    </td>

                    {activePrices.slice(0, 8).map((price, index) => (
                      <td
                        key={`${price.variant_id ?? "product"}-${
                          price.quantity_min
                        }-${price.final_price}-${index}`}
                        className="border-b border-neutral-100 px-4 py-3 text-center font-semibold text-neutral-950"
                      >
                        {formatPrice(price.final_price, price.currency)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 text-sm text-neutral-600">
              O preço será apresentado antes da conclusão da encomenda.
            </p>
          )}
        </div>

        <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-neutral-950">
            Faça a sua encomenda
          </h2>

          <p className="mt-2 text-sm leading-6 text-neutral-600">
            Indique a quantidade pretendida na cor desejada. Pode adicionar
            directamente ao carrinho ou criar uma maquete antes de avançar.
          </p>

          <form action={formAction} className="mt-6 space-y-5">
            <input type="hidden" name="productId" value={productId} />
            <input type="hidden" name="variantId" value={selectedColorId ?? ""} />
            <input type="hidden" name="quantity" value={selectedQuantity} />
            <input type="hidden" name="printingTechniqueId" value="" />
            <input type="hidden" name="personalizationNotes" value="" />

            {colors.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-neutral-200">
                <table className="min-w-full border-separate border-spacing-0 text-sm">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="border-b border-neutral-200 px-4 py-3 text-left font-semibold text-neutral-500">
                        Cor
                      </th>

                      <th className="border-b border-neutral-200 px-4 py-3 text-right font-semibold text-neutral-500">
                        Stock
                      </th>

                      <th className="border-b border-neutral-200 px-4 py-3 text-right font-semibold text-neutral-500">
                        Próxima entrada
                      </th>

                      <th className="border-b border-neutral-200 px-4 py-3 text-right font-semibold text-neutral-500">
                        Em produção
                      </th>

                      <th className="border-b border-neutral-200 px-4 py-3 text-right font-semibold text-neutral-500">
                        Quantidade
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {colors.map((color) => {
                      const stock = getStockForColor({
                        stocks,
                        colorId: color.id,
                      });

                      const quantity =
                        quantitiesByColor[color.id] ??
                        (color.id === selectedColorId ? minimumQuantity : 0);

                      const isSelected = color.id === selectedColorId;

                      return (
                        <tr
                          key={color.id}
                          className={`cursor-pointer transition ${
                            isSelected ? "bg-neutral-950/[0.03]" : "bg-white"
                          }`}
                          onClick={() => {
                            setSelectedColorId(color.id);
                          }}
                        >
                          <td className="border-b border-neutral-100 px-4 py-3">
                            <div className="flex items-center gap-2">
                              {color.color_hex ? (
                                <span
                                  className="h-4 w-4 rounded-sm border border-neutral-300"
                                  style={{ backgroundColor: color.color_hex }}
                                />
                              ) : (
                                <span className="h-4 w-4 rounded-sm border border-neutral-300 bg-white" />
                              )}

                              <span className="font-medium text-neutral-950">
                                {getColorLabel(color)}
                              </span>
                            </div>
                          </td>

                          <td className="border-b border-neutral-100 px-4 py-3 text-right text-neutral-700">
                            {stock.available.toLocaleString("pt-PT")}
                          </td>

                          <td className="border-b border-neutral-100 px-4 py-3 text-right text-neutral-700">
                            {formatDate(stock.expectedDate)}
                          </td>

                          <td className="border-b border-neutral-100 px-4 py-3 text-right text-neutral-700">
                            {stock.incoming > 0
                              ? stock.incoming.toLocaleString("pt-PT")
                              : "—"}
                          </td>

                          <td className="border-b border-neutral-100 px-4 py-3 text-right">
                            <input
                              type="number"
                              min={0}
                              value={quantity}
                              onFocus={() => {
                                setSelectedColorId(color.id);
                              }}
                              onChange={(event) => {
                                updateColorQuantity(
                                  color.id,
                                  Number(event.target.value),
                                );
                              }}
                              className="w-28 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-right text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
                            />
                          </td>
                        </tr>
                      );
                    })}
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
                  value={selectedQuantity}
                  onChange={(event) => {
                    updateColorQuantity("default", Number(event.target.value));
                  }}
                  className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
                />
              </div>
            )}

            <div className="rounded-2xl bg-neutral-50 p-5">
              <p className="text-sm font-semibold text-neutral-950">
                Resumo da encomenda
              </p>

              <div className="mt-4 space-y-2 text-sm text-neutral-600">
                <div className="flex justify-between gap-4">
                  <span>Cor seleccionada</span>

                  <span className="font-medium text-neutral-950">
                    {selectedColor ? getColorLabel(selectedColor) : "—"}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span>Quantidade</span>

                  <span className="font-medium text-neutral-950">
                    {selectedQuantity.toLocaleString("pt-PT")} un.
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span>Produto</span>

                  <span className="font-medium text-neutral-950">
                    {formatPrice(pricing.subtotal, pricing.currency)}
                  </span>
                </div>

                <div className="border-t border-neutral-200 pt-3">
                  <div className="flex justify-between gap-4 text-base">
                    <span className="font-semibold text-neutral-950">
                      Total estimado
                    </span>

                    <span className="font-semibold text-neutral-950">
                      {formatPrice(pricing.total, pricing.currency)}
                    </span>
                  </div>

                  <p className="mt-2 text-xs leading-5 text-neutral-500">
                    Valores sem IVA e sem portes. A disponibilidade,
                    personalização e valor final são confirmados antes da
                    conclusão da encomenda.
                  </p>
                </div>
              </div>
            </div>

            {state.message ? (
              <div
                className={`rounded-2xl px-4 py-3 text-sm ${
                  state.success
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {state.message}

                {state.success ? (
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
              {isCustomizable && canProceed ? (
                <Link
                  href={personalizeHref}
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-neutral-950 bg-white px-6 py-4 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-50"
                >
                  Criar maquete
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-100 px-6 py-4 text-sm font-semibold text-neutral-400"
                >
                  Criar maquete
                </button>
              )}

              <button
                type="submit"
                disabled={isPending || !canProceed}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-neutral-950 px-6 py-4 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                {isPending ? "A adicionar..." : "Adicionar ao carrinho"}
              </button>
            </div>
          </form>

          <p className="mt-5 text-xs leading-5 text-neutral-500">
            Produto: {productName} · Referência: {productSku}
          </p>
        </div>
      </div>
    </div>
  );
}