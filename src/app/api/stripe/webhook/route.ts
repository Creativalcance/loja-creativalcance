import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createStripeServerClient } from "@/lib/stripe/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

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

  return value ? value : null;
}

async function markCheckoutPaid(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const supabaseAdmin = createSupabaseAdminClient();

  const orderId =
    getMetadataValue(session.metadata, "orderId") ?? null;

  const cartId =
    getMetadataValue(session.metadata, "cartId") ?? null;

  const paymentIntentId = getPaymentIntentId(session);
  const completedAt = new Date().toISOString();

  if (!orderId) {
    throw new Error(
      `Checkout Session ${session.id} sem orderId na metadata.`,
    );
  }

  const amountReceived =
    typeof session.amount_total === "number"
      ? session.amount_total / 100
      : 0;

  const { error: orderError } = await supabaseAdmin
    .from("orders")
    .update({
      status: "paid",
      payment_status: "paid",
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      paid_at: completedAt,
      supplier_submission_status: "ready_for_review",
      metadata: {
        stripePaymentStatus: session.payment_status,
        stripeCheckoutStatus: session.status,
      },
    })
    .eq("id", orderId)
    .neq("payment_status", "paid");

  if (orderError) {
    throw new Error(orderError.message);
  }

  const { error: paymentError } = await supabaseAdmin
    .from("payments")
    .update({
      provider_payment_id: paymentIntentId,
      provider_payment_intent_id: paymentIntentId,
      status: "paid",
      paid_at: completedAt,
      amount_received: amountReceived,
      raw_payload: session as unknown as JsonRecord,
    })
    .eq("provider_checkout_session_id", session.id);

  if (paymentError) {
    throw new Error(paymentError.message);
  }

  const { error: checkoutSessionError } = await supabaseAdmin
    .from("checkout_sessions")
    .update({
      provider_payment_intent_id: paymentIntentId,
      status: "completed",
      completed_at: completedAt,
      raw_payload: session as unknown as JsonRecord,
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
      })
      .eq("id", cartId)
      .eq("status", "active");

    if (cartError) {
      throw new Error(cartError.message);
    }
  }
}

async function markCheckoutFailed(params: {
  session: Stripe.Checkout.Session;
  status: "failed" | "cancelled" | "expired";
}): Promise<void> {
  const supabaseAdmin = createSupabaseAdminClient();

  const orderId = getMetadataValue(
    params.session.metadata,
    "orderId",
  );

  const eventDate = new Date().toISOString();

  const checkoutUpdate: JsonRecord = {
    status: params.status,
    raw_payload: params.session as unknown as JsonRecord,
  };

  if (params.status === "expired") {
    checkoutUpdate.expired_at = eventDate;
  }

  if (params.status === "cancelled") {
    checkoutUpdate.cancelled_at = eventDate;
  }

  await supabaseAdmin
    .from("checkout_sessions")
    .update(checkoutUpdate)
    .eq("provider_session_id", params.session.id);

  const paymentUpdate: JsonRecord = {
    status:
      params.status === "cancelled" ? "cancelled" : "failed",
    raw_payload: params.session as unknown as JsonRecord,
  };

  if (params.status === "cancelled") {
    paymentUpdate.cancelled_at = eventDate;
  } else {
    paymentUpdate.failed_at = eventDate;
  }

  await supabaseAdmin
    .from("payments")
    .update(paymentUpdate)
    .eq("provider_checkout_session_id", params.session.id);

  if (orderId) {
    await supabaseAdmin
      .from("orders")
      .update({
        status:
          params.status === "cancelled" ? "cancelled" : "failed",
        payment_status:
          params.status === "cancelled" ? "cancelled" : "failed",
        cancelled_at:
          params.status === "cancelled" ? eventDate : null,
      })
      .eq("id", orderId)
      .neq("payment_status", "paid");
  }
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      {
        error: "STRIPE_WEBHOOK_SECRET não está configurada.",
      },
      {
        status: 500,
      },
    );
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      {
        error: "Cabeçalho Stripe-Signature em falta.",
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

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;

        if (session.payment_status === "paid") {
          await markCheckoutPaid(session);
        }

        break;
      }

      case "checkout.session.async_payment_succeeded": {
        await markCheckoutPaid(event.data.object);
        break;
      }

      case "checkout.session.async_payment_failed": {
        await markCheckoutFailed({
          session: event.data.object,
          status: "failed",
        });

        break;
      }

      case "checkout.session.expired": {
        await markCheckoutFailed({
          session: event.data.object,
          status: "expired",
        });

        break;
      }

      default:
        break;
    }

    return NextResponse.json({
      received: true,
    });
  } catch (error) {
    console.error("Erro no webhook Stripe:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro inesperado no webhook.",
      },
      {
        status: 500,
      },
    );
  }
}