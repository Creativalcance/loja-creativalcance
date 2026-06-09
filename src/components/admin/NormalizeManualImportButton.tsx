"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Wand2 } from "lucide-react";

type NormalizeManualImportButtonProps = {
  importFileId: string | null;
  datasetName: string;
};

type NormalizeResponse = {
  success: boolean;
  message: string;
  imported?: number;
  failed?: number;
  errors?: string[];
};

const NORMALIZABLE_DATASETS = ["colors", "productTypes", "productsTree"];

async function readResponse(response: Response): Promise<NormalizeResponse> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as NormalizeResponse;
  }

  const text = await response.text();

  return {
    success: false,
    message:
      text.trim().length > 0
        ? text.slice(0, 500)
        : `Pedido falhou com estado HTTP ${response.status}.`,
  };
}

export default function NormalizeManualImportButton({
  importFileId,
  datasetName,
}: NormalizeManualImportButtonProps) {
  const router = useRouter();
  const [isNormalizing, setIsNormalizing] = useState(false);

  const canNormalize =
    Boolean(importFileId) && NORMALIZABLE_DATASETS.includes(datasetName);

  async function handleNormalize() {
    if (!importFileId || !canNormalize || isNormalizing) {
      return;
    }

    setIsNormalizing(true);

    try {
      const response = await fetch(
        `/api/admin/stricker/manual-import/${encodeURIComponent(
          importFileId,
        )}/normalize`,
        {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
        },
      );

      const payload = await readResponse(response);

      if (!response.ok || !payload.success) {
        alert(payload.message);
        return;
      }

      alert(
        `Normalização concluída.\nImportados: ${
          payload.imported ?? 0
        }\nFalhados: ${payload.failed ?? 0}`,
      );

      router.refresh();
    } catch (error) {
      alert(
        error instanceof Error
          ? `Erro ao chamar a normalização: ${error.message}`
          : "Erro inesperado ao normalizar ficheiro.",
      );
    } finally {
      setIsNormalizing(false);
    }
  }

  if (!canNormalize) {
    return <span className="text-xs text-neutral-400">—</span>;
  }

  return (
    <button
      type="button"
      onClick={handleNormalize}
      disabled={isNormalizing}
      className="inline-flex items-center justify-center rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 transition hover:border-neutral-950 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isNormalizing ? (
        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
      ) : (
        <Wand2 className="mr-1.5 h-3.5 w-3.5" />
      )}
      {isNormalizing ? "A normalizar..." : "Normalizar"}
    </button>
  );
}