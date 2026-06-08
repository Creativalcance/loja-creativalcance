"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { calculateCartItemPricing } from "@/lib/pricing/calculate-cart-item";

export type AddToCartActionState = {
  success: boolean;
  message: string;
};

type ProductForCart = {
  id: string;
  supplier_id: string | null;
  sku: string;
  name: string;
  min_order_quantity: number;
  product_prices: {
    quantity_min: number;
    quantity_max: number | null;
    final_price: number;
    currency: string;
  }[] | null;
};

type ProductVariantForCart = {
  id: string;
  sku: string;
} | null;

type PrintingTechniqueForCart = {
  id: string;
  name: string;
  setup_cost: number | null;
  price_per_unit: number | null;
} | null;

type CartRecord = {
  id: string;
};

const CART_SESSION_COOKIE = "loja_creativ_cart_session";

function parseQuantity(value: FormDataEntryValue | null): number {
  const quantity = Number(value);

  return Number.isFinite(quantity) ? Math.floor(quantity) : 0;
}

function parseOptionalString(value: FormDataEntryValue | null): string | null {
  if (!value) {
    return null;
  }

  const parsedValue = String(value).trim();

  return parsedValue.length > 0 ? parsedValue : null;
}

async function getCartSessionId(): Promise<string> {
  const cookieStore = await cookies();
  const existingSessionId = cookieStore.get(CART_SESSION_COOKIE)?.value;

  if (existingSessionId) {
    return existingSessionId;
  }

  const newSessionId = crypto.randomUUID();

  cookieStore.set(CART_SESSION_COOKIE, newSessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return newSessionId;
}

async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

async function getOrCreateActiveCart(params: {
  userId: string | null;
  sessionId: string;
}): Promise<CartRecord> {
  const supabaseAdmin = createSupabaseAdminClient();

  const query = supabaseAdmin
    .from("carts")
    .select("id")
    .eq("status", "active")
    .limit(1);

  const { data: existingCart } = params.userId
    ? await query.eq("user_id", params.userId).maybeSingle<CartRecord>()
    : await query.eq("session_id", params.sessionId).maybeSingle<CartRecord>();

  if (existingCart) {
    return existingCart;
  }

  const { data: createdCart, error } = await supabaseAdmin
    .from("carts")
    .insert({
      user_id: params.userId,
      session_id: params.userId ? null : params.sessionId,
      status: "active",
      currency: "EUR",
    })
    .select("id")
    .single<CartRecord>();

  if (error || !createdCart) {
    throw new Error(error?.message ?? "Não foi possível criar o carrinho.");
  }

  return createdCart;
}

async function recalculateCartTotals(cartId: string): Promise<void> {
  const supabaseAdmin = createSupabaseAdminClient();

  const { data: items, error } = await supabaseAdmin
    .from("cart_items")
    .select("subtotal, personalization_total, setup_cost, total")
    .eq("cart_id", cartId);

  if (error) {
    throw new Error(error.message);
  }

  const subtotal = (items ?? []).reduce(
    (total, item) => total + Number(item.subtotal ?? 0),
    0,
  );

  const personalizationTotal = (items ?? []).reduce(
    (total, item) => total + Number(item.personalization_total ?? 0),
    0,
  );

  const setupTotal = (items ?? []).reduce(
    (total, item) => total + Number(item.setup_cost ?? 0),
    0,
  );

  const grandTotal = (items ?? []).reduce(
    (total, item) => total + Number(item.total ?? 0),
    0,
  );

  const { error: updateError } = await supabaseAdmin
    .from("carts")
    .update({
      subtotal,
      personalization_total: personalizationTotal,
      setup_total: setupTotal,
      tax_total: 0,
      shipping_total: 0,
      discount_total: 0,
      grand_total: grandTotal,
    })
    .eq("id", cartId);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

export async function addToCartAction(
  _previousState: AddToCartActionState,
  formData: FormData,
): Promise<AddToCartActionState> {
  const productId = String(formData.get("productId") || "").trim();
  const variantId = parseOptionalString(formData.get("variantId"));
  const printingTechniqueId = parseOptionalString(
    formData.get("printingTechniqueId"),
  );
  const personalizationNotes = parseOptionalString(
    formData.get("personalizationNotes"),
  );

  const quantity = parseQuantity(formData.get("quantity"));

  if (!productId) {
    return {
      success: false,
      message: "Produto inválido.",
    };
  }

  if (quantity <= 0) {
    return {
      success: false,
      message: "Indica uma quantidade válida.",
    };
  }

  try {
    const supabaseAdmin = createSupabaseAdminClient();

    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select(
        `
          id,
          supplier_id,
          sku,
          name,
          min_order_quantity,
          product_prices (
            quantity_min,
            quantity_max,
            final_price,
            currency
          )
        `,
      )
      .eq("id", productId)
      .eq("status", "active")
      .eq("is_active", true)
      .maybeSingle<ProductForCart>();

    if (productError || !product) {
      return {
        success: false,
        message: "Produto não encontrado ou indisponível.",
      };
    }

    if (quantity < product.min_order_quantity) {
      return {
        success: false,
        message: `A quantidade mínima deste produto é ${product.min_order_quantity.toLocaleString(
          "pt-PT",
        )} unidades.`,
      };
    }

    let variant: ProductVariantForCart = null;

    if (variantId) {
      const { data: variantData } = await supabaseAdmin
        .from("product_variants")
        .select("id, sku")
        .eq("id", variantId)
        .eq("product_id", product.id)
        .maybeSingle<ProductVariantForCart>();

      variant = variantData ?? null;
    }

    let printingTechnique: PrintingTechniqueForCart = null;

    if (printingTechniqueId) {
      const { data: techniqueData } = await supabaseAdmin
        .from("printing_techniques")
        .select("id, name, setup_cost, price_per_unit")
        .eq("id", printingTechniqueId)
        .eq("is_active", true)
        .maybeSingle<PrintingTechniqueForCart>();

      printingTechnique = techniqueData ?? null;
    }

    const pricing = calculateCartItemPricing({
      quantity,
      prices: product.product_prices ?? [],
      selectedPrintingTechnique: printingTechnique,
    });

    if (pricing.unitPrice <= 0) {
      return {
        success: false,
        message:
          "Este produto ainda não tem preço automático. Usa o pedido de orçamento personalizado.",
      };
    }

    const userId = await getCurrentUserId();
    const sessionId = await getCartSessionId();
    const cart = await getOrCreateActiveCart({ userId, sessionId });

    const { error: insertError } = await supabaseAdmin.from("cart_items").insert({
      cart_id: cart.id,
      product_id: product.id,
      variant_id: variant?.id ?? null,
      supplier_id: product.supplier_id,
      product_sku: variant?.sku ?? product.sku,
      product_name: product.name,
      quantity,
      unit_price: pricing.unitPrice,
      personalization_unit_price: pricing.personalizationUnitPrice,
      setup_cost: pricing.setupCost,
      subtotal: pricing.subtotal,
      personalization_total: pricing.personalizationTotal,
      total: pricing.total,
      personalization_required: Boolean(printingTechnique),
      personalization_technique_id: printingTechnique?.id ?? null,
      personalization_notes: personalizationNotes,
      personalization_data: {
        techniqueName: printingTechnique?.name ?? null,
      },
    });

    if (insertError) {
      return {
        success: false,
        message: insertError.message,
      };
    }

    await recalculateCartTotals(cart.id);

    revalidatePath("/carrinho");
    revalidatePath("/produto/[slug]", "page");

    return {
      success: true,
      message: "Produto adicionado ao carrinho.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? `Erro técnico ao adicionar ao carrinho: ${error.message}`
          : "Erro técnico inesperado ao adicionar ao carrinho.",
    };
  }
}