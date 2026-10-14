"use client";

import { useState, type FormEvent } from "react";
import { parseNewsletterCsv, type ParsedContacts } from "@/lib/newsletter/parse-import-csv";
import { importNewsletterContacts } from "./import-actions";

export default function NewsletterContactImport() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedContacts | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function choose(next?: File) {
    setResult(null); setPreview(null); setFile(null);
    if (!next) return;
    if (next.size > 150_000 || !/\.csv$/i.test(next.name)) {
      setResult({ ok: false, message: "Seleciona um CSV até 150 KB." }); return;
    }
    try {
      const parsed = parseNewsletterCsv(await next.text());
      if (parsed.total > 200 || parsed.total === 0) throw new Error("Cada ficheiro deve ter entre 1 e 200 linhas.");
      setFile(next); setPreview(parsed);
    } catch (error) {
      setResult({ ok: false, message: error instanceof Error ? error.message : "O CSV não é válido." });
    }
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file || busy) return;
    const form = e.currentTarget;
    setBusy(true); setResult(null);
    try {
      const data = new FormData(form);
      data.set("file", file);
      const outcome = await importNewsletterContacts(data);
      setResult(outcome);
      if (outcome.ok) {
        setFile(null); setPreview(null);
        const input = form.querySelector('input[type="file"]') as HTMLInputElement | null;
        if (input) input.value = "";
      }
    } catch {
      setResult({ ok: false, message: "Não foi possível concluir a operação. Verifica a ligação e tenta novamente." });
    } finally { setBusy(false); }
  }

  return <section className="mt-8 rounded-3xl border border-white/10 bg-white/[.03] p-5" id="importar-contactos">
    <h2 className="text-lg font-semibold">Importar contactos autorizados</h2>
    <p className="mt-2 text-sm text-white/60">Adiciona uma lista CSV de pessoas que autorizaram receber comunicações da 360. Não cria contas de cliente nem envia emails. Os contactos cancelados nunca são reativados.</p>
    <p className="mt-3 text-xs text-white/60">CSV UTF-8 com cabeçalho <code>nome,email</code> (separador vírgula ou ponto e vírgula). Máximo de 200 linhas e 150 KB por ficheiro.</p>
    <form onSubmit={submit} className="mt-5 grid gap-4">
      <label className="grid gap-2 text-sm text-white/75">Ficheiro CSV
        <input type="file" name="file" accept=".csv,text/csv" required disabled={busy} onChange={e => { void choose(e.target.files?.[0]); }} className="block w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white"/>
      </label>
      {preview && <div className="rounded-xl border border-white/10 bg-neutral-900 p-3 text-sm">
        <p className="font-semibold">Pré-visualização: {preview.total} linhas · {preview.valid.length} válidas · {preview.duplicates} duplicadas no ficheiro · {preview.invalid} inválidas</p>
        <div className="mt-3 max-h-36 overflow-y-auto text-xs text-white/65">{preview.valid.slice(0, 5).map(x => <p key={x.line} className="py-1">{x.name} — {x.email}</p>)}</div>
        {preview.errors.map((x,i) => <p key={i} className="mt-1 text-xs text-amber-300">{x}</p>)}
      </div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm text-white/75">Idioma da lista
          <select name="locale" defaultValue="pt" className="rounded-xl border border-white/15 bg-neutral-900 p-3">
            <option value="pt">Português</option><option value="en">Inglês</option><option value="fr">Francês</option><option value="es">Espanhol</option><option value="de">Alemão</option><option value="it">Italiano</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm text-white/75">Data do consentimento
          <input name="consent_date" type="date" required max={new Date().toISOString().slice(0,10)} className="rounded-xl border border-white/15 bg-neutral-900 p-3"/>
        </label>
      </div>
      <label className="grid gap-2 text-sm text-white/75">Origem e prova do consentimento
        <textarea name="consent_evidence" minLength={15} maxLength={500} required rows={3} placeholder="Ex.: inscrição presencial no evento X, com formulário de consentimento guardado em arquivo." className="rounded-xl border border-white/15 bg-neutral-900 p-3"/>
      </label>
      <label className="flex gap-3 text-sm text-white/75">
        <input type="checkbox" name="confirm" value="yes" required className="mt-1"/>
        Confirmo que todos os contactos válidos nesta lista autorizaram expressamente a 360 Merchandising a enviar comunicações comerciais e que consigo comprovar essa autorização.
      </label>
      <button type="submit" disabled={!file || !preview?.valid.length || busy} className="w-fit rounded-xl bg-[#ff6a00] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">
        {busy ? "A importar…" : "Importar contactos"}
      </button>
      {result && <p role="status" className={`rounded-xl p-3 text-sm ${result.ok ? "bg-emerald-500/10 text-emerald-200" : "bg-red-500/10 text-red-200"}`}>{result.message}</p>}
    </form>
  </section>;
}
