"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { CalendarDays, Check, Truck } from "lucide-react";
import {
  saveCheckoutShippingAction,
  type CheckoutShippingActionState,
} from "@/lib/checkout/shipping-actions";

export type CheckoutShippingMethod = "store_transport";

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
  if (params.method !== "store_transport") return 0;
  if (params.merchandiseTotal >= 500) return 0;
  if (params.merchandiseTotal >= 250) return 5.9;
  return 8.9;
}

function getMinimumDeliveryDate(): string {
  const todayParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = Number(todayParts.find((part) => part.type === "year")?.value);
  const month = Number(todayParts.find((part) => part.type === "month")?.value);
  const day = Number(todayParts.find((part) => part.type === "day")?.value);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  let businessDaysAdded = 0;

  while (businessDaysAdded < 2) {
    date.setUTCDate(date.getUTCDate() + 1);
    const weekDay = date.getUTCDay();
    if (weekDay !== 0 && weekDay !== 6) businessDaysAdded += 1;
  }

  return date.toISOString().slice(0, 10);
}

function addBusinessDays(value: string, amount: number): string {
  const date = new Date(`${value}T12:00:00Z`);
  let added = 0;

  while (added < amount) {
    date.setUTCDate(date.getUTCDate() + 1);
    const weekDay = date.getUTCDay();
    if (weekDay !== 0 && weekDay !== 6) added += 1;
  }

  return date.toISOString().slice(0, 10);
}

function formatDateLabel(value: string): string {
  return new Intl.DateTimeFormat("pt-PT", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(`${value}T12:00:00Z`));
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
  const minimumDeliveryDate = getMinimumDeliveryDate();
  const initialDate =
    initialRequestedDeliveryDate >= minimumDeliveryDate
      ? initialRequestedDeliveryDate
      : "";

  const [shippingMethod, setShippingMethod] = useState<CheckoutShippingMethod>(
    initialShippingMethod === "store_transport"
      ? initialShippingMethod
      : "store_transport",
  );
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState(initialDate);
  const [acceptsDeliveryAfterDate, setAcceptsDeliveryAfterDate] = useState(
    initialAcceptsDeliveryAfterDate,
  );
  const [state, formAction, isPending] = useActionState(
    saveCheckoutShippingAction,
    initialState,
  );
  const dateInputRef = useRef<HTMLInputElement>(null);
  const dateSectionRef = useRef<HTMLElement>(null);

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

  const recommendedDates = useMemo(
    () => [
      minimumDeliveryDate,
      addBusinessDays(minimumDeliveryDate, 1),
      addBusinessDays(minimumDeliveryDate, 2),
    ],
    [minimumDeliveryDate],
  );

  function openDatePicker() {
    const input = dateInputRef.current;
    if (!input) return;

    input.focus({ preventScroll: true });
    const pickerInput = input as HTMLInputElement & { showPicker?: () => void };

    try {
      pickerInput.showPicker?.();
    } catch {
      input.focus();
    }
  }

  function handleInvalid(event: React.InvalidEvent<HTMLFormElement>) {
    const target = event.target as HTMLInputElement;
    if (target.id !== "requestedDeliveryDate") return;

    window.requestAnimationFrame(() => {
      dateSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      window.setTimeout(() => target.focus({ preventScroll: true }), 350);
    });
  }

  return (
    <form
      action={formAction}
      className="mt-8 space-y-8"
      onInvalid={handleInvalid}
    >
      <input type="hidden" name="cartId" value={cartId} />
      <input type="hidden" name="shippingMethod" value={shippingMethod} />
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
                  <p className="font-semibold">Transporte disponibilizado pela loja</p>
                  <p
                    className={`mt-2 text-sm leading-6 ${
                      shippingMethod === "store_transport"
                        ? "text-neutral-300"
                        : "text-neutral-500"
                    }`}
                  >
                    A encomenda é expedida para a morada definida no passo anterior.
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
                  : formatPrice(estimatedShippingPrice, currency)}
              </span>
            </div>
          </button>
        </div>
      </section>

      {shippingMethod === "store_transport" ? (
        <section
          ref={dateSectionRef}
          className="scroll-mt-24 border-t border-neutral-200 pt-8"
        >
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-neutral-100 p-3">
              <CalendarDays className="h-5 w-5 text-neutral-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-neutral-950">Data pretendida</h2>
              <p className="mt-1 text-sm leading-6 text-neutral-500">
                A data será considerada no planeamento, mas só fica confirmada
                depois da validação da produção e do transporte.
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

            <div className="mt-2 flex max-w-sm items-stretch gap-2">
              <input
                ref={dateInputRef}
                id="requestedDeliveryDate"
                name="requestedDeliveryDate"
                type="date"
                required
                min={minimumDeliveryDate}
                value={requestedDeliveryDate}
                onChange={(event) => setRequestedDeliveryDate(event.target.value)}
                className="h-12 min-w-0 flex-1 rounded-2xl border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10 sm:px-4"
              />
              <button
                type="button"
                onClick={openDatePicker}
                aria-label="Abrir calendário"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-neutral-300 bg-white text-neutral-700 shadow-none transition hover:border-neutral-950"
              >
                <CalendarDays className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3 sm:hidden">
              <p className="text-xs font-medium text-neutral-600">Datas recomendadas</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {recommendedDates.map((date, index) => (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setRequestedDeliveryDate(date)}
                    className={`rounded-xl border px-2 py-2.5 text-xs font-semibold transition ${
                      requestedDeliveryDate === date
                        ? "border-neutral-950 bg-neutral-950 text-white"
                        : "border-neutral-200 bg-white text-neutral-700"
                    }`}
                  >
                    <span className="block">{index === 0 ? "Mais cedo" : `+${index} dia${index > 1 ? "s" : ""}`}</span>
                    <span className="mt-1 block font-medium opacity-80">
                      {formatDateLabel(date)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <p className="mt-2 text-xs leading-5 text-neutral-500">
              A primeira data disponível corresponde ao segundo dia útil após hoje.
            </p>
          </div>

          <label className="mt-5 flex gap-3 rounded-2xl bg-neutral-50 p-4">
            <input
              type="checkbox"
              checked={acceptsDeliveryAfterDate}
              onChange={(event) => setAcceptsDeliveryAfterDate(event.target.checked)}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-semibold text-neutral-950">
                Aceito entrega após esta data
              </span>
              <span className="mt-1 block text-xs leading-5 text-neutral-500">
                Autoriza o envio assim que a encomenda estiver pronta, mesmo que
                a data indicada já tenha sido ultrapassada.
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
        <p className="text-sm font-semibold text-neutral-950">Total antes de IVA</p>
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
              {formatPrice(estimatedShippingPrice, currency)}
            </span>
          </div>
          <div className="border-t border-neutral-200 pt-3">
            <div className="flex justify-between gap-4 text-base">
              <span className="font-semibold text-neutral-950">Total atual</span>
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
        {isPending ? "A guardar expedição..." : "Continuar para pagamento"}
      </button>
    </form>
  );
}
