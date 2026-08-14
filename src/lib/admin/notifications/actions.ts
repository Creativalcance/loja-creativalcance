"use server";

import { revalidatePath } from "next/cache";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function markAllAdminNotificationsAsRead(): Promise<void> {
  const { userId } = await assertAdminAccess("/admin");
  const supabase = createSupabaseAdminClient();
  const { data: notifications, error } = await supabase
    .from("admin_notifications")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(`Não foi possível consultar as notificações: ${error.message}`);
  }

  if (notifications && notifications.length > 0) {
    const { error: readError } = await supabase
      .from("admin_notification_reads")
      .upsert(
        notifications.map((notification) => ({
          notification_id: notification.id,
          user_id: userId,
          read_at: new Date().toISOString(),
        })),
        { onConflict: "notification_id,user_id" },
      );

    if (readError) {
      throw new Error(`Não foi possível atualizar as notificações: ${readError.message}`);
    }
  }

  revalidatePath("/admin");
}
