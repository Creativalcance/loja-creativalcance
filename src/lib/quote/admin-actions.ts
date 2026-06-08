"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

type Profile = {
  role: string;
};

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
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single<Profile>();

    if (!profile || !["admin", "super_admin", "sales"].includes(profile.role)) {
      return {
        success: false,
        message: "Não tem permissões para actualizar este pedido.",
      };
    }

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