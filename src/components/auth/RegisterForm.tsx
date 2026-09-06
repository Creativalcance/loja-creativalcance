"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction, type AuthActionState } from "@/lib/auth/actions";
import { localizePath, type SiteLocale } from "@/lib/i18n/config";
import { authCopy } from "@/lib/i18n/account";

const initialState: AuthActionState = {
  success: false,
  message: "",
};

export default function RegisterForm({ locale }: { locale: SiteLocale }) {
  const t = authCopy[locale];
  const [state, formAction, isPending] = useActionState(
    registerAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <input type="hidden" name="locale" value={locale} />
      <div>
        <label
          htmlFor="fullName"
          className="block text-sm font-medium text-neutral-700"
        >
          {t.fullName}
        </label>

        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          required
          className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
          placeholder={t.namePlaceholder}
        />
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-neutral-700"
        >
          {t.professionalEmail}
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
          autoComplete="new-password"
          required
          minLength={8}
          pattern="(?=.*[A-Za-zÀ-ÿ])(?=.*[0-9]).{8,}"
          title={t.passwordRule}
          className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
          placeholder={t.passwordPlaceholder}
        />

        <p className="mt-2 text-xs leading-5 text-neutral-500">
          {t.passwordRule}
        </p>
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-neutral-700"
        >
          {t.confirmPassword}
        </label>

        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          pattern="(?=.*[A-Za-zÀ-ÿ])(?=.*[0-9]).{8,}"
          title={t.passwordRule}
          className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
          placeholder={t.repeatPassword}
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
        {isPending ? t.creating : t.createAccount}
      </button>

      <p className="text-center text-sm text-neutral-600">
        {t.hasAccount}{" "}
        <Link
          href={localizePath("/login", locale)}
          className="font-semibold text-neutral-950 underline-offset-4 hover:underline"
        >
          {t.signIn}
        </Link>
      </p>
    </form>
  );
}
