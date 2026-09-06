"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordResetAction } from "./actions";
import { localizePath, type SiteLocale } from "@/lib/i18n/config";
import { authCopy } from "@/lib/i18n/account";

const initialState = { success: false, message: "" };

export default function PasswordResetRequestForm({ locale }: { locale: SiteLocale }) {
  const t = authCopy[locale];
  const [state, action, pending] = useActionState(requestPasswordResetAction, initialState);
  return <form action={action} className="mt-8 space-y-5"><input type="hidden" name="locale" value={locale}/>
    <div><label htmlFor="email" className="block text-sm font-medium text-neutral-700">E-mail</label><input id="email" name="email" type="email" autoComplete="email" required className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3" /></div>
    {state.message ? <div className={`rounded-2xl px-4 py-3 text-sm ${state.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{state.message}</div> : null}
    <button disabled={pending} className="w-full rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{pending ? t.sending : t.sendLink}</button>
    <p className="text-center text-sm"><Link href={localizePath("/login", locale)} className="font-semibold underline-offset-4 hover:underline">{t.backLogin}</Link></p>
  </form>;
}
