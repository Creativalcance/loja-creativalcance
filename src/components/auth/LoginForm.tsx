"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type AuthActionState } from "@/lib/auth/actions";
import { localizePath, type SiteLocale } from "@/lib/i18n/config";
import { authCopy } from "@/lib/i18n/account";

const initialState: AuthActionState = {
  success: false,
  message: "",
};

type LoginFormProps = {
  nextPath?: string;
  registrationSucceeded?: boolean;
  locale: SiteLocale;
};

export function LoginForm({
  nextPath,
  registrationSucceeded = false,
  locale,
}: LoginFormProps) {
  const t = authCopy[locale];
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-8 space-y-5">
      {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
      <input type="hidden" name="locale" value={locale} />

      {registrationSucceeded ? (
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
          {t.registrationSuccess}
        </div>
      ) : null}

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-neutral-700"
        >
          E-mail
        </label>

        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
          placeholder="email@empresa.pt"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-neutral-700"
        >
          {t.password}
        </label>

        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
          placeholder="••••••••"
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
        className="inline-flex w-full items-center justify-center rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? t.signingIn : t.signIn}
      </button>

      <p className="text-center text-sm text-neutral-600">
        <Link href={localizePath("/recuperar-password", locale)} className="font-semibold text-neutral-950 underline-offset-4 hover:underline">
          {t.forgot}
        </Link>
      </p>

      <p className="text-center text-sm text-neutral-600">
        {t.noAccount}{" "}
        <Link
          href={localizePath("/registo", locale)}
          className="font-semibold text-neutral-950 underline-offset-4 hover:underline"
        >
          {t.createAccount}
        </Link>
      </p>
    </form>
  );
}
