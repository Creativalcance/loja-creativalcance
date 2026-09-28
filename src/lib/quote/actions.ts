"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSiteLocale } from "@/lib/i18n/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const messages = {
  pt: { invalid: "Verifica os dados do pedido, incluindo nome, e-mail e quantidade.", failed: "Não foi possível guardar o pedido. Tenta novamente.", success: "Pedido de orçamento recebido. A equipa da 360 Merchandising irá contactar-te." },
  en: { invalid: "Check your request details, including name, email and quantity.", failed: "We could not save your request. Please try again.", success: "Quotation request received. The 360 Merchandising team will contact you." },
  fr: { invalid: "Vérifiez votre demande, notamment le nom, l’e-mail et la quantité.", failed: "Impossible d’enregistrer la demande. Veuillez réessayer.", success: "Demande de devis reçue. L’équipe 360 Merchandising vous contactera." },
  es: { invalid: "Comprueba los datos, incluidos nombre, correo y cantidad.", failed: "No se pudo guardar la solicitud. Inténtalo de nuevo.", success: "Solicitud de presupuesto recibida. El equipo de 360 Merchandising se pondrá en contacto contigo." },
  de: { invalid: "Prüfen Sie die Angaben, einschließlich Name, E-Mail und Menge.", failed: "Die Anfrage konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.", success: "Angebotsanfrage erhalten. Das Team von 360 Merchandising wird Sie kontaktieren." },
  it: { invalid: "Controlla i dati, inclusi nome, e-mail e quantità.", failed: "Impossibile salvare la richiesta. Riprova.", success: "Richiesta di preventivo ricevuta. Il team di 360 Merchandising ti contatterà." },
};

export type QuoteRequestActionState = {
  success: boolean;
  message: string;
};

type ProductForQuote = {
  id: string;
  supplier_id: string | null;
  sku: string;
  name: string;
};

function parseOptionalNumber(value: FormDataEntryValue | null): number | null {
  if (!value) {
    return null;
  }

  const parsedValue = Number(String(value).replace(",", "."));

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function parseOptionalString(value: FormDataEntryValue | null): string | null {
  if (!value) {
    return null;
  }

  const parsedValue = String(value).trim();

  return parsedValue.length > 0 ? parsedValue : null;
}

export async function createQuoteRequestAction(
  _previousState: QuoteRequestActionState,
  formData: FormData,
): Promise<QuoteRequestActionState> {
  const text = messages[getSiteLocale(String(formData.get("locale") ?? "pt"))];
  const contactName = String(formData.get("contactName") || "").trim();
  const contactEmail = String(formData.get("contactEmail") || "")
    .trim()
    .toLowerCase();
  const contactPhone = parseOptionalString(formData.get("contactPhone"));
  const companyName = parseOptionalString(formData.get("companyName"));
  const companyTaxId = parseOptionalString(formData.get("companyTaxId"));

  const productSku = parseOptionalString(formData.get("productSku"));
  const productNameFallback = parseOptionalString(formData.get("productName"));
  const quantity = Number(formData.get("quantity") || 1);

  const subject = parseOptionalString(formData.get("subject"));
  const message = parseOptionalString(formData.get("message"));
  const personalizationNotes = parseOptionalString(
    formData.get("personalizationNotes"),
  );

  const preferredContactMethod =
    parseOptionalString(formData.get("preferredContactMethod")) ?? "email";

  const budgetMin = parseOptionalNumber(formData.get("budgetMin"));
  const budgetMax = parseOptionalNumber(formData.get("budgetMax"));
  const desiredDeliveryDate = parseOptionalString(
    formData.get("desiredDeliveryDate"),
  );

  if (!contactName || contactName.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail) || contactEmail.length > 254) {
    return {
      success: false,
      message: text.invalid,
    };
  }

  if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > 1000000) {
    return {
      success: false,
      message: text.invalid,
    };
  }

  if ([message, personalizationNotes, subject, productNameFallback].some(value => (value?.length ?? 0) > 10000) ||
      !["email", "phone", "whatsapp"].includes(preferredContactMethod) ||
      [budgetMin, budgetMax].some(value => value !== null && value < 0) ||
      (budgetMin !== null && budgetMax !== null && budgetMin > budgetMax)) {
    return { success: false, message: text.invalid };
  }

  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const admin = createSupabaseAdminClient();
    let product: ProductForQuote | null = null;

    if (productSku) {
      const { data: productData } = await admin
        .from("products")
        .select("id, supplier_id, sku, name")
        .eq("sku", productSku)
        .eq("is_active", true)
        .maybeSingle<ProductForQuote>();

      product = productData ?? null;
    }

    const { data: quoteRequest, error: quoteRequestError } = await admin
      .from("quote_requests")
      .insert({
        user_id: user?.id ?? null,
        contact_name: contactName,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        company_name: companyName,
        company_tax_id: companyTaxId,
        subject:
          subject ??
          (product
            ? `Pedido de orçamento: ${product.name}`
            : "Pedido de orçamento"),
        message,
        source: product ? "product_page" : "website",
        preferred_contact_method: preferredContactMethod,
        budget_min: budgetMin,
        budget_max: budgetMax,
        desired_delivery_date: desiredDeliveryDate,
        metadata: {
          productSku,
          origin: "contact_page",
        },
      })
      .select("id")
      .single<{ id: string }>();

    if (quoteRequestError || !quoteRequest) {
      return {
        success: false,
        message: text.failed,
      };
    }

    const { error: quoteItemError } = await admin
      .from("quote_request_items")
      .insert({
        quote_request_id: quoteRequest.id,
        product_id: product?.id ?? null,
        supplier_id: product?.supplier_id ?? null,
        product_sku: product?.sku ?? productSku,
        product_name:
          product?.name ??
          productNameFallback ??
          "Produto indicado pelo cliente",
        quantity,
        personalization_required: true,
        personalization_notes: personalizationNotes,
        metadata: {
          origin: "contact_page",
        },
      });

    if (quoteItemError) {
      // Compensate the header insert so a failed submission leaves no partial request.
      await admin.from("quote_requests").delete().eq("id", quoteRequest.id);
      return {
        success: false,
        message: text.failed,
      };
    }

    return {
      success: true,
      message: text.success,
    };
  } catch {
    return {
      success: false,
      message: text.failed,
    };
  }
}