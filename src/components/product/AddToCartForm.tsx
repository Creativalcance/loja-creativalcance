"use client";

import Link from "next/link";
import { useMemo, useState, useActionState } from "react";
import { ShoppingCart } from "lucide-react";
import { addToCartAction, type AddToCartActionState } from "@/lib/cart/actions";
import { calculateCartItemPricing } from "@/lib/pricing/calculate-cart-item";

type ColorOption = {
  id: string;
  sku: string;
  color_name: string | null;
  color_hex: string | null;
  size: string | null;
};

type PriceTier = {
  quantity_min: number;
  quantity_max: number | null;
  final_price: number;
  currency: string;
};

type PrintingTechniqueOption = {
  id: string;
  name: string;
  setup_cost: number | null;
  price_per_unit: number | null;
};

type AddToCartFormProps = {
  productId: string;
  productSku: string;
  productName: string;
  minimumQuantity: number;
  prices: PriceTier[];
  variants: ColorOption[];
  printingTechniques: PrintingTechniqueOption[];
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

function getColorLabel(color: ColorOption): string {
  if (color.color_name && color.size) {
    return `${color.color_name} · ${color.size}`;
  }

  return color.color_name ?? color.size ?? color.sku;
}

export default function AddToCartForm({
  productId,
  productSku,
  productName,
  minimumQuantity,
  prices,
  variants,
  printingTechniques,
}: AddToCartFormProps) {
  const [quantity, setQuantity] = useState(minimumQuantity);
  const [printingTechniqueId, setPrintingTechniqueId] = useState("");

  const [state, formAction, isPending] = useActionState(
    addToCartAction,
    initialState,
  );

  const selectedTechnique = useMemo(
    () =>
      printingTechniques.find(
        (technique) => technique.id === printingTechniqueId,
      ) ?? null,
    [printingTechniqueId, printingTechniques],
  );

  const pricing = useMemo(
    () =>
      calculateCartItemPricing({
        quantity,
        prices,
        selectedPrintingTechnique: selectedTechnique,
      }),
    [quantity, prices, selectedTechnique],
  );

  return (
    <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-neutral-950">
        Comprar este produto
      </h2>

      <form action={formAction} className="mt-6 space-y-5">
        <input type="hidden" name="productId" value={productId} />

        <div>
          <label
            htmlFor="quantity"
            className="block text-sm font-medium text-neutral-700"
          >
            Quantidade
          </label>

          <input
            id="quantity"
            name="quantity"
            type="number"
            min={minimumQuantity}
            value={quantity}
            onChange={(event) => {
              setQuantity(Number(event.target.value));
            }}
            required
            className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
          />

          <p className="mt-2 text-xs text-neutral-500">
            Quantidade mínima: {minimumQuantity.toLocaleString("pt-PT")} un.
          </p>
        </div>

        {variants.length > 0 ? (
          <div>
            <label
              htmlFor="variantId"
              className="block text-sm font-medium text-neutral-700"
            >
              Cor
            </label>

            <select
              id="variantId"
              name="variantId"
              className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
            >
              <option value="">Escolhe a cor</option>

              {variants.map((color, index) => (
                <option
                  key={`${color.id}-${color.sku}-${index}`}
                  value={color.id}
                >
                  {getColorLabel(color)}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {printingTechniques.length > 0 ? (
          <div>
            <label
              htmlFor="printingTechniqueId"
              className="block text-sm font-medium text-neutral-700"
            >
              Técnica de personalização
            </label>

            <select
              id="printingTechniqueId"
              name="printingTechniqueId"
              value={printingTechniqueId}
              onChange={(event) => {
                setPrintingTechniqueId(event.target.value);
              }}
              className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
            >
              <option value="">Sem personalização</option>

              {printingTechniques.map((technique, index) => (
                <option
                  key={`${technique.id}-${technique.name}-${index}`}
                  value={technique.id}
                >
                  {technique.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div>
          <label
            htmlFor="personalizationNotes"
            className="block text-sm font-medium text-neutral-700"
          >
            Indicações para a encomenda
          </label>

          <textarea
            id="personalizationNotes"
            name="personalizationNotes"
            rows={3}
            className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
            placeholder="Ex: logótipo na frente, gravação no corpo, preferência de posição ou outra indicação relevante."
          />
        </div>

        <div className="rounded-2xl bg-neutral-50 p-5">
          <p className="text-sm font-semibold text-neutral-950">
            Resumo da encomenda
          </p>

          <div className="mt-4 space-y-2 text-sm text-neutral-600">
            <div className="flex justify-between gap-4">
              <span>Produto</span>
              <span className="font-medium text-neutral-950">
                {formatPrice(pricing.subtotal, pricing.currency)}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span>Personalização</span>
              <span className="font-medium text-neutral-950">
                {formatPrice(pricing.personalizationTotal, pricing.currency)}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span>Preparação</span>
              <span className="font-medium text-neutral-950">
                {formatPrice(pricing.setupCost, pricing.currency)}
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

              <p className="mt-2 text-xs text-neutral-500">
                Valores sem IVA e sem portes. A disponibilidade, a técnica de
                personalização e o valor final são confirmados no checkout antes
                da conclusão da encomenda.
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

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-neutral-950 px-6 py-4 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          {isPending ? "A adicionar..." : "Adicionar ao carrinho"}
        </button>
      </form>

      <p className="mt-5 text-xs leading-5 text-neutral-500">
        Produto: {productName} · Referência: {productSku}
      </p>
    </div>
  );
}