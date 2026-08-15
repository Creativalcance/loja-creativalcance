import type { createSupabaseAdminClient } from "@/lib/supabase/admin";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

const STALE_SYNC_AFTER_MS = 6 * 60 * 1000;

export class SyncCancelledError extends Error {
  constructor() {
    super("SYNC_CANCELLED");
    this.name = "SyncCancelledError";
  }
}

export async function assertSyncNotCancelled(params: {
  supabaseAdmin: SupabaseAdminClient;
  datasetImportId: string;
}): Promise<void> {
  const { data, error } = await params.supabaseAdmin
    .from("supplier_dataset_imports")
    .select("status")
    .eq("id", params.datasetImportId)
    .single<{ status: string }>();

  if (error) throw new Error(error.message);
  if (data.status === "canceled") throw new SyncCancelledError();
}

export function isSyncCancelledError(error: unknown): boolean {
  return error instanceof SyncCancelledError ||
    (error instanceof Error && error.message === "SYNC_CANCELLED");
}

export async function expireStaleSupplierSyncs(params: {
  supabaseAdmin: SupabaseAdminClient;
}): Promise<number> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - STALE_SYNC_AFTER_MS).toISOString();
  const { data, error } = await params.supabaseAdmin
    .from("supplier_dataset_imports")
    .update({
      status: "failed",
      finished_at: now.toISOString(),
      errors: [
        "A execução excedeu o limite máximo e foi encerrada automaticamente. Os dados já importados foram preservados.",
      ],
    })
    .eq("status", "running")
    .lt("started_at", cutoff)
    .select("id");

  if (error) throw new Error(error.message);

  return data?.length ?? 0;
}
