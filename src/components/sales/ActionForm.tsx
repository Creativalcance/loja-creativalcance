"use client";
import Link from "next/link";
import { useActionState, useState, useEffect, type ReactNode } from "react";
import { useAgentEdits } from "./AgentEditContext";
import type { SalesActionState } from "@/lib/sales/types";
export default function SalesActionForm({
  action,
  children,
  submit = "Guardar",
  pendingText = "A guardar…",
  createdLink = false,
  className = "",
  disabled = false,
  tracksAgentEdits = false,
}: {
  action: (s: SalesActionState, f: FormData) => Promise<SalesActionState>;
  children: ReactNode;
  submit?: string;
  pendingText?: string;
  createdLink?: boolean;
  className?: string;
  disabled?: boolean;
  tracksAgentEdits?: boolean;
}) {
  const { setDirty } = useAgentEdits();
  const [uploadError, setUploadError] = useState("");
  const [state, formAction, pending] = useActionState(action, {
    success: false,
    message: "",
  });
  useEffect(() => {
    if (tracksAgentEdits && state.success) setDirty(false);
  }, [state, tracksAgentEdits, setDirty]);
  return (
    <form
      action={formAction}
      onChange={() => {
        if (tracksAgentEdits) setDirty(true);
      }}
      onSubmit={(event) => {
        setUploadError("");
        const data = new FormData(event.currentTarget);
        for (const value of data.values())
          if (value instanceof File && value.size > 3145728) {
            event.preventDefault();
            setUploadError("O comprovativo deve ter até 3 MB.");
            break;
          }
      }}
      className={`space-y-4 ${className}`}
    >
      <fieldset
        disabled={pending || disabled}
        className="space-y-4 disabled:opacity-60"
      >
        {children}
        <button
          type="submit"
          className="rounded-xl bg-[#162334] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#293f59] disabled:cursor-wait"
        >
          {pending ? pendingText : submit}
        </button>
      </fieldset>
      {uploadError && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-3 text-sm text-red-800"
        >
          {uploadError}
        </p>
      )}
      {state.message && (
        <p
          role={state.success ? "status" : "alert"}
          className={`rounded-xl p-3 text-sm ${state.success ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}
        >
          {state.message}
          {createdLink && state.success && state.id && (
            <>
              {" "}
              <Link
                className="font-semibold underline"
                href={`/admin/rede-comercial/${state.id}`}
              >
                Abrir ficha e enviar convite
              </Link>
            </>
          )}
        </p>
      )}
    </form>
  );
}
