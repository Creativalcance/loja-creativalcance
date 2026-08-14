"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, RefreshCw, Square } from "lucide-react";

type RunningSync = {
  id: string;
  dataset_name: string;
  language: string | null;
  country: string | null;
  records_received: number;
  records_imported: number;
  started_at: string | null;
  created_at: string;
};

export default function RunningSynchronizations() {
  const [items, setItems] = useState<RunningSync[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/stricker/running-syncs", { cache: "no-store" });
      const payload = await response.json() as { success: boolean; items?: RunningSync[]; message?: string };
      if (!response.ok || !payload.success) throw new Error(payload.message ?? "Erro ao carregar sincronizações.");
      setItems(payload.items ?? []);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Erro ao carregar sincronizações.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function cancel(id: string) {
    if (!window.confirm("Cancelar esta sincronização? Os dados já importados serão mantidos.")) return;
    setCancelingId(id);
    try {
      const response = await fetch("/api/admin/stricker/running-syncs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const payload = await response.json() as { success: boolean; message?: string };
      if (!response.ok || !payload.success) throw new Error(payload.message ?? "Erro ao cancelar sincronização.");
      await load();
      window.location.reload();
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Erro ao cancelar sincronização.");
    } finally {
      setCancelingId(null);
    }
  }

  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">Controlo</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">Sincronizações em execução</h2>
          <p className="mt-2 text-sm text-neutral-600">Atualização automática a cada 5 segundos.</p>
        </div>
        <button type="button" onClick={() => void load()} className="rounded-full border border-neutral-200 p-3 text-neutral-600 hover:bg-neutral-50" aria-label="Atualizar">
          <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {items.length === 0 && !loading ? <p className="mt-6 rounded-2xl bg-neutral-50 p-5 text-sm text-neutral-500">Não existem sincronizações em execução.</p> : null}
      <div className="mt-6 grid gap-3">
        {items.map((item) => (
          <article key={item.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <LoaderCircle className="mt-0.5 h-5 w-5 animate-spin text-amber-600" />
              <div>
                <p className="font-semibold text-neutral-950">{item.dataset_name}</p>
                <p className="mt-1 text-xs text-neutral-600">{[item.language, item.country].filter(Boolean).join(" · ") || "Âmbito geral"} · Início {new Intl.DateTimeFormat("pt-PT", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.started_at ?? item.created_at))}</p>
                <p className="mt-1 text-xs text-neutral-500">Recebidos: {item.records_received.toLocaleString("pt-PT")} · Importados: {item.records_imported.toLocaleString("pt-PT")}</p>
              </div>
            </div>
            <button type="button" disabled={cancelingId !== null} onClick={() => void cancel(item.id)} className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
              <Square className="mr-2 h-4 w-4" />{cancelingId === item.id ? "A cancelar…" : "Cancelar"}
            </button>
          </article>
        ))}
      </div>
      {error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <p className="mt-4 text-xs leading-5 text-neutral-500">O cancelamento não elimina nem reverte registos já importados. A execução termina no próximo ponto seguro de verificação.</p>
    </section>
  );
}
