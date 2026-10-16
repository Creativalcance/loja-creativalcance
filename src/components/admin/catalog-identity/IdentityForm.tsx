"use client";
import { useActionState } from "react";
import { saveCommercialIdentity } from "@/app/admin/identidade-360/actions";
import { identityLocales, identityLanguageLabels, type IdentityTranslations, type IdentityFormState } from "@/lib/catalog-identity/validation";

export default function IdentityForm({ productId, version, translations, reviewStatus }: {
  productId: string; version: number; translations: Partial<IdentityTranslations>; reviewStatus: string;
}) {
  const [state, action, pending] = useActionState(saveCommercialIdentity, {} as IdentityFormState);
  return <form action={action} className="space-y-6">
    <input type="hidden" name="productId" value={productId} /><input type="hidden" name="version" value={version} />
    <div className="grid gap-5 lg:grid-cols-2">{identityLocales.map(locale => <fieldset key={locale} className="rounded-2xl border bg-white p-5">
      <legend className="px-2 font-semibold">{identityLanguageLabels[locale]}</legend>
      <label className="block text-sm font-medium" htmlFor={`${locale}-name`}>Nome 360</label>
      <input id={`${locale}-name`} name={`${locale}.name`} defaultValue={translations[locale]?.name ?? ""} maxLength={180} className="mt-2 w-full rounded-xl border p-3" />
      <label className="mt-4 block text-sm font-medium" htmlFor={`${locale}-description`}>Descrição comercial</label>
      <textarea id={`${locale}-description`} name={`${locale}.description`} defaultValue={translations[locale]?.description ?? ""} maxLength={6000} rows={4} className="mt-2 w-full rounded-xl border p-3" />
    </fieldset>)}</div>
    <label className="block font-medium">Revisão dos nomes
      <select name="reviewStatus" defaultValue={reviewStatus} className="ml-4 rounded-xl border bg-white p-3">
        <option value="draft">Em preparação</option><option value="ready">Nomes revistos nos seis idiomas</option>
      </select>
    </label>
    <p className="text-sm text-neutral-600">Guardar prepara a identidade 360. Não publica os nomes na loja. Mantém as características técnicas e certificações do produto.</p>
    {state.error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{state.error}</p>}
    {state.saved && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-800">Identidade guardada. A apresentação na loja mantém-se até à ativação.</p>}
    <button disabled={pending} className="rounded-xl bg-neutral-950 px-6 py-3 font-semibold text-white disabled:opacity-50">{pending ? "A guardar…" : "Guardar identidade 360"}</button>
  </form>;
}
