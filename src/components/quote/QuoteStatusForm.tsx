"use client";

import { useActionState } from "react";
import {
  updateQuoteRequestStatusAction,
  type UpdateQuoteStatusState,
} from "@/lib/quote/admin-actions";

type QuoteStatusFormProps = {
  quoteRequestId: string;
  currentStatus: string;
};

const initialState: UpdateQuoteStatusState = {
  success: false,
  message: "",
};

const statusOptions = [
  {
    value: "new",
    label: "Novo",
  },
  {
    value: "in_analysis",
    label: "Em análise",
  },
  {
    value: "proposal_sent",
    label: "Proposta enviada",
  },
  {
    value: "negotiation",
    label: "Negociação",
  },
  {
    value: "won",
    label: "Ganho",
  },
  {
    value: "lost",
    label: "Perdido",
  },
  {
    value: "cancelled",
    label: "Cancelado",
  },
];

export default function QuoteStatusForm({
  quoteRequestId,
  currentStatus,
}: QuoteStatusFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateQuoteRequestStatusAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="quoteRequestId" value={quoteRequestId} />

      <div>
        <label
          htmlFor="status"
          className="block text-sm font-medium text-neutral-700"
        >
          Estado do pedido
        </label>

        <select
          id="status"
          name="status"
          defaultValue={currentStatus}
          className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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
        className="inline-flex w-full items-center justify-center rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "A actualizar..." : "Actualizar estado"}
      </button>
    </form>
  );
}