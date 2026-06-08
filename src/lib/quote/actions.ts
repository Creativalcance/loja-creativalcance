"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  if (!contactName || !contactEmail) {
    return {
      success: false,
      message: "Preenche o nome e o e-mail.",
    };
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return {
      success: false,
      message: "Indica uma quantidade válida.",
    };
  }

  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let product: ProductForQuote | null = null;

    if (productSku) {
      const { data: productData } = await supabase
        .from("products")
        .select("id, supplier_id, sku, name")
        .eq("sku", productSku)
        .maybeSingle<ProductForQuote>();

      product = productData ?? null;
    }

    const { data: quoteRequest, error: quoteRequestError } = await supabase
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
        message:
          quoteRequestError?.message ??
          "Não foi possível criar o pedido de orçamento.",
      };
    }

    const { error: quoteItemError } = await supabase
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
      return {
        success: false,
        message:
          quoteItemError.message ??
          "O pedido foi criado, mas não foi possível associar o produto.",
      };
    }

    return {
      success: true,
      message:
        "Pedido de orçamento enviado com sucesso. A equipa da Loja Creativ irá contactar-te em breve.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? `Erro técnico ao criar pedido: ${error.message}`
          : "Erro técnico inesperado ao criar pedido.",
    };
  }
}