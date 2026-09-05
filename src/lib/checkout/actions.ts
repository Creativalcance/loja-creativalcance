"use server";

import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteLocale, localizePath } from "@/lib/i18n/config";

export type CheckoutDestinationActionState = {
  success: boolean;
  message: string;
};

type CartRecord = {
  id: string;
  user_id: string | null;
  metadata: Record<string, unknown> | null;
};

type AddressRecord = {
  id: string;
  user_id: string | null;
};

type InsertedAddressRecord = {
  id: string;
};

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

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeTaxId(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value
    .replace(/\s+/g, "")
    .replace(/^PT/i, "")
    .trim();

  return normalized.length > 0 ? normalized : null;
}

function normalizePostalCode(value: string): string {
  return value.trim().toUpperCase();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getMetadataRecord(
  value: Record<string, unknown> | null,
): Record<string, unknown> {
  return value && typeof value === "object" ? value : {};
}

export async function saveCheckoutDestinationAction(
  _previousState: CheckoutDestinationActionState,
  formData: FormData,
): Promise<CheckoutDestinationActionState> {
  const locale = getSiteLocale(String(formData.get("locale") ?? "pt"));
  let redirectUrl: string | null = null;

  try {
    const cartId = getRequiredString(formData, "cartId");
    const addressMode =
      getOptionalString(formData, "addressMode") ?? "new";

    const customerName = getRequiredString(
      formData,
      "customerName",
    );

    const customerEmail = normalizeEmail(
      getRequiredString(formData, "customerEmail"),
    );

    const customerPhone = getOptionalString(
      formData,
      "customerPhone",
    );

    const companyName = getOptionalString(
      formData,
      "companyName",
    );

    const companyTaxId = normalizeTaxId(
      getOptionalString(formData, "companyTaxId"),
    );

    const artworkEmailValue =
      getOptionalString(formData, "artworkEmail") ??
      customerEmail;

    const artworkEmail = normalizeEmail(artworkEmailValue);

    const customerNotes = getOptionalString(
      formData,
      "customerNotes",
    );

    if (!isValidEmail(customerEmail)) {
      return {
        success: false,
        message: "Indica um endereço de e-mail válido.",
      };
    }

    if (!isValidEmail(artworkEmail)) {
      return {
        success: false,
        message:
          "Indica um endereço de e-mail válido para receção da maquete.",
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

      const { data: cart, error: cartError } =
        await supabaseAdmin
          .from("carts")
          .select(
            `
              id,
              user_id,
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

      let shippingAddressId: string | null = null;
      const makeShippingDefault = formData.get("makeShippingDefault") === "on";

      if (addressMode === "saved") {
        const selectedAddressId = getRequiredString(
          formData,
          "selectedAddressId",
        );

        const { data: selectedAddress, error: addressError } =
          await supabaseAdmin
            .from("customer_addresses")
            .select("id, user_id")
            .eq("id", selectedAddressId)
            .eq("user_id", user.id)
            .maybeSingle<AddressRecord>();

        if (addressError || !selectedAddress) {
          return {
            success: false,
            message:
              "A morada selecionada não foi encontrada.",
          };
        }

        shippingAddressId = selectedAddress.id;
      } else {
        const shippingContactName =
          getOptionalString(
            formData,
            "shippingContactName",
          ) ?? customerName;

        const shippingCompanyName =
          getOptionalString(
            formData,
            "shippingCompanyName",
          ) ?? companyName;

        const shippingPhone =
          getOptionalString(
            formData,
            "shippingPhone",
          ) ?? customerPhone;

        const shippingAddressLine1 = getRequiredString(
          formData,
          "shippingAddressLine1",
        );

        const shippingAddressLine2 = getOptionalString(
          formData,
          "shippingAddressLine2",
        );

        const shippingPostalCode = normalizePostalCode(
          getRequiredString(
            formData,
            "shippingPostalCode",
          ),
        );

        const shippingCity = getRequiredString(
          formData,
          "shippingCity",
        );

        const shippingDistrict = getOptionalString(
          formData,
          "shippingDistrict",
        );

        const shippingCountryCode =
          getOptionalString(
            formData,
            "shippingCountryCode",
          )?.toUpperCase() ?? "PT";

        if (makeShippingDefault) {
          await supabaseAdmin.from("customer_addresses").update({ is_default: false })
            .eq("user_id", user.id).eq("address_type", "shipping");
        }

        const { data: createdAddress, error: addressError } =
          await supabaseAdmin
            .from("customer_addresses")
            .insert({
              user_id: user.id,
              address_type: "shipping",
              company_name: shippingCompanyName,
              tax_id: companyTaxId,
              contact_name: shippingContactName,
              contact_email: customerEmail,
              contact_phone: shippingPhone,
              address_line_1: shippingAddressLine1,
              address_line_2: shippingAddressLine2,
              postal_code: shippingPostalCode,
              city: shippingCity,
              district: shippingDistrict,
              country_code: shippingCountryCode,
              is_default: makeShippingDefault,
            })
            .select("id")
            .single<InsertedAddressRecord>();

        if (addressError || !createdAddress) {
          return {
            success: false,
            message:
              addressError?.message ??
              "Não foi possível guardar a morada de entrega.",
          };
        }

        shippingAddressId = createdAddress.id;
      }

      if (addressMode === "saved" && makeShippingDefault && shippingAddressId) {
        await supabaseAdmin.from("customer_addresses").update({ is_default: false })
          .eq("user_id", user.id).eq("address_type", "shipping");
        await supabaseAdmin.from("customer_addresses").update({ is_default: true })
          .eq("id", shippingAddressId).eq("user_id", user.id);
      }

      let billingAddressId: string | null = null;
      const { data: currentBilling } = await supabaseAdmin.from("customer_addresses")
        .select("id").eq("user_id", user.id).eq("address_type", "billing")
        .eq("is_default", true).maybeSingle<{ id: string }>();
      billingAddressId = currentBilling?.id ?? null;

      if (formData.get("billingSameAsShipping") === "on" && shippingAddressId) {
        const { data: shippingAddress } = await supabaseAdmin.from("customer_addresses")
          .select("company_name,tax_id,contact_name,contact_email,contact_phone,address_line_1,address_line_2,postal_code,city,district,country_code")
          .eq("id", shippingAddressId).eq("user_id", user.id).single();
        if (shippingAddress) {
          await supabaseAdmin.from("customer_addresses").update({ is_default: false })
            .eq("user_id", user.id).eq("address_type", "billing");
          const { data: billing } = await supabaseAdmin.from("customer_addresses").insert({
            ...shippingAddress, user_id: user.id, address_type: "billing", label: "Faturação", company_name: companyName ?? shippingAddress.company_name,
            tax_id: companyTaxId ?? shippingAddress.tax_id, contact_email: customerEmail, is_default: true,
          }).select("id").single<{ id: string }>();
          billingAddressId = billing?.id ?? billingAddressId;
        }
      }

      await supabaseAdmin.from("profiles").update({
        full_name: customerName, phone: customerPhone, company_name: companyName, tax_id: companyTaxId,
        billing_email: customerEmail,
      }).eq("id", user.id);

      const currentMetadata = getMetadataRecord(cart.metadata);

      const currentCheckoutMetadata =
        currentMetadata.checkout &&
        typeof currentMetadata.checkout === "object" &&
        !Array.isArray(currentMetadata.checkout)
          ? (currentMetadata.checkout as Record<string, unknown>)
          : {};

      const { error: updateError } = await supabaseAdmin
        .from("carts")
        .update({
          shipping_address_id: shippingAddressId,
          billing_address_id: billingAddressId,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          company_name: companyName,
          company_tax_id: companyTaxId,
          artwork_email: artworkEmail,
          customer_notes: customerNotes,
          checkout_step: "shipping",
          destination_completed_at: new Date().toISOString(),
          metadata: {
            ...currentMetadata,
            checkout: {
              ...currentCheckoutMetadata,
              destinationCompleted: true,
              destinationCompletedAt: new Date().toISOString(),
              addressMode,
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
            "Não foi possível guardar os dados de destino.",
        };
      }

      redirectUrl = localizePath("/checkout/expedicao", locale);
    }
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? `Erro ao guardar o destino: ${error.message}`
          : "Ocorreu um erro inesperado ao guardar o destino.",
    };
  }

  if (redirectUrl) {
    redirect(redirectUrl);
  }

  return {
    success: false,
    message: "Não foi possível avançar para a expedição.",
  };
}
