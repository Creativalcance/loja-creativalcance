"use server";

import { redirect } from "next/navigation";
import Stripe from "stripe";
import { createStripeServerClient } from "@/lib/stripe/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStrickerConfig } from "@/lib/stricker/config";

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

type ExistingOrder = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  stripe_checkout_session_id: string | null;
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

function isSupplierServiceCode(value: string | null): value is string {
  return Boolean(
    value && /^\d+\.\d+\.\d+\.[A-Za-z0-9-]+$/.test(value.trim()),
  );
}

function locationNamesMatch(left: string | null, right: string | null): boolean {
  const normalizedLeft = normalizeText(left);
  const normalizedRight = normalizeText(right);

  if (normalizedLeft === normalizedRight) {
    return true;
  }

  const aliases: Record<string, string[]> = {
    costas: ["back"],
    back: ["costas"],
    peito: ["chest"],
    chest: ["peito"],
    frente: ["front"],
    front: ["frente"],
    manga: ["sleeve"],
    sleeve: ["manga"],
  };

  return (aliases[normalizedLeft] ?? []).includes(normalizedRight);
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
}): StripeLineItem[] {
  const currency = params.currency.toLowerCase();

  const lineItems: StripeLineItem[] = params.cartItems.map((item) => {
    const descriptionParts = [
      `${item.quantity.toLocaleString("pt-PT")} unidades`,
      item.customization_location_name
        ? `Local: ${item.customization_location_name}`
        : null,
      item.customization_technique_name
        ? `Técnica: ${item.customization_technique_name}`
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
          name: "Expedição",
          description: "Transporte da encomenda",
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
          name: "IVA",
          description: "Imposto sobre o valor acrescentado",
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
      redirect("/login");
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

    const personalizedItemsNeedingServiceCode = cartItems.filter(
      (item) =>
        item.personalization_required &&
        !isSupplierServiceCode(item.service_code),
    );

    if (personalizedItemsNeedingServiceCode.length > 0) {
      const variantIds = Array.from(
        new Set(
          personalizedItemsNeedingServiceCode
            .map((item) => item.variant_id)
            .filter((value): value is string => Boolean(value)),
        ),
      );
      const tableCodeOptions = Array.from(
        new Set(
          personalizedItemsNeedingServiceCode
            .map((item) => item.table_code_option)
            .filter((value): value is string => Boolean(value)),
        ),
      );

      if (variantIds.length === 0 || tableCodeOptions.length === 0) {
        const invalidItem = personalizedItemsNeedingServiceCode[0];
        return {
          success: false,
          message: `A personalização de ${invalidItem.product_name} ainda não está pronta para submissão automática ao fornecedor. Seleciona novamente a personalização antes de efetuar o pagamento.`,
        };
      }

      const { data: supplierOptions, error: supplierOptionsError } =
        await supabaseAdmin
          .from("product_customization_options")
          .select(
            "variant_id,service_code,table_code_option,location_name,is_active",
          )
          .in("variant_id", variantIds)
          .in("table_code_option", tableCodeOptions)
          .eq("is_active", true);

      if (supplierOptionsError) {
        return {
          success: false,
          message:
            "Não foi possível validar a personalização junto dos dados do fornecedor. Tenta novamente dentro de alguns instantes.",
        };
      }

      const resolvedServiceCodes = new Map<string, string>();

      for (const item of personalizedItemsNeedingServiceCode) {
        const candidates = (supplierOptions ?? []).filter(
          (option) =>
            option.variant_id === item.variant_id &&
            option.table_code_option === item.table_code_option &&
            isSupplierServiceCode(option.service_code),
        );
        const locationCandidates = candidates.filter((option) =>
          locationNamesMatch(
            option.location_name,
            item.customization_location_name,
          ),
        );
        const selected =
          locationCandidates.length === 1
            ? locationCandidates[0]
            : candidates.length === 1
              ? candidates[0]
              : null;

        if (!selected?.service_code) {
          return {
            success: false,
            message: `A personalização de ${item.product_name} ainda não possui um código de serviço válido do fornecedor. O pagamento foi bloqueado para evitar uma encomenda paga que não possa ser submetida automaticamente.`,
          };
        }

        resolvedServiceCodes.set(item.id, selected.service_code);
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

    const { error: cartUpdateError } = await supabaseAdmin
      .from("carts")
      .update({
        subtotal: productsTotal,
        personalization_total: personalizationTotal,
        setup_total: setupTotal,
        shipping_total: shippingTotal,
        discount_total: discountTotal,
        tax_rate: tax.rate,
        tax_region: tax.region,
        tax_total: taxTotal,
        grand_total: grandTotal,
        checkout_step: "payment",
        payment_started_at: new Date().toISOString(),
      })
      .eq("id", cart.id)
      .eq("status", "active");

    if (cartUpdateError) {
      return {
        success: false,
        message:
          cartUpdateError.message ??
          "Não foi possível atualizar os totais do carrinho.",
      };
    }

    const { data: existingOrderData } = await supabaseAdmin
      .from("orders")
      .select(
        `
          id,
          order_number,
          status,
          payment_status,
          stripe_checkout_session_id
        `,
      )
      .eq("source_cart_id", cart.id)
      .maybeSingle<ExistingOrder>();

    let order: CreatedOrder;
    const strickerOrderTestMode = getStrickerConfig().orderTestMode;

    if (existingOrderData) {
      if (existingOrderData.payment_status === "paid") {
        return {
          success: false,
          message: "Esta encomenda já se encontra paga.",
        };
      }

      const { data: updatedOrder, error: updateOrderError } =
        await supabaseAdmin
          .from("orders")
          .update({
            user_id: user.id,
            customer_email: cart.customer_email,
            customer_name: cart.customer_name,
            customer_phone: cart.customer_phone,
            company_name: cart.company_name,
            company_tax_id: cart.company_tax_id,
            status: "pending_payment",
            payment_status: "pending",
            fulfillment_status: "unfulfilled",
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
            supplier_submission_status: "not_submitted",
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
          })
          .eq("id", existingOrderData.id)
          .select("id, order_number")
          .single<CreatedOrder>();

      if (updateOrderError || !updatedOrder) {
        return {
          success: false,
          message:
            updateOrderError?.message ??
            "Não foi possível atualizar a encomenda.",
        };
      }

      order = updatedOrder;

      const { error: deleteItemsError } = await supabaseAdmin
        .from("order_items")
        .delete()
        .eq("order_id", order.id);

      if (deleteItemsError) {
        return {
          success: false,
          message:
            "Não foi possível atualizar as linhas da encomenda.",
        };
      }
    } else {
      const orderId = crypto.randomUUID();
      const orderNumber = createOrderNumber(orderId);

      const { data: createdOrder, error: createOrderError } =
        await supabaseAdmin
          .from("orders")
          .insert({
            id: orderId,
            user_id: user.id,
            order_number: orderNumber,
            customer_email: cart.customer_email,
            customer_name: cart.customer_name,
            customer_phone: cart.customer_phone,
            company_name: cart.company_name,
            company_tax_id: cart.company_tax_id,
            status: "pending_payment",
            payment_status: "pending",
            fulfillment_status: "unfulfilled",
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
            supplier_submission_status: "not_submitted",
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
          })
          .select("id, order_number")
          .single<CreatedOrder>();

      if (createOrderError || !createdOrder) {
        return {
          success: false,
          message:
            createOrderError?.message ??
            "Não foi possível criar a encomenda.",
        };
      }

      order = createdOrder;
    }

    const orderItemsPayload = cartItems.map((item) => ({
      order_id: order.id,
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
    const siteUrl = getSiteUrl();

    const lineItems = buildStripeLineItems({
      cartItems,
      shippingTotal,
      taxTotal,
      currency: cart.currency,
    });

    const commonMetadata = {
      orderId: order.id,
      orderNumber: order.order_number,
      cartId: cart.id,
      userId: user.id,
    };

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: cart.customer_email,
      line_items: lineItems,
      success_url:
        `${siteUrl}/checkout/sucesso` +
        "?session_id={CHECKOUT_SESSION_ID}",
      cancel_url:
        `${siteUrl}/checkout/cancelado` +
        `?order_id=${encodeURIComponent(order.id)}`,
      locale: "pt",
      billing_address_collection: "auto",
      phone_number_collection: {
        enabled: true,
      },
      metadata: commonMetadata,
      payment_intent_data: {
        metadata: commonMetadata,
      },
    });

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

    const { error: paymentError } = await supabaseAdmin
      .from("payments")
      .insert({
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
      });

    if (paymentError) {
      return {
        success: false,
        message:
          paymentError.message ??
          "Não foi possível preparar o registo do pagamento.",
      };
    }

    const { error: checkoutSessionError } = await supabaseAdmin
      .from("checkout_sessions")
      .insert({
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
          ? new Date(
              checkoutSession.expires_at * 1000,
            ).toISOString()
          : null,
        raw_payload:
          checkoutSession as unknown as Record<string, unknown>,
        metadata: commonMetadata,
      });

    if (checkoutSessionError) {
      return {
        success: false,
        message:
          checkoutSessionError.message ??
          "Não foi possível guardar a sessão de pagamento.",
      };
    }

    const { error: orderStripeUpdateError } = await supabaseAdmin
      .from("orders")
      .update({
        stripe_checkout_session_id: checkoutSession.id,
        stripe_payment_intent_id: paymentIntentId,
      })
      .eq("id", order.id);

    if (orderStripeUpdateError) {
      return {
        success: false,
        message:
          orderStripeUpdateError.message ??
          "Não foi possível associar o pagamento à encomenda.",
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
