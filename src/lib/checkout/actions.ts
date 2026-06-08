"use server";

import { redirect } from "next/navigation";
import { createStripeServerClient } from "@/lib/stripe/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CheckoutActionState = {
  success: boolean;
  message: string;
};

type CartItem = {
  id: string;
  product_id: string;
  variant_id: string | null;
  supplier_id: string | null;
  product_sku: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  personalization_unit_price: number;
  setup_cost: number;
  subtotal: number;
  personalization_total: number;
  total: number;
  personalization_required: boolean;
  personalization_technique_id: string | null;
  personalization_notes: string | null;
  personalization_data: Record<string, unknown>;
};

type Cart = {
  id: string;
  user_id: string | null;
  subtotal: number;
  personalization_total: number;
  setup_total: number;
  shipping_total: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  currency: string;
  cart_items: CartItem[] | null;
};

function getRequiredString(formData: FormData, key: string): string {
  const value = String(formData.get(key) || "").trim();

  if (!value) {
    throw new Error(`Campo obrigatório em falta: ${key}`);
  }

  return value;
}

function getOptionalString(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) || "").trim();

  return value.length > 0 ? value : null;
}

function toStripeAmount(value: number): number {
  return Math.round(value * 100);
}

export async function createCheckoutSessionAction(
  _previousState: CheckoutActionState,
  formData: FormData,
): Promise<CheckoutActionState> {
  let checkoutUrl: string | null = null;

  try {
    const cartId = getRequiredString(formData, "cartId");
    const customerName = getRequiredString(formData, "customerName");
    const customerEmail = getRequiredString(formData, "customerEmail");
    const customerPhone = getOptionalString(formData, "customerPhone");
    const companyName = getOptionalString(formData, "companyName");
    const companyTaxId = getOptionalString(formData, "companyTaxId");
    const customerNotes = getOptionalString(formData, "customerNotes");

    const shippingAddressLine1 = getRequiredString(
      formData,
      "shippingAddressLine1",
    );
    const shippingPostalCode = getRequiredString(
      formData,
      "shippingPostalCode",
    );
    const shippingCity = getRequiredString(formData, "shippingCity");

    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const supabaseAdmin = createSupabaseAdminClient();

    const { data: cart, error: cartError } = await supabaseAdmin
      .from("carts")
      .select(
        `
          id,
          user_id,
          subtotal,
          personalization_total,
          setup_total,
          shipping_total,
          discount_total,
          tax_total,
          grand_total,
          currency,
          cart_items (
            id,
            product_id,
            variant_id,
            supplier_id,
            product_sku,
            product_name,
            quantity,
            unit_price,
            personalization_unit_price,
            setup_cost,
            subtotal,
            personalization_total,
            total,
            personalization_required,
            personalization_technique_id,
            personalization_notes,
            personalization_data
          )
        `,
      )
      .eq("id", cartId)
      .eq("status", "active")
      .eq("user_id", user.id)
      .maybeSingle<Cart>();

    if (cartError || !cart) {
      return {
        success: false,
        message: "Carrinho não encontrado.",
      };
    }

    const cartItems = cart.cart_items ?? [];

    if (cartItems.length === 0) {
      return {
        success: false,
        message: "O carrinho está vazio.",
      };
    }

    const { data: shippingAddress, error: shippingAddressError } =
      await supabaseAdmin
        .from("customer_addresses")
        .insert({
          user_id: user.id,
          address_type: "shipping",
          company_name: companyName,
          tax_id: companyTaxId,
          contact_name: customerName,
          contact_email: customerEmail,
          contact_phone: customerPhone,
          address_line_1: shippingAddressLine1,
          postal_code: shippingPostalCode,
          city: shippingCity,
          country_code: "PT",
        })
        .select("id")
        .single<{ id: string }>();

    if (shippingAddressError || !shippingAddress) {
      return {
        success: false,
        message:
          shippingAddressError?.message ??
          "Não foi possível guardar a morada de entrega.",
      };
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: user.id,
        order_number: "",
        customer_email: customerEmail,
        customer_name: customerName,
        customer_phone: customerPhone,
        company_name: companyName,
        company_tax_id: companyTaxId,
        status: "pending_payment",
        payment_status: "pending",
        fulfillment_status: "unfulfilled",
        currency: cart.currency,
        subtotal: cart.subtotal,
        personalization_total: cart.personalization_total,
        setup_total: cart.setup_total,
        shipping_total: cart.shipping_total,
        discount_total: cart.discount_total,
        tax_total: cart.tax_total,
        grand_total: cart.grand_total,
        shipping_address_id: shippingAddress.id,
        customer_notes: customerNotes,
        metadata: {
          source: "checkout",
          cartId: cart.id,
        },
      })
      .select("id, order_number")
      .single<{ id: string; order_number: string }>();

    if (orderError || !order) {
      return {
        success: false,
        message: orderError?.message ?? "Não foi possível criar a encomenda.",
      };
    }

    const orderItemsPayload = cartItems.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      variant_id: item.variant_id,
      supplier_id: item.supplier_id,
      product_sku: item.product_sku,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      personalization_unit_price: item.personalization_unit_price,
      setup_cost: item.setup_cost,
      subtotal: item.subtotal,
      personalization_total: item.personalization_total,
      total: item.total,
      personalization_required: item.personalization_required,
      personalization_technique_id: item.personalization_technique_id,
      personalization_notes: item.personalization_notes,
      personalization_data: item.personalization_data,
    }));

    const { error: orderItemsError } = await supabaseAdmin
      .from("order_items")
      .insert(orderItemsPayload);

    if (orderItemsError) {
      return {
        success: false,
        message: orderItemsError.message,
      };
    }

    const stripe = createStripeServerClient();

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
      "http://localhost:3000";

    const lineItems = cartItems.map((item) => ({
      quantity: 1,
      price_data: {
        currency: cart.currency.toLowerCase(),
        product_data: {
          name: `${item.product_name} — ${item.quantity.toLocaleString(
            "pt-PT",
          )} un.`,
          description: item.product_sku,
        },
        unit_amount: toStripeAmount(item.total),
      },
    }));

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: customerEmail,
      line_items: lineItems,
      success_url: `${siteUrl}/checkout/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout/cancelado?order_id=${order.id}`,
      metadata: {
        orderId: order.id,
        orderNumber: order.order_number,
        cartId: cart.id,
        userId: user.id,
      },
    });

    if (!checkoutSession.url) {
      return {
        success: false,
        message: "Não foi possível criar o checkout Stripe.",
      };
    }

    await supabaseAdmin.from("payments").insert({
      order_id: order.id,
      provider: "stripe",
      provider_checkout_session_id: checkoutSession.id,
      status: "pending",
      amount: cart.grand_total,
      currency: cart.currency,
      raw_payload: checkoutSession as unknown as Record<string, unknown>,
    });

    await supabaseAdmin.from("checkout_sessions").insert({
      cart_id: cart.id,
      order_id: order.id,
      user_id: user.id,
      provider: "stripe",
      provider_session_id: checkoutSession.id,
      status: "open",
      amount_total: cart.grand_total,
      currency: cart.currency,
      checkout_url: checkoutSession.url,
      raw_payload: checkoutSession as unknown as Record<string, unknown>,
    });

    await supabaseAdmin
      .from("orders")
      .update({
        stripe_checkout_session_id: checkoutSession.id,
      })
      .eq("id", order.id);

    checkoutUrl = checkoutSession.url;
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? `Erro técnico no checkout: ${error.message}`
          : "Erro técnico inesperado no checkout.",
    };
  }

  if (checkoutUrl) {
    redirect(checkoutUrl);
  }

  return {
    success: false,
    message: "Não foi possível iniciar o pagamento.",
  };
}