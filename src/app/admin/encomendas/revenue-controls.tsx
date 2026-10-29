"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { scheduleRevenueRollover } from "@/lib/admin/orders/revenue-rollover";
import { resetOrderRevenueAction, type RevenueResetState } from "./revenue-actions";

export function RevenueControls({ nextMonth }: { nextMonth: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (previous: RevenueResetState, formData: FormData) => {
      const result = await resetOrderRevenueAction(previous, formData);
      setShowResult(true);
      if (result.saved) setConfirming(false);
      return result;
    },
    {},
  );

  useEffect(
    () => scheduleRevenueRollover(nextMonth, () => router.refresh()),
    [nextMonth, router],
  );

  return (
    <div className="mt-4">
      <button
        type="button"
        aria-expanded={confirming}
        aria-controls="revenue-reset-confirmation"
        disabled={pending}
        onClick={() => { setShowResult(false); setConfirming(!confirming); }}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-50 disabled:opacity-50"
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Repor faturação a zero
      </button>

      {confirming && (
        <form action={formAction} id="revenue-reset-confirmation" className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-neutral-900">Repor os contadores deste período?</p>
          <p className="mt-2 text-sm leading-6 text-neutral-700">
            A faturação, os custos do fornecedor e a margem abaixo passam a contar apenas os pagamentos confirmados após esta reposição.
            As encomendas, os pagamentos e as faturas mantêm-se no histórico.
          </p>
          <label className="mt-3 flex items-start gap-3 text-sm text-neutral-800">
            <input type="checkbox" name="confirmReset" value="yes" required disabled={pending} className="mt-1 h-4 w-4 shrink-0" />
            Confirmo que quero repor estes contadores a zero.
          </label>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="submit" disabled={pending} className="min-h-11 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {pending ? "A repor…" : "Confirmar reposição"}
            </button>
            <button type="button" disabled={pending} onClick={() => { setConfirming(false); setShowResult(false); }} className="min-h-11 rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 disabled:opacity-50">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {showResult && state.error && <p role="alert" className="mt-3 text-sm text-red-700">{state.error}</p>}
      {showResult && state.saved && <p role="status" className="mt-3 text-sm text-emerald-700">Contadores repostos a zero. O histórico de encomendas foi preservado.</p>}
    </div>
  );
}
