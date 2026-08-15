"use server";

import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CheckoutShippingActionState = {
  success: boolean;
  message: string;
};

type ShippingMethod = "store_transport";

type CartRecord = {
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
  shipping_address_id: string | null;
  metadata: Record<string, unknown> | null;
};

type ShippingCalculation = {
  method: ShippingMethod;
  methodName: string;
  provider: string | null;
  originCountryCode: string | null;
  estimatedDaysMin: number | null;
  estimatedDaysMax: number | null;
  shippingTotal: number;
};

const ALLOWED_SHIPPING_METHODS = new Set<ShippingMethod>([
  "store_transport",
]);

function getRequiredString(formData: FormData, key: string): string {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    throw new Error(`Campo obrigatório em falta: ${key}`);
  }

  return value;
}

function getOptionalString(
  formData: FormData,
  key: string,
): string | null {
  const value = String(formData.get(key) ?? "").trim();

  return value.length > 0 ? value : null;
}

function getBoolean(formData: FormData, key: string): boolean {
  return String(formData.get(key) ?? "") === "true";
}

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

function parseShippingMethod(value: string): ShippingMethod | null {
  if (!ALLOWED_SHIPPING_METHODS.has(value as ShippingMethod)) {
    return null;
  }

  return value as ShippingMethod;
}

function parseOptionalDate(value: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const parsedDate = new Date(`${value}T12:00:00Z`);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return value;
}

function getMinimumDeliveryDate(): string {
  const todayParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = Number(
    todayParts.find((part) => part.type === "year")?.value,
  );
  const month = Number(
    todayParts.find((part) => part.type === "month")?.value,
  );
  const day = Number(
    todayParts.find((part) => part.type === "day")?.value,
  );

  const date = new Date(Date.UTC(year, month - 1, day, 12));
  let businessDaysAdded = 0;

  while (businessDaysAdded < 2) {
    date.setUTCDate(date.getUTCDate() + 1);

    const weekDay = date.getUTCDay();

    if (weekDay !== 0 && weekDay !== 6) {
      businessDaysAdded += 1;
    }
  }

  return date.toISOString().slice(0, 10);
}

function getMetadataRecord(
  value: Record<string, unknown> | null,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value;
}

function calculateShipping(params: {
  method: ShippingMethod;
  merchandiseTotal: number;
}): ShippingCalculation {
  /*
   * Valor provisório até a integração definitiva com as tabelas
   * de transporte do fornecedor ou com uma transportadora.
   *
   * A regra fica centralizada nesta função para poder ser
   * substituída sem alterar o formulário ou o checkout.
   */
  const shippingTotal =
    params.merchandiseTotal >= 500
      ? 0
      : params.merchandiseTotal >= 250
        ? 5.9
        : 8.9;

  return {
    method: "store_transport",
    methodName: "Transporte disponibilizado pela loja",
    provider: "A definir",
    originCountryCode: "PT",
    estimatedDaysMin: 1,
    estimatedDaysMax: 3,
    shippingTotal,
  };
}

export async function saveCheckoutShippingAction(
  _previousState: CheckoutShippingActionState,
  formData: FormData,
): Promise<CheckoutShippingActionState> {
  let redirectUrl: string | null = null;

  try {
    const cartId = getRequiredString(formData, "cartId");

    const requestedShippingMethod = parseShippingMethod(
      getRequiredString(formData, "shippingMethod"),
    );

    const requestedDeliveryDate = parseOptionalDate(
      getOptionalString(formData, "requestedDeliveryDate"),
    );

    const acceptsDeliveryAfterDate = getBoolean(
      formData,
      "acceptsDeliveryAfterDate",
    );

    const internalReference = getOptionalString(
      formData,
      "internalReference",
    );

    const shippingNotes = getOptionalString(
      formData,
      "shippingNotes",
    );

    if (!requestedShippingMethod) {
      return {
        success: false,
        message: "Seleciona um método de expedição válido.",
      };
    }

    if (
      requestedShippingMethod === "store_transport" &&
      !requestedDeliveryDate
    ) {
      return {
        success: false,
        message: "Indica uma data pretendida de entrega.",
      };
    }

    const minimumDeliveryDate = getMinimumDeliveryDate();

    if (
      requestedDeliveryDate &&
      requestedDeliveryDate < minimumDeliveryDate
    ) {
      return {
        success: false,
        message:
          "A data pretendida deve ser igual ou posterior ao segundo dia útil após hoje.",
      };
    }

    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirectUrl = "/login";
    } else {
      const supabaseAdmin = createSupabaseAdminClient();

      const { data: cart, error: cartError } = await supabaseAdmin
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
            shipping_address_id,
            metadata
          `,
        )
        .eq("id", cartId)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle<CartRecord>();

      if (cartError || !cart) {
        return {
          success: false,
          message:
            "O carrinho não foi encontrado ou já não está disponível.",
        };
      }

      if (!cart.shipping_address_id) {
        return {
          success: false,
          message:
            "Define primeiro a morada de destino da encomenda.",
        };
      }

      const merchandiseTotal = roundMoney(
        Number(cart.subtotal ?? 0) +
          Number(cart.personalization_total ?? 0) +
          Number(cart.setup_total ?? 0) -
          Number(cart.discount_total ?? 0),
      );

      const shipping = calculateShipping({
        method: requestedShippingMethod,
        merchandiseTotal,
      });

      const totalBeforeTax = roundMoney(
        merchandiseTotal + shipping.shippingTotal,
      );

      /*
       * O IVA continua a zero até ao passo de pagamento.
       * No passo seguinte será calculado com base nos dados
       * fiscais, país de entrega e regras comerciais aplicáveis.
       */
      const taxTotal = 0;

      const grandTotal = roundMoney(totalBeforeTax + taxTotal);

      const currentMetadata = getMetadataRecord(cart.metadata);

      const currentCheckoutMetadata =
        currentMetadata.checkout &&
        typeof currentMetadata.checkout === "object" &&
        !Array.isArray(currentMetadata.checkout)
          ? (currentMetadata.checkout as Record<string, unknown>)
          : {};

      const completedAt = new Date().toISOString();

      const { error: updateError } = await supabaseAdmin
        .from("carts")
        .update({
          shipping_method: shipping.method,
          shipping_method_name: shipping.methodName,
          shipping_provider: shipping.provider,
          shipping_origin_country_code:
            shipping.originCountryCode,
          shipping_estimated_days_min:
            shipping.estimatedDaysMin,
          shipping_estimated_days_max:
            shipping.estimatedDaysMax,
          requested_delivery_date:
            requestedDeliveryDate,
          accepts_delivery_after_date:
            acceptsDeliveryAfterDate,
          internal_reference: internalReference,
          shipping_notes: shippingNotes,
          shipping_total: shipping.shippingTotal,
          tax_total: taxTotal,
          grand_total: grandTotal,
          checkout_step: "payment",
          shipping_completed_at: completedAt,
          metadata: {
            ...currentMetadata,
            checkout: {
              ...currentCheckoutMetadata,
              shippingCompleted: true,
              shippingCompletedAt: completedAt,
              shippingPricingStatus:
                "provisional",
            },
          },
        })
        .eq("id", cart.id)
        .eq("status", "active");

      if (updateError) {
        return {
          success: false,
          message:
            updateError.message ??
            "Não foi possível guardar a expedição.",
        };
      }

      redirectUrl = "/checkout/pagamento";
    }
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? `Erro ao guardar a expedição: ${error.message}`
          : "Ocorreu um erro inesperado ao guardar a expedição.",
    };
  }

  if (redirectUrl) {
    redirect(redirectUrl);
  }

  return {
    success: false,
    message: "Não foi possível avançar para o pagamento.",
  };
}
