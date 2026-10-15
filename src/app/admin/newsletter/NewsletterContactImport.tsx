"use client";

import { useRef, useState, type FormEvent } from "react";
import { parseNewsletterCsv, type ParsedContacts, type ParsedContact } from "@/lib/newsletter/parse-import-csv";
import { importNewsletterContacts } from "./import-actions";

const MAX_FILE_BYTES = 2_000_000;
const MAX_LINES = 5_000;
const BATCH_SIZE = 200;
type Totals = { added: number; duplicates: number; invalid: number; processed: number };
const ZERO: Totals = { added: 0, duplicates: 0, invalid: 0, processed: 0 };

// Each small upload is processed by the existing audited server action.
// Repeating a failed batch is safe: the server never reactivates existing contacts.
function csvCell(value: string): string {
  return '"' + value.replace(/"/g, '""') + '"';
}
function batchFile(rows: ParsedContact[], batch: number): File {
  const csv = "nome,email\n" + rows.map(row =>
    csvCell(row.name) + "," + csvCell(row.email)).join("\n");
  return new File([csv], `contactos-lote-${String(batch).padStart(3, "0")}.csv`, {
    type: "text/csv;charset=utf-8",
  });
}

export default function NewsletterContactImport() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedContacts | null>(null);
  const [busy, setBusy] = useState(false);
  const [locale, setLocale] = useState("pt");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [totals, setTotals] = useState<Totals>(ZERO);
  const [nextBatch, setNextBatch] = useState(0);
  const cursor = useRef(0);
  const counters = useRef<Totals>({ ...ZERO });

  async function choose(next?: File) {
    if (busy) return;
    setResult(null); setPreview(null); setFile(null);
    setNextBatch(0); cursor.current = 0; counters.current = { ...ZERO }; setTotals(ZERO);
    if (!next) return;
    if (next.size < 5 || next.size > MAX_FILE_BYTES || !/\.csv$/i.test(next.name)) {
      setResult({ ok: false, message: "Seleciona um ficheiro CSV de até 2 MB." }); return;
    }
    try {
      const parsed = parseNewsletterCsv(await next.text());
      if (parsed.total > MAX_LINES || parsed.total === 0)
        throw new Error("Cada ficheiro deve conter entre 1 e 5.000 linhas de contactos.");
      setFile(next); setPreview(parsed);
    } catch (error) {
      setResult({ ok: false, message: error instanceof Error ? error.message : "O CSV não é válido." });
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !preview?.valid.length || busy) return;
    const form = event.currentTarget;
    const batches = Math.ceil(preview.valid.length / BATCH_SIZE);
    setBusy(true); setResult(null);
    try {
      const common = new FormData(form);
      common.set("locale", locale);
      common.delete("file");
      for (let i = cursor.current; i < batches; i++) {
        const rows = preview.valid.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
        const data = new FormData();
        for (const key of ["consent_evidence", "consent_date", "locale", "confirm"]) {
          data.set(key, String(common.get(key) ?? ""));
        }
        data.set("file", batchFile(rows, i + 1));
        const response = await importNewsletterContacts(data);
        if (!response.ok) throw new Error(`Lote ${i + 1}/${batches}: ${response.message}`);
        counters.current = {
          added: counters.current.added + (response.added ?? 0),
          duplicates: counters.current.duplicates + (response.existing ?? 0) + (response.duplicates ?? 0),
          invalid: counters.current.invalid + (response.invalid ?? 0),
          processed: Math.min((i + 1) * BATCH_SIZE, preview.valid.length),
        };
        cursor.current = i + 1;
        setNextBatch(cursor.current);
        setTotals({ ...counters.current });
      }
      const finished = counters.current;
      setResult({ ok: true, message:
        `Importação concluída: ${finished.added} novos, ${finished.duplicates + preview.duplicates} duplicados e ${finished.invalid + preview.invalid} inválidos. Nenhum email foi enviado.` });
      // Keep completed file and preview visible as an audit trail until another file is chosen.
    } catch (error) {
      setResult({ ok: false, message:
        `${error instanceof Error ? error.message : "Falha de ligação."} Os lotes concluídos foram preservados. Volta a clicar para retomar sem reimportar os anteriores.` });
    } finally {
      setBusy(false);
    }
  }

  const batches = preview ? Math.ceil(preview.valid.length / BATCH_SIZE) : 0;
  const percent = preview?.valid.length ? Math.round(totals.processed / preview.valid.length * 100) : 0;
  const complete = Boolean(batches && nextBatch === batches);

  return <section className="mt-8 rounded-3xl border border-white/10 bg-white/[.03] p-5" id="importar-contactos">
    <h2 className="text-lg font-semibold">Importar contactos autorizados</h2>
    <p className="mt-2 text-sm text-white/60">Carrega um único CSV com até 5.000 contactos. A plataforma processa automaticamente em lotes de 200, mantendo o progresso e sem enviar emails. Contactos que cancelaram a subscrição não são reativados.</p>
    <p className="mt-3 text-xs text-white/60">CSV UTF-8 com cabeçalho <code>nome,email</code> (vírgula ou ponto e vírgula). Até 5.000 linhas e 2 MB por ficheiro.</p>
    <form onSubmit={submit} className="mt-5 grid gap-4">
      <label className="grid gap-2 text-sm text-white/75">Ficheiro CSV
        <input type="file" name="file" accept=".csv,text/csv" required disabled={busy}
          onChange={event => { void choose(event.target.files?.[0]); }}
          className="block w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white"/>
      </label>
      {preview && <div className="rounded-xl border border-white/10 bg-neutral-900 p-3 text-sm">
        <p className="font-semibold">Pré-visualização: {preview.total} linhas · {preview.valid.length} válidas · {preview.duplicates} duplicadas no ficheiro · {preview.invalid} inválidas</p>
        <p className="mt-2 text-xs text-white/55">A processar em {batches} {batches === 1 ? "lote" : "lotes"}, sem divisão manual do ficheiro.</p>
        <div className="mt-3 max-h-36 overflow-y-auto text-xs text-white/65">{preview.valid.slice(0, 5).map(row =>
          <p key={row.line} className="py-1">{row.name} — {row.email}</p>)}</div>
        {preview.errors.map((error, index) => <p key={index} className="mt-1 text-xs text-amber-300">{error}</p>)}
      </div>}
      {preview && (busy || nextBatch > 0) ? <div role="status" aria-live="polite" className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between text-sm"><strong>{complete ? "Importação concluída" : busy ? "A importar contactos…" : "Importação interrompida"}</strong>
          <span>{percent}% · {nextBatch}/{batches} lotes</span></div>
        <div role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}
          aria-label="Progresso de importação" className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
          <div style={{ width: `${percent}%` }} className="h-full rounded-full bg-[#ff6a00]"/>
        </div>
        <p className="mt-2 text-xs text-white/60">Novos: {totals.added} · Duplicados no sistema: {totals.duplicates} · Processados: {totals.processed}/{preview.valid.length}</p>
      </div> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm text-white/75">Idioma da lista
          <select name="locale" value={locale} onChange={event => setLocale(event.target.value)} disabled={busy || nextBatch > 0} className="rounded-xl border border-white/15 bg-neutral-900 p-3">
            <option value="pt">Português</option><option value="en">Inglês</option><option value="fr">Francês</option><option value="es">Espanhol</option><option value="de">Alemão</option><option value="it">Italiano</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm text-white/75">Data do consentimento
          <input name="consent_date" type="date" required max={new Date().toISOString().slice(0,10)}
            readOnly={busy || nextBatch > 0} className="rounded-xl border border-white/15 bg-neutral-900 p-3"/>
        </label>
      </div>
      <label className="grid gap-2 text-sm text-white/75">Origem e prova do consentimento
        <textarea name="consent_evidence" minLength={15} maxLength={500} required rows={3}
          readOnly={busy || nextBatch > 0}
          placeholder="Ex.: inscrição presencial no evento X, com formulário de consentimento arquivado."
          className="rounded-xl border border-white/15 bg-neutral-900 p-3"/>
      </label>
      <label className="flex gap-3 text-sm text-white/75">
        <input type="checkbox" name="confirm" value="yes" required disabled={busy} className="mt-1"/>
        Confirmo que todos os contactos válidos nesta lista autorizaram expressamente a 360 Merchandising a enviar comunicações comerciais e que consigo comprovar essa autorização.
      </label>
      <button type="submit" disabled={!file || !preview?.valid.length || busy || complete}
        className="w-fit rounded-xl bg-[#ff6a00] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">
        {busy ? "A processar…" : complete ? "Importação concluída" : nextBatch ? "Retomar importação" : "Importar contactos"}
      </button>
      {busy ? <p className="text-xs text-amber-200">Mantém esta página aberta até terminar. Os lotes concluídos ficam gravados no Supabase.</p> : null}
      {result && <p role="status" className={`rounded-xl p-3 text-sm ${result.ok ? "bg-emerald-500/10 text-emerald-200" : "bg-red-500/10 text-red-200"}`}>{result.message}</p>}
    </form>
  </section>;
}
