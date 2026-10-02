import { randomUUID } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStrickerSupplierId } from "@/lib/stricker/auth";
import type { StrickerLanguage } from "@/lib/stricker/rest/types";
import { syncRestCustomizationOptions } from "@/lib/stricker/rest/sync-customization-options";
import { syncRestCustomizationOptionsSource } from "@/lib/stricker/rest/sync-customization-options-source";
import { advanceCustomizationProgress, customizationInvocationPolicy, initialCustomizationProgress, nextCustomizationBatch, type CustomizationJobProgress } from "./customization-job-progress";
import { CUSTOMIZATION_GENERATION_VERSION } from "./customization-fingerprint";
import { assertSyncNotCancelled, isSyncCancelledError } from "./sync-control";

export const CUSTOMIZATION_JOB_DATASET = "customizationOptionsJob";
const LOCK_KEY = "stricker:automatic-sync";
type Job = {
  id: string;
  language: StrickerLanguage;
  status: string;
  raw_payload: CustomizationJobProgress;
  errors: string[];
  created_at: string;
  finished_at: string | null;
};

export async function getCustomizationJob(lang?: StrickerLanguage): Promise<Job | null> {
  const client = createSupabaseAdminClient();
  let query = client.from("supplier_dataset_imports")
    .select("id,language,status,raw_payload,errors,created_at,finished_at")
    .eq("supplier_id", await getStrickerSupplierId())
    .eq("dataset_name", CUSTOMIZATION_JOB_DATASET);
  if (lang) query = query.eq("language", lang);
  const { data, error } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle<Job>();
  if (error) throw new Error(error.message);
  return data;
}

// Called with the common integration lock held by either the admin endpoint or cron.
export async function enqueueCustomizationJob(lang: StrickerLanguage, weekly = false): Promise<Job> {
  const client = createSupabaseAdminClient();
  const supplierId = await getStrickerSupplierId();
  const { data: active, error: activeError } = await client.from("supplier_dataset_imports")
    .select("id,language,status,raw_payload,errors,created_at,finished_at")
    .eq("supplier_id", supplierId).eq("dataset_name", CUSTOMIZATION_JOB_DATASET)
    .in("status", ["pending", "running"]).order("created_at", { ascending: false }).limit(1).maybeSingle<Job>();
  if (activeError) throw new Error(activeError.message);
  if (active) return active;
  const latest = await getCustomizationJob(lang);
  if (latest?.status === "failed") {
    if (weekly) return latest;
    const { data, error } = await client.from("supplier_dataset_imports")
      .update({ status: "pending", finished_at: null, errors: [], raw_payload: { ...latest.raw_payload, attempts: 0, nextRunAt: null } })
      .eq("id", latest.id).eq("status", "failed")
      .select("id,language,status,raw_payload,errors,created_at,finished_at").single<Job>();
    if (error) throw new Error(error.message);
    return data;
  }
  if (weekly && latest?.status === "success" && latest.finished_at) {
    const start = new Date(); start.setUTCHours(0, 0, 0, 0); start.setUTCDate(start.getUTCDate() - start.getUTCDay());
    if (new Date(latest.finished_at) >= start) return latest;
  }
  const { data, error } = await client.from("supplier_dataset_imports").insert({
    supplier_id: supplierId, dataset_name: CUSTOMIZATION_JOB_DATASET, language: lang,
    extension: "json", status: "pending", raw_payload: initialCustomizationProgress(), errors: [],
  }).select("id,language,status,raw_payload,errors,created_at,finished_at").single<Job>();
  if (error) throw new Error(error.message);
  return data;
}

export async function startCustomizationJob(lang: StrickerLanguage): Promise<Job> {
  const client = createSupabaseAdminClient();
  const owner = randomUUID();
  const { data, error } = await client.rpc("try_acquire_integration_sync_lock", {
    target_lock_key: LOCK_KEY, target_owner_token: owner, target_ttl_seconds: 330,
  });
  if (error) throw new Error(error.message);
  if (data !== true) {
    const current = await getCustomizationJob();
    if (current && ["pending", "running"].includes(current.status)) return current;
    throw new Error("Existe uma sincronização em curso. Tente iniciar a geração daqui a alguns minutos.");
  }
  try { return await enqueueCustomizationJob(lang); }
  finally {
    const released = await client.rpc("release_integration_sync_lock", { target_lock_key: LOCK_KEY, target_owner_token: owner });
    if (released.error) console.error("Falha ao libertar bloqueio:", released.error.message);
  }
}

// Cron holds the integration lock. A killed invocation leaves its saved cursor intact.
export async function processCustomizationJob(): Promise<Record<string, unknown>> {
  const client = createSupabaseAdminClient();
  const { data: job, error } = await client.from("supplier_dataset_imports")
    .select("id,language,status,raw_payload,errors,created_at,finished_at")
    .eq("supplier_id", await getStrickerSupplierId()).eq("dataset_name", CUSTOMIZATION_JOB_DATASET)
    .in("status", ["pending", "running"]).order("created_at", { ascending: true }).limit(1).maybeSingle<Job>();
  if (error) throw new Error(error.message);
  if (!job) return { idle: true };
  let progress = job.raw_payload;
  async function catalogSignature() {
    // This whole-catalogue shortcut is optional. Failure must fall back to
    // bounded per-location comparisons, never stop or falsely certify a job.
    try {
      const { data, error } = await client.rpc("customization_generation_catalog_hash", {
        p_supplier_id: await getStrickerSupplierId(), p_language: job!.language,
        p_captured_at: progress.sourceCapturedAt,
      }).abortSignal(AbortSignal.timeout(10_000));
      if (error || typeof data !== "string") return undefined;
      return `${CUSTOMIZATION_GENERATION_VERSION}:${data}`;
    } catch { return undefined; }
  }
  if (progress.nextRunAt && Date.parse(progress.nextRunAt) > Date.now()) {
    return { jobId: job.id, status: "cooldown", nextRunAt: progress.nextRunAt };
  }
  if (progress.stage === "options" && !progress.sourceCapturedAt) {
    progress = initialCustomizationProgress();
  }
  async function save(status: string, errors: string[] = []) {
    const { error: saveError } = await client.from("supplier_dataset_imports").update({
      status, raw_payload: progress, records_received: progress.offset,
      records_imported: progress.optionsImported, errors,
      finished_at: ["success", "failed"].includes(status) ? new Date().toISOString() : null,
    }).eq("id", job!.id).in("status", ["pending", "running"]);
    if (saveError) throw new Error(saveError.message);
  }
  try {
    if (progress.attempts >= 3) {
      await save("failed", ["A geração foi interrompida três vezes no mesmo lote. Pode retomar o progresso guardado."]);
      return { jobId: job.id, status: "failed" };
    }
    if (progress.stage === "source") {
      progress = { ...progress, attempts: progress.attempts + 1 };
      await save("running");
      const source = await syncRestCustomizationOptionsSource({ lang: job.language });
      if (typeof source.capturedAt !== "string") throw new Error("A captura não devolveu uma data válida.");
      await assertSyncNotCancelled({ supabaseAdmin: client, datasetImportId: job.id });
      progress = { ...progress, stage: "options", attempts: 0, sourceCapturedAt: source.capturedAt };
      await save("running");
      // Source capture has its own invocation budget; process options on the next tick.
      return { jobId: job.id, stage: "options", offset: progress.offset };
    }
    // Run a short sequential burst under the existing integration lock. Save
    // every successful batch, and stop before starting work outside the budget.
    const invocationStartedAt = Date.now();
    for (let batches = 1; ; batches += 1) {
      const batchStartedAt = Date.now();
      progress = { ...progress, attempts: progress.attempts + 1 };
      await save("running");
      if (progress.offset === 0 && !progress.catalogSignature) {
        const signature = await catalogSignature();
        const { data: previous, error: previousError } = await client.from("supplier_dataset_imports")
          .select("raw_payload").eq("supplier_id", await getStrickerSupplierId())
          .eq("dataset_name", CUSTOMIZATION_JOB_DATASET).eq("language", job.language)
          .eq("status", "success").order("created_at", { ascending: false }).limit(1)
          .maybeSingle<{ raw_payload: CustomizationJobProgress }>();
        if (previousError) throw new Error(previousError.message);
        progress = { ...progress, catalogSignature: signature };
        const prior = previous?.raw_payload;
        if (signature && prior?.completedCatalogSignature === signature && prior.recordsTotal !== null) {
          progress = { ...progress, offset: prior.recordsTotal, recordsTotal: prior.recordsTotal,
            locationsSkipped: prior.recordsTotal, completedCatalogSignature: signature,
            skippedUnchangedCatalog: true, attempts: 0 };
          await save("success");
          return { jobId: job.id, status: "success", ...progress };
        }
      }
      await assertSyncNotCancelled({ supabaseAdmin: client, datasetImportId: job.id });
      const batchSize = Math.max(25, Math.min(100, progress.batchSize ?? 25));
      const result = await syncRestCustomizationOptions({ lang: job.language,
        offset: progress.offset, cursor: progress.cursor, recordsTotal: progress.recordsTotal,
        sourceCapturedAt: progress.sourceCapturedAt, limit: batchSize });
      await assertSyncNotCancelled({ supabaseAdmin: client, datasetImportId: job.id });
      let completedCatalogSignature: string | undefined;
      if (!result.hasMore && progress.catalogSignature) {
        const signature = await catalogSignature();
        if (signature === progress.catalogSignature) completedCatalogSignature = signature;
      }
      progress = advanceCustomizationProgress(progress, result);
      const duration = Date.now() - batchStartedAt;
      const nextBatch = nextCustomizationBatch(batchSize, duration, progress.fastBatches);
      const elapsedMs = Date.now() - invocationStartedAt;
      const policy = customizationInvocationPolicy({ batches, elapsedMs, durationMs: duration,
        batchSize, nextBatchSize: nextBatch.batchSize });
      progress = { ...progress, ...nextBatch, lastBatchDurationMs: duration,
        lastInvocationBatches: batches, lastInvocationDurationMs: elapsedMs,
        nextRunAt: new Date(Date.now() + policy.cooldownMs).toISOString() };
      // A legacy job already halfway through has no start signature. It must not
      // certify inputs that were processed before this version was deployed.
      if (!result.hasMore) progress = { ...progress, completedCatalogSignature };
      await save(result.hasMore ? "running" : "success");
      if (!result.hasMore) return { jobId: job.id, status: "success", ...progress };
      if (!policy.continueNow) return { jobId: job.id, status: "running", ...progress };
    }
  } catch (error) {
    if (isSyncCancelledError(error)) return { jobId: job.id, status: "canceled" };
    const message = error instanceof Error ? error.message : "Falha na geração das personalizações.";
    // Back off across invocations instead of repeatedly hammering a busy database.
    progress = { ...progress, batchSize: Math.max(25, Math.floor((progress.batchSize ?? 25) / 2)),
      fastBatches: 0, nextRunAt: new Date(Date.now() + 10 * 60_000).toISOString() };
    await save(progress.attempts >= 3 ? "failed" : "running", [message]);
    return { jobId: job.id, status: progress.attempts >= 3 ? "failed" : "retrying", message };
  }
}
