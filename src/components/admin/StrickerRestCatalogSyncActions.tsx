"use client";

import { useState } from "react";
import { RefreshCw, ServerCog } from "lucide-react";

type SyncDataset = "colors" | "productTypes";

type SyncState = {
  loadingDataset: SyncDataset | null;
  message: string | null;
  error: string | null;
};

type SyncResponse = {
  success: boolean;
  message: string;
  dataset?: SyncDataset;
  lang?: string;
  recordsReceived?: number;
  recordsImported?: number;
  datasetImportId?: string;
};

const DATASETS: {
  dataset: SyncDataset;
  title: string;
  description: string;
}[] = [
  {
    dataset: "colors",
    title: "Sincronizar cores",
    description: "Importa cores da Stricker via REST para supplier_colors.",
  },
  {
    dataset: "productTypes",
    title: "Sincronizar tipos",
    description:
      "Importa tipos e subtipos da Stricker via REST para supplier_catalog_categories.",
  },
];

export default function StrickerRestCatalogSyncActions() {
  const [state, setState] = useState<SyncState>({
    loadingDataset: null,
    message: null,
    error: null,
  });

  async function handleSync(dataset: SyncDataset): Promise<void> {
    setState({
      loadingDataset: dataset,
      message: null,
      error: null,
    });

    try {
      const response = await fetch("/api/admin/stricker/rest/sync-catalog", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dataset,
          lang: "EN",
        }),
      });

      const payload = (await response.json()) as SyncResponse;

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.message || "Não foi possível sincronizar o dataset.",
        );
      }

      setState({
        loadingDataset: null,
        message: `${payload.message} Recebidos: ${
          payload.recordsReceived ?? 0
        }. Importados: ${payload.recordsImported ?? 0}.`,
        error: null,
      });

      window.location.reload();
    } catch (error) {
      setState({
        loadingDataset: null,
        message: null,
        error:
          error instanceof Error
            ? error.message
            : "Erro inesperado na sincronização REST.",
      });
    }
  }

  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
            Stricker REST
          </p>

          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">
            Sincronização directa
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
            Sincroniza datasets pequenos directamente via REST usando a sessão
            autenticada da Stricker.
          </p>
        </div>

        <ServerCog className="h-6 w-6 text-neutral-400" />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {DATASETS.map((item) => {
          const isLoading = state.loadingDataset === item.dataset;

          return (
            <button
              key={item.dataset}
              type="button"
              onClick={() => {
                void handleSync(item.dataset);
              }}
              disabled={state.loadingDataset !== null}
              className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 text-left transition hover:border-neutral-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-neutral-950">
                    {item.title}
                  </p>

                  <p className="mt-2 text-sm leading-5 text-neutral-600">
                    {item.description}
                  </p>
                </div>

                <RefreshCw
                  className={`h-5 w-5 text-neutral-500 ${
                    isLoading ? "animate-spin" : ""
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>

      {state.message ? (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {state.message}
        </div>
      ) : null}

      {state.error ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}
    </section>
  );
}