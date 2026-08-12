"use client";

import Link from "next/link";
import { useActionState } from "react";
import { updatePasswordAction } from "./actions";

const initialState = { success: false, message: "" };

export default function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(
    updatePasswordAction,
    initialState,
  );

  return (
    <form action={action} className="mt-8 space-y-5">
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-neutral-700"
        >
          Nova palavra-passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          pattern="(?=.*[A-Za-zÀ-ÿ])(?=.*[0-9]).{8,}"
          title="A palavra-passe deve ter no mínimo 8 caracteres e incluir pelo menos uma letra e um número."
          required
          placeholder="Mínimo 8 caracteres, com letras e números"
          className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3"
        />
        <p className="mt-2 text-xs leading-5 text-neutral-500">
          Mínimo de 8 caracteres, incluindo pelo menos uma letra e um número.
        </p>
      </div>

      <div>
        <label
          htmlFor="confirmation"
          className="block text-sm font-medium text-neutral-700"
        >
          Confirmar palavra-passe
        </label>
        <input
          id="confirmation"
          name="confirmation"
          type="password"
          autoComplete="new-password"
          minLength={8}
          pattern="(?=.*[A-Za-zÀ-ÿ])(?=.*[0-9]).{8,}"
          title="A palavra-passe deve ter no mínimo 8 caracteres e incluir pelo menos uma letra e um número."
          required
          placeholder="Repetir palavra-passe"
          className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3"
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
        disabled={pending}
        className="w-full rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "A alterar..." : "Alterar palavra-passe"}
      </button>

      {state.success ? (
        <p className="text-center text-sm">
          <Link href="/area-cliente" className="font-semibold underline">
            Continuar
          </Link>
        </p>
      ) : null}
    </form>
  );
}
