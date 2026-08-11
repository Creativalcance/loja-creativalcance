"use client";
import Link from "next/link";
import { useActionState } from "react";
import { updatePasswordAction } from "./actions";
const initialState = { success: false, message: "" };
export default function UpdatePasswordForm(){const [state,action,pending]=useActionState(updatePasswordAction,initialState);return <form action={action} className="mt-8 space-y-5"><input name="password" type="password" minLength={8} required placeholder="Nova palavra-passe" className="w-full rounded-2xl border border-neutral-300 px-4 py-3"/><input name="confirmation" type="password" minLength={8} required placeholder="Confirmar palavra-passe" className="w-full rounded-2xl border border-neutral-300 px-4 py-3"/>{state.message?<div className={`rounded-2xl px-4 py-3 text-sm ${state.success?"bg-emerald-50 text-emerald-700":"bg-red-50 text-red-700"}`}>{state.message}</div>:null}<button disabled={pending} className="w-full rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white">Alterar palavra-passe</button>{state.success?<p className="text-center text-sm"><Link href="/area-cliente" className="font-semibold underline">Continuar</Link></p>:null}</form>}
