"use client";

import { useActionState, useState } from "react";
import { CreditCard, LockKeyhole } from "lucide-react";
import {
  createPaymentCheckoutSessionAction,
  type CheckoutPaymentActionState,
} from "@/lib/checkout/payment-actions";

type CheckoutPaymentFormProps = {
  cartId: string;
};

const initialState: CheckoutPaymentActionState = {
  success: false,
  message: "",
};

export default function CheckoutPaymentForm({
  cartId,
}: CheckoutPaymentFormProps) {
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [state, formAction, isPending] = useActionState(
    createPaymentCheckoutSessionAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-8 space-y-6">
      <input type="hidden" name="cartId" value={cartId} />

      <input
        type="hidden"
        name="termsAccepted"
        value={String(termsAccepted)}
      />

      <label className="flex gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={(event) =>
            setTermsAccepted(event.target.checked)
          }
          className="mt-1"
        />

        <span>
          <span className="block text-sm font-semibold text-neutral-950">
            Confirmo os dados da encomenda
          </span>

          <span className="mt-1 block text-xs leading-5 text-neutral-500">
            Confirmo que verifiquei os produtos, quantidades,
            personalizações, morada, transporte e valor final da
            encomenda.
          </span>
        </span>
      </label>

      <div className="rounded-2xl bg-neutral-950 p-5 text-white">
        <div className="flex items-start gap-3">
          <LockKeyhole className="mt-0.5 h-5 w-5 text-neutral-300" />

          <div>
            <p className="text-sm font-semibold">
              Pagamento protegido pela Stripe
            </p>

            <p className="mt-1 text-sm leading-6 text-neutral-300">
              Serás encaminhado para o ambiente seguro da Stripe.
              A encomenda só fica validada depois da confirmação
              do pagamento.
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
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending || !termsAccepted}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-neutral-950 px-6 py-4 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <CreditCard className="mr-2 h-4 w-4" />

        {isPending
          ? "A preparar pagamento..."
          : "Pagar encomenda"}
      </button>
    </form>
  );
}