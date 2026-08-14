import type { createSupabaseAdminClient } from "@/lib/supabase/admin";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

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
