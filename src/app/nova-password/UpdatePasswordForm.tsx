"use client";

import Link from "next/link";
import { useActionState } from "react";
import { updatePasswordAction } from "./actions";
import { localizePath, type SiteLocale } from "@/lib/i18n/config";
import { authCopy } from "@/lib/i18n/account";

const initialState = { success: false, message: "" };

export default function UpdatePasswordForm({ locale }: { locale: SiteLocale }) {
  const t = authCopy[locale];
  const [state, action, pending] = useActionState(
    updatePasswordAction,
    initialState,
  );

  return (
    <form action={action} className="mt-8 space-y-5"><input type="hidden" name="locale" value={locale}/>
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-neutral-700"
        >
          {t.newPassword}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          pattern="(?=.*[A-Za-zÀ-ÿ])(?=.*[0-9]).{8,}"
          title={t.passwordRule}
          required
          placeholder={t.passwordPlaceholder}
          className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3"
        />
        <p className="mt-2 text-xs leading-5 text-neutral-500">
          {t.passwordRule}
        </p>
      </div>

      <div>
        <label
          htmlFor="confirmation"
          className="block text-sm font-medium text-neutral-700"
        >
          {t.confirmPassword}
        </label>
        <input
          id="confirmation"
          name="confirmation"
          type="password"
          autoComplete="new-password"
          minLength={8}
          pattern="(?=.*[A-Za-zÀ-ÿ])(?=.*[0-9]).{8,}"
          title={t.passwordRule}
          required
          placeholder={t.repeatPassword}
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
        {pending ? t.changing : t.changePassword}
      </button>

      {state.success ? (
        <p className="text-center text-sm">
          <Link href={localizePath("/area-cliente", locale)} className="font-semibold underline">
            {t.continue}
          </Link>
        </p>
      ) : null}
    </form>
  );
}
