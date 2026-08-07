"use client";

import { useActionState } from "react";
import {
  updateAdminPriceAction,
  type UpdateAdminPriceState,
} from "@/app/admin/precos/actions";
import type { PricingMode } from "@/lib/pricing/calculate-selling-price";

type AdminPriceEditFormProps = {
  entityType: "product_price" | "printing_price" | "printing_setup";
  entityId: string;
  currentMode: PricingMode;
  supplierPrice: number;
  handlingCost?: number;
  finalPrice: number;
  marginPercentage: number | null;
  markupPercentage: number | null;
  fixedMarkup: number | null;
  manualPrice: number | null;
  overrideReason: string | null;
};

const initialState: UpdateAdminPriceState = {
  success: false,
  message: "",
};

function formatPrice(value: number): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export default function AdminPriceEditForm({
  entityType,
  entityId,
  currentMode,
  supplierPrice,
  handlingCost = 0,
  finalPrice,
  marginPercentage,
  markupPercentage,
  fixedMarkup,
  manualPrice,
  overrideReason,
}: AdminPriceEditFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateAdminPriceAction,
    initialState,
  );

  const costPrice = supplierPrice + handlingCost;

  return (
    <form action={formAction} className="space-y-5">
      <input
        type="hidden"
        name="entityType"
        value={entityType}
      />

      <input
        type="hidden"
        name="entityId"
        value={entityId}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-neutral-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
            Custo Stricker
          </p>

          <p className="mt-2 text-lg font-semibold text-neutral-950">
            {formatPrice(supplierPrice)}
          </p>
        </div>

        {entityType === "printing_price" ? (
          <div className="rounded-2xl bg-neutral-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
              Manuseamento
            </p>

            <p className="mt-2 text-lg font-semibold text-neutral-950">
              {formatPrice(handlingCost)}
            </p>
          </div>
        ) : null}

        <div className="rounded-2xl bg-neutral-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
            Custo total
          </p>

          <p className="mt-2 text-lg font-semibold text-neutral-950">
            {formatPrice(costPrice)}
          </p>
        </div>

        <div className="rounded-2xl bg-neutral-950 p-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">
            Preço atual
          </p>

          <p className="mt-2 text-lg font-semibold">
            {formatPrice(finalPrice)}
          </p>
        </div>
      </div>

      <label className="block">
        <span className="text-sm font-semibold text-neutral-950">
          Modo de cálculo
        </span>

        <select
          name="pricingMode"
          defaultValue={currentMode}
          className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
        >
          <option value="automatic">
            Regra automática
          </option>

          <option value="margin">
            Margem sobre o preço de venda
          </option>

          <option value="markup">
            Markup sobre o custo
          </option>

          <option value="fixed_markup">
            Acrescentar valor fixo
          </option>

          <option value="manual">
            Preço final manual
          </option>
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-neutral-700">
            Margem pretendida (%)
          </span>

          <input
            type="number"
            name="marginPercentage"
            min="0"
            max="99.99"
            step="0.01"
            defaultValue={marginPercentage ?? ""}
            placeholder="Ex.: 35"
            className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-neutral-700">
            Markup sobre o custo (%)
          </span>

          <input
            type="number"
            name="markupPercentage"
            min="0"
            step="0.01"
            defaultValue={markupPercentage ?? ""}
            placeholder="Ex.: 50"
            className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-neutral-700">
            Valor fixo por unidade
          </span>

          <input
            type="number"
            name="fixedMarkup"
            min="0"
            step="0.01"
            defaultValue={fixedMarkup ?? ""}
            placeholder="Ex.: 0,50"
            className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-neutral-700">
            Preço final manual
          </span>

          <input
            type="number"
            name="manualPrice"
            min="0"
            step="0.01"
            defaultValue={manualPrice ?? ""}
            placeholder="Ex.: 2,49"
            className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-neutral-700">
          Motivo da alteração
        </span>

        <textarea
          name="reason"
          rows={3}
          defaultValue={overrideReason ?? ""}
          placeholder="Ex.: Ajuste comercial para campanha, cliente ou categoria."
          className="mt-2 w-full resize-none rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
        />
      </label>

      {state.message ? (
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${
            state.success
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-neutral-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending
          ? "A guardar..."
          : "Guardar preço Loja Creativ"}
      </button>
    </form>
  );
}
