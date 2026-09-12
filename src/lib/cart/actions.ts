"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { calculateCartItemPricing } from "@/lib/pricing/calculate-cart-item";
import {
  resolveCustomizationPrice,
  type CustomizationPriceTier,
} from "@/lib/pricing/resolve-customization-price";
import type { PricingRule } from "@/lib/pricing/types";
import { getCustomizationServiceCodeHints } from "@/lib/stricker/resolve-customization-service-code";
import { getEffectiveMinimumOrderQuantity } from "@/lib/commerce/minimum-order-quantity";

export type AddToCartActionState = {
  success: boolean;
  message: string;
};

export type RemoveCartItemActionState = {
  success: boolean;
  message: string;
};

type ProductForCart = {
  id: string;
  supplier_id: string | null;
  fulfillment_route: "supplier_api" | "internal_360";
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
        "N√£o foi poss√≠vel criar o carrinho.",
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

const REMOVE_RETURN_PATHS = new Set([
  "/carrinho",
  "/checkout",
  "/checkout/expedicao",
]);

function getSafeRemoveReturnPath(
  value: FormDataEntryValue | null,
): string {
  const path = String(value ?? "").trim();

  const basePath = path.replace(/^\/(?:en|fr)(?=\/|$)/, "") || "/";
  if (REMOVE_RETURN_PATHS.has(basePath)) {
    return path;
  }

  return "/carrinho";
}

export async function removeCartItemAction(
  _previousState: RemoveCartItemActionState,
  formData: FormData,
): Promise<RemoveCartItemActionState> {
  const itemId = String(formData.get("itemId") ?? "").trim();
  const returnTo = getSafeRemoveReturnPath(formData.get("returnTo"));
  let redirectUrl: string | null = null;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(itemId)) {
    return {
      success: false,
      message: "O produto selecionado n√£o √© v√°lido.",
    };
  }

  try {
    const userId = await getCurrentUserId();
    const cookieStore = await cookies();
    const sessionId =
      cookieStore.get(CART_SESSION_COOKIE)?.value?.trim() ?? "";

    if (!userId && !sessionId) {
      return {
        success: false,
        message: "O carrinho j√° n√£o est√° dispon√≠vel. Atualiza a p√°gina.",
      };
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const cartQuery = supabaseAdmin
      .from("carts")
      .select("id,shipping_address_id")
      .eq("status", "active")
      .limit(1);
    const { data: cart, error: cartError } = userId
      ? await cartQuery
          .eq("user_id", userId)
          .maybeSingle<{ id: string; shipping_address_id: string | null }>()
      : await cartQuery
          .eq("session_id", sessionId)
          .is("user_id", null)
          .maybeSingle<{ id: string; shipping_address_id: string | null }>();

    if (cartError || !cart) {
      return {
        success: false,
        message: "O carrinho n√£o foi encontrado ou j√° n√£o est√° ativo.",
      };
    }

    const { data: cartItem, error: itemError } = await supabaseAdmin
      .from("cart_items")
      .select("id,customization_draft_id")
      .eq("id", itemId)
      .eq("cart_id", cart.id)
      .maybeSingle<{
        id: string;
        customization_draft_id: string | null;
      }>();

    if (itemError || !cartItem) {
      return {
        success: false,
        message: "O produto j√° n√£o existe neste carrinho.",
      };
    }

    const { error: checkoutResetError } = await supabaseAdmin
      .from("carts")
      .update({
        checkout_step: cart.shipping_address_id
          ? "shipping"
          : "destination",
        shipping_method: null,
        shipping_method_name: null,
        shipping_provider: null,
        shipping_origin_country_code: null,
        shipping_estimated_days_min: null,
        shipping_estimated_days_max: null,
        shipping_completed_at: null,
        shipping_total: 0,
        tax_total: 0,
      })
      .eq("id", cart.id)
      .eq("status", "active");

    if (checkoutResetError) {
      return {
        success: false,
        message:
          "N√£o foi poss√≠vel atualizar a expedi√ß√£o antes de remover o produto.",
      };
    }

    const { data: deletedItem, error: deleteError } = await supabaseAdmin
      .from("cart_items")
      .delete()
      .eq("id", cartItem.id)
      .eq("cart_id", cart.id)
      .select("id")
      .maybeSingle<{ id: string }>();

    if (deleteError || !deletedItem) {
      return {
        success: false,
        message:
          deleteError?.message ??
          "N√£o foi poss√≠vel remover o produto do carrinho.",
      };
    }

    if (cartItem.customization_draft_id) {
      const { error: draftError } = await supabaseAdmin
        .from("product_customization_drafts")
        .update({
          status: "ready_for_review",
          flow_step: "review",
          converted_cart_item_id: null,
          converted_at: null,
        })
        .eq("id", cartItem.customization_draft_id);

      if (draftError) {
        console.error(
          "O produto foi removido, mas n√£o foi poss√≠vel libertar a maquete:",
          draftError,
        );
      }
    }

    await recalculateCartTotals(cart.id);

    const { data: remainingItem, error: remainingItemError } =
      await supabaseAdmin
        .from("cart_items")
        .select("id")
        .eq("cart_id", cart.id)
        .limit(1)
        .maybeSingle<{ id: string }>();

    if (remainingItemError) {
      throw new Error(remainingItemError.message);
    }

    revalidatePath("/carrinho");
    revalidatePath("/checkout");
    revalidatePath("/checkout/expedicao");
    revalidatePath("/checkout/pagamento");

    const localePrefix = returnTo.match(/^\/(en|fr)(?=\/|$)/)?.[0] ?? "";
    redirectUrl = remainingItem ? returnTo : `${localePrefix}/carrinho`;
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? `N√£o foi poss√≠vel remover o produto: ${error.message}`
          : "N√£o foi poss√≠vel remover o produto do carrinho.",
    };
  }

  if (redirectUrl) {
    redirect(redirectUrl);
  }

  return {
    success: false,
    message: "N√£o foi poss√≠vel atualizar o carrinho.",
  };
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
      message: "Produto inv√°lido.",
    };
  }

  if (quantity <= 0) {
    return {
      success: false,
      message: "Indica uma quantidade v√°lida.",
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
            fulfillment_route,
            sku,
            name,
            min_order_quantity,
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
        .maybeSingle<ProductForCart>();

    if (productError || !product) {
      return {
        success: false,
        message:
          "Produto n√£o encontrado ou indispon√≠vel.",
      };
    }

    const minimumQuantity = getEffectiveMinimumOrderQuantity(
      product.min_order_quantity,
    );

    if (quantity < minimumQuantity) {
      return {
        success: false,
        message: `A quantidade m√≠nima deste produto √© ${minimumQuantity.toLocaleString(
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
            "A variante selecionada n√£o √© v√°lida.",
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
            "A maquete selecionada n√£o foi encontrada.",
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
            "N√£o tens acesso a esta maquete.",
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
            "Esta maquete j√° n√£o est√° dispon√≠vel.",
        };
      }

      if (
        draftData.variant_id &&
        variant?.id !== draftData.variant_id
      ) {
        return {
          success: false,
          message:
            "A variante selecionada n√£o corresponde √† variante da maquete.",
        };
      }

      if (draftData.quantity !== quantity) {
        return {
          success: false,
          message:
            "A quantidade foi alterada depois da cria√ß√£o da maquete. Cria uma nova maquete para esta quantidade.",
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
          "Este produto ainda n√£o tem pre√ßo autom√°tico. Usa o pedido de or√ßamento personalizado.",
      };
    }

    let confirmedCustomizationPrice = null;

    if (customizationDraft) {
      const safeTableCode = (customizationDraft.table_code ?? "").replace(/[(),]/g, "");
      if (!safeTableCode) {
        return {
          success: false,
          message: "A maquete n√£o cont√©m uma tabela v√°lida do fornecedor.",
        };
      }

      const safeTableCodeOption =
        customizationDraft.table_code_option?.replace(/[(),]/g, "") ?? null;
      const tierFilters = [
        `table_code.eq.${safeTableCode}`,
        `table_code_option.eq.${safeTableCode}`,
        ...(safeTableCodeOption
          ? [`table_code_option.eq.${safeTableCodeOption}`]
          : []),
      ];

      const { data: tiers } = await supabaseAdmin
        .from("printing_price_tables")
        .select(
          "id,table_code,table_code_option,technique_code,technique_name,quantity_min,quantity_max,supplier_price,final_price,supplier_handling_cost,handling_cost,handling_cost_code,currency,price_by_color,price_by_area,max_colors,area_cm2,is_manual_override,pricing_rule_id,handling_is_manual_override",
        )
        .eq("supplier_id", customizationDraft.supplier_id)
        .eq("is_active", true)
        .or(tierFilters/]{„ªhëÈÏ∂ªßq´^u’—MïÕÕ•Ω∏π’…∞§ÅÏ(ÄÄÄÄÄÅ…ï—’…∏ÅÏ(ÄÄÄÄÄÄÄÅÕ’ççïÕÃËÅôÖ±Õî∞(ÄÄÄÄÄÄÄÅµïÕÕÖùîËÄâÅM—…•¡îÅªçºÅëïŸΩ±Ÿï‘Å’¥Åïπëï…óùºÅ€Ö±•ëºÅ¡Ö…ÑÅ¡ÖùÖµïπ—º∏à∞(ÄÄÄÄÄÅÙÏ(ÄÄÄÅÙ((ÄÄÄÅçΩπÕ–Å¡ÖÂµïπ—%π—ïπ—%êÄÙ(ÄÄÄÄÄÅ—Â¡ïΩòÅç°ïç≠Ω’—MïÕÕ•Ω∏π¡ÖÂµïπ—}•π—ïπ–ÄÙÙÙÄâÕ—…•πúà(ÄÄÄÄÄÄÄÄ¸Åç°ïç≠Ω’—MïÕÕ•Ω∏π¡ÖÂµïπ—}•π—ïπ–(ÄÄÄÄÄÄÄÄËÄ°ç°ïç≠Ω’—MïÕÕ•Ω∏π¡ÖÂµïπ—}•π—ïπ–¸π•êÄ¸¸Åπ’±∞§Ï((ÄÄÄÅçΩπÕ–Å¡ÖÂµïπ—AÖÂ±ΩÖêÄÙÅÏ(ÄÄÄÄÄÅΩ…ëï…}•êËÅΩ…ëï»π•ê∞(ÄÄÄÄÄÅ¡…ΩŸ•ëï»ËÄâÕ—…•¡îà∞(ÄÄÄÄÄÅ¡…ΩŸ•ëï…}¡ÖÂµïπ—}•êËÅ¡ÖÂµïπ—%π—ïπ—%ê∞(ÄÄÄÄÄÅ¡…ΩŸ•ëï…}ç°ïç≠Ω’—}ÕïÕÕ•Ωπ}•êËÅç°ïç≠Ω’—MïÕÕ•Ω∏π•ê∞(ÄÄÄÄÄÅ¡…ΩŸ•ëï…}¡ÖÂµïπ—}•π—ïπ—}•êËÅ¡ÖÂµïπ—%π—ïπ—%ê∞(ÄÄÄÄÄÅÕ—Ö—’ÃËÄâ¡ïπë•πúà∞(ÄÄÄÄÄÅÖµΩ’π–ËÅù…ÖπëQΩ—Ö∞∞(ÄÄÄÄÄÅÖµΩ’π—}…ïçï•ŸïêËÄ¿∞(ÄÄÄÄÄÅÖµΩ’π—}…ïô’πëïêËÄ¿∞(ÄÄÄÄÄÅç’……ïπç‰ËÅçÖ…–πç’……ïπç‰∞(ÄÄÄÄÄÅ…Ö›}¡ÖÂ±ΩÖêËÅç°ïç≠Ω’—MïÕÕ•Ω∏ÅÖÃÅ’π≠πΩ›∏ÅÖÃÅIïçΩ…êÒÕ—…•πú∞Å’π≠πΩ›∏¯∞(ÄÄÄÄÄÅµï—ÖëÖ—ÑËÅçΩµµΩπ5ï—ÖëÖ—Ñ∞(ÄÄÄÅÙÏ((ÄÄÄÅçΩπÕ–Åç°ïç≠Ω’—MïÕÕ•ΩπAÖÂ±ΩÖêÄÙÅÏ(ÄÄÄÄÄÅçÖ…—}•êËÅçÖ…–π•ê∞(ÄÄÄÄÄÅΩ…ëï…}•êËÅΩ…ëï»π•ê∞(ÄÄÄÄÄÅ’Õï…}•êËÅ’Õï»π•ê∞(ÄÄÄÄÄÅ¡…ΩŸ•ëï»ËÄâÕ—…•¡îà∞(ÄÄÄÄÄÅ¡…ΩŸ•ëï…}ÕïÕÕ•Ωπ}•êËÅç°ïç≠Ω’—MïÕÕ•Ω∏π•ê∞(ÄÄÄÄÄÅ¡…ΩŸ•ëï…}¡ÖÂµïπ—}•π—ïπ—}•êËÅ¡ÖÂµïπ—%π—ïπ—%ê∞(ÄÄÄÄÄÅÕ—Ö—’ÃËÄâΩ¡ï∏à∞(ÄÄÄÄÄÅÖµΩ’π—}—Ω—Ö∞ËÅù…ÖπëQΩ—Ö∞∞(ÄÄÄÄÄÅç’……ïπç‰ËÅçÖ…–πç’……ïπç‰∞(ÄÄÄÄÄÅç°ïç≠Ω’—}’…∞ËÅç°ïç≠Ω’—MïÕÕ•Ω∏π’…∞∞(ÄÄÄÄÄÅï·¡•…ïÕ}Ö–ËÅç°ïç≠Ω’—MïÕÕ•Ω∏πï·¡•…ïÕ}Ö–(ÄÄÄÄÄÄÄÄ¸Åπï‹ÅÖ—î°ç°ïç≠Ω’—MïÕÕ•Ω∏πï·¡•…ïÕ}Ö–Ä®Äƒ¿¿¿§π—Ω%M=M—…•πú†§(ÄÄÄÄÄÄÄÄËÅπ’±∞∞(ÄÄÄÄÄÅ…Ö›}¡ÖÂ±ΩÖêËÅç°ïç≠Ω’—MïÕÕ•Ω∏ÅÖÃÅ’π≠πΩ›∏ÅÖÃÅIïçΩ…êÒÕ—…•πú∞Å’π≠πΩ›∏¯∞(ÄÄÄÄÄÅµï—ÖëÖ—ÑËÅçΩµµΩπ5ï—ÖëÖ—Ñ∞(ÄÄÄÅÙÏ((ÄÄÄÅçΩπÕ–ÅÏÅï……Ω»ËÅ…ïçΩ…ëAÖÂµïπ—……Ω»ÅÙÄÙÅÖ›Ö•–ÅÕ’¡ÖâÖÕïëµ•∏π…¡å†(ÄÄÄÄÄÄâ…ïçΩ…ë}ç°ïç≠Ω’—}¡ÖÂµïπ–à∞(ÄÄÄÄÄÅÏ(ÄÄÄÄÄÄÄÅ¡}Ω…ëï…}•êËÅΩ…ëï»π•ê∞(ÄÄÄÄÄÄÄÅ¡}çÖ…—}•êËÅçÖ…–π•ê∞(ÄÄÄÄÄÄÄÅ¡}’Õï…}•êËÅ’Õï»π•ê∞(ÄÄÄÄÄÄÄÅ¡}¡ÖÂµïπ–ËÅ¡ÖÂµïπ—AÖÂ±ΩÖê∞(ÄÄÄÄÄÄÄÅ¡}ç°ïç≠Ω’—}ÕïÕÕ•Ω∏ËÅç°ïç≠Ω’—MïÕÕ•ΩπAÖÂ±ΩÖê∞(ÄÄÄÄÄÅÙ∞(ÄÄÄÄ§Ï((ÄÄÄÅ•òÄ°…ïçΩ…ëAÖÂµïπ—……Ω»§ÅÏ(ÄÄÄÄÄÅ…ï—’…∏ÅÏ(ÄÄÄÄÄÄÄÅÕ’ççïÕÃËÅôÖ±Õî∞(ÄÄÄÄÄÄÄÅµïÕÕÖùîË(ÄÄÄÄÄÄÄÄÄÅ…ïçΩ…ëAÖÂµïπ—……Ω»πµïÕÕÖùîÄ¸¸(ÄÄÄÄÄÄÄÄÄÄâ;çºÅôΩ§Å¡ΩÕœµŸï∞Åù’Ö…ëÖ»ÅΩÃÅëÖëΩÃÅëºÅ¡ÖùÖµïπ—º∏à∞(ÄÄÄÄÄÅÙÏ(ÄÄÄÅÙ((ÄÄÄÅç°ïç≠Ω’—U…∞ÄÙÅç°ïç≠Ω’—MïÕÕ•Ω∏π’…∞Ï(ÄÅÙÅçÖ—ç†Ä°ï……Ω»§ÅÏ(ÄÄÄÅ…ï—’…∏ÅÏ(ÄÄÄÄÄÅÕ’ççïÕÃËÅôÖ±Õî∞(ÄÄÄÄÄÅµïÕÕÖùîË(ÄÄÄÄÄÄÄÅï……Ω»Å•πÕ—ÖπçïΩòÅ……Ω»(ÄÄÄÄÄÄÄÄÄÄ¸ÅÅ……ºÅÖºÅ•π•ç•Ö»ÅºÅ¡ÖùÖµïπ—ºËÄëÌï……Ω»πµïÕÕÖùïıÄ(ÄÄÄÄÄÄÄÄÄÄËÄâ=çΩ……ï‘Å’¥Åï……ºÅ•πïÕ¡ï…ÖëºÅÖºÅ•π•ç•Ö»ÅºÅ¡ÖùÖµïπ—º∏à∞(ÄÄÄÅÙÏ(ÄÅÙ((ÄÅ•òÄ°ç°ïç≠Ω’—U…∞§ÅÏ(ÄÄÄÅ…ïë•…ïç–°ç°ïç≠Ω’—U…∞§Ï(ÄÅÙ((ÄÅ…ï—’…∏ÅÏ(ÄÄÄÅÕ’ççïÕÃËÅôÖ±Õî∞(ÄÄÄÅµïÕÕÖùîËÄâ;çºÅôΩ§Å¡ΩÕœµŸï∞Å•π•ç•Ö»ÅºÅ¡ÖùÖµïπ—º∏à∞(ÄÅÙÏ)Ù(