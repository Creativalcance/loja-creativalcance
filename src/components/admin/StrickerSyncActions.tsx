"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";

type ApiResult = {
  success: boolean;
  message?: string;
  recommendation?: string;
  rest?: {
    success: boolean;
    message: string;
    details?: Record<string, unknown>;
  };
  direct_download?: {
    success: boolean;
    message: string;
    details?: Record<string, unknown>;
  };
  dataset?: string;
  language?: string;
  received?: number;
  imported?: number;
  failed?: number;
  errors?: string[];
};

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export default function StrickerSyncActions() {
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isImportingColors, setIsImportingColors] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);

  async function testConnection() {
    setIsTestingConnection(true);
    setResult(null);

    try {
      const response = await fetch("/api/admin/stricker/test-connection", {
        method: "GET",
        credentials: "same-origin",
      });

      const payload = (await response.json()) as ApiResult;

      setResult(payload);
    } catch (error) {
      setResult({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao testar a ligação ao fornecedor.",
      });
    } finally {
      setIsTestingConnection(false);
    }
  }

  async function importColors() {
    setIsImportingColors(true);
    setResult(null);

    try {
      const response = await fetch("/api/admin/stricker/import/colors", {
        method: "POST",
        credentials: "same-origin",
      });

      const payload = (await response.json()) as ApiResult;

      setResult(payload);
    } catch (error) {
      setResult({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao importar cores do fornecedor.",
      });
    } finally {
      setIsImportingColors(false);
    }
  }

  const isLoading = isTestingConnection || isImportingColors;

  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
            Fornecedor
          </p>

          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">
            Sincronização de fornecedor
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
            Testa a ligação ao fornecedor e executa importações controladas. Para
            já, a importação inicial validada é o dataset de cores.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={testConnection}
            disabled={isLoading}
            className="inline-flex items-center justify-center rounded-2xl border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-950 transition hover:border-neutral-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isTestingConnection ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Testar ligação
          </button>

          <button
            type="button"
            onClick={importColors}
            disabled={isLoading}
            className="inline-flex items-center justify-center rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isImportingColors ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Importar cores
          </button>
        </div>
      </div>

      {result ? (
        <div
          className={`mt-6 rounded-3xl border p-5 ${
            result.success
              ? "border-emerald-200 bg-emerald-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          <div className="flex items-start gap-3">
            {result.success ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" />
            ) : (
              <AlertCircle className="mt-0.5 h-5 w-5 text-red-700" />
            )}

            <div className="min-w-0 flex-1">
              <p
                className={`text-sm font-semibold ${
                  result.success ? "text-emerald-800" : "text-red-800"
                }`}
              >
                {result.message ??
                  (result.success
                    ? "Operação concluída com sucesso."
                    : "A operação falhou.")}
              </p>

              {result.recommendation ? (
                <p className="mt-2 text-sm leading-6 text-neutral-700">
                  {result.recommendation}
                </p>
              ) : null}

              {typeof result.received === "number" ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white/70 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">
                      Recebidos
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-neutral-950">
                      {result.received.toLocaleString("pt-PT")}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/70 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">
                      Importados
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-neutral-950">
                      {(result.imported ?? 0).toLocaleString("pt-PT")}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/70 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">
                      Falhados
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-neutral-950">
                      {(result.failed ?? 0).toLocaleString("pt-PT")}
                    </p>
                  </div>
                </div>
              ) : null}

              <pre className="mt-4 max-h-96 overflow-auto rounded-2xl bg-neutral-950 p-4 text-xs leading-5 text-white">
                {formatJson(result)}
              </pre>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
