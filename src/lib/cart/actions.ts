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
    variant_id: string | null;
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

type CustomizationDraft = {
  id: string;
  user_id: string | null;
  session_id: string | null;
  product_id: string;
  variant_id: string | null;
  supplier_id: string | null;
  quantity: number;
  location_id: string | null;
  printing_technique_id: string | null;
  component_name: string | null;
  location_name: string | null;
  technique_name: string | null;
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
  personalization_unit_price: number;
  setup_cost: number;
  extras_total: number;
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
  personalization_data: Record<string, unknown>;
  status: string;
};

type CartRecord = {
  id: string;
};

type InsertedCartItem = {
  id: string;
};

const CART_SESSION_COOKIE = "loja_creativ_cart_session";

function parseQuantity(
  value: FormDataEntryValue | null,
): number {
  const quantity = Number(value);

  return Number.isFinite(quantity)
    ? Math.floor(quantity)
    : 0;
}

function parseOptionalString(
  value: FormDataEntryValue | null,
): string | null {
  if (!value) {
    return null;
  }

  const parsedValue = String(value).trim();

  return parsedValue.length > 0 ? parsedValue : null;
}

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

function getRecordString(
  record: Record<string, unknown>,
  key: string,
): string | null {
  const value = record[key];

  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0
    ? trimmedValue
    : null;
}

async function getCartSessionId(): Promise<string> {
  const cookieStore = await cookies();

  const existingSessionId =
    cookieStore.get(CART_SESSION_COOKIE)?.value;

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
  const supabaseAdmin =
    createSupabaseAdminClient();

  const query = supabaseAdmin
    .from("carts")
    .select("id")
    .eq("status", "active")
    .limit(1);

  const { data: existingCart } = params.userId
    ? await query
        .eq("user_id", params.userId)
        .maybeSingle<CartRecord>()
    : await query
        .eq("session_id", params.sessionId)
        .maybeSingle<CartRecord>();

  if (existingCart) {
    return existingCart;
  }

  const { data: createdCart, error } =
    await supabaseAdmin
      .from("carts")
      .insert({
        user_id: params.userId,
        session_id: params.userId
          ? null
          : params.sessionId,
        status: "active",
        currency: "EUR",
      })
      .select("id")
      .single<CartRecord>();

  if (error || !createdCart) {
    throw new Error(
      error?.message ??
        "Não foi possível criar o carrinho.",
    );
  }

  return createdCart;
}

async function recalculateCartTotals(
  cartId: string,
): Promise<void> {
  const supabaseAdmin =
    createSupabaseAdminClient();

  const { data: items, error } =
    await supabaseAdmin
      .from("cart_items")
      .select(
        `
          subtotal,
          personalization_total,
          setup_cost,
          extras_total,
          total
        `,
      )
      .eq("cart_id", cartId);

  if (error) {
    throw new Error(error.message);
  }

  const subtotal = (items ?? []).reduce(
    (total, item) =>
      total + Number(item.subtotal ?? 0),
    0,
  );

  const personalizationTotal = (items ?? []).reduce(
    (total, item) =>
      total +
      Number(item.personalization_total ?? 0),
    0,
  );

  const setupTotal = (items ?? []).reduce(
    (total, item) =>
      total + Number(item.setup_cost ?? 0),
    0,
  );

  const extrasTotal = (items ?? []).reduce(
    (total, item) =>
      total + Number(item.extras_total ?? 0),
    0,
  );

  const grandTotal = (items ?? []).reduce(
    (total, item) =>
      total + Number(item.total ?? 0),
    0,
  );

  const { error: updateError } =
    await supabaseAdmin
      .from("carts")
      .update({
        subtotal: roundMoney(subtotal),

        personalization_total:
          roundMoney(personalizationTotal),

        setup_total:
          roundMoney(setupTotal + extrasTotal),

        tax_total: 0,
        shipping_total: 0,
        discount_total: 0,
        grand_total: roundMoney(grandTotal),
      })
      .eq("id", cartId);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

function getActivePrices(params: {
  prices: ProductForCart["product_prices"];
  variantId: string | null;
}) {
  const prices = params.prices ?? [];

  if (params.variantId) {
    const variantPrices = prices.filter(
      (price) =>
        price.variant_id === params.variantId,
    );

    if (variantPrices.length > 0) {
      return variantPrices;
    }
  }

  const productPrices = prices.filter(
    (price) => !price.variant_id,
  );

  return productPrices.length > 0
    ? productPrices
    : prices;
}

function draftBelongsToIdentity(params: {
  draft: CustomizationDraft;
  userId: string | null;
  sessionId: string;
}): boolean {
  if (
    params.userId &&
    params.draft.user_id === params.userId
  ) {
    return true;
  }

  return (
    params.draft.session_id === params.sessionId
  );
}

export async function addToCartAction(
  _previousState: AddToCartActionState,
  formData: FormData,
): Promise<AddToCartActionState> {
  const productId = String(
    formData.get("productId") || "",
  ).trim();

  const variantId = parseOptionalString(
    formData.get("variantId"),
  );

  const customizationDraftId =
    parseOptionalString(
      formData.get("customizationDraftId"),
    );

  const printingTechniqueId =
    parseOptionalString(
      formData.get("printingTechniqueId"),
    );

  const personalizationNotes =
    parseOptionalString(
      formData.get("personalizationNotes"),
    );

  const quantity = parseQuantity(
    formData.get("quantity"),
  );

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
    const supabaseAdmin =
      createSupabaseAdminClient();

    const userId = await getCurrentUserId();
    const sessionId = await getCartSessionId();

    const { data: product, error: productError } =
      await supabaseAdmin
        .from("products")
        .select(
          `
            id,
            supplier_id,
            sku,
            name,
            min_order_quantity,
            is_purchasable,
            product_prices (
              variant_id,
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
        .eq("is_purchasable", true)
        .maybeSingle<ProductForCart>();

    if (productError || !product) {
      return {
        success: false,
        message:
          "Produto não encontrado ou indisponível.",
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
      const {
        data: variantData,
        error: variantError,
      } = await supabaseAdmin
        .from("product_variants")
        .select("id, sku")
        .eq("id", variantId)
        .eq("product_id", product.id)
        .maybeSingle<ProductVariantForCart>();

      if (variantError || !variantData) {
        return {
          success: false,
          message:
            "A variante selecionada não é válida.",
        };
      }

      variant = variantData;
    }

    let customizationDraft:
      | CustomizationDraft
      | null = null;

    if (customizationDraftId) {
      const {
        data: draftData,
        error: draftError,
      } = await supabaseAdmin
        .from("product_customization_drafts")
        .select(
          `
            id,
            user_id,
            session_id,
            product_id,
            variant_id,
            supplier_id,
            quantity,
            location_id,
            printing_technique_id,
            component_name,
            location_name,
            technique_name,
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
            personalization_unit_price,
            setup_cost,
            extras_total,
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
            artwork_approved,
            personalization_data,
            status
          `,
        )
        .eq("id", customizationDraftId)
        .eq("product_id", product.id)
        .maybeSingle<CustomizationDraft>();

      if (draftError || !draftData) {
        return {
          success: false,
          message:
            "A maquete selecionada não foi encontrada.",
        };
      }

      if (
        !draftBelongsToIdentity({
          draft: draftData,
          userId,
          sessionId,
        })
      ) {
        return {
          success: false,
          message:
            "Não tens acesso a esta maquete.",
        };
      }

      if (
        ![
          "draft",
          "ready",
          "characteristics",
          "personalizing",
          "ready_for_review",
        ].includes(draftData.status)
      ) {
        return {
          success: false,
          message:
            "Esta maquete já não está disponível.",
        };
      }

      if (
        draftData.variant_id &&
        variant?.id !== draftData.variant_id
      ) {
        return {
          success: false,
          message:
            "A variante selecionada não corresponde à variante da maquete.",
        };
      }

      if (draftData.quantity !== quantity) {
        return {
          success: false,
          message:
            "A quantidade foi alterada depois da criação da maquete. Cria uma nova maquete para esta quantidade.",
        };
      }

      customizationDraft = draftData;
    }

    let printingTechnique:
      | PrintingTechniqueForCart
      | null = null;

    if (
      !customizationDraft &&
      printingTechniqueId
    ) {
      const { data: techniqueData } =
        await supabaseAdmin
          .from("printing_techniques")
          .select(
            "id, name, setup_cost, price_per_unit",
          )
          .eq("id", printingTechniqueId)
          .eq("is_active", true)
          .maybeSingle<PrintingTechniqueForCart>();

      printingTechnique = techniqueData ?? null;
    }

    const activePrices = getActivePrices({
      prices: product.product_prices,
      variantId: variant?.id ?? null,
    });

    const productPricing =
      calculateCartItemPricing({
        quantity,
        prices: activePrices,
        selectedPrintingTechnique:
          customizationDraft
            ? null
            : printingTechnique,
      });

    if (productPricing.unitPrice <= 0) {
      return {
        success: false,
        message:
          "Este produto ainda não tem preço automático. Usa o pedido de orçamento personalizado.",
      };
    }

    const personalizationUnitPrice =
      customizationDraft
        ? Number(
            customizationDraft.personalization_unit_price ??
              0,
          )
        : productPricing.personalizationUnitPrice;

    const setupCost = customizationDraft
      ? Number(customizationDraft.setup_cost ?? 0)
      : productPricing.setupCost;

    const extrasTotal = customizationDraft
      ? Number(
          customizationDraft.extras_total ?? 0,
        )
      : 0;

    const subtotal = roundMoney(
      productPricing.unitPrice * quantity,
    );

    const personalizationTotal = roundMoney(
      personalizationUnitPrice * quantity,
    );

    const total = roundMoney(
      subtotal +
        personalizationTotal +
        setupCost +
        extrasTotal,
    );

    const cart = await getOrCreateActiveCart({
      userId,
      sessionId,
    });

    const draftNotes = customizationDraft
      ? getRecordString(
          customizationDraft.personalization_data,
          "notes",
        )
      : null;

    const personalizationData =
      customizationDraft
        ? {
            ...customizationDraft.personalization_data,

            draftId: customizationDraft.id,

            techniqueName:
              customizationDraft.technique_name,

            componentName:
              customizationDraft.component_name,

            locationName:
              customizationDraft.location_name,

            logoFileName:
              customizationDraft.logo_file_name,

            artworkStatus:
              customizationDraft.artwork_status,
          }
        : {
            techniqueName:
              printingTechnique?.name ?? null,
          };

    const {
      data: insertedItem,
      error: insertError,
    } = await supabaseAdmin
      .from("cart_items")
      .insert({
        cart_id: cart.id,
        product_id: product.id,
        variant_id: variant?.id ?? null,

        supplier_id:
          customizationDraft?.supplier_id ??
          product.supplier_id,

        product_sku:
          variant?.sku ?? product.sku,

        product_name: product.name,
        quantity,

        unit_price: productPricing.unitPrice,

        personalization_unit_price:
          personalizationUnitPrice,

        setup_cost: setupCost,
        extras_total: extrasTotal,

        subtotal,
        personalization_total: personalizationTotal,
        total,

        personalization_required: Boolean(
          customizationDraft ||
            printingTechnique,
        ),

        personalization_technique_id:
          customizationDraft?.printing_technique_id ??
          printingTechnique?.id ??
          null,

        personalization_notes:
          draftNotes ?? personalizationNotes,

        personalization_data:
          personalizationData,

        customization_draft_id:
          customizationDraft?.id ?? null,

        customization_location_id:
          customizationDraft?.location_id ?? null,

        customization_component_name:
          customizationDraft?.component_name ?? null,

        customization_location_name:
          customizationDraft?.location_name ?? null,

        customization_technique_name:
          customizationDraft?.technique_name ??
          printingTechnique?.name ??
          null,

        supplier_product_reference:
          customizationDraft
            ?.supplier_product_reference ?? null,

        supplier_sku:
          customizationDraft?.supplier_sku ??
          variant?.sku ??
          product.sku,

        service_code:
          customizationDraft?.service_code ?? null,

        table_code:
          customizationDraft?.table_code ?? null,

        table_code_option:
          customizationDraft?.table_code_option ??
          null,

        handling_cost_code:
          customizationDraft?.handling_cost_code ??
          null,

        printing_area_label:
          customizationDraft?.printing_area_label ??
          null,

        printing_width_mm:
          customizationDraft?.printing_width_mm ??
          null,

        printing_height_mm:
          customizationDraft?.printing_height_mm ??
          null,

        printing_area_mm2:
          customizationDraft?.printing_area_mm2 ??
          null,

        logo_file_name:
          customizationDraft?.logo_file_name ?? null,

        logo_storage_path:
          customizationDraft?.logo_storage_path ??
          null,

        logo_url:
          customizationDraft?.logo_url ?? null,

        technical_preview_url:
          customizationDraft
            ?.technical_preview_url ?? null,

        logo_position_x:
          customizationDraft?.logo_position_x ??
          null,

        logo_position_y:
          customizationDraft?.logo_position_y ??
          null,

        logo_scale:
          customizationDraft?.logo_scale ?? null,

        logo_rotation:
          customizationDraft?.logo_rotation ?? 0,

        logo_width_mm:
          customizationDraft?.logo_width_mm ??
          null,

        logo_height_mm:
          customizationDraft?.logo_height_mm ??
          null,

        logo_area:
          customizationDraft?.logo_area ?? null,

        artwork_status:
          customizationDraft?.artwork_status ??
          "draft",

        artwork_approved:
          customizationDraft?.artwork_approved ??
          false,

        metadata: {
          source: customizationDraft
            ? "customization_draft"
            : "direct_purchase",

          customizationDraftId:
            customizationDraft?.id ?? null,
        },
      })
      .select("id")
      .single<InsertedCartItem>();

    if (insertError || !insertedItem) {
      return {
        success: false,
        message:
          insertError?.message ??
          "Não foi possível adicionar o produto ao carrinho.",
      };
    }

    if (customizationDraft) {
      const { error: draftUpdateError } =
        await supabaseAdmin
          .from("product_customization_drafts")
          .update({
            status: "converted",
            flow_step: "converted",

            converted_cart_item_id:
              insertedItem.id,

            converted_at:
              new Date().toISOString(),
          })
          .eq("id", customizationDraft.id)
          .in("status", [
            "draft",
            "ready",
            "characteristics",
            "personalizing",
            "ready_for_review",
          ]);

      if (draftUpdateError) {
        await supabaseAdmin
          .from("cart_items")
          .delete()
          .eq("id", insertedItem.id);

        return {
          success: false,
          message:
            "Não foi possível associar a maquete ao carrinho. Tenta novamente.",
        };
      }
    }

    await recalculateCartTotals(cart.id);

    revalidatePath("/carrinho");
    revalidatePath("/produto/[slug]", "page");

    return {
      success: true,

      message: customizationDraft
        ? "Produto personalizado adicionado ao carrinho."
        : "Produto adicionado ao carrinho.",
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
