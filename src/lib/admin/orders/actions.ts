"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { assertAdminAccess } from "@/lib/auth/assert-admin";

export type AdminOrderActionState = {
  success: boolean;
  message: string;
};

type JsonRecord = Record<string, unknown>;

type OrderRecord = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  fulfillment_status: string;
  supplier_submission_status: string;
  tracking_number: string | null;
  tracking_url: string | null;
  shipping_carrier: string | null;
  invoice_number: string | null;
  invoice_url: string | null;
  invoice_status: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  metadata: JsonRecord | null;
};

type OrderItemRecord = {
  id: string;
  order_id: string;
  product_name: string;
  personalization_required: boolean;
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

const FULFILLMENT_STATUSES = new Set([
  "unfulfilled",
  "partially_fulfilled",
  "fulfilled",
  "shipped",
  "delivered",
  "cancelled",
]);

const INVOICE_STATUSES = new Set([
  "pending",
  "issued",
  "sent",
  "cancelled",
]);

function getFormString(
  formData: FormData,
  key: string,
): string | null {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0
    ? trimmedValue
    : null;
}

function getRequiredFormString(
  formData: FormData,
  key: string,
): string {
  const value = getFormString(formData, key);

  if (!value) {
    throw new Error(
      `O campo ${key} é obrigatório.`,
    );
  }

  return value;
}

function getFormBoolean(
  formData: FormData,
  key: string,
): boolean {
  return String(formData.get(key) ?? "") ===
    "true";
}

function getMetadataRecord(
  value: JsonRecord | null,
): JsonRecord {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value;
}

function isValidHttpUrl(
  value: string | null,
): boolean {
  if (!value) {
    return true;
  }

  try {
    const url = new URL(value);

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "pending_payment":
      return "A aguardar pagamento";

    case "paid":
      return "Pago";

    case "processing":
      return "Em processamento";

    case "sent_to_supplier":
      return "Enviada à Stricker";

    case "supplier_confirmed":
      return "Confirmada pela Stricker";

    case "in_production":
      return "Em produção";

    case "shipped":
      return "Expedida";

    case "delivered":
      return "Entregue";

    case "cancelled":
      return "Cancelada";

    case "refunded":
      return "Reembolsada";

    case "failed":
      return "Falhou";

    case "unfulfilled":
      return "Por preparar";

    case "partially_fulfilled":
      return "Parcialmente preparada";

    case "fulfilled":
      return "Preparada";

    case "issued":
      return "Emitida";

    case "sent":
      return "Enviada";

    case "pending":
      return "Pendente";

    default:
      return status.replaceAll("_", " ");
  }
}

async function getOrder(
  orderId: string,
): Promise<OrderRecord> {
  const supabaseAdmin =
    createSupabaseAdminClient();

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(
      `
        id,
        order_number,
        status,
        payment_status,
        fulfillment_status,
        supplier_submission_status,
        tracking_number,
        tracking_url,
        shipping_carrier,
        invoice_number,
        invoice_url,
        invoice_status,
        shipped_at,
        delivered_at,
        metadata
      `,
    )
    .eq("id", orderId)
    .maybeSingle<OrderRecord>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error(
      "A encomenda não foi encontrada.",
    );
  }

  return data;
}

async function getOrderItem(
  params: {
    orderId: string;
    orderItemId: string;
  },
): Promise<OrderItemRecord> {
  const supabaseAdmin =
    createSupabaseAdminClient();

  const { data, error } = await supabaseAdmin
    .from("order_items")
    .select(
      `
        id,
        order_id,
        product_name,
        personalization_required,
        artwork_status,
        artwork_approved
      `,
    )
    .eq("id", params.orderItemId)
    .eq("order_id", params.orderId)
    .maybeSingle<OrderItemRecord>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error(
      "A linha da encomenda não foi encontrada.",
    );
  }

  return data;
}

async function insertOrderHistory(params: {
  orderId: string;
  previousStatus: string | null;
  newStatus: string;
  changedBy: string;
  notes: string;
  metadata?: JsonRecord;
}): Promise<void> {
  const supabaseAdmin =
    createSupabaseAdminClient();

  const { error } = await supabaseAdmin
    .from("order_status_history")
    .insert({
      order_id: params.orderId,
      previous_status:
        params.previousStatus,
      new_status: params.newStatus,
      changed_by: params.changedBy,
      notes: params.notes,
      metadata: params.metadata ?? {},
    });

  if (error) {
    throw new Error(
      `Não foi possível registar o histórico: ${error.message}`,
    );
  }
}

function revalidateOrderPaths(
  orderId: string,
): void {
  revalidatePath("/admin/encomendas");

  revalidatePath(
    `/admin/encomendas/${orderId}`,
  );
}

export async function updateOrderTrackingAction(
  _previousState: AdminOrderActionState,
  formData: FormData,
): Promise<AdminOrderActionState> {
  try {
    const access = await assertAdminAccess(
      "/admin/encomendas",
    );

    const orderId = getRequiredFormString(
      formData,
      "orderId",
    );

    const trackingNumber = getFormString(
      formData,
      "trackingNumber",
    );

    const trackingUrl = getFormString(
      formData,
      "trackingUrl",
    );

    const shippingCarrier = getFormString(
      formData,
      "shippingCarrier",
    );

    const markAsShipped = getFormBoolean(
      formData,
      "markAsShipped",
    );

    if (
      !trackingNumber &&
      !trackingUrl &&
      !shippingCarrier
    ) {
      return {
        success: false,
        message:
          "Indica pelo menos o tracking, a ligação ou a transportadora.",
      };
    }

    if (!isValidHttpUrl(trackingUrl)) {
      return {
        success: false,
        message:
          "A ligação de tracking não é válida.",
      };
    }

    const order = await getOrder(orderId);
    const now = new Date().toISOString();

    const nextOrderStatus = markAsShipped
      ? "shipped"
      : order.status;

    const nextFulfillmentStatus =
      markAsShipped
        ? "shipped"
        : order.fulfillment_status;

    const supabaseAdmin =
      createSupabaseAdminClient();

    const currentMetadata =
      getMetadataRecord(order.metadata);

    const { error } = await supabaseAdmin
      .from("orders")
      .update({
        tracking_number: trackingNumber,
        tracking_url: trackingUrl,
        shipping_carrier:
          shippingCarrier ??
          order.shipping_carrier,
        status: nextOrderStatus,
        fulfillment_status:
          nextFulfillmentStatus,
        shipped_at: markAsShipped
          ? order.shipped_at ?? now
          : order.shipped_at,
        metadata: {
          ...currentMetadata,
          trackingUpdatedAt: now,
          trackingUpdatedBy:
            access.userId,
        },
      })
      .eq("id", order.id);

    if (error) {
      throw new Error(error.message);
    }

    await insertOrderHistory({
      orderId: order.id,
      previousStatus: order.status,
      newStatus: nextOrderStatus,
      changedBy: access.userId,
      notes: markAsShipped
        ? `Tracking atualizado e encomenda marcada como expedida${
            trackingNumber
              ? `: ${trackingNumber}`
              : ""
          }.`
        : `Dados de tracking atualizados${
            trackingNumber
              ? `: ${trackingNumber}`
              : ""
          }.`,
      metadata: {
        action:
          "tracking_updated",
        trackingNumber,
        trackingUrl,
        shippingCarrier,
        markAsShipped,
      },
    });

    revalidateOrderPaths(order.id);

    return {
      success: true,
      message:
        "Dados de expedição atualizados com sucesso.",
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

export async function updateOrderInvoiceAction(
  _previousState: AdminOrderActionState,
  formData: FormData,
): Promise<AdminOrderActionState> {
  try {
    const access = await assertAdminAccess(
      "/admin/encomendas",
    );

    const orderId = getRequiredFormString(
      formData,
      "orderId",
    );

    const invoiceNumber = getFormString(
      formData,
      "invoiceNumber",
    );

    const invoiceUrl = getFormString(
      formData,
      "invoiceUrl",
    );

    const invoiceStatus =
      getFormString(
        formData,
        "invoiceStatus",
      ) ?? "issued";

    if (!invoiceNumber && !invoiceUrl) {
      return {
        success: false,
        message:
          "Indica o número ou a ligação da fatura.",
      };
    }

    if (
      !INVOICE_STATUSES.has(invoiceStatus)
    ) {
      return {
        success: false,
        message:
          "O estado da fatura não é válido.",
      };
    }

    if (!isValidHttpUrl(invoiceUrl)) {
      return {
        success: false,
        message:
          "A ligação da fatura não é válida.",
      };
    }

    const order = await getOrder(orderId);
    const now = new Date().toISOString();

    const supabaseAdmin =
      createSupabaseAdminClient();

    const currentMetadata =
      getMetadataRecord(order.metadata);

    const { error } = await supabaseAdmin
      .from("orders")
      .update({
        invoice_number: invoiceNumber,
        invoice_url: invoiceUrl,
        invoice_status: invoiceStatus,
        metadata: {
          ...currentMetadata,
          invoiceUpdatedAt: now,
          invoiceUpdatedBy:
            access.userId,
        },
      })
      .eq("id", order.id);

    if (error) {
      throw new Error(error.message);
    }

    await insertOrderHistory({
      orderId: order.id,
      previousStatus: order.status,
      newStatus: order.status,
      changedBy: access.userId,
      notes: `Fatura ${
        invoiceNumber ?? ""
      } atualizada. Estado: ${getStatusLabel(
        invoiceStatus,
      )}.`,
      metadata: {
        action: "invoice_updated",
        invoiceNumber,
        invoiceUrl,
        invoiceStatus,
      },
    });

    revalidateOrderPaths(order.id);

    return {
      success: true,
      message:
        "Fatura atualizada com sucesso.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a fatura.",
    };
  }
}

export async function updateOrderArtworkAction(
  _previousState: AdminOrderActionState,
  formData: FormData,
): Promise<AdminOrderActionState> {
  try {
    const access = await assertAdminAccess(
      "/admin/encomendas",
    );

    const orderId = getRequiredFormString(
      formData,
      "orderId",
    );

    const orderItemId =
      getRequiredFormString(
        formData,
        "orderItemId",
      );

    const artworkApproved =
      getFormBoolean(
        formData,
        "artworkApproved",
      );

    const notes = getFormString(
      formData,
      "notes",
    );

    const order = await getOrder(orderId);

    const orderItem = await getOrderItem({
      orderId,
      orderItemId,
    });

    if (
      !orderItem.personalization_required
    ) {
      return {
        success: false,
        message:
          "Esta linha não requer aprovação de arte.",
      };
    }

    const artworkStatus =
      artworkApproved
        ? "approved"
        : "ready";

    const supabaseAdmin =
      createSupabaseAdminClient();

    const { error } = await supabaseAdmin
      .from("order_items")
      .update({
        artwork_approved:
          artworkApproved,
        artwork_status:
          artworkStatus,
      })
      .eq("id", orderItem.id)
      .eq("order_id", order.id);

    if (error) {
      throw new Error(error.message);
    }

    await insertOrderHistory({
      orderId: order.id,
      previousStatus: order.status,
      newStatus: order.status,
      changedBy: access.userId,
      notes:
        notes ??
        (artworkApproved
          ? `Arte aprovada para ${orderItem.product_name}.`
          : `Aprovação da arte removida para ${orderItem.product_name}.`),
      metadata: {
        action:
          artworkApproved
            ? "artwork_approved"
            : "artwork_approval_removed",
        orderItemId:
          orderItem.id,
        productName:
          orderItem.product_name,
        artworkApproved,
      },
    });

    revalidateOrderPaths(order.id);

    return {
      success: true,
      message: artworkApproved
        ? "Arte aprovada com sucesso."
        : "A aprovação da arte foi removida.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a aprovação da arte.",
    };
  }
}

export async function updateOrderStatusAction(
  _previousState: AdminOrderActionState,
  formData: FormData,
): Promise<AdminOrderActionState> {
  try {
    const access = await assertAdminAccess(
      "/admin/encomendas",
    );

    const orderId = getRequiredFormString(
      formData,
      "orderId",
    );

    const status =
      getRequiredFormString(
        formData,
        "status",
      );

    const fulfillmentStatus =
      getRequiredFormString(
        formData,
        "fulfillmentStatus",
      );

    const notes = getFormString(
      formData,
      "notes",
    );

    if (!ORDER_STATUSES.has(status)) {
      return {
        success: false,
        message:
          "O estado da encomenda não é válido.",
      };
    }

    if (
      !FULFILLMENT_STATUSES.has(
        fulfillmentStatus,
      )
    ) {
      return {
        success: false,
        message:
          "O estado de preparação não é válido.",
      };
    }

    const order = await getOrder(orderId);
    const now = new Date().toISOString();

    const updateValues: JsonRecord = {
      status,
      fulfillment_status:
        fulfillmentStatus,
    };

    if (
      status === "shipped" ||
      fulfillmentStatus === "shipped"
    ) {
      updateValues.shipped_at =
        order.shipped_at ?? now;
    }

    if (
      status === "delivered" ||
      fulfillmentStatus === "delivered"
    ) {
      updateValues.delivered_at =
        order.delivered_at ?? now;

      updateValues.fulfilled_at = now;
    }

    if (
      fulfillmentStatus === "fulfilled"
    ) {
      updateValues.fulfilled_at = now;
    }

    if (status === "cancelled") {
      updateValues.cancelled_at = now;
    }

    const supabaseAdmin =
      createSupabaseAdminClient();

    const { error } = await supabaseAdmin
      .from("orders")
      .update(updateValues)
      .eq("id", order.id);

    if (error) {
      throw new Error(error.message);
    }

    await insertOrderHistory({
      orderId: order.id,
      previousStatus: order.status,
      newStatus: status,
      changedBy: access.userId,
      notes:
        notes ??
        `Estado alterado de ${getStatusLabel(
          order.status,
        )} para ${getStatusLabel(
          status,
        )}. Preparação: ${getStatusLabel(
          fulfillmentStatus,
        )}.`,
      metadata: {
        action:
          "order_status_updated",
        previousStatus:
          order.status,
        newStatus: status,
        previousFulfillmentStatus:
          order.fulfillment_status,
        newFulfillmentStatus:
          fulfillmentStatus,
      },
    });

    revalidateOrderPaths(order.id);

    return {
      success: true,
      message:
        "Estado da encomenda atualizado com sucesso.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o estado da encomenda.",
    };
  }
}