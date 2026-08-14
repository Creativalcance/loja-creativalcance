"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Upload } from "lucide-react";

type ManualImportResult = {
  success: boolean;
  message: string;
  dataset?: string;
  extension?: string;
  storagePath?: string;
  recordsDetected?: number;
  previewPayload?: Record<string, unknown>;
  errors?: string[];
};

const DATASETS = [
  { value: "products", label: "Products" },
  { value: "productsTree", label: "Products Tree" },
  { value: "optionals", label: "Optionals" },
  { value: "optionalsPrice", label: "Optionals Price" },
  { value: "optionalsComplete", label: "Optionals Complete" },
  { value: "customizationOptions", label: "Customization Options" },
  { value: "customizationTables", label: "Customization Tables" },
  { value: "stocks", label: "Stocks" },
  { value: "colors", label: "Colors" },
  { value: "productTypes", label: "Product Types" },
  { value: "catalogPrices", label: "Catalog Prices" },
  { value: "canceledProducts", label: "Canceled Products" },
  { value: "restrictedProducts", label: "Restricted Products" },
];

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export default function StrickerManualImportForm() {
  const router = useRouter();
  const [datasetName, setDatasetName] = useState("productsTree");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ManualImportResult | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setResult({
        success: false,
        message: "Selecciona um ficheiro XML ou CSV.",
      });
      return;
    }

    setIsUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("datasetName", datasetName);
      formData.append("file", file);

      const response = await fetch("/api/admin/stricker/manual-import", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });

      const payload = (await response.json()) as ManualImportResult;

      setResult(payload);
      router.refresh();
    } catch (error) {
      setResult({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao carregar ficheiro.",
      });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
          Upload manual
        </p>

        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">
          Importar XML/CSV do fornecedor
        </h2>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
          Carrega ficheiros exportados manualmente pelo fornecedor. O sistema
          guarda o ficheiro, regista a importação e cria uma pré-análise para
          posterior normalização.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-5 lg:grid-cols-3">
        <div>
          <label
            htmlFor="datasetName"
            className="block text-sm font-medium text-neutral-700"
          >
            Tipo de dataset
          </label>

          <select
            id="datasetName"
            value={datasetName}
            onChange={(event) => setDatasetName(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
          >
            {DATASETS.map((dataset) => (
              <option key={dataset.value} value={dataset.value}>
                {dataset.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="manualImportFile"
            className="block text-sm font-medium text-neutral-700"
          >
            Ficheiro XML/CSV
          </label>

          <input
            id="manualImportFile"
            type="file"
            accept=".xml,.csv,text/xml,text/csv,application/xml"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-950 outline-none file:mr-4 file:rounded-xl file:border-0 file:bg-neutral-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-neutral-800 hover:file:bg-neutral-200"
          />
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={isUploading}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {isUploading ? "A carregar..." : "Carregar ficheiro"}
          </button>
        </div>
      </form>

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
                {result.message}
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/70 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">
                    Dataset
                  </p>
                  <p className="mt-2 text-sm font-semibold text-neutral-950">
                    {result.dataset ?? "—"}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/70 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">
                    Extensão
                  </p>
                  <p className="mt-2 text-sm font-semibold text-neutral-950">
                    {result.extension ?? "—"}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/70 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">
                    Registos detectados
                  </p>
                  <p className="mt-2 text-sm font-semibold text-neutral-950">
                    {(result.recordsDetected ?? 0).toLocaleString("pt-PT")}
                  </p>
                </div>
              </div>

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
