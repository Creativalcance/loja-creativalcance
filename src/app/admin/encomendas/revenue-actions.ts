"use server";

import { revalidatePath } from "next/cache";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type RevenueResetState = { saved?: boolean; error?: string };

export async function resetOrderRevenueAction(
  _previous: RevenueResetState,
  formData: FormData,
): Promise<RevenueResetState> {
  const access = await assertAdminAccess("/admin/encomendas");

  if (formData.get("confirmReset") !== "yes") {
    return { error: "Confirma que queres repor o contador de faturação a zero." };
  }

  try {
    const admin = createSupabaseAdminClient();
    // The database supplies the reset time; the actor always comes from the session.
    const { error } = await admin.from("admin_order_revenue_resets").insert({
      reset_by: access.userId,
    });
    if (error) {
      return { error: "Não foi possível repor o contador. Tenta novamente." };
    }
  } catch {
    return { error: "Não foi possível repor o contador. Tenta novamente." };
  }

  revalidatePath("/admin/encomendas");
  return { saved: true };
}
