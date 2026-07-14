"use client";

import { useActionState, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  PackageCheck,
  Store,
  Truck,
} from "lucide-react";
import {
  saveCheckoutShippingAction,
  type CheckoutShippingActionState,
} from "@/lib/checkout/shipping-actions";

export type CheckoutShippingMethod =
  | "store_transport"
  | "customer_transport"
  | "pickup";

type CheckoutShippingFormProps = {
  cartId: string;
  currency: string;
  merchandiseTotal: number;
  initialShippingMethod: CheckoutShippingMethod | null;
  initialRequestedDeliveryDate: string;
  initialAcceptsDeliveryAfterDate: boolean;
  initialInternalReference: string;
  initialShippingNotes: string;
};

const initialState: CheckoutShippingActionState = {
  success: false,
  message: "",
};

function formatPrice(value: number, currency: string): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency,
  }).format(value);
}

function getEstimatedShippingPrice(params: {
  method: CheckoutShippingMethod;
  merchandiseTotal: number;
}): number {
  if (params.method !== "store_transport") {
    return 0;
  }

  if (params.merchandiseTotal >= 500) {
    return 0;
  }

  if (params.merchandiseTotal >= 250) {
    return 5.9;
  }

  return 8.9;
}

function getMinimumDeliveryDate(): string {
  const date = new Date();

  date.setDate(date.getDate() + 2);

  return date.toISOString().slice(0, 10);
}

export default function CheckoutShippingForm({
  cartId,
  currency,
  merchandiseTotal,
  initialShippingMethod,
  initialRequestedDeliveryDate,
  initialAcceptsDeliveryAfterDate,
  initialInternalReference,
  initialShippingNotes,
}: CheckoutShippingFormProps) {
  const [shippingMethod, setShippingMethod] =
    useState<CheckoutShippingMethod>(
      initialShippingMethod ?? "store_transport",
    );

  const [acceptsDeliveryAfterDate, setAcceptsDeliveryAfterDate] =
    useState(initialAcceptsDeliveryAfterDate);

  const [state, formAction, isPending] = useActionState(
    saveCheckoutShippingAction,
    initialState,
  );

  const estimatedShippingPrice = useMemo(
    () =>
      getEstimatedShippingPrice({
        method: shippingMethod,
        merchandiseTotal,
      }),
    [merchandiseTotal, shippingMethod],
  );

  const estimatedTotal = useMemo(
    () => merchandiseTotal + estimatedShippingPrice,
    [estimatedShippingPrice, merchandiseTotal],
  );

  const minimumDeliveryDate = getMinimumDeliveryDate();

  return (
    <form action={formAction} className="mt-8 space-y-8">
      <input type="hidden" name="cartId" value={cartId} />

      <input
        type="hidden"
        name="shippingMethod"
        value={shippingMethod}
      />

      <input
        type="hidden"
        name="acceptsDeliveryAfterDate"
        value={String(acceptsDeliveryAfterDate)}
      />

      <section>
        <h2 className="text-xl font-semibold text-neutral-950">
          Método de expedição
        </h2>

        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Escolhe como pretendes receber ou recolher a encomenda.
        </p>

        <div className="mt-6 grid gap-4">
          <button
            type="button"
            onClick={() => setShippingMethod("store_transport")}
            className={`rounded-3xl border p-5 text-left transition ${
              shippingMethod === "store_transport"
                ? "border-neutral-950 bg-neutral-950 text-white"
                : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
            }`}
          >
            <div className="flex items-start justify-between gap-5">
              <div className="flex items-start gap-4">
                <div
                  className={`rounded-2xl p-3 ${
                    shippingMethod === "store_transport"
                      ? "bg-white/10"
                      : "bg-neutral-100"
                  }`}
                >
                  <Truck
                    className={`h-5 w-5 ${
                      shippingMethod === "store_transport"
                        ? "text-white"
                        : "text-neutral-600"
                    }`}
                  />
                </div>

                <div>
                  <p className="font-semibold">
                    Transporte disponibilizado pela loja
                  </p>

                  <p
                    className={`mt-2 text-sm leading-6 ${
                      shippingMethod === "store_transport"
                        ? "text-neutral-300"
                        : "text-neutral-500"
                    }`}
                  >
                    A encomenda é expedida para a morada
                    definida no passo anterior.
                  </p>

                  <div
                    className={`mt-4 flex flex-wrap gap-2 text-xs ${
                      shippingMethod === "store_transport"
                        ? "text-neutral-200"
                        : "text-neutral-600"
                    }`}
                  >
                    <span
                      className={`rounded-full px-3 py-1 ${
                        shippingMethod === "store_transport"
                          ? "bg-white/10"
                          : "bg-neutral-100"
                      }`}
                    >
                      Estimativa: 1 a 3 dias úteis
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 ${
                        shippingMethod === "store_transport"
                          ? "bg-white/10"
                          : "bg-neutral-100"
                      }`}
                    >
                      Origem: Portugal
                    </span>
                  </div>
                </div>
              </div>

              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                  shippingMethod === "store_transport"
                    ? "border-white bg-white text-neutral-950"
                    : "border-neutral-300 bg-white text-transparent"
                }`}
              >
                <Check className="h-4 w-4" />
              </div>
            </div>

            <div
              className={`mt-5 flex items-center justify-between border-t pt-4 ${
                shippingMethod === "store_transport"
                  ? "border-white/10"
                  : "border-neutral-200"
              }`}
            >
              <span className="text-sm">Custo estimado</span>

              <span className="font-semibold">
                {estimatedShippingPrice === 0
                  ? "Grátis"
                  : formatPrice(
                      estimatedShippingPrice,
                      currency,
                    )}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              setShippingMethod("customer_transport")
            }
            className={`rounded-3xl border p-5 text-left transition ${
              shippingMethod === "customer_transport"
                ? "border-neutral-950 bg-neutral-950 text-white"
                : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
            }`}
          >
            <div className="flex items-start justify-between gap-5">
              <div className="flex items-start gap-4">
                <div
                  className={`rounded-2xl p-3 ${
                    shippingMethod === "customer_transport"
                      ? "bg-white/10"
                      : "bg-neutral-100"
                  }`}
                >
                  <PackageCheck
                    className={`h-5 w-5 ${
                      shippingMethod === "customer_transport"
                        ? "text-white"
                        : "text-neutral-600"
                    }`}
                  />
                </div>

                <div>
                  <p className="font-semibold">
                    Transporte organizado pelo cliente
                  </p>

                  <p
                    className={`mt-2 text-sm leading-6 ${
                      shippingMethod === "customer_transport"
                        ? "text-neutral-300"
                        : "text-neutral-500"
                    }`}
                  >
                    A recolha será efetuada por uma transportadora
                    ou operador indicado pelo cliente.
                  </p>
                </div>
              </div>

              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                  shippingMethod === "customer_transport"
                    ? "border-white bg-white text-neutral-950"
                    : "border-neutral-300 bg-white text-transparent"
                }`}
              >
                <Check className="h-4 w-4" />
              </div>
            </div>

            <div
              className={`mt-5 flex items-center justify-between border-t pt-4 ${
                shippingMethod === "customer_transport"
                  ? "border-white/10"
                  : "border-neutral-200"
              }`}
            >
              <span className="text-sm">Custo da loja</span>

              <span className="font-semibold">
                {formatPrice(0, currency)}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setShippingMethod("pickup")}
            className={`rounded-3xl border p-5 text-left transition ${
              shippingMethod === "pickup"
                ? "border-neutral-950 bg-neutral-950 text-white"
                : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
            }`}
          >
            <div className="flex items-start justify-between gap-5">
              <div className="flex items-start gap-4">
                <div
                  className={`rounded-2xl p-3 ${
                    shippingMethod === "pickup"
                      ? "bg-white/10"
                      : "bg-neutral-100"
                  }`}
                >
                  <Store
                    className={`h-5 w-5 ${
                      shippingMethod === "pickup"
                        ? "text-white"
                        : "text-neutral-600"
                    }`}
                  />
                </div>

                <div>
                  <p className="font-semibold">
                    Recolha em ponto a confirmar
                  </p>

                  <p
                    className={`mt-2 text-sm leading-6 ${
                      shippingMethod === "pickup"
                        ? "text-neutral-300"
                        : "text-neutral-500"
                    }`}
                  >
                    A equipa entra em contacto para confirmar o
                    local e a disponibilidade para recolha.
                  </p>
                </div>
              </div>

              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                  shippingMethod === "pickup"
                    ? "border-white bg-white text-neutral-950"
                    : "border-neutral-300 bg-white text-transparent"
                }`}
              >
                <Check className="h-4 w-4" />
              </div>
            </div>

            <div
              className={`mt-5 flex items-center justify-between border-t pt-4 ${
                shippingMethod === "pickup"
                  ? "border-white/10"
                  : "border-neutral-200"
              }`}
            >
              <span className="text-sm">Custo</span>

              <span className="font-semibold">
                {formatPrice(0, currency)}
              </span>
            </div>
          </button>
        </div>
      </section>

      {shippingMethod === "store_transport" ? (
        <section className="border-t border-neutral-200 pt-8">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-neutral-100 p-3">
              <CalendarDays className="h-5 w-5 text-neutral-600" />
            </div>

            <div>
              <h2 className="text-xl font-semibold text-neutral-950">
                Data pretendida
              </h2>

              <p className="mt-1 text-sm leading-6 text-neutral-500">
                A data será considerada no planeamento, mas só
                fica confirmada depois da validação da produção e
                do transporte.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <label
              htmlFor="requestedDeliveryDate"
              className="block text-sm font-medium text-neutral-700"
            >
              Data pretendida de entrega *
            </label>

            <input
              id="requestedDeliveryDate"
              name="requestedDeliveryDate"
              type="date"
              required
              min={minimumDeliveryDate}
              defaultValue={initialRequestedDeliveryDate}
              className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
            />
          </div>

          <label className="mt-5 flex gap-3 rounded-2xl bg-neutral-50 p-4">
            <input
              type="checkbox"
              checked={acceptsDeliveryAfterDate}
              onChange={(event) =>
                setAcceptsDeliveryAfterDate(event.target.checked)
              }
              className="mt-1"
            />

            <span>
              <span className="block text-sm font-semibold text-neutral-950">
                Aceito entrega após esta data
              </span>

              <span className="mt-1 block text-xs leading-5 text-neutral-500">
                Autoriza o envio assim que a encomenda estiver
                pronta, mesmo que a data indicada já tenha sido
                ultrapassada.
              </span>
            </span>
          </label>
        </section>
      ) : null}

      <section className="border-t border-neutral-200 pt-8">
        <h2 className="text-xl font-semibold text-neutral-950">
          Referências e indicações
        </h2>

        <div className="mt-6">
          <label
            htmlFor="internalReference"
            className="block text-sm font-medium text-neutral-700"
          >
            Referência interna
          </label>

          <input
            id="internalReference"
            name="internalReference"
            type="text"
            defaultValue={initialInternalReference}
            maxLength={120}
            placeholder="Ex.: PO-2026-001, evento ou centro de custo"
            className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
          />
        </div>

        <div className="mt-5">
          <label
            htmlFor="shippingNotes"
            className="block text-sm font-medium text-neutral-700"
          >
            Indicações para a expedição
          </label>

          <textarea
            id="shippingNotes"
            name="shippingNotes"
            rows={4}
            defaultValue={initialShippingNotes}
            maxLength={1000}
            placeholder="Horário de receção, acesso a cais, contacto no local ou outras indicações."
            className="mt-2 w-full resize-none rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
          />
        </div>
      </section>

      <section className="rounded-3xl bg-neutral-50 p-5">
        <p className="text-sm font-semibold text-neutral-950">
          Total antes de IVA
        </p>

        <div className="mt-4 space-y-3 text-sm text-neutral-600">
          <div className="flex justify-between gap-4">
            <span>Produtos e personalização</span>

            <span className="font-semibold text-neutral-950">
              {formatPrice(merchandiseTotal, currency)}
            </span>
          </div>

          <div className="flex justify-between gap-4">
            <span>Expedição</span>

            <span className="font-semibold text-neutral-950">
              {estimatedShippingPrice === 0
                ? formatPrice(0, currency)
                : formatPrice(
                    estimatedShippingPrice,
                    currency,
                  )}
            </span>
          </div>

          <div className="border-t border-neutral-200 pt-3">
            <div className="flex justify-between gap-4 text-base">
              <span className="font-semibold text-neutral-950">
                Total atual
              </span>

              <span className="font-semibold text-neutral-950">
                {formatPrice(estimatedTotal, currency)}
              </span>
            </div>
          </div>
        </div>
      </section>

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
        className="inline-flex w-full items-center justify-center rounded-2xl bg-neutral-950 px-6 py-4 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending
          ? "A guardar expedição..."
          : "Continuar para pagamento"}
      </button>
    </form>
  );
}