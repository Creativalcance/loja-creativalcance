import type { SyncRestCustomizationOptionsResult } from "@/lib/stricker/rest/sync-customization-options";

export type CustomizationJobProgress = {
  stage: "source" | "options";
  offset: number;
  cursor: string | null;
  recordsTotal: number | null;
  optionsImported: number;
  attempts: number;
  sourceCapturedAt?: string;
  nextRunAt?: string;
  lastBatchDurationMs?: number;
};

export function initialCustomizationProgress(): CustomizationJobProgress {
  return { stage: "source", offset: 0, cursor: null, recordsTotal: null, optionsImported: 0, attempts: 0 };
}

// The checkpoint advances only after every write in the batch succeeded.
// Repeating an interrupted batch is safe because option writes are upserts.
export function advanceCustomizationProgress(
  progress: CustomizationJobProgress,
  result: SyncRestCustomizationOptionsResult,
): CustomizationJobProgress {
  if (result.optionsFailed > 0) {
    throw new Error(`${result.optionsFailed} opções ficaram por gravar. O lote será repetido sem perder o progresso.`);
  }
  if (result.hasMore && (!result.nextCursor || result.nextCursor === progress.cursor ||
    result.nextOffset === null || result.nextOffset <= progress.offset)) {
    throw new Error("A geração devolveu uma paginação inválida. O progresso foi preservado.");
  }
  return {
    ...progress,
    stage: "options",
    offset: progress.offset + result.recordsProcessed,
    cursor: result.nextCursor,
    recordsTotal: result.recordsTotal,
    optionsImported: progress.optionsImported + result.optionsImported,
    attempts: 0,
  };
}
