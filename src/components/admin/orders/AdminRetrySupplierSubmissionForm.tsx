"use client";

import { useActionState } from "react";
import { RefreshCw } from "lucide-react";
import {
  retrySupplierSubmissionAction,
  type AdminOrderActionState,
} from "@/app/admin/encomendas/[id]/actions";

const initialState: AdminOrderActionState = {
  success: false,
  message: "",
};

export default function AdminRetrySupplierSubmissionForm({
  orderId,
  orderNumber,
}: {
  orderId: string;
  orderNumber: string;
}) {
  const [state, action, pending] = useActionState(
    retrySupplierSubmissionAction,
    initialState,
  );

  return (
    <form
      action={action}
      className="mt-4"
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Reenviar a encomenda ${orderNumber} ao fornecedor?`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="orderId" value={orderId} />

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCw
          className={`mr-2 h-4 w-4 ${pending ? "animate-spin" : ""}`}
        />
        {pending ? "A reenviar..." : "Reenviar ao fornecedor"}
      </button>

      {state.message ? (
        <p
          className={`mt-3 rounded-2xl p-3 text-sm leading-6 ${
            state.success
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-800"
          }`}
          role="status"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
