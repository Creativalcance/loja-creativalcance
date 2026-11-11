"use client";
import { useRef, useState } from "react";
import { HOME_LOCALES, HOME_SECTION_LABELS, moveItem, type CampaignText, type HomepageConfig } from "@/lib/homepage/config";
import { saveHomepageAction, searchHomepageProductsAction, type HomepageProductOption } from "./actions";

const languageNames = { pt: "Português", en: "English", fr: "Français", es: "Español", de: "Deutsch", it: "Italiano" };
const fieldLabels: Record<keyof CampaignText, string> = { eyebrow: "Etiqueta", title: "Título", description: "Descrição", productCta: "Botão de compra de cada produto", collectionCta: "Botão para ver a coleção" };
const input = "mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3 font-normal";

export default function HomepageEditor({ initialConfig, initialVersion, initialProducts }: { initialConfig: HomepageConfig; initialVersion: number; initialProducts: HomepageProductOption[] }) {
  const [config, setConfig] = useState(initialConfig);
  const [version, setVersion] = useState(initialVersion);
  const [options, setOptions] = useState(initialProducts);
  const [results, setResults] = useState<HomepageProductOption[]>([]);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [searchMessage, setSearchMessage] = useState("");
  const locked = useRef(false);
  const products = new Map(options.map(product => [product.id, product]));
  const updateIds = (ids: string[]) => setConfig(current => ({ ...current, campaign: { ...current.campaign, productIds: ids } }));
  async function search() {
    if (searching || saving) return;
    setSearching(true); setSearchMessage("");
    try {
      const result = await searchHomepageProductsAction(query);
      setResults(result.products); setSearchMessage(result.message);
      setOptions(current => [...new Map([...current, ...result.products].map(product => [product.id, product])).values()]);
    } catch { setSearchMessage("Não foi possível pesquisar. Tenta novamente."); }
    finally { setSearching(false); }
  }
  async function save() {
    if (locked.current) return;
    locked.current = true; setSaving(true); setMessage(""); setError("");
    try {
      const result = await saveHomepageAction(JSON.stringify(config), version);
      if (!result.success) setError(result.message);
      else { setVersion(result.version!); setMessage(result.message); }
    } catch { setError("Não foi possível publicar. As alterações continuam no formulário; tenta novamente."); }
    finally { locked.current = false; setSaving(false); }
  }
  return <form onSubmit={event => { event.preventDefault(); void save(); }}>
    <fieldset disabled={saving} className="space-y-6 disabled:opacity-70">
      <section className="rounded-2xl border bg-white p-5 sm:p-7">
        <h2 className="text-xl font-semibold">Blocos da página</h2><p className="mt-2 text-sm text-neutral-600">Usa as setas para mudar a ordem. Desmarca os blocos que não queres mostrar.</p>
        <ol className="mt-5 space-y-3">
          {config.sections.map((section, index) => <li key={section.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-neutral-50 p-3">
            <label className="flex min-w-0 items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={section.enabled} onChange={event => setConfig(current => ({ ...current, sections: current.sections.map(item => item.id === section.id ? { ...item, enabled: event.target.checked } : item) }))} className="h-5 w-5 shrink-0" />{index + 1}. {HOME_SECTION_LABELS[section.id]}</label>
            <div className="flex gap-2"><button type="button" disabled={index === 0} aria-label={`Subir ${HOME_SECTION_LABELS[section.id]}`} className="min-h-11 min-w-11 rounded-lg border bg-white disabled:opacity-30" onClick={() => setConfig(current => ({ ...current, sections: moveItem(current.sections, index, -1) }))}>↑</button><button type="button" disabled={index === config.sections.length - 1} aria-label={`Descer ${HOME_SECTION_LABELS[section.id]}`} className="min-h-11 min-w-11 rounded-lg border bg-white disabled:opacity-30" onClick={() => setConfig(current => ({ ...current, sections: moveItem(current.sections, index, 1) }))}>↓</button></div>
          </li>)}
        </ol>
      </section>
      <section className="rounded-2xl border bg-white p-5 sm:p-7">
        <h2 className="text-xl font-semibold">Produtos destacados</h2><p className="mt-2 text-sm text-neutral-600">Escolhe até 12 produtos. A ordem abaixo é a ordem na homepage. Produtos retirados da loja deixam de aparecer automaticamente.</p>
        <ol className="mt-5 space-y-3">
          {config.campaign.productIds.map((id, index) => { const product = products.get(id); return <li key={id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
            <div><p className="text-sm font-semibold">{index + 1}. {product?.name ?? "Produto indisponível"}</p><p className="mt-1 text-xs text-neutral-500">{product?.sku}{product && (product.status !== "active" || !product.is_purchasable) ? " · Já não está disponível" : ""}</p></div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={index === 0} aria-label={`Subir produto ${product?.name ?? index + 1}`} className="min-h-11 min-w-11 rounded-lg border disabled:opacity-30" onClick={() => updateIds(moveItem(config.campaign.productIds, index, -1))}>↑</button>
              <button type="button" disabled={index === config.campaign.productIds.length - 1} aria-label={`Descer produto ${product?.name ?? index + 1}`} className="min-h-11 min-w-11 rounded-lg border disabled:opacity-30" onClick={() => updateIds(moveItem(config.campaign.productIds, index, 1))}>↓</button>
              <button type="button" aria-label={`Retirar ${product?.name ?? "produto"} da homepage`} className="min-h-11 rounded-lg border px-3 text-sm text-red-700" onClick={() => updateIds(config.campaign.productIds.filter(value => value !== id))}>Retirar do destaque</button>
            </div>
          </li>; })}
        </ol>
        {!config.campaign.productIds.length && <p className="mt-4 text-sm text-neutral-500">Ainda não há produtos selecionados.</p>}
        <div className="mt-6 rounded-xl bg-neutral-50 p-4">
          <label className="block text-sm font-semibold">Pesquisar produto por nome ou SKU<input className={input} value={query} maxLength={100} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void search(); } }} placeholder="Ex.: Galileia ou 360-CABAZ" /></label>
          <button type="button" disabled={searching || query.trim().length < 2} onClick={() => void search()} className="mt-3 min-h-11 rounded-xl border bg-white px-4 text-sm font-semibold disabled:opacity-50">{searching ? "A pesquisar…" : "Pesquisar"}</button>
          <p role="status" className="mt-3 text-sm">{searchMessage}</p>
          <ul className="mt-3 space-y-2">{results.map(product => <li key={product.id} className="flex items-center justify-between gap-4 rounded-lg bg-white p-3 text-sm"><span>{product.name}<span className="block text-xs text-neutral-500">{product.sku}</span></span><button type="button" disabled={config.campaign.productIds.includes(product.id) || config.campaign.productIds.length >= 12} className="min-h-11 rounded-lg border px-3 font-semibold disabled:opacity-40" onClick={() => updateIds([...config.campaign.productIds, product.id])}>{config.campaign.productIds.includes(product.id) ? "Selecionado" : "Adicionar"}</button></li>)}</ul>
        </div>
      </section>
      <section className="rounded-2xl border bg-white p-5 sm:p-7">
        <h2 className="text-xl font-semibold">Textos e botões da campanha</h2><p className="mt-2 text-sm text-neutral-600">Podes reutilizar este destaque noutra campanha. Revê os textos nos seis idiomas; os campos de tradução vazios usam o texto português.</p>
        <label className="mt-5 block text-sm font-semibold">Endereço do botão da coleção<input className={input} required value={config.campaign.collectionPath} maxLength={300} onChange={event => setConfig(current => ({ ...current, campaign: { ...current.campaign, collectionPath: event.target.value } }))} /><span className="mt-2 block text-xs font-normal text-neutral-500">Usa um endereço interno, por exemplo /categorias/Cabazes. Os botões Comprar abrem sempre o produto correspondente.</span></label>
        <div className="mt-6 space-y-3">{HOME_LOCALES.map(locale => <details key={locale} open={locale === "pt"} className="rounded-xl border p-4"><summary className="cursor-pointer font-semibold">{languageNames[locale]}</summary><div className="mt-5 grid gap-5 md:grid-cols-2">
          {(Object.keys(fieldLabels) as Array<keyof CampaignText>).map(field => <label key={field} className={`block text-sm font-semibold ${field === "description" ? "md:col-span-2" : ""}`}>{fieldLabels[field]}{field === "description" ? <textarea className={input} rows={3} maxLength={500} value={config.campaign.text[locale][field]} onChange={event => setConfig(current => ({ ...current, campaign: { ...current.campaign, text: { ...current.campaign.text, [locale]: { ...current.campaign.text[locale], [field]: event.target.value } } } }))} /> : <input className={input} required={locale === "pt" && field !== "eyebrow"} maxLength={field === "title" ? 140 : field === "productCta" ? 40 : 60} value={config.campaign.text[locale][field]} onChange={event => setConfig(current => ({ ...current, campaign: { ...current.campaign, text: { ...current.campaign.text, [locale]: { ...current.campaign.text[locale], [field]: event.target.value } } } }))} />}</label>)}
        </div></details>)}</div>
      </section>
      <div className="sticky bottom-3 rounded-2xl border border-neutral-300 bg-white/95 p-4 shadow-lg backdrop-blur">
        {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <p role="status" className="text-sm text-green-800">{message}</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4"><p className="text-sm text-neutral-600">As alterações são publicadas ao guardar.</p><button type="submit" className="min-h-12 rounded-xl bg-[#162334] px-6 font-semibold text-white disabled:opacity-60">{saving ? "A publicar…" : "Guardar e publicar"}</button></div>
      </div>
    </fieldset>
  </form>;
}
