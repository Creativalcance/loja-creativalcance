import { randomUUID } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStrickerSupplierId } from "@/lib/stricker/auth";
import type { StrickerLanguage } from "@/lib/stricker/rest/types";
import { syncRestCustomizationOptions } from "@/lib/stricker/rest/sync-customization-options";
import { syncRestCustomizationOptionsSource } from "@/lib/stricker/rest/sync-customization-options-source";
import { advanceCustomizationProgress, initialCustomizationProgress, type CustomizationJobProgress } from "./customization-job-progress";
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
      .update({ status: "pending", finished_at: null, errors: [], raw_payload: { ...latest.raw_payload, attempts: 0 } })
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
  const deadline = Date.now() + 180_000;
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
      await syncRestCustomizationOptionsSource({ lang: job.language });
      await assertSyncNotCancelled({ supabaseAdmin: client, datasetImportId: job.id });
      progress = { ...progress, stage: "options", attempts: 0 };
      await save("running");
      // Source capture has its own invocation budget; process options on the next tick.
      return { jobId: job.id, stage: "options", offset: progress.offset };
    }
    do {
      await assertSyncNotCancelled({ supabaseAdmin: client, datasetImportId: job.id });
      progress = { ...progress, attempts: progress.attempts + 1 };
      await save("running");
      const result = await syncRestCustomizationOptions({ lang: job.language,
        offset: progress.offset, cursor: progress.cursor, recordsTotal: progress.recordsTotal, limit: 25 });
      await assertSyncNotCancelled({ supabaseAdmin: client, datasetImportId: job.id });
      progress = advanceCustomizationProgress(progress, result);
      await save(result.hasMore ? "running" : "success");
      if (!result.hasMore) return { jobId: job.id, status: "success", ...progress };
    } while (Date.now() < deadline);
    return { jobId: job.id, status: "running", ...progress };
  } catch (error) {
    if (isSyncCancelledError(error)) return { jobId: job.id, status: "canceled" };
    const message = error instanceof Error ? error.message : "Falha na geração das personalizações.";
    await save(progress.attempts >= 3 ? "failed" : "running", [message]);
    return { jobId: job.id, status: progress.attempts >= 3 ? "failed" : "retrying", message };
  }
}
