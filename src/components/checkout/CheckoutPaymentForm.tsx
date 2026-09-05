"use client";

import { useActionState, useState } from "react";
import { CreditCard, LockKeyhole } from "lucide-react";
import {
  createPaymentCheckoutSessionAction,
  type CheckoutPaymentActionState,
} from "@/lib/checkout/payment-actions";
import type { SiteLocale } from "@/lib/i18n/config";

type CheckoutPaymentFormProps = {
  cartId: string;
  locale: SiteLocale;
};

const initialState: CheckoutPaymentActionState = {
  success: false,
  message: "",
};

export default function CheckoutPaymentForm({
  cartId,
  locale,
}: CheckoutPaymentFormProps) {
  const text = locale === "en" ? {
    confirm: "I confirm the order details", detail: "I have checked the products, quantities, customisation, address, shipping and final order amount.", protected: "Payment protected by Stripe", protectedText: "You will be redirected to Stripe’s secure payment page. The order is only confirmed after payment approval.", preparing: "Preparing payment...", pay: "Pay for order"
  } : locale === "fr" ? {
    confirm: "Je confirme les informations de la commande", detail: "J’ai vérifié les produits, quantités, personnalisations, adresse, transport et montant final.", protected: "Paiement protégé par Stripe", protectedText: "Vous serez redirigé vers la page de paiement sécurisée de Stripe. La commande n’est confirmée qu’après validation du paiement.", preparing: "Préparation du paiement...", pay: "Payer la commande"
  } : {
    confirm: "Confirmo os dados da encomenda", detail: "Confirmo que verifiquei os produtos, quantidades, personalizações, morada, transporte e valor final da encomenda.", protected: "Pagamento protegido pela Stripe", protectedText: "Serás encaminhado para o ambiente seguro da Stripe. A encomenda só fica validada depois da confirmação do pagamento.", preparing: "A preparar pagamento...", pay: "Pagar encomenda"
  };
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [state, formAction, isPending] = useActionState(
    createPaymentCheckoutSessionAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-8 space-y-6">
      <input type="hidden" name="cartId" value={cartId} />
      <input type="hidden" name="locale" value={locale} />

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
            {text.confirm}
          </span>

          <span className="mt-1 block text-xs leading-5 text-neutral-500">
            {text.detail}
          </span>
        </span>
      </label>

      <div className="rounded-2xl bg-neutral-950 p-5 text-white">
        <div className="flex items-start gap-3">
          <LockKeyhole className="mt-0.5 h-5 w-5 text-neutral-300" />

          <div>
            <p className="text-sm font-semibold">
              {text.protected}
            </p>

            <p className="mt-1 text-sm leading-6 text-neutral-300">
              {text.protectedText}
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
          ? text.preparing
          : text.pay}
      </button>
    </form>
  );
}
