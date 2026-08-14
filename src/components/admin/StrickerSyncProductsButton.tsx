"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";

type SyncResponse = {
  success: boolean;
  message: string;
  totalRecords?: number;
  successfulRecords?: number;
  failedRecords?: number;
};

export default function StrickerSyncProductsButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [resultType, setResultType] = useState<"success" | "error" | null>(
    null,
  );

  async function handleSync() {
    setIsLoading(true);
    setResultMessage(null);
    setResultType(null);

    try {
      const response = await fetch("/api/admin/stricker/sync-products", {
        method: "POST",
      });

      const data = (await response.json()) as SyncResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Erro ao iniciar sincronização.");
      }

      setResultType("success");
      setResultMessage(
        `Sincronização concluída. Produtos processados: ${
          data.totalRecords ?? 0
        }. Sucesso: ${data.successfulRecords ?? 0}. Falhas: ${
          data.failedRecords ?? 0
        }.`,
      );
    } catch (error) {
      setResultType("error");
      setResultMessage(
        error instanceof Error
          ? error.message
          : "Erro inesperado ao iniciar sincronização.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <button
        type="button"
        onClick={handleSync}
        disabled={isLoading}
        className="inline-flex items-center justify-center rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCw
          className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
        />
        {isLoading ? "A sincronizar..." : "Sincronizar produtos do fornecedor"}
      </button>

      {resultMessage ? (
        <p
          className={`text-sm ${
            resultType === "success" ? "text-emerald-700" : "text-red-700"
          }`}
        >
          {resultMessage}
        </p>
      ) : null}
    </div>
  );
}
