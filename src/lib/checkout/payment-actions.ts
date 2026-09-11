"use server";

import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import Stripe from "stripe";
import { createStripeServerClient } from "@/lib/stripe/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteLocale, localizePath, SITE_LOCALES, type SiteLocale } from "@/lib/i18n/config";
import { getStrickerConfig } from "@/lib/stricker/config";
import {
  getCustomizationServiceCodeHints,
  resolveCustomizationServiceCode,
} from "@/lib/stricker/resolve-customization-service-code";

export type CheckoutPaymentActionState = {
  success: boolean;
  message: string;
};

type JsonRecord = Record<string, unknown>;

type CartItem = {
  id: string;
  product_id: string | null;
  variant_id: string | null;
  supplier_id: string | null;
  product_sku: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  personalization_unit_price: number;
  setup_cost: number;
  extras_total: number;
  subtotal: number;
  personalization_total: number;
  total: number;
  personalization_required: boolean;
  personalization_technique_id: string | null;
  personalization_notes: string | null;
  personalization_data: JsonRecord;
  customization_draft_id: string | null;
  customization_location_id: string | null;
  customization_component_name: string | null;
  customization_location_name: string | null;
  customization_technique_name: string | null;
  supplier_product_reference: string | null;
  supplier_sku: string | null;
  service_code: string | null;
  table_code: string | null;
  table_code_option: string | null;
  handling_cost_code: string | null;
  printing_area_label: string | null;
  printing_width_mm: number | null;
  printing_height_mm: number | null;
  printing_area_mm2: number | null;
  logo_file_name: string | null;
  logo_storage_path: string | null;
  logo_url: string | null;
  technical_preview_url: string | null;
  logo_position_x: number | null;
  logo_position_y: number | null;
  logo_scale: number | null;
  logo_rotation: number | null;
  logo_width_mm: number | null;
  logo_height_mm: number | null;
  logo_area: number | null;
  artwork_status: string;
  artwork_approved: boolean;
};

type ShippingAddress = {
  id: string;
  company_name: string | null;
  tax_id: string | null;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  address_line_1: string;
  address_line_2: string | null;
  postal_code: string;
  city: string;
  district: string | null;
  country_code: string;
};

type Cart = {
  id: string;
  user_id: string | null;
  status: string;
  checkout_step: string;
  currency: string;
  subtotal: number;
  personalization_total: number;
  setup_total: number;
  shipping_total: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  company_name: string | null;
  company_tax_id: string | null;
  customer_notes: string | null;
  shipping_address_id: string | null;
  shipping_method: string | null;
  shipping_method_name: string | null;
  shipping_provider: string | null;
  requested_delivery_date: string | null;
  internal_reference: string | null;
  metadata: JsonRecord;
  customer_addresses: ShippingAddress | null;
  cart_items: CartItem[] | null;
};

type CreatedOrder = {
  id: string;
  order_number: string;
};

type StripeLineItem = Stripe.Checkout.SessionCreateParams.LineItem;

function getRequiredString(formData: FormData, key: string): string {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    throw new Error(`Campo obrigatório em falta: ${key}`);
  }

  return value;
}

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

function toStripeAmount(value: number): number {
  return Math.round(roundMoney(value) * 100);
}

function normalizeText(value: string | null): string {
  return (
    value
      ?.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase() ?? ""
  );
}

function determinePortugueseTax(params: {
  address: ShippingAddress;
}): {
  rate: number;
  region: "continental" | "madeira" | "acores";
  label: string;
} {
  const searchableText = normalizeText(
    [
      params.address.district,
      params.address.city,
      params.address.address_line_1,
      params.address.address_line_2,
    ]
      .filter(Boolean)
      .join(" "),
  );

  const azoresTerms = [
    "acores",
    "ponta delgada",
    "angra do heroismo",
    "ribeira grande",
    "praia da vitoria",
    "horta",
    "sao miguel",
    "santa maria",
    "terceira",
    "graciosa",
    "sao jorge",
    "pico",
    "faial",
    "flores",
    "corvo",
  ];

  if (azoresTerms.some((term) => searchableText.includes(term))) {
    return {
      rate: 0.16,
      region: "acores",
      label: "Açores",
    };
  }

  const madeiraTerms = [
    "madeira",
    "funchal",
    "porto santo",
    "camara de lobos",
    "machico",
    "santa cruz",
    "ribeira brava",
    "calheta",
    "santana",
    "sao vicente",
    "ponta do sol",
  ];

  if (madeiraTerms.some((term) => searchableText.includes(term))) {
    return {
      rate: 0.22,
      region: "madeira",
      label: "Madeira",
    };
  }

  return {
    rate: 0.23,
    region: "continental",
    label: "Portugal Continental",
  };
}

function createOrderNumber(orderId: string): string {
  const now = new Date();

  const datePart = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
  ].join("");

  const referencePart = orderId
    .replace(/-/g, "")
    .slice(0, 8)
    .toUpperCase();

  return `LC-${datePart}-${referencePart}`;
}

function normalizeSiteUrl(value: string): string {
  const trimmedValue = value.trim().replace(/\/+$/, "");

  if (/^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  return `https://${trimmedValue}`;
}

function getSiteUrl(): string {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configuredSiteUrl) {
    const normalizedConfiguredUrl = normalizeSiteUrl(configuredSiteUrl);

    if (
      process.env.NODE_ENV === "production" &&
      /^http:\/\/localhost(?::\d+)?$/i.test(normalizedConfiguredUrl)
    ) {
      throw new Error(
        "NEXT_PUBLIC_SITE_URL não pode apontar para localhost em produção.",
      );
    }

    return normalizedConfiguredUrl;
  }

  const vercelProductionUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();

  if (vercelProductionUrl) {
    return normalizeSiteUrl(vercelProductionUrl);
  }

  const vercelDeploymentUrl = process.env.VERCEL_URL?.trim();

  if (vercelDeploymentUrl) {
    return normalizeSiteUrl(vercelDeploymentUrl);
  }

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  throw new Error(
    "Não foi possível determinar o endereço público da loja. Configura NEXT_PUBLIC_SITE_URL na Vercel.",
  );
}

function buildStripeLineItems(params: {
  cartItems: CartItem[];
  shippingTotal: number;
  taxTotal: number;
  currency: string;
  locale: SiteLocale;
}): StripeLineItem[] {
  const currency = params.currency.toLowerCase();
  const intlLocale = SITE_LOCALES[params.locale].intlLocale;
  const text = params.locale === "en"
    ? { units: "units", location: "Location", technique: "Technique", shipping: "Shipping", shippingDescription: "Order shipping", tax: "VAT", taxDescription: "Value added tax" }
    : params.locale === "fr"
      ? { units: "unités", location: "Emplacement", technique: "Technique", shipping: "Expédition", shippingDescription: "Transport de la commande", tax: "TVA", taxDescription: "Taxe sur la valeur ajoutée" }
      : { units: "unidades", location: "Local", technique: "Técnica", shipping: "Expedição", shippingDescription: "Transporte da encomenda", tax: "IVA", taxDescription: "Imposto sobre o valor acrescentado" };

  const lineItems: StripeLineItem[] = params.cartItems.map((item) => {
    const descriptionParts = [
      `${item.quantity.toLocaleString(intlLocale)} ${text.units}`,
      item.customization_location_name
        ? `${text.location}: ${item.customization_location_name}`
        : null,
      item.customization_technique_name
        ? `${text.technique}: ${item.customization_technique_name}`
        : null,
    ].filter((value): value is string => Boolean(value));

    return {
      quantity: 1,
      price_data: {
        currency,
        unit_amount: toStripeAmount(item.total),
        product_data: {
          name: item.product_name,
          description: descriptionParts.join(" · ").slice(0, 500),
          metadata: {
            cartItemId: item.id,
            productId: item.product_id ?? "",
            variantId: item.variant_id ?? "",
          },
        },
      },
    };
  });

  if (params.shippingTotal > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency,
        unit_amount: toStripeAmount(params.shippingTotal),
        product_data: {
          name: text.shipping,
          description: text.shippingDescription,
        },
      },
    });
  }

  if (params.taxTotal > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency,
        unit_amount: toStripeAmount(params.taxTotal),
        product_data: {
          name: text.tax,
          description: text.taxDescription,
        },
      },
    });
  }

  return lineItems;
}

export async function createPaymentCheckoutSessionAction(
  _previousState: CheckoutPaymentActionState,
  formData: FormData,
): Promise<CheckoutPaymentActionState> {
  const locale = getSiteLocale(String(formData.get("locale") ?? "pt"));
  let checkoutUrl: string | null = null;

  try {
    const cartId = getRequiredString(formData, "cartId");

    const termsAccepted =
      String(formData.get("termsAccepted") ?? "") === "true";

    if (!termsAccepted) {
      return {
        success: false,
        message:
          "Confirma que leste e aceitas os termos e condições da encomenda.",
      };
    }

    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect(localizePath("/login", locale));
    }

    const supabaseAdmin = createSupabaseAdminClient();

    const { data: cartData, error: cartError } = await supabaseAdmin
      .from("carts")
      .select(
        `
          id,
          user_id,
          status,
          checkout_step,
          currency,
          subtotal,
          personalization_total,
          setup_total,
          shipping_total,
          discount_total,
          tax_total,
          grand_total,
          customer_name,
          customer_email,
          customer_phone,
          company_name,
          company_tax_id,
          customer_notes,
          shipping_address_id,
          shipping_method,
          shipping_method_name,
          shipping_provider,
          requested_delivery_date,
          internal_reference,
          metadata,
          customer_addresses!carts_shipping_address_id_fkey (
            id,
            company_name,
            tax_id,
            contact_name,
            contact_email,
            contact_phone,
            address_line_1,
            address_line_2,
            postal_code,
            city,
            district,
            country_code
          ),
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
            extras_total,
            subtotal,
            personalization_total,
            total,
            personalization_required,
            personalization_technique_id,
            personalization_notes,
            personalization_data,
            customization_draft_id,
            customization_location_id,
            customization_component_name,
            customization_location_name,
            customization_technique_name,
            supplier_product_reference,
            supplier_sku,
            service_code,
            table_code,
            table_code_option,
            handling_cost_code,
            printing_area_label,
            printing_width_mm,
            printing_height_mm,
            printing_area_mm2,
            logo_file_name,
            logo_storage_path,
            logo_url,
            technical_preview_url,
            logo_position_x,
            logo_position_y,
            logo_scale,
            logo_rotation,
            logo_width_mm,
            logo_height_mm,
            logo_area,
            artwork_status,
            artwork_approved
          )
        `,
      )
      .eq("id", cartId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (cartError || !cartData) {
      return {
        success: false,
        message:
          "O carrinho não foi encontrado ou já não está disponível.",
      };
    }

    const cart = cartData as unknown as Cart;
    let cartItems = cart.cart_items ?? [];
    const shippingAddress = cart.customer_addresses;

    if (cartItems.length === 0) {
      return {
        success: false,
        message: "O carrinho está vazio.",
      };
    }

    const productIds = Array.from(
      new Set(
        cartItems
          .map((item) => item.product_id)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    if (cartItems.some((item) => !item.product_id)) {
      return {
        success: false,
        message:
          "O carrinho contém artigos inválidos. Remove-os antes de continuar.",
      };
    }

    const { data: purchasableProducts, error: availabilityError } =
      await supabaseAdmin
        .from("products")
        .select("id")
        .in("id", productIds)
        .eq("status", "active")
        .eq("is_active", true)
        .eq("is_purchasable", true);

    if (availabilityError) {
      return {
        success: false,
        message:
          "Não foi possível confirmar a disponibilidade dos artigos.",
      };
    }

    const purchasableProductIds = new Set(
      (purchasableProducts ?? []).map((product) => product.id),
    );

    const unavailableItem = cartItems.find(
      (item) =>
        !item.product_id || !purchasableProductIds.has(item.product_id),
    );

    if (unavailableItem) {
      return {
        success: false,
        message: `${unavailableItem.product_name} deixou de estar disponível. Remove este artigo do carrinho antes de continuar.`,
      };
    }

    const personalizedItems = cartItems.filter(
      (item) => item.personalization_required,
    );

    if (personalizedItems.length > 0) {
      const resolvedServiceCodes = new Map<string, string>();

      for (const item of personalizedItems) {
        if (!item.product_id) {
          return {
            success: false,
            message: `A personalização de ${item.product_name} não está associada a um produto válido.`,
          };
        }

        const resolutionHints = getCustomizationServiceCodeHints(
          item.personalization_data,
        );
        const resolvedServiceCode = await resolveCustomizationServiceCode({
          supabaseAdmin,
          productId: item.product_id,
          variantId: item.variant_id,
          locationId: item.customization_location_id,
          locationName: item.customization_location_name,
          techniqueName: item.customization_technique_name,
          tableCode: item.table_code,
          tableCodeOption: item.table_code_option,
          priceTableId: resolutionHints.priceTableId,
          selectedColorCount: resolutionHints.selectedColorCount,
          currentServiceCode: item.service_code,
        });

        if (!resolvedServiceCode) {
          return {
            success: false,
            message: `A personalização de ${item.product_name} ainda não possui uma correspondência inequívoca com uma opção ativa do fornecedor. Seleciona novamente a área e a técnica antes de efetuar o pagamento.`,
          };
        }

        resolvedServiceCodes.set(item.id, resolvedServiceCode);
      }

      for (const [cartItemId, serviceCode] of resolvedServiceCodes) {
        const { error: updateServiceCodeError } = await supabaseAdmin
          .from("cart_items")
          .update({ service_code: serviceCode })
          .eq("id", cartItemId)
          .eq("cart_id", cart.id);

        if (updateServiceCodeError) {
          return {
            success: false,
            message:
              "Não foi possível validar a personalização antes do pagamento. Tenta novamente.",
          };
        }
      }

      cartItems = cartItems.map((item) => ({
        ...item,
        service_code:
          resolvedServiceCodes.get(item.id) ?? item.service_code,
      }));
    }

    if (!shippingAddress || !cart.shipping_address_id) {
      return {
        success: false,
        message: "Confirma primeiro a morada de entrega.",
      };
    }

    if (!cart.shipping_method) {
      return {
        success: false,
        message: "Confirma primeiro o método de expedição.",
      };
    }

    if (!cart.customer_name || !cart.customer_email) {
      return {
        success: false,
        message: "Os dados do cliente estão incompletos.",
      };
    }

    const productsTotal = roundMoney(
      cartItems.reduce(
        (total, item) => total + Number(item.subtotal ?? 0),
        0,
      ),
    );

    const personalizationTotal = roundMoney(
      cartItems.reduce(
        (total, item) =>
          total + Number(item.personalization_total ?? 0),
        0,
      ),
    );

    const setupTotal = roundMoney(
      cartItems.reduce(
        (total, item) =>
          total +
          Number(item.setup_cost ?? 0) +
          Number(item.extras_total ?? 0),
        0,
      ),
    );

    const shippingTotal = roundMoney(
      Number(cart.shipping_total ?? 0),
    );

    const discountTotal = roundMoney(
      Number(cart.discount_total ?? 0),
    );

    const taxableTotal = roundMoney(
      Math.max(
        0,
        productsTotal +
          personalizationTotal +
          setupTotal +
          shippingTotal -
          discountTotal,
      ),
    );

    const tax = determinePortugueseTax({
      address: shippingAddress,
    });

    const taxTotal = roundMoney(taxableTotal * tax.rate);
    const grandTotal = roundMoney(taxableTotal + taxTotal);

    if (grandTotal <= 0) {
      return {
        success: false,
        message: "O valor final da encomenda não é válido.",
      };
    }

    const orderId = crypto.randomUUID();
    const orderNumber = createOrderNumber(orderId);
    const strickerOrderTestMode = getStrickerConfig().orderTestMode;
    const orderItemsPayload = cartItems.map((item) => ({
      source_cart_item_id: item.id,
      product_id: item.product_id,
      variant_id: item.variant_id,
      supplier_id: item.supplier_id,
      product_sku: item.product_sku,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      personalization_unit_price: item.personalization_unit_price,
      setup_cost: item.setup_cost,
      extras_total: item.extras_total,
      subtotal: item.subtotal,
      personalization_total: item.personalization_total,
      total: item.total,
      personalization_required: item.personalization_required,
      personalization_technique_id:
        item.personalization_technique_id,
      personalization_notes: item.personalization_notes,
      personalization_data: item.personalization_data ?? {},
      supplier_payload: {},
      customization_draft_id: item.customization_draft_id,
      customization_location_id: item.customization_location_id,
      customization_component_name:
        item.customization_component_name,
      customization_location_name:
        item.customization_location_name,
      customization_technique_name:
        item.customization_technique_name,
      supplier_product_reference:
        item.supplier_product_reference,
      supplier_sku: item.supplier_sku,
      service_code: item.service_code,
      table_code: item.table_code,
      table_code_option: item.table_code_option,
      handling_cost_code: item.handling_cost_code,
      printing_area_label: item.printing_area_label,
      printing_width_mm: item.printing_width_mm,
      printing_height_mm: item.printing_height_mm,
      printing_area_mm2: item.printing_area_mm2,
      logo_file_name: item.logo_file_name,
      logo_storage_path: item.logo_storage_path,
      logo_url: item.logo_url,
      technical_preview_url: item.technical_preview_url,
      logo_position_x: item.logo_position_x,
      logo_position_y: item.logo_position_y,
      logo_scale: item.logo_scale,
      logo_rotation: item.logo_rotation,
      logo_width_mm: item.logo_width_mm,
      logo_height_mm: item.logo_height_mm,
      logo_area: item.logo_area,
      artwork_status: item.artwork_status,
      artwork_approved: item.artwork_approved,
      supplier_submission_status: "not_submitted",
    }));

    const orderPayload = {
      id: orderId,
      user_id: user.id,
      order_number: orderNumber,
      customer_email: cart.customer_email,
      customer_name: cart.customer_name,
      customer_phone: cart.customer_phone,
      company_name: cart.company_name,
      company_tax_id: cart.company_tax_id,
      currency: cart.currency,
      subtotal: productsTotal,
      personalization_total: personalizationTotal,
      setup_total: setupTotal,
      shipping_total: shippingTotal,
      discount_total: discountTotal,
      tax_total: taxTotal,
      grand_total: grandTotal,
      shipping_address_id: cart.shipping_address_id,
      customer_notes: cart.customer_notes,
      source_cart_id: cart.id,
      invoice_status: "pending",
      supplier_test_mode: strickerOrderTestMode,
      shipping_method: cart.shipping_method_name,
      shipping_carrier: cart.shipping_provider,
      requested_shipping_date: cart.requested_delivery_date,
      no_shipping: cart.shipping_method !== "store_transport",
      internal_reference: cart.internal_reference,
      metadata: {
        source: "checkout",
        cartId: cart.id,
        taxRate: tax.rate,
        taxRegion: tax.region,
        taxRegionLabel: tax.label,
      },
    };

    const { data: preparedOrderData, error: prepareOrderError } =
      await supabaseAdmin.rpc("prepare_checkout_order", {
        p_cart_id: cart.id,
        p_user_id: user.id,
        p_cart: {
          subtotal: productsTotal,
          personalization_total: personalizationTotal,
          setup_total: setupTotal,
          shipping_total: shippingTotal,
          discount_total: discountTotal,
          tax_rate: tax.rate,
          tax_region: tax.region,
          tax_total: taxTotal,
          grand_total: grandTotal,
        },
        p_order: orderPayload,
        p_items: orderItemsPayload,
      });

    const order = Array.isArray(preparedOrderData)
      ? (preparedOrderData[0] as CreatedOrder | undefined)
      : undefined;

    if (prepareOrderError || !order) {
      return {
        success: false,
        message:
          prepareOrderError?.message === "checkout_order_already_paid"
            ? "Esta encomenda já se encontra paga."
            : prepareOrderError?.message ??
              "Não foi possível preparar a encomenda.",
      };
    }

    const stripe = createStripeServerClient();
    const siteUrl = getSiteUrl();

    const lineItems = buildStripeLineItems({
      cartItems,
      shippingTotal,
      taxTotal,
      currency: cart.currency,
      locale,
    });

    const commonMetadata = {
      orderId: order.id,
      orderNumber: order.order_number,
      cartId: cart.id,
      userId: user.id,
    };

    const stripeIdempotencyKey = `checkout:${order.id}:${createHash("sha256")
      .update(JSON.stringify(lineItems))
      .digest("hex")
      .slice(0, 32)}`;

    const checkoutSession = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        customer_email: cart.customer_email,
        line_items: lineItems,
        success_url:
          `${siteUrl}${localizePath("/checkout/sucesso", locale)}` +
          "?session_id={CHECKOUT_SESSION_ID}",
        cancel_url:
          `${siteUrl}${localizePath("/checkout/cancelado", locale)}` +
          `?order_id=${encodeURIComponent(order.id)}`,
        locale,
        billing_address_collection: "auto",
        phone_number_collection: {
          enabled: true,
        },
        metadata: commonMetadata,
        payment_intent_data: {
          metadata: commonMetadata,
        },
      },
      {
        idempotencyKey: stripeIdempotencyKey,
      },
    );

    if (!checkoutSession.url) {
      return {
        success: false,
        message:
          "A Stripe não devolveu um endereço válido para pagamento.",
      };
    }

    const paymentIntentId =
      typeof checkoutSession.payment_intent === "string"
        ? checkoutSession.payment_intent
        : checkoutSession.payment_intent?.id ?? null;

    const paymentPayload = {
      order_id: order.id,
      provider: "stripe",
      provider_payment_id: paymentIntentId,
      provider_checkout_session_id: checkoutSession.id,
      provider_payment_intent_id: paymentIntentId,
      status: "pending",
      amount: grandTotal,
      amount_received: 0,
      amount_refunded: 0,
      currency: cart.currency,
      raw_payload:
        checkoutSession as unknown as Record<string, unknown>,
      metadata: commonMetadata,
    };

    const checkoutSessionPayload = {
      cart_id: cart.id,
      order_id: order.id,
      user_id: user.id,
      provider: "stripe",
      provider_session_id: checkoutSession.id,
      provider_payment_intent_id: paymentIntentId,
      status: "open",
      amount_total: grandTotal,
      currency: cart.currency,
      checkout_url: checkoutSession.url,
      expires_at: checkoutSession.expires_at
        ? new Date(checkoutSession.expires_at * 1000).toISOString()
        : null,
      raw_payload:
        checkoutSession as unknown as Record<string, unknown>,
      metadata: commonMetadata,
    };

    const { error: recordPaymentError } = await supabaseAdmin.rpc(
      "record_checkout_payment",
      {
        p_order_id: order.id,
        p_cart_id: cart.id,
        p_user_id: user.id,
        p_payment: paymentPayload,
        p_checkout_session: checkoutSessionPayload,
      },
    );

    if (recordPaymentError) {
      return {
        success: false,
        message:
          recordPaymentError.message ??
          "Não foi possível guardar os dados do pagamento.",
      };
    }

    checkoutUrl = checkoutSession.url;
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? `Erro ao iniciar o pagamento: ${error.message}`
          : "Ocorreu um erro inesperado ao iniciar o pagamento.",
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
