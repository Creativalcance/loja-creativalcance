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
  lastInvocationBatches?: number;
  lastInvocationDurationMs?: number;
  batchSize?: number;
  fastBatches?: number;
  locationsSkipped?: number;
  catalogSignature?: string;
  completedCatalogSignature?: string;
  skippedUnchangedCatalog?: boolean;
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
    locationsSkipped: (progress.locationsSkipped ?? 0) + (result.locationsSkipped ?? 0),
  };
}

export function nextCustomizationBatch(current: number, durationMs: number, fastBatches = 0) {
  const size = Math.max(25, Math.min(100, current));
  if (durationMs > 15_000) return { batchSize: Math.max(25, Math.floor(size / 2)), fastBatches: 0 };
  if (durationMs > 8_000) return { batchSize: size, fastBatches: 0 };
  const successes = fastBatches + 1;
  return successes >= 2
    ? { batchSize: Math.min(100, size * 2), fastBatches: 0 }
    : { batchSize: size, fastBatches: successes };
}

// Estimate before starting another batch, rather than writing continuously.
// The time budget is a scheduling bound, not cancellation of an in-flight write.
export function customizationInvocationPolicy(params: {
  batches: number; elapsedMs: number; durationMs: number; batchSize: number; nextBatchSize: number;
}) {
  const slow = params.durationMs > 15_000;
  const predictedMs = Math.max(2_000, params.durationMs * params.nextBatchSize / params.batchSize);
  return {
    continueNow: !slow && params.batches < 4 && params.elapsedMs + predictedMs <= 20_000,
    cooldownMs: slow ? Math.max(60_000, params.durationMs * 3) : 15_000,
  };
}
