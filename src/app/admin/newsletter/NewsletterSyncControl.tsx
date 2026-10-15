"use client";

import { useState, type FormEvent } from "react";
import { syncNewsletterContacts } from "./sync-actions";

type Progress = { processed: number; synced: number; skipped: number; failed: number; rounds: number };
const INITIAL: Progress = { processed: 0, synced: 0, skipped: 0, failed: 0, rounds: 0 };
const MAX_CONTACTS = 250;
const PAGE_SIZE = 25;

export default function NewsletterSyncControl({ enabled, pending }: { enabled: boolean; pending: number | null }) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<Progress>(INITIAL);
  const [message, setMessage] = useState("");
  const [finished, setFinished] = useState(false);

  async function run(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !enabled) return;
    setBusy(true); setFinished(false); setProgress(INITIAL); setMessage("");
    const summary = { ...INITIAL };
    let cursor = "";
    try {
      const planned = Math.min(MAX_CONTACTS, pending ?? MAX_CONTACTS);
      const maxRounds = Math.ceil(planned / PAGE_SIZE);
      for (let i = 0; i < maxRounds; i++) {
        const data = new FormData();
        data.set("confirm", "yes");
        if (cursor) data.set("cursor", cursor);
        const result = await syncNewsletterContacts(data);
        summary.processed += result.processed;
        summary.synced += result.synced;
        summary.skipped += result.skipped;
        summary.failed += result.failed;
        summary.rounds++;
        setProgress({ ...summary });
        if (!result.hasMore || !result.cursor || result.cursor === cursor) break;
        cursor = result.cursor;
      }
      setFinished(true);
      setMessage(`Operação terminada: ${summary.synced} sincronizados, ${summary.skipped} excluídos, ${summary.failed} falhas. Atualiza a página para consultar os pendentes.`);
    } catch {
      setMessage("A operação foi interrompida. Os contactos já sincronizados mantêm-se guardados; atualiza a página e volta a iniciar para processar os restantes.");
    } finally { setBusy(false); }
  }

  return <form onSubmit={run} className="mt-4 space-y-3">
    <label className="flex items-center gap-2 text-sm text-white/70">
      <input type="checkbox" name="confirm" value="yes" required disabled={!enabled || busy}/>
      Confirmo a sincronização dos contactos elegíveis
    </label>
    <button type="submit" disabled={!enabled || busy || (pending !== null && pending === 0)}
      className="rounded-xl bg-[#ff6a00] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
      {busy ? "A sincronizar…" : "Sincronizar até 250 contactos"}
    </button>
    {(busy || finished || progress.processed > 0) ? <div role="status" aria-live="polite" className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/75">
      <p>Verificados: {progress.processed} / {Math.min(MAX_CONTACTS, pending ?? MAX_CONTACTS)} · Sincronizados: {progress.synced} · Excluídos: {progress.skipped} · Falhas: {progress.failed}</p>
      <p className="mt-1 text-xs text-white/50">Grupos processados: {progress.rounds} / 10</p>
    </div> : null}
    {message ? <p role="status" className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/75">{message}</p> : null}
    {busy ? <p className="text-xs text-amber-300">Mantém esta página aberta enquanto decorre a sincronização. Não são enviados emails.</p> : null}
  </form>;
}
