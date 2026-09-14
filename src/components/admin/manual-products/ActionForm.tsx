"use client";
import { useActionState, type ReactNode } from "react";
import {
  manageManualProductAction,
  type ManualProductActionState,
} from "@/app/admin/produtos/actions";
export default function ProductActionForm({
  children,
  submit,
  className = "",
  destructive = false,
}: {
  children: ReactNode;
  submit: string;
  className?: string;
  destructive?: boolean;
}) {
  const [state, action, pending] = useActionState<
    ManualProductActionState,
    FormData
  >(manageManualProductAction, { success: false, message: "" });
  return (
    <form action={action} className={className}>
      <fieldset disabled={pending} className="space-y-4 disabled:opacity-60">
        {children}
        <button
          type="submit"
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-wait ${destructive ? "bg-red-700" : "bg-[#162334]"}`}
        >
          {pending ? "A guardar…" : submit}
        </button>
      </fieldset>
      {state.message && (
        <p
          role={state.success ? "status" : "alert"}
          className={`mt-3 rounded-xl p-3 text-sm ${state.success ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
