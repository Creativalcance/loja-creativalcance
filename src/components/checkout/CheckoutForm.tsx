"use client";

import { useActionState } from "react";
import {
  createCheckoutSessionAction,
  type CheckoutActionState,
} from "@/lib/checkout/actions";

type CheckoutFormProps = {
  cartId: string;
  customerName: string;
  customerEmail: string;
};

const initialState: CheckoutActionState = {
  success: false,
  message: "",
};

export default function CheckoutForm({
  cartId,
  customerName,
  customerEmail,
}: CheckoutFormProps) {
  const [state, formAction, isPending] = useActionState(
    createCheckoutSessionAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-8 space-y-8">
      <input type="hidden" name="cartId" value={cartId} />

      <section>
        <h2 className="text-xl font-semibold text-neutral-950">
          Dados do cliente
        </h2>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="customerName"
              className="block text-sm font-medium text-neutral-700"
            >
              Nome completo *
            </label>

            <input
              id="customerName"
              name="customerName"
              type="text"
              required
              defaultValue={customerName}
              className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
            />
          </div>

          <div>
            <label
              htmlFor="customerEmail"
              className="block text-sm font-medium text-neutral-700"
            >
              E-mail *
            </label>

            <input
              id="customerEmail"
              name="customerEmail"
              type="email"
              required
              defaultValue={customerEmail}
              className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
            />
          </div>

          <div>
            <label
              htmlFor="customerPhone"
              className="block text-sm font-medium text-neutral-700"
            >
              Telefone
            </label>

            <input
              id="customerPhone"
              name="customerPhone"
              type="tel"
              className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
              placeholder="+351 900 000 000"
            />
          </div>

          <div>
            <label
              htmlFor="companyName"
              className="block text-sm font-medium text-neutral-700"
            >
              Empresa
            </label>

            <input
              id="companyName"
              name="companyName"
              type="text"
              className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
              placeholder="Nome da empresa"
            />
          </div>

          <div>
            <label
              htmlFor="companyTaxId"
              className="block text-sm font-medium text-neutral-700"
            >
              NIF
            </label>

            <input
              id="companyTaxId"
              name="companyTaxId"
              type="text"
              className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
              placeholder="PT 000 000 000"
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-neutral-950">
          Morada de entrega
        </h2>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label
              htmlFor="shippingAddressLine1"
              className="block text-sm font-medium text-neutral-700"
            >
              Morada *
            </label>

            <input
              id="shippingAddressLine1"
              name="shippingAddressLine1"
              type="text"
              required
              className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
            />
          </div>

          <div>
            <label
              htmlFor="shippingPostalCode"
              className="block text-sm font-medium text-neutral-700"
            >
              Código postal *
            </label>

            <input
              id="shippingPostalCode"
              name="shippingPostalCode"
              type="text"
              required
              className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
            />
          </div>

          <div>
            <label
              htmlFor="shippingCity"
              className="block text-sm font-medium text-neutral-700"
            >
              Localidade *
            </label>

            <input
              id="shippingCity"
              name="shippingCity"
              type="text"
              required
              className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
            />
          </div>
        </div>
      </section>

      <div>
        <label
          htmlFor="customerNotes"
          className="block text-sm font-medium text-neutral-700"
        >
          Notas da encomenda
        </label>

        <textarea
          id="customerNotes"
          name="customerNotes"
          rows={4}
          className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
          placeholder="Notas sobre entrega, horários, referência interna, etc."
        />
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
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-neutral-950 px-6 py-4 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "A preparar pagamento..." : "Avançar para pagamento"}
      </button>
    </form>
  );
}