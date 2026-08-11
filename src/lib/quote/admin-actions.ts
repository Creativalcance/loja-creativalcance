"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assertAdminAccess } from "@/lib/auth/assert-admin";

export type UpdateQuoteStatusState = {
  success: boolean;
  message: string;
};

const ALLOWED_STATUSES = [
  "new",
  "in_analysis",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
  "cancelled",
] as const;

type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

function isAllowedStatus(status: string): status is AllowedStatus {
  return ALLOWED_STATUSES.includes(status as AllowedStatus);
}

export async function updateQuoteRequestStatusAction(
  _previousState: UpdateQuoteStatusState,
  formData: FormData,
): Promise<UpdateQuoteStatusState> {
  const quoteRequestId = String(formData.get("quoteRequestId") || "").trim();
  const status = String(formData.get("status") || "").trim();

  if (!quoteRequestId) {
    return {
      success: false,
      message: "Pedido de orçamento inválido.",
    };
  }

  if (!isAllowedStatus(status)) {
    return {
      success: false,
      message: "Estado inválido.",
    };
  }

  try {
    await assertAdminAccess("/admin/pedidos-de-orcamento");
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("quote_requests")
      .update({
        status,
      })
      .eq("id", quoteRequestId);

    if (error) {
      return {
        success: false,
        message: error.message,
      };
    }

    revalidatePath("/admin/pedidos-de-orcamento");
    revalidatePath(`/admin/pedidos-de-orcamento/${quoteRequestId}`);

    return {
      success: true,
      message: "Estado actualizado com sucesso.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? `Erro técnico: ${error.message}`
          : "Erro técnico inesperado.",
    };
  }
}
