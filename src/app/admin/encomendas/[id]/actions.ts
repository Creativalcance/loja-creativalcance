"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminOrderActionState = {
  success: boolean;
  message: string;
};

type AdminIdentity = {
  userId: string;
};

type OrderStateRecord = {
  id: string;
  status: string;
  supplier_submission_status: string;
  internal_notes: string | null;
};

type OrderItemRecord = {
  id: string;
  order_id: string;
  artwork_status: string;
  artwork_approved: boolean;
};

const ORDER_STATUSES = new Set([
  "pending_payment",
  "paid",
  "processing",
  "sent_to_supplier",
  "supplier_confirmed",
  "in_production",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
  "failed",
]);

const SUPPLIER_STATUSES = new Set([
  "not_submitted",
  "ready_for_review",
  "approved_for_submission",
  "submitting",
  "submitted",
  "partially_submitted",
  "failed",
  "cancelled",
]);

const ARTWORK_STATUSES = new Set([
  "draft",
  "uploaded",
  "pending_review",
  "approved",
  "rejected",
  "changes_requested",
]);

function getRequiredString(formData: FormData, key: string): string {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    throw new Error(`Campo obrigatório em falta: ${key}`);
  }

  return value;
}

function getOptionalString(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();

  return value.length > 0 ? value : null;
}

async function requireAdmin(): Promise<AdminIdentity> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Sessão de administrador não encontrada.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string }>();

  if (!profile || profile.role !== "admin") {
    throw new Error("Não tens permissões para alterar encomendas.");
  }

  return {
    userId: user.id,
  };
}

async function insertHistory(params: {
  orderId: string;
  previousStatus: string | null;
  newStatus: string;
  changedBy: string;
  notes: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabaseAdmin = createSupabaseAdminClient();

  const { error } = await supabaseAdmin
    .from("order_status_history")
    .insert({
      order_id: params.orderId,
      previous_status: params.previousStatus,
      new_status: params.newStatus,
      changed_by: params.changedBy,
      notes: params.notes,
      metadata: params.metadata ?? {},
    });

  if (error) {
    throw new Error(
      `A alteração foi efetuada, mas não foi possível guardar o histórico: ${error.message}`,
    );
  }
}

export async function updateAdminOrderStatusAction(
  _previousState: AdminOrderActionState,
  formData: FormData,
): Promise<AdminOrderActionState> {
  try {
    const identity = await requireAdmin();

    const orderId = getRequiredString(formData, "orderId");
    const nextStatus = getRequiredString(formData, "status");
    const notes = getOptionalString(formData, "notes");

    if (!ORDER_STATUSES.has(nextStatus)) {
      return {
        success: false,
        message: "Estado da encomenda inválido.",
      };
    }

    const supabaseAdmin = createSupabaseAdminClient();

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, status, supplier_submission_status, internal_notes")
      .eq("id", orderId)
      .maybeSingle<OrderStateRecord>();

    if (orderError || !order) {
      return {
        success: false,
        message: "Encomenda não encontrada.",
      };
    }

    const now = new Date().toISOString();

    const updatePayload: Record<string, unknown> = {
      status: nextStatus,
    };

    if (nextStatus === "processing") {
      updatePayload.fulfillment_status = "unfulfilled";
    }

    if (nextStatus === "shipped") {
      updatePayload.fulfillment_status = "shipped";
      updatePayload.shipped_at = now;
    }

    if (nextStatus === "delivered") {
      updatePayload.fulfillment_status = "delivered";
      updatePayload.delivered_at = now;
      updatePayload.fulfilled_at = now;
    }

    if (nextStatus === "cancelled") {
      updatePayload.fulfillment_status = "cancelled";
      updatePayload.cancelled_at = now;
    }

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update(updatePayload)
      .eq("id", order.id);

    if (updateError) {
      return {
        success: false,
        message: updateError.message,
      };
    }

    await insertHistory({
      orderId: order.id,
      previousStatus: order.status,
      newStatus: nextStatus,
      changedBy: identity.userId,
      notes,
      metadata: {
        eventType: "order_status_changed",
      },
    });

    revalidatePath("/admin/encomendas");
    revalidatePath(`/admin/encomendas/${order.id}`);

    return {
      success: true,
      message: "Estado da encomenda atualizado.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a encomenda.",
    };
  }
}

export async function updateAdminSupplierStatusAction(
  _previousState: AdminOrderActionState,
  formData: FormData,
): Promise<AdminOrderActionState> {
  try {
    const identity = await requireAdmin();

    const orderId = getRequiredString(formData, "orderId");
    const nextStatus = getRequiredString(formData, "supplierStatus");
    const notes = getOptionalString(formData, "notes");

    if (!SUPPLIER_STATUSES.has(nextStatus)) {
      return {
        success: false,
        message: "Estado de submissão ao fornecedor inválido.",
      };
    }

    const supabaseAdmin = createSupabaseAdminClient();

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, status, supplier_submission_status, internal_notes")
      .eq("id", orderId)
      .maybeSingle<OrderStateRecord>();

    if (orderError || !order) {
      return {
        success: false,
        message: "Encomenda não encontrada.",
      };
    }

    const now = new Date().toISOString();

    const updatePayload: Record<string, unknown> = {
      supplier_submission_status: nextStatus,
      supplier_submission_error:
        nextStatus === "failed" ? notes : null,
    };

    if (nextStatus === "submitted") {
      updatePayload.supplier_submitted_at = now;
      updatePayload.status = "sent_to_supplier";
    }

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update(updatePayload)
      .eq("id", order.id);

    if (updateError) {
      return {
        success: false,
        message: updateError.message,
      };
    }

    await insertHistory({
      orderId: order.id,
      previousStatus: order.supplier_submission_status,
      newStatus: nextStatus,
      changedBy: identity.userId,
      notes,
      metadata: {
        eventType: "supplier_submission_status_changed",
      },
    });

    revalidatePath("/admin/encomendas");
    revalidatePath(`/admin/encomendas/${order.id}`);

    return {
      success: true,
      message: "Estado Stricker atualizado.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o estado Stricker.",
    };
  }
}

export async function updateAdminArtworkAction(
  _previousState: AdminOrderActionState,
  formData: FormData,
): Promise<AdminOrderActionState> {
  try {
    const identity = await requireAdmin();

    const orderItemId = getRequiredString(formData, "orderItemId");
    const artworkStatus = getRequiredString(formData, "artworkStatus");
    const notes = getOptionalString(formData, "notes");

    if (!ARTWORK_STATUSES.has(artworkStatus)) {
      return {
        success: false,
        message: "Estado da arte inválido.",
      };
    }

    const supabaseAdmin = createSupabaseAdminClient();

    const { data: orderItem, error: itemError } = await supabaseAdmin
      .from("order_items")
      .select("id, order_id, artwork_status, artwork_approved")
      .eq("id", orderItemId)
      .maybeSingle<OrderItemRecord>();

    if (itemError || !orderItem) {
      return {
        success: false,
        message: "Linha da encomenda não encontrada.",
      };
    }

    const artworkApproved = artworkStatus === "approved";

    const { error: updateError } = await supabaseAdmin
      .from("order_items")
      .update({
        artwork_status: artworkStatus,
        artwork_approved: artworkApproved,
      })
      .eq("id", orderItem.id);

    if (updateError) {
      return {
        success: false,
        message: updateError.message,
      };
    }

    await insertHistory({
      orderId: orderItem.order_id,
      previousStatus: orderItem.artwork_status,
      newStatus: artworkStatus,
      changedBy: identity.userId,
      notes,
      metadata: {
        eventType: "artwork_status_changed",
        orderItemId: orderItem.id,
        artworkApproved,
      },
    });

    revalidatePath(`/admin/encomendas/${orderItem.order_id}`);

    return {
      success: true,
      message: "Estado da arte atualizado.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a arte.",
    };
  }
}

export async function updateAdminTrackingAction(
  _previousState: AdminOrderActionState,
  formData: FormData,
): Promise<AdminOrderActionState> {
  try {
    const identity = await requireAdmin();

    const orderId = getRequiredString(formData, "orderId");
    const shippingCarrier = getOptionalString(formData, "shippingCarrier");
    const trackingNumber = getOptionalString(formData, "trackingNumber");
    const trackingUrl = getOptionalString(formData, "trackingUrl");
    const notes = getOptionalString(formData, "notes");

    if (trackingUrl) {
      try {
        new URL(trackingUrl);
      } catch {
        return {
          success: false,
          message: "O endereço de tracking não é válido.",
        };
      }
    }

    const supabaseAdmin = createSupabaseAdminClient();

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, status, supplier_submission_status, internal_notes")
      .eq("id", orderId)
      .maybeSingle<OrderStateRecord>();

    if (orderError || !order) {
      return {
        success: false,
        message: "Encomenda não encontrada.",
      };
    }

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        shipping_carrier: shippingCarrier,
        tracking_number: trackingNumber,
        tracking_url: trackingUrl,
      })
      .eq("id", order.id);

    if (updateError) {
      return {
        success: false,
        message: updateError.message,
      };
    }

    await insertHistory({
      orderId: order.id,
      previousStatus: null,
      newStatus: "tracking_updated",
      changedBy: identity.userId,
      notes,
      metadata: {
        eventType: "tracking_updated",
        shippingCarrier,
        trackingNumber,
        trackingUrl,
      },
    });

    revalidatePath("/admin/encomendas");
    revalidatePath(`/admin/encomendas/${order.id}`);

    return {
      success: true,
      message: "Dados de tracking atualizados.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o tracking.",
    };
  }
}

export async function addAdminOrderNoteAction(
  _previousState: AdminOrderActionState,
  formData: FormData,
): Promise<AdminOrderActionState> {
  try {
    const identity = await requireAdmin();

    const orderId = getRequiredString(formData, "orderId");
    const note = getRequiredString(formData, "note");

    if (note.length > 2000) {
      return {
        success: false,
        message: "A nota não pode ultrapassar 2000 caracteres.",
      };
    }

    const supabaseAdmin = createSupabaseAdminClient();

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, status, supplier_submission_status, internal_notes")
      .eq("id", orderId)
      .maybeSingle<OrderStateRecord>();

    if (orderError || !order) {
      return {
        success: false,
        message: "Encomenda não encontrada.",
      };
    }

    const timestamp = new Intl.DateTimeFormat("pt-PT", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date());

    const nextInternalNotes = [
      order.internal_notes?.trim() || null,
      `[${timestamp}] ${note}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        internal_notes: nextInternalNotes,
      })
      .eq("id", order.id);

    if (updateError) {
      return {
        success: false,
        message: updateError.message,
      };
    }

    await insertHistory({
      orderId: order.id,
      previousStatus: null,
      newStatus: "internal_note_added",
      changedBy: identity.userId,
      notes: note,
      metadata: {
        eventType: "internal_note_added",
      },
    });

    revalidatePath(`/admin/encomendas/${order.id}`);

    return {
      success: true,
      message: "Nota interna adicionada.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível adicionar a nota.",
    };
  }
}
