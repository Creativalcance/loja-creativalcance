import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createStripeServerClient } from "@/lib/stripe/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { submitPaidOrderToStricker } from "@/lib/stricker/orders/submit-order";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

type StripeWebhookEventRow = {
  id: string;
  stripe_event_id: string;
  event_type: string;
  status: string;
  processing_attempts: number;
  order_id: string | null;
  payment_id: string | null;
  provider_checkout_session_id: string | null;
  provider_payment_intent_id: string | null;
};

type OrderRecord = {
  id: string;
  source_cart_id: string | null;
  status: string;
  payment_status: string;
  supplier_submission_status: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  metadata: JsonRecord | null;
};

type PaymentRecord = {
  id: string;
  order_id: string;
  status: string;
  provider_checkout_session_id: string | null;
  provider_payment_intent_id: string | null;
};

type SupplierSubmissionResult = {
  success: boolean;
  status:
    | "submitted"
    | "partially_submitted"
    | "failed"
    | "already_submitted"
    | "not_ready";
  message: string;
};

function getPaymentIntentId(
  session: Stripe.Checkout.Session,
): string | null {
  if (typeof session.payment_intent === "string") {
    return session.payment_intent;
  }

  return session.payment_intent?.id ?? null;
}

function getMetadataValue(
  metadata: Stripe.Metadata | null,
  key: string,
): string | null {
  const value = metadata?.[key]?.trim();

  return value || null;
}

function getJsonRecord(value: unknown): JsonRecord {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value as JsonRecord;
}

function getStripeObjectId(
  value:
    | string
    | Stripe.PaymentIntent
    | Stripe.Checkout.Session
    | Stripe.Charge
    | null
    | undefined,
): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  return value.id ?? null;
}

function getEventCheckoutSessionId(
  event: Stripe.Event,
): string | null {
  if (
    event.type === "checkout.session.completed" ||
    event.type ===
      "checkout.session.async_payment_succeeded" ||
    event.type ===
      "checkout.session.async_payment_failed" ||
    event.type === "checkout.session.expired"
  ) {
    return event.data.object.id;
  }

  return null;
}

function getEventPaymentIntentId(
  event: Stripe.Event,
): string | null {
  if (
    event.type === "checkout.session.completed" ||
    event.type ===
      "checkout.session.async_payment_succeeded" ||
    event.type ===
      "checkout.session.async_payment_failed" ||
    event.type === "checkout.session.expired"
  ) {
    return getPaymentIntentId(event.data.object);
  }

  if (
    event.type === "payment_intent.succeeded" ||
    event.type === "payment_intent.payment_failed" ||
    event.type === "payment_intent.canceled"
  ) {
    return event.data.object.id;
  }

  return null;
}

async function findOrderByReferences(params: {
  orderId?: string | null;
  checkoutSessionId?: string | null;
  paymentIntentId?: string | null;
}): Promise<OrderRecord | null> {
  const supabaseAdmin = createSupabaseAdminClient();

  if (params.orderId) {
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select(
        `
          id,
          source_cart_id,
          status,
          payment_status,
          supplier_submission_status,
          stripe_checkout_session_id,
          stripe_payment_intent_id,
          metadata
        `,
      )
      .eq("id", params.orderId)
      .maybeSingle<OrderRecord>();

    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      return data;
    }
  }

  if (params.checkoutSessionId) {
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select(
        `
          id,
          source_cart_id,
          status,
          payment_status,
          supplier_submission_status,
          stripe_checkout_session_id,
          stripe_payment_intent_id,
          metadata
        `,
      )
      .eq(
        "stripe_checkout_session_id",
        params.checkoutSessionId,
      )
      .maybeSingle<OrderRecord>();

    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      return data;
    }
  }

  if (params.paymentIntentId) {
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select(
        `
          id,
          source_cart_id,
          status,
          payment_status,
          supplier_submission_status,
          stripe_checkout_session_id,
          stripe_payment_intent_id,
          metadata
        `,
      )
      .eq(
        "stripe_payment_intent_id",
        params.paymentIntentId,
      )
      .maybeSingle<OrderRecord>();

    if (error) {
      throw new Error(error.message);
    }

    return data ?? null;
  }

  return null;
}

async function createOrStartWebhookEvent(
  event: Stripe.Event,
): Promise<{
  webhookEventId: string;
  alreadyProcessed: boolean;
}> {
  const supabaseAdmin = createSupabaseAdminClient();

  const checkoutSessionId =
    getEventCheckoutSessionId(event);

  const paymentIntentId =
    getEventPaymentIntentId(event);

  const { data: existingEvent, error: existingError } =
    await supabaseAdmin
      .from("stripe_webhook_events")
      .select(
        `
          id,
          stripe_event_id,
          event_type,
          status,
          processing_attempts,
          order_id,
          payment_id,
          provider_checkout_session_id,
          provider_payment_intent_id
        `,
      )
      .eq("stripe_event_id", event.id)
      .maybeSingle<StripeWebhookEventRow>();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingEvent) {
    if (existingEvent.status === "processed") {
      return {
        webhookEventId: existingEvent.id,
        alreadyProcessed: true,
      };
    }

    const { error: updateError } = await supabaseAdmin
      .from("stripe_webhook_events")
      .update({
        status: "processing",
        processing_attempts:
          Number(existingEvent.processing_attempts ?? 0) + 1,
        processing_started_at: new Date().toISOString(),
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingEvent.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return {
      webhookEventId: existingEvent.id,
      alreadyProcessed: false,
    };
  }

  const { data: createdEvent, error: createError } =
    await supabaseAdmin
      .from("stripe_webhook_events")
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        livemode: event.livemode,
        api_version: event.api_version ?? null,
        status: "processing",
        processing_attempts: 1,
        provider_checkout_session_id: checkoutSessionId,
        provider_payment_intent_id: paymentIntentId,
        payload: event as unknown as JsonRecord,
        received_at: new Date().toISOString(),
        processing_started_at: new Date().toISOString(),
      })
      .select("id")
      .single<{ id: string }>();

  if (createError || !createdEvent) {
    throw new Error(
      createError?.message ??
        "Não foi possível registar o evento Stripe.",
    );
  }

  return {
    webhookEventId: createdEvent.id,
    alreadyProcessed: false,
  };
}

async function markWebhookEventProcessed(params: {
  webhookEventId: string;
  orderId?: string | null;
  paymentId?: string | null;
  checkoutSessionId?: string | null;
  paymentIntentId?: string | null;
}): Promise<void> {
  const supabaseAdmin = createSupabaseAdminClient();

  const { error } = await supabaseAdmin
    .from("stripe_webhook_events")
    .update({
      status: "processed",
      order_id: params.orderId ?? null,
      payment_id: params.paymentId ?? null,
      provider_checkout_session_id:
        params.checkoutSessionId ?? null,
      provider_payment_intent_id:
        params.paymentIntentId ?? null,
      processed_at: new Date().toISOString(),
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.webhookEventId);

  if (error) {
    throw new Error(error.message);
  }
}

async function markWebhookEventFailed(params: {
  webhookEventId: string;
  errorMessage: string;
  orderId?: string | null;
  paymentId?: string | null;
}): Promise<void> {
  const supabaseAdmin = createSupabaseAdminClient();

  await supabaseAdmin
    .from("stripe_webhook_events")
    .update({
      status: "failed",
      order_id: params.orderId ?? null,
      payment_id: params.paymentId ?? null,
      error_message: params.errorMessage,
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.webhookEventId);
}

async function createOrderHistoryEntry(params: {
  orderId: string;
  previousStatus: string | null;
  newStatus: string;
  notes: string;
  metadata?: JsonRecord;
}): Promise<void> {
  const supabaseAdmin = createSupabaseAdminClient();

  const { error } = await supabaseAdmin
    .from("order_status_history")
    .insert({
      order_id: params.orderId,
      previous_status: params.previousStatus,
      new_status: params.newStatus,
      changed_by: null,
      notes: params.notes,
      metadata: params.metadata ?? {},
    });

  if (error) {
    console.error(
      "Não foi possível guardar o histórico da encomenda:",
      error.message,
    );
  }
}

async function markCheckoutPaid(
  session: Stripe.Checkout.Session,
): Promise<{
  orderId: string;
  paymentId: string | null;
  cartId: string | null;
  paymentIntentId: string | null;
}> {
  const supabaseAdmin = createSupabaseAdminClient();

  const metadataOrderId = getMetadataValue(
    session.metadata,
    "orderId",
  );

  const metadataCartId = getMetadataValue(
    session.metadata,
    "cartId",
  );

  const paymentIntentId = getPaymentIntentId(session);
  const completedAt = new Date().toISOString();

  const order = await findOrderByReferences({
    orderId: metadataOrderId,
    checkoutSessionId: session.id,
    paymentIntentId,
  });

  if (!order) {
    throw new Error(
      `Não foi encontrada uma encomenda para a Checkout Session ${session.id}.`,
    );
  }

  const cartId =
    metadataCartId ?? order.source_cart_id ?? null;

  const amountReceived =
    typeof session.amount_total === "number"
      ? session.amount_total / 100
      : 0;

  const existingMetadata = getJsonRecord(order.metadata);

  const wasAlreadyPaid = order.payment_status === "paid";

  const { error: orderError } = await supabaseAdmin
    .from("orders")
    .update({
      status: wasAlreadyPaid ? order.status : "paid",
      payment_status: "paid",
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      paid_at: completedAt,
      supplier_submission_status:
        order.supplier_submission_status ===
          "not_submitted" ||
        order.supplier_submission_status ===
          "ready_for_review"
          ? "approved_for_submission"
          : order.supplier_submission_status,
      metadata: {
        ...existingMetadata,
        stripePaymentStatus: session.payment_status,
        stripeCheckoutStatus: session.status,
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
        stripePaidAt: completedAt,
      },
      updated_at: completedAt,
    })
    .eq("id", order.id);

  if (orderError) {
    throw new Error(orderError.message);
  }

  const { data: paymentData, error: paymentError } =
    await supabaseAdmin
      .from("payments")
      .update({
        provider_payment_id: paymentIntentId,
        provider_payment_intent_id: paymentIntentId,
        status: "paid",
        paid_at: completedAt,
        amount_received: amountReceived,
        raw_payload: session as unknown as JsonRecord,
        updated_at: completedAt,
      })
      .eq("provider_checkout_session_id", session.id)
      .select("id, order_id, status")
      .maybeSingle<PaymentRecord>();

  if (paymentError) {
    throw new Error(paymentError.message);
  }

  const { error: checkoutSessionError } =
    await supabaseAdmin
      .from("checkout_sessions")
      .update({
        provider_payment_intent_id: paymentIntentId,
        status: "completed",
        completed_at: completedAt,
        raw_payload: session as unknown as JsonRecord,
        updated_at: completedAt,
      })
      .eq("provider_session_id", session.id);

  if (checkoutSessionError) {
    throw new Error(checkoutSessionError.message);
  }

  if (cartId) {
    const { error: cartError } = await supabaseAdmin
      .from("carts")
      .update({
        status: "converted",
        checkout_step: "completed",
        payment_completed_at: completedAt,
        completed_at: completedAt,
        updated_at: completedAt,
      })
      .eq("id", cartId);

    if (cartError) {
      throw new Error(cartError.message);
    }
  }

  if (!wasAlreadyPaid) {
    await createOrderHistoryEntry({
      orderId: order.id,
      previousStatus: order.status,
      newStatus: "paid",
      notes:
        "Pagamento confirmado automaticamente através da Stripe.",
      metadata: {
        source: "stripe_webhook",
        checkoutSessionId: session.id,
        paymentIntentId,
        amountReceived,
        currency: session.currency?.toUpperCase() ?? null,
      },
    });
  }

  return {
    orderId: order.id,
    paymentId: paymentData?.id ?? null,
    cartId,
    paymentIntentId,
  };
}

async function markPaymentIntentPaid(
  paymentIntent: Stripe.PaymentIntent,
): Promise<{
  orderId: string;
  paymentId: string | null;
  cartId: string | null;
  paymentIntentId: string;
}> {
  const supabaseAdmin = createSupabaseAdminClient();

  const metadataOrderId = getMetadataValue(
    paymentIntent.metadata,
    "orderId",
  );

  const metadataCartId = getMetadataValue(
    paymentIntent.metadata,
    "cartId",
  );

  const order = await findOrderByReferences({
    orderId: metadataOrderId,
    paymentIntentId: paymentIntent.id,
  });

  if (!order) {
    throw new Error(
      `Não foi encontrada uma encomenda para o Payment Intent ${paymentIntent.id}.`,
    );
  }

  const cartId =
    metadataCartId ?? order.source_cart_id ?? null;

  const completedAt = new Date().toISOString();
  const amountReceived = paymentIntent.amount_received / 100;
  const wasAlreadyPaid = order.payment_status === "paid";

  const existingMetadata = getJsonRecord(order.metadata);

  const { error: orderError } = await supabaseAdmin
    .from("orders")
    .update({
      status: wasAlreadyPaid ? order.status : "paid",
      payment_status: "paid",
      stripe_payment_intent_id: paymentIntent.id,
      paid_at: completedAt,
      supplier_submission_status:
        order.supplier_submission_status ===
          "not_submitted" ||
        order.supplier_submission_status ===
          "ready_for_review"
          ? "approved_for_submission"
          : order.supplier_submission_status,
      metadata: {
        ...existingMetadata,
        stripePaymentIntentId: paymentIntent.id,
        stripePaymentIntentStatus: paymentIntent.status,
        stripePaidAt: completedAt,
      },
      updated_at: completedAt,
    })
    .eq("id", order.id);

  if (orderError) {
    throw new Error(orderError.message);
  }

  const { data: paymentData, error: paymentError } =
    await supabaseAdmin
      .from("payments")
      .update({
        provider_payment_id: paymentIntent.id,
        provider_payment_intent_id: paymentIntent.id,
        provider_charge_id: getStripeObjectId(
          paymentIntent.latest_charge,
        ),
        status: "paid",
        paid_at: completedAt,
        amount_received: amountReceived,
        raw_payload:
          paymentIntent as unknown as JsonRecord,
        updated_at: completedAt,
      })
      .eq(
        "provider_payment_intent_id",
        paymentIntent.id,
      )
      .select("id, order_id, status")
      .maybeSingle<PaymentRecord>();

  if (paymentError) {
    throw new Error(paymentError.message);
  }

  if (cartId) {
    const { error: cartError } = await supabaseAdmin
      .from("carts")
      .update({
        status: "converted",
        checkout_step: "completed",
        payment_completed_at: completedAt,
        completed_at: completedAt,
        updated_at: completedAt,
      })
      .eq("id", cartId);

    if (cartError) {
      throw new Error(cartError.message);
    }
  }

  if (!wasAlreadyPaid) {
    await createOrderHistoryEntry({
      orderId: order.id,
      previousStatus: order.status,
      newStatus: "paid",
      notes:
        "Pagamento confirmado automaticamente através do Payment Intent da Stripe.",
      metadata: {
        source: "stripe_webhook",
        paymentIntentId: paymentIntent.id,
        amountReceived,
        currency:
          paymentIntent.currency?.toUpperCase() ?? null,
      },
    });
  }

  return {
    orderId: order.id,
    paymentId: paymentData?.id ?? null,
    cartId,
    paymentIntentId: paymentIntent.id,
  };
}

async function submitOrderAfterPayment(
  orderId: string,
): Promise<SupplierSubmissionResult> {
  const supabaseAdmin = createSupabaseAdminClient();

  const { data: order, error: orderError } =
    await supabaseAdmin
      .from("orders")
      .select(
        `
          id,
          status,
          payment_status,
          supplier_submission_status
        `,
      )
      .eq("id", orderId)
      .maybeSingle<{
        id: string;
        status: string;
        payment_status: string;
        supplier_submission_status: string;
      }>();

  if (orderError || !order) {
    return {
      success: false,
      status: "failed",
      message:
        orderError?.message ??
        "A encomenda não foi encontrada.",
    };
  }

  if (order.payment_status !== "paid") {
    return {
      success: false,
      status: "not_ready",
      message:
        "A encomenda ainda não possui pagamento confirmado.",
    };
  }

  if (
    order.supplier_submission_status === "submitted"
  ) {
    return {
      success: true,
      status: "already_submitted",
      message:
        "A encomenda já tinha sido submetida ao fornecedor.",
    };
  }

  const previousStatus = order.status;

  await createOrderHistoryEntry({
    orderId,
    previousStatus,
    newStatus: previousStatus,
    notes:
      "Pagamento validado. Iniciada a submissão automática da encomenda ao fornecedor.",
    metadata: {
      source: "stripe_webhook",
      action: "supplier_submission_started",
    },
  });

  try {
    await submitPaidOrderToStricker(orderId);

    const { data: updatedOrder } = await supabaseAdmin
      .from("orders")
      .select(
        `
          status,
          supplier_submission_status,
          supplier_submission_error
        `,
      )
      .eq("id", orderId)
      .maybeSingle<{
        status: string;
        supplier_submission_status: string;
        supplier_submission_error: string | null;
      }>();

    const finalSubmissionStatus =
      updatedOrder?.supplier_submission_status ??
      "submitted";

    const isSuccessful =
      finalSubmissionStatus === "submitted";

    const isPartial =
      finalSubmissionStatus === "partially_submitted";

    await createOrderHistoryEntry({
      orderId,
      previousStatus,
      newStatus:
        updatedOrder?.status ??
        (isSuccessful
          ? "sent_to_supplier"
          : previousStatus),
      notes: isSuccessful
        ? "Encomenda submetida automaticamente ao fornecedor."
        : isPartial
          ? "Encomenda submetida parcialmente ao fornecedor."
          : "A submissão ao fornecedor terminou com um estado não conclusivo.",
      metadata: {
        source: "stripe_webhook",
        action: "supplier_submission_finished",
        supplierSubmissionStatus:
          finalSubmissionStatus,
        supplierSubmissionError:
          updatedOrder?.supplier_submission_error ?? null,
      },
    });

    if (isSuccessful) {
      return {
        success: true,
        status: "submitted",
        message:
          "Encomenda submetida automaticamente ao fornecedor.",
      };
    }

    if (isPartial) {
      return {
        success: false,
        status: "partially_submitted",
        message:
          updatedOrder?.supplier_submission_error ??
          "A encomenda foi submetida parcialmente ao fornecedor.",
      };
    }

    return {
      success: false,
      status: "failed",
      message:
        updatedOrder?.supplier_submission_error ??
        "A submissão ao fornecedor não ficou concluída.",
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Erro inesperado durante a submissão ao fornecedor.";

    await supabaseAdmin
      .from("orders")
      .update({
        supplier_submission_status: "failed",
        supplier_submission_error: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .neq("supplier_submission_status", "submitted");

    await supabaseAdmin
      .from("order_items")
      .update({
        supplier_submission_status: "failed",
        supplier_submission_error: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq("order_id", orderId)
      .neq("supplier_submission_status", "submitted");

    await createOrderHistoryEntry({
      orderId,
      previousStatus,
      newStatus: previousStatus,
      notes:
        "O pagamento foi confirmado, mas a submissão automática ao fornecedor falhou.",
      metadata: {
        source: "stripe_webhook",
        action: "supplier_submission_failed",
        error: errorMessage,
      },
    });

    return {
      success: false,
      status: "failed",
      message: errorMessage,
    };
  }
}

async function markCheckoutFailed(params: {
  session: Stripe.Checkout.Session;
  status: "failed" | "cancelled" | "expired";
}): Promise<{
  orderId: string | null;
  paymentId: string | null;
}> {
  const supabaseAdmin = createSupabaseAdminClient();

  const metadataOrderId = getMetadataValue(
    params.session.metadata,
    "orderId",
  );

  const paymentIntentId = getPaymentIntentId(
    params.session,
  );

  const order = await findOrderByReferences({
    orderId: metadataOrderId,
    checkoutSessionId: params.session.id,
    paymentIntentId,
  });

  const eventDate = new Date().toISOString();

  const checkoutUpdate: JsonRecord = {
    status: params.status,
    raw_payload:
      params.session as unknown as JsonRecord,
    updated_at: eventDate,
  };

  if (params.status === "expired") {
    checkoutUpdate.expired_at = eventDate;
  }

  if (params.status === "cancelled") {
    checkoutUpdate.cancelled_at = eventDate;
  }

  const { error: checkoutError } = await supabaseAdmin
    .from("checkout_sessions")
    .update(checkoutUpdate)
    .eq("provider_session_id", params.session.id);

  if (checkoutError) {
    throw new Error(checkoutError.message);
  }

  const paymentUpdate: JsonRecord = {
    status:
      params.status === "cancelled"
        ? "cancelled"
        : "failed",
    raw_payload:
      params.session as unknown as JsonRecord,
    updated_at: eventDate,
  };

  if (params.status === "cancelled") {
    paymentUpdate.cancelled_at = eventDate;
  } else {
    paymentUpdate.failed_at = eventDate;
  }

  const { data: payment, error: paymentError } =
    await supabaseAdmin
      .from("payments")
      .update(paymentUpdate)
      .eq(
        "provider_checkout_session_id",
        params.session.id,
      )
      .select("id, order_id, status")
      .maybeSingle<PaymentRecord>();

  if (paymentError) {
    throw new Error(paymentError.message);
  }

  if (order && order.payment_status !== "paid") {
    const nextOrderStatus =
      params.status === "cancelled"
        ? "cancelled"
        : "failed";

    const nextPaymentStatus =
      params.status === "cancelled"
        ? "cancelled"
        : "failed";

    const { error: orderError } = await supabaseAdmin
      .from("orders")
      .update({
        status: nextOrderStatus,
        payment_status: nextPaymentStatus,
        cancelled_at:
          params.status === "cancelled"
            ? eventDate
            : null,
        updated_at: eventDate,
      })
      .eq("id", order.id)
      .neq("payment_status", "paid");

    if (orderError) {
      throw new Error(orderError.message);
    }

    await createOrderHistoryEntry({
      orderId: order.id,
      previousStatus: order.status,
      newStatus: nextOrderStatus,
      notes:
        params.status === "expired"
          ? "A sessão de pagamento Stripe expirou."
          : params.status === "cancelled"
            ? "O pagamento foi cancelado."
            : "O pagamento não foi concluído.",
      metadata: {
        source: "stripe_webhook",
        checkoutSessionId: params.session.id,
        paymentIntentId,
        checkoutStatus: params.status,
      },
    });
  }

  return {
    orderId: order?.id ?? null,
    paymentId: payment?.id ?? null,
  };
}

async function markPaymentIntentFailed(params: {
  paymentIntent: Stripe.PaymentIntent;
  status: "failed" | "cancelled";
}): Promise<{
  orderId: string | null;
  paymentId: string | null;
}> {
  const supabaseAdmin = createSupabaseAdminClient();

  const metadataOrderId = getMetadataValue(
    params.paymentIntent.metadata,
    "orderId",
  );

  const order = await findOrderByReferences({
    orderId: metadataOrderId,
    paymentIntentId: params.paymentIntent.id,
  });

  const eventDate = new Date().toISOString();

  const paymentUpdate: JsonRecord = {
    status: params.status,
    raw_payload:
      params.paymentIntent as unknown as JsonRecord,
    updated_at: eventDate,
  };

  if (params.status === "cancelled") {
    paymentUpdate.cancelled_at = eventDate;
  } else {
    paymentUpdate.failed_at = eventDate;
    paymentUpdate.failure_code =
      params.paymentIntent.last_payment_error?.code ??
      null;
    paymentUpdate.failure_message =
      params.paymentIntent.last_payment_error?.message ??
      null;
  }

  const { data: payment, error: paymentError } =
    await supabaseAdmin
      .from("payments")
      .update(paymentUpdate)
      .eq(
        "provider_payment_intent_id",
        params.paymentIntent.id,
      )
      .select("id, order_id, status")
      .maybeSingle<PaymentRecord>();

  if (paymentError) {
    throw new Error(paymentError.message);
  }

  if (order && order.payment_status !== "paid") {
    const nextOrderStatus =
      params.status === "cancelled"
        ? "cancelled"
        : "failed";

    const { error: orderError } = await supabaseAdmin
      .from("orders")
      .update({
        status: nextOrderStatus,
        payment_status: params.status,
        cancelled_at:
          params.status === "cancelled"
            ? eventDate
            : null,
        updated_at: eventDate,
      })
      .eq("id", order.id)
      .neq("payment_status", "paid");

    if (orderError) {
      throw new Error(orderError.message);
    }

    await createOrderHistoryEntry({
      orderId: order.id,
      previousStatus: order.status,
      newStatus: nextOrderStatus,
      notes:
        params.status === "cancelled"
          ? "O Payment Intent da Stripe foi cancelado."
          : "O Payment Intent da Stripe falhou.",
      metadata: {
        source: "stripe_webhook",
        paymentIntentId: params.paymentIntent.id,
        failureCode:
          params.paymentIntent.last_payment_error
            ?.code ?? null,
        failureMessage:
          params.paymentIntent.last_payment_error
            ?.message ?? null,
      },
    });
  }

  return {
    orderId: order?.id ?? null,
    paymentId: payment?.id ?? null,
  };
}

export async function POST(request: Request) {
  const webhookSecret =
    process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      {
        error:
          "STRIPE_WEBHOOK_SECRET não está configurada.",
      },
      {
        status: 500,
      },
    );
  }

  const signature = request.headers.get(
    "stripe-signature",
  );

  if (!signature) {
    return NextResponse.json(
      {
        error:
          "Cabeçalho Stripe-Signature em falta.",
      },
      {
        status: 400,
      },
    );
  }

  const rawBody = await request.text();
  const stripe = createStripeServerClient();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Assinatura inválida: ${error.message}`
            : "Assinatura Stripe inválida.",
      },
      {
        status: 400,
      },
    );
  }

  let webhookEventId: string | null = null;
  let processedOrderId: string | null = null;
  let processedPaymentId: string | null = null;

  try {
    const webhookRegistration =
      await createOrStartWebhookEvent(event);

    webhookEventId =
      webhookRegistration.webhookEventId;

    if (webhookRegistration.alreadyProcessed) {
      return NextResponse.json({
        received: true,
        duplicate: true,
      });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;

        if (session.payment_status === "paid") {
          const paymentResult =
            await markCheckoutPaid(session);

          processedOrderId = paymentResult.orderId;
          processedPaymentId =
            paymentResult.paymentId;

          const supplierResult =
            await submitOrderAfterPayment(
              paymentResult.orderId,
            );

          if (!supplierResult.success) {
            console.error(
              "Pagamento confirmado, mas submissão ao fornecedor não concluída:",
              supplierResult,
            );
          }
        }

        break;
      }

      case "checkout.session.async_payment_succeeded": {
        const paymentResult =
          await markCheckoutPaid(event.data.object);

        processedOrderId = paymentResult.orderId;
        processedPaymentId = paymentResult.paymentId;

        const supplierResult =
          await submitOrderAfterPayment(
            paymentResult.orderId,
          );

        if (!supplierResult.success) {
          console.error(
            "Pagamento assíncrono confirmado, mas submissão ao fornecedor não concluída:",
            supplierResult,
          );
        }

        break;
      }

      case "payment_intent.succeeded": {
        const paymentResult =
          await markPaymentIntentPaid(
            event.data.object,
          );

        processedOrderId = paymentResult.orderId;
        processedPaymentId = paymentResult.paymentId;

        const supplierResult =
          await submitOrderAfterPayment(
            paymentResult.orderId,
          );

        if (!supplierResult.success) {
          console.error(
            "Payment Intent confirmado, mas submissão ao fornecedor não concluída:",
            supplierResult,
          );
        }

        break;
      }

      case "checkout.session.async_payment_failed": {
        const failureResult =
          await markCheckoutFailed({
            session: event.data.object,
            status: "failed",
          });

        processedOrderId = failureResult.orderId;
        processedPaymentId =
          failureResult.paymentId;

        break;
      }

      case "checkout.session.expired": {
        const failureResult =
          await markCheckoutFailed({
            session: event.data.object,
            status: "expired",
          });

        processedOrderId = failureResult.orderId;
        processedPaymentId =
          failureResult.paymentId;

        break;
      }

      case "payment_intent.payment_failed": {
        const failureResult =
          await markPaymentIntentFailed({
            paymentIntent: event.data.object,
            status: "failed",
          });

        processedOrderId = failureResult.orderId;
        processedPaymentId =
          failureResult.paymentId;

        break;
      }

      case "payment_intent.canceled": {
        const failureResult =
          await markPaymentIntentFailed({
            paymentIntent: event.data.object,
            status: "cancelled",
          });

        processedOrderId = failureResult.orderId;
        processedPaymentId =
          failureResult.paymentId;

        break;
      }

      default:
        break;
    }

    await markWebhookEventProcessed({
      webhookEventId,
      orderId: processedOrderId,
      paymentId: processedPaymentId,
      checkoutSessionId:
        getEventCheckoutSessionId(event),
      paymentIntentId:
        getEventPaymentIntentId(event),
    });

    return NextResponse.json({
      received: true,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Erro inesperado no webhook Stripe.";

    console.error("Erro no webhook Stripe:", error);

    if (webhookEventId) {
      await markWebhookEventFailed({
        webhookEventId,
        errorMessage,
        orderId: processedOrderId,
        paymentId: processedPaymentId,
      });
    }

    return NextResponse.json(
      {
        error: errorMessage,
      },
      {
        status: 500,
      },
    );
  }
}
