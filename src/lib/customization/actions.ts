"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  addToCartAction,
  type AddToCartActionState,
} from "@/lib/cart/actions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  resolveCustomizationPrice,
  type CustomizationPriceTier,
} from "@/lib/pricing/resolve-customization-price";
import type { PricingRule } from "@/lib/pricing/types";
import { resolveCustomizationServiceCode } from "@/lib/stricker/resolve-customization-service-code";
import { getEffectiveMinimumOrderQuantity } from "@/lib/commerce/minimum-order-quantity";

export type StartCustomizationDraftState = {
  success: boolean;
  message: string;
};

export type SaveCustomizationDraftResult = {
  success: boolean;
  message: string;
  draftId: string | null;
  redirectUrl: string | null;
};

type ProductRecord = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  supplier_id: string | null;
  min_order_quantity: number;
  product_prices: {
    variant_id: string | null;
    quantity_min: number;
    quantity_max: number | null;
    final_price: number;
    currency: string;
  }[] | null;
};

type VariantRecord = {
  id: string;
  sku: string;
};

type LocationRecord = {
  id: string;
  product_id: string;
  variant_id: string | null;
  external_location_id: string;
  location_name: string | null;
  location_code: string | null;
  max_printing_area_mm: string | null;
  max_area_cm2: number | null;
  raw_payload: Record<string, unknown> | null;
};

type PrintingTechniqueRecord = {
  id: string;
  name: string;
};

type ExistingDraftRecord = {
  id: string;
  user_id: string | null;
  session_id: string | null;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  logo_storage_path: string | null;
  status: string;
};

type DraftPrice = {
  finalPrice: number;
  currency: string;
};

const CART_SESSION_COOKIE = "loja_creativ_cart_session";
const ARTWORK_BUCKET = "customization-artwork";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
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

function getRequiredNumber(formData: FormData, key: string): number {
  const value = Number(formData.get(key));

  if (!Number.isFinite(value)) {
    throw new Error(`Valor numérico inválido: ${key}`);
  }

  return value;
}

function getOptionalNumber(
  formData: FormData,
  key: string,
): number | null {
  const rawValue = formData.get(key);

  if (rawValue === null || String(rawValue).trim() === "") {
    return null;
  }

  const value = Number(rawValue);

  return Number.isFinite(value) ? value : null;
}

function getBoolean(formData: FormData, key: string): boolean {
  return String(formData.get(key) ?? "") === "true";
}

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

function getSelectedColorCount(printColorMode: string | null): number | null {
  if (!printColorMode?.startsWith("colors:")) return null;
  const count = Number(printColorMode.split(":")[1]);
  return Number.isInteger(count) && count > 0 ? count : null;
}

function getTableOptionColorCount(tableCodeOption: string | null): number | null {
  const match = tableCodeOption?.match(/-(\d+)$/);
  const count = match?.[1] ? Number(match[1]) : null;
  return count && Number.isInteger(count) && count > 0 ? count : null;
}

function sanitizeFileName(fileName: string): string {
  const extensionIndex = fileName.lastIndexOf(".");

  const extension =
    extensionIndex >= 0
      ? fileName.slice(extensionIndex).toLowerCase()
      : "";

  const baseName =
    extensionIndex >= 0
      ? fileName.slice(0, extensionIndex)
      : fileName;

  const safeName = baseName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${safeName || "logo"}${extension}`;
}

function getFileFromFormData(formData: FormData): File | null {
  const value = formData.get("logoFile");

  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  return value;
}

function validateFile(file: File): void {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("O ficheiro ultrapassa o limite máximo de 10 MB.");
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error(
      "Formato não permitido. Usa SVG, PDF, PNG, JPG ou WEBP.",
    );
  }
}

async function getIdentity(): Promise<{
  userId: string | null;
  sessionId: string;
}> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const cookieStore = await cookies();
  const existingSessionId =
    cookieStore.get(CART_SESSION_COOKIE)?.value ?? null;

  if (existingSessionId) {
    return {
      userId: user?.id ?? null,
      sessionId: existingSessionId,
    };
  }

  const sessionId = crypto.randomUUID();

  cookieStore.set(CART_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return {
    userId: user?.id ?? null,
    sessionId,
  };
}

function draftBelongsToIdentity(params: {
  draft: ExistingDraftRecord;
  userId: string | null;
  sessionId: string;
}): boolean {
  if (params.userId && params.draft.user_id === params.userId) {
    return true;
  }

  return params.draft.session_id === params.sessionId;
}

function findProductPrice(params: {
  prices: ProductRecord["product_prices"];
  variantId: string | null;
  quantity: number;
}): DraftPrice | null {
  const prices = params.prices ?? [];

  const variantPrices = params.variantId
    ? prices.filter((price) => price.variant_id === params.variantId)
    : [];

  const productPrices = prices.filter((price) => !price.variant_id);

  const activePrices =
    variantPrices.length > 0
      ? variantPrices
      : productPrices.length > 0
        ? productPrices
        : prices;

  const sortedPrices = [...activePrices].sort(
    (a, b) => a.quantity_min - b.quantity_min,
  );

  const matchingPrice = sortedPrices.find((price) => {
    const matchesMinimum = params.quantity >= price.quantity_min;
    const matchesMaximum =
      price.quantity_max === null ||
      params.quantity <= price.quantity_max;

    return matchesMinimum && matchesMaximum;
  });

  const fallbackPrice =
    matchingPrice ??
    sortedPrices
      .filter((price) => params.quantity >= price.quantity_min)
      .at(-1) ??
    sortedPrices[0] ??
    null;

  if (!fallbackPrice) {
    return null;
  }

  return {
    finalPrice: Number(fallbackPrice.final_price),
    currency: fallbackPrice.currency || "EUR",
  };
}

export async function startCustomizationDraftAction(
  _previousState: StartCustomizationDraftState,
  formData: FormData,
): Promise<StartCustomizationDraftState> {
  let redirectUrl: string | null = null;

  try {
    const productId = getRequiredString(formData, "productId");
    const productSlug = getRequiredString(formData, "productSlug");
    const variantId = getRequiredString(formData, "variantId");
    const quantity = Math.floor(
      getRequiredNumber(formData, "quantity"),
    );

    if (quantity <= 0) {
      return {
        success: false,
        message: "Indica uma quantidade válida.",
      };
    }

    const supabaseAdmin = createSupabaseAdminClient();

    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select(
        `
          id,
          slug,
          sku,
          name,
          supplier_id,
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
      .eq("slug", productSlug)
      .eq("status", "active")
      .eq("is_active", true)
      .maybeSingle<ProductRecord>();

    if (productError || !product) {
      return {
        success: false,
        message: "Produto não encontrado ou indisponível.",
      };
    }

    const minimumQuantity = getEffectiveMinimumOrderQuantity(
      product.min_order_quantity,
    );

    if (quantity < minimumQuantity) {
      return {
        success: false,
        message: `A quantidade mínima deste produto é ${minimumQuantity.toLocaleString(
          "pt-PT",
        )} unidades.`,
      };
    }

    const { data: variant, error: variantError } = await supabaseAdmin
      .from("product_variants")
      .select("id, sku")
      .eq("id", variantId)
      .eq("product_id", product.id)
      .maybeSingle<VariantRecord>();

    if (variantError || !variant) {
      return {
        success: false,
        message: "A variante selecionada não é válida.",
      };
    }

    const selectedPrice = findProductPrice({
      prices: product.product_prices,
      variantId: variant.id,
      quantity,
    });

    if (!selectedPrice || selectedPrice.finalPrice <= 0) {
      return {
        success: false,
        message:
          "Não foi possível determinar o preço desta configuração.",
      };
    }

    const identity = await getIdentity();

    let existingDraftQuery = supabaseAdmin
      .from("product_customization_drafts")
      .select(
        `
          id,
          user_id,
          session_id,
          product_id,
          variant_id,
          quantity,
          logo_storage_path,
          status
        `,
      )
      .eq("product_id", product.id)
      .eq("variant_id", variant.id)
      .eq("quantity", quantity)
      .eq("status", "characteristics")
      .eq("flow_step", "characteristics")
      .order("updated_at", { ascending: false })
      .limit(1);

    existingDraftQuery = identity.userId
      ? existingDraftQuery.eq("user_id", identity.userId)
      : existingDraftQuery.eq("session_id", identity.sessionId);

    const { data: existingDraft } =
      await existingDraftQuery.maybeSingle<ExistingDraftRecord>();

    let draftId: string;

    if (existingDraft) {
      draftId = existingDraft.id;

      await supabaseAdmin
        .from("product_customization_drafts")
        .update({
          status: "personalizing",
          flow_step: "personalization",
          personalization_started_at: new Date().toISOString(),
        })
        .eq("id", draftId);
    } else {
      const productSubtotal = roundMoney(
        selectedPrice.finalPrice * quantity,
      );

      const { data: draft, error: draftError } = await supabaseAdmin
        .from("product_customization_drafts")
        .insert({
          user_id: identity.userId,
          session_id: identity.sessionId,
          product_id: product.id,
          variant_id: variant.id,
          supplier_id: product.supplier_id,
          quantity,
          supplier_product_reference: product.sku,
          supplier_sku: variant.sku,
          product_unit_price: selectedPrice.finalPrice,
          personalization_unit_price: 0,
          setup_cost: 0,
          extras_total: 0,
          estimated_total: productSubtotal,
          currency: selectedPrice.currency,
          artwork_status: "draft",
          artwork_approved: false,
          status: "personalizing",
          flow_step: "personalization",
          characteristics_completed_at: new Date().toISOString(),
          personalization_started_at: new Date().toISOString(),
          personalization_data: {
            pricingStatus: "product_price_confirmed",
          },
          metadata: {
            source: "product_characteristics",
            productSlug: product.slug,
          },
        })
        .select("id")
        .single<{ id: string }>();

      if (draftError || !draft) {
        return {
          success: false,
          message:
            draftError?.message ??
            "Não foi possível iniciar a personalização.",
        };
      }

      draftId = draft.id;
    }

    redirectUrl =
      `/produto/${product.slug}/personalizar` +
      `?draft=${encodeURIComponent(draftId)}` +
      `&cor=${encodeURIComponent(variant.id)}` +
      `&quantidade=${encodeURIComponent(String(quantity))}`;
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? `Erro ao iniciar a personalização: ${error.message}`
          : "Ocorreu um erro inesperado.",
    };
  }

  if (redirectUrl) {
    redirect(redirectUrl);
  }

  return {
    success: false,
    message: "Não foi possível iniciar a personalização.",
  };
}

export async function saveCustomizationDraftAction(
  formData: FormData,
): Promise<SaveCustomizationDraftResult> {
  let newlyUploadedStoragePath: string | null = null;

  try {
    const draftId = getOptionalString(formData, "draftId");
    const productId = getRequiredString(formData, "productId");
    const productSlug = getRequiredString(formData, "productSlug");
    const variantId = getRequiredString(formData, "variantId");

    const sourceLocationId = getRequiredString(
      formData,
      "sourceLocationId",
    );

    const techniqueName = getRequiredString(
      formData,
      "techniqueName",
    );

    const componentName = getOptionalString(
      formData,
      "componentName",
    );

    const locationName = getOptionalString(formData, "locationName");
    const serviceCode = getOptionalString(formData, "serviceCode");
    const tableCode = getOptionalString(formData, "tableCode");

    const tableCodeOption = getOptionalString(
      formData,
      "tableCodeOption",
    );

    const quantity = Math.floor(
      getRequiredNumber(formData, "quantity"),
    );

    const extrasTotal =
      getOptionalNumber(formData, "extrasTotal") ?? 0;

    const printingWidthMm = getOptionalNumber(
      formData,
      "printingWidthMm",
    );

    const printingHeightMm = getOptionalNumber(
      formData,
      "printingHeightMm",
    );

    const logoPositionX = getOptionalNumber(
      formData,
      "logoPositionX",
    );

    const logoPositionY = getOptionalNumber(
      formData,
      "logoPositionY",
    );

    const logoScale = getOptionalNumber(formData, "logoScale");

    const logoRotation =
      getOptionalNumber(formData, "logoRotation") ?? 0;

    const logoWidthMm = getOptionalNumber(formData, "logoWidthMm");

    const logoHeightMm = getOptionalNumber(
      formData,
      "logoHeightMm",
    );

    const needsDesignHelp = getBoolean(
      formData,
      "needsDesignHelp",
    );

    const extraProof = getBoolean(formData, "extraProof");
    const nominative = getBoolean(formData, "nominative");

    const internalReference = getOptionalString(
      formData,
      "internalReference",
    );

    const notes = getOptionalString(formData, "notes");

    const printColorMode = getOptionalString(
      formData,
      "printColorMode",
    );
    const printColorsRaw = getOptionalString(formData, "printColors");
    let printColors: Array<{ code: string; hex: string }> = [];

    if (printColorsRaw) {
      try {
        const parsedColors: unknown = JSON.parse(printColorsRaw);

        if (!Array.isArray(parsedColors)) {
          throw new Error("Formato de cores inválido.");
        }

        printColors = parsedColors
          .filter(
            (color): color is { code: string; hex: string } =>
              typeof color === "object" &&
              color !== null &&
              typeof (color as { code?: unknown }).code === "string" &&
              typeof (color as { hex?: unknown }).hex === "string" &&
              /^#[0-9a-f]{6}$/i.test(
                (color as { hex: string }).hex,
              ),
          )
          .map((color) => ({
            code: color.code.trim().slice(0, 80),
            hex: color.hex.toUpperCase(),
          }))
          .filter((color) => color.code.length > 0)
          .slice(0, 10);
      } catch {
        return {
          success: false,
          message: "A seleção de cores da personalização não é válida.",
          draftId: null,
          redirectUrl: null,
        };
      }
    }

    const selectedColorCount = getSelectedColorCount(printColorMode);
    const tableOptionColorCount = getTableOptionColorCount(tableCodeOption);

    if (selectedColorCount !== null && printColors.length !== selectedColorCount) {
      return {
        success: false,
        message: `Seleciona exatamente ${selectedColorCount} ${selectedColorCount === 1 ? "cor de impressão" : "cores de impressão"}.`,
        draftId: null,
        redirectUrl: null,
      };
    }

    if (
      selectedColorCount !== null &&
      tableOptionColorCount !== null &&
      selectedColorCount !== tableOptionColorCount
    ) {
      return {
        success: false,
        message: "O número de cores não corresponde à opção de personalização selecionada.",
        draftId: null,
        redirectUrl: null,
      };
    }

    const technicalPreviewUrl = getOptionalString(
      formData,
      "technicalPreviewUrl",
    );

    if (quantity <= 0) {
      return {
        success: false,
        message: "A quantidade indicada não é válida.",
        draftId: null,
        redirectUrl: null,
      };
    }

    const identity = await getIdentity();
    const supabaseAdmin = createSupabaseAdminClient();

    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select(
        `
          id,
          slug,
          sku,
          name,
          supplier_id,
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
      .eq("slug", productSlug)
      .eq("status", "active")
      .eq("is_active", true)
      .maybeSingle<ProductRecord>();

    if (productError || !product) {
      return {
        success: false,
        message: "Produto não encontrado ou indisponível.",
        draftId: null,
        redirectUrl: null,
      };
    }

    const minimumQuantity = getEffectiveMinimumOrderQuantity(
      product.min_order_quantity,
    );

    if (quantity < minimumQuantity) {
      return {
        success: false,
        message: `A quantidade mínima deste produto é ${minimumQuantity.toLocaleString(
          "pt-PT",
        )} unidades.`,
        draftId: null,
        redirectUrl: null,
      };
    }

    const { data: variant, error: variantError } = await supabaseAdmin
      .from("product_variants")
      .select("id, sku")
      .eq("id", variantId)
      .eq("product_id", product.id)
      .maybeSingle<VariantRecord>();

    if (variantError || !variant) {
      return {
        success: false,
        message: "A variante selecionada não é válida.",
        draftId: null,
        redirectUrl: null,
      };
    }

    const selectedPrice = findProductPrice({
      prices: product.product_prices,
      variantId: variant.id,
      quantity,
    });

    if (!selectedPrice || selectedPrice.finalPrice <= 0) {
      return {
        success: false,
        message:
          "Não foi possível confirmar o preço atual do produto.",
        draftId: null,
        redirectUrl: null,
      };
    }

    if (!tableCode) {
      return {
        success: false,
        message: "Não foi possível identificar a tabela do fornecedor desta personalização.",
        draftId: null,
        redirectUrl: null,
      };
    }

    const safeTableCode = tableCode.replace(/[(),]/g, "");
    const safeTableCodeOption = tableCodeOption?.replace(/[(),]/g, "") ?? null;
    const priceFilters = [
      `table_code.eq.${safeTableCode}`,
      `table_code_option.eq.${safeTableCode}`,
      ...(safeTableCodeOption
        ? [`table_code_option.eq.${safeTableCodeOption}`]
        : []),
    ];
    const { data: priceTiers, error: priceTierError } = await supabaseAdmin
      .from("printing_price_tables")
      .select(
        "id,table_code,table_code_option,technique_code,technique_name,quantity_min,quantity_max,supplier_price,final_price,supplier_handling_cost,handling_cost,handling_cost_code,currency,price_by_color,price_by_area,max_colors,area_cm2,is_manual_override,pricing_rule_id,handling_is_manual_override",
      )
      .eq("supplier_id", product.supplier_id)
      .eq("is_active", true)
      .or(priceFilters.join(","))
      .returns<CustomizationPriceTier[]>();

    const { data: pricingRules } = await supabaseAdmin
      .from("pricing_rules")
      .select("*")
      .eq("is_active", true)
      .in("price_type", ["personalization", "setup"])
      .returns<PricingRule[]>();

    const confirmedCustomizationPrice = resolveCustomizationPrice({
      tiers: priceTiers ?? [],
      rules: pricingRules ?? [],
      supplierId: product.supplier_id,
      productId: product.id,
      variantId: variant.id,
      tableCode,
      tableCodeOption,
      techniqueName,
      quantity,
      colors: selectedColorCount,
      areaCm2:
        printingWidthMm && printingHeightMm
          ? (printingWidthMm * printingHeightMm) / 100
          : null,
    });

    if (priceTierError || !confirmedCustomizationPrice) {
      return {
        success: false,
        message: "Não foi possível confirmar o preço do fornecedor desta personalização para a quantidade selecionada.",
        draftId: null,
        redirectUrl: null,
      };
    }

    const personalizationUnitPrice =
      confirmedCustomizationPrice.personalizationUnitPrice;
    const setupCost = confirmedCustomizationPrice.setupCost;

    const { data: location, error: locationError } =
      await supabaseAdmin
        .from("product_customization_locations")
        .select(
          `
            id,
            product_id,
            variant_id,
            external_location_id,
            location_name,
            location_code,
            max_printing_area_mm,
            max_area_cm2,
            raw_payload
          `,
        )
        .eq("id", sourceLocationId)
        .eq("product_id", product.id)
        .eq("is_active", true)
        .maybeSingle<LocationRecord>();

    if (locationError || !location) {
      return {
        success: false,
        message:
          "A área de personalização selecionada não é válida.",
        draftId: null,
        redirectUrl: null,
      };
    }

    if (
      location.variant_id &&
      location.variant_id !== variant.id
    ) {
      return {
        success: false,
        message:
          "A área de personalização não pertence à variante selecionada.",
        draftId: null,
        redirectUrl: null,
      };
    }

    const { data: techniqueData } = await supabaseAdmin
      .from("printing_techniques")
      .select("id, name")
      .ilike("name", techniqueName)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle<PrintingTechniqueRecord>();

    const printingTechnique = techniqueData ?? null;

    const resolvedServiceCode = await resolveCustomizationServiceCode({
      supabaseAdmin,
      productId: product.id,
      variantId: variant.id,
      locationId: location.id,
      locationName:
        locationName ?? location.location_name ?? location.location_code,
      techniqueName,
      tableCode: confirmedCustomizationPrice.tableCode ?? tableCode,
      tableCodeOption:
        confirmedCustomizationPrice.tableCodeOption ?? tableCodeOption,
      priceTableId: confirmedCustomizationPrice.priceTableId,
      selectedColorCount,
      currentServiceCode: serviceCode,
    });

    if (!resolvedServiceCode) {
      return {
        success: false,
        message:
          "Não foi possível identificar de forma inequívoca a opção de personalização do fornecedor. Seleciona novamente a área e a técnica.",
        draftId: null,
        redirectUrl: null,
      };
    }

    let existingDraft: ExistingDraftRecord | null = null;

    if (draftId) {
      const { data: draftData, error: draftError } =
        await supabaseAdmin
          .from("product_customization_drafts")
          .select(
            `
              id,
              user_id,
              session_id,
              product_id,
              variant_id,
              quantity,
              logo_storage_path,
              status
            `,
          )
          .eq("id", draftId)
          .eq("product_id", product.id)
          .maybeSingle<ExistingDraftRecord>();

      if (draftError || !draftData) {
        return {
          success: false,
          message: "A configuração iniciada não foi encontrada.",
          draftId: null,
          redirectUrl: null,
        };
      }

      if (
        !draftBelongsToIdentity({
          draft: draftData,
          userId: identity.userId,
          sessionId: identity.sessionId,
        })
      ) {
        return {
          success: false,
          message: "Não tens acesso a esta configuração.",
          draftId: null,
          redirectUrl: null,
        };
      }

      if (
        !["characteristics", "personalizing"].includes(
          draftData.status,
        )
      ) {
        return {
          success: false,
          message:
            "Esta configuração já foi concluída ou deixou de estar disponível.",
          draftId: null,
          redirectUrl: null,
        };
      }

      if (
        draftData.variant_id !== variant.id ||
        draftData.quantity !== quantity
      ) {
        return {
          success: false,
          message:
            "A variante ou quantidade não corresponde à configuração iniciada.",
          draftId: null,
          redirectUrl: null,
        };
      }

      existingDraft = draftData;
    }

    const logoFile = getFileFromFormData(formData);

    let logoStoragePath =
      existingDraft?.logo_storage_path ?? null;

    let logoFileName: string | null = null;
    let logoMimeType: string | null = null;

    if (logoFile) {
      validateFile(logoFile);

      const safeFileName = sanitizeFileName(logoFile.name);

      logoStoragePath = [
        identity.userId ?? `session-${identity.sessionId}`,
        product.id,
        crypto.randomUUID(),
        safeFileName,
      ].join("/");

      const { error: uploadError } = await supabaseAdmin.storage
        .from(ARTWORK_BUCKET)
        .upload(logoStoragePath, logoFile, {
          contentType: logoFile.type,
          upsert: false,
          cacheControl: "3600",
        });

      if (uploadError) {
        return {
          success: false,
          message: `Não foi possível guardar o logótipo: ${uploadError.message}`,
          draftId: null,
          redirectUrl: null,
        };
      }

      newlyUploadedStoragePath = logoStoragePath;
      logoFileName = logoFile.name;
      logoMimeType = logoFile.type;
    }

    const productUnitPrice = selectedPrice.finalPrice;
    const productSubtotal = roundMoney(productUnitPrice * quantity);

    const personalizationSubtotal = roundMoney(
      personalizationUnitPrice * quantity,
    );

    const estimatedTotal = roundMoney(
      productSubtotal +
        personalizationSubtotal +
        setupCost +
        extrasTotal,
    );

    const printingAreaMm2 =
      printingWidthMm && printingHeightMm
        ? printingWidthMm * printingHeightMm
        : null;

    const logoArea =
      logoWidthMm && logoHeightMm
        ? logoWidthMm * logoHeightMm
        : null;

    const draftPayload = {
      user_id: identity.userId,
      session_id: identity.sessionId,
      product_id: product.id,
      variant_id: variant.id,
      supplier_id: product.supplier_id,
      quantity,
      location_id: location.id,
      printing_technique_id: printingTechnique?.id ?? null,
      component_name: componentName,
      location_name:
        locationName ??
        location.location_name ??
        location.location_code,
      technique_name: techniqueName,
      supplier_product_reference: product.sku,
      supplier_sku: variant.sku,
      service_code: resolvedServiceCode,
      table_code: confirmedCustomizationPrice.tableCode,
      table_code_option: confirmedCustomizationPrice.tableCodeOption,
      handling_cost_code: confirmedCustomizationPrice.handlingCostCode,
      printing_area_label: location.max_printing_area_mm,
      printing_width_mm: printingWidthMm,
      printing_height_mm: printingHeightMm,
      printing_area_mm2: printingAreaMm2,
      product_unit_price: productUnitPrice,
      personalization_unit_price: personalizationUnitPrice,
      setup_cost: setupCost,
      extras_total: extrasTotal,
      estimated_total: estimatedTotal,
      currency: selectedPrice.currency,
      logo_file_name:
        logoFileName ??
        (existingDraft?.logo_storage_path
          ? "Logótipo carregado"
          : null),
      logo_mime_type: logoMimeType,
      logo_storage_path: logoStoragePath,
      logo_url: null,
      technical_preview_url: technicalPreviewUrl,
      logo_position_x: logoPositionX,
      logo_position_y: logoPositionY,
      logo_scale: logoScale,
      logo_rotation: logoRotation,
      logo_width_mm: logoWidthMm,
      logo_height_mm: logoHeightMm,
      logo_area: logoArea,
      artwork_status: logoStoragePath ? "uploaded" : "draft",
      artwork_approved: false,
      status: "ready_for_review",
      flow_step: "review",
      personalization_completed_at: new Date().toISOString(),
      review_completed_at: new Date().toISOString(),
      personalization_data: {
        sourceLocationId: location.id,
        externalLocationId: location.external_location_id,
        techniqueName,
        componentName,
        locationName,
        serviceCode: resolvedServiceCode,
        tableCode: confirmedCustomizationPrice.tableCode,
        tableCodeOption: confirmedCustomizationPrice.tableCodeOption,
        needsDesignHelp,
        extraProof,
        nominative,
        internalReference,
        notes,
        printColorMode,
        printColors,
        pricing: {
          priceTableId: confirmedCustomizationPrice.priceTableId,
          supplierPersonalizationUnitPrice:
            confirmedCustomizationPrice.supplierPersonalizationUnitPrice,
          personalizationUnitPrice,
          supplierSetupCost: confirmedCustomizationPrice.supplierSetupCost,
          setupCost,
          quantityMin: confirmedCustomizationPrice.quantityMin,
          quantityMax: confirmedCustomizationPrice.quantityMax,
          personalizationPricingRuleId:
            confirmedCustomizationPrice.personalizationPricingRuleId,
          setupPricingRuleId:
            confirmedCustomizationPrice.setupPricingRuleId,
          confirmedAt: new Date().toISOString(),
        },
        pricingStatus: "estimated",
      },
      metadata: {
        source: "product_customization_editor",
        productSlug,
      },
    };

    let savedDraftId: string;

    if (existingDraft) {
      const { data: updatedDraft, error: updateError } =
        await supabaseAdmin
          .from("product_customization_drafts")
          .update(draftPayload)
          .eq("id", existingDraft.id)
          .select("id")
          .single<{ id: string }>();

      if (updateError || !updatedDraft) {
        if (newlyUploadedStoragePath) {
          await supabaseAdmin.storage
            .from(ARTWORK_BUCKET)
            .remove([newlyUploadedStoragePath]);
        }

        return {
          success: false,
          message:
            updateError?.message ??
            "Não foi possível concluir a personalização.",
          draftId: null,
          redirectUrl: null,
        };
      }

      savedDraftId = updatedDraft.id;

      if (
        newlyUploadedStoragePath &&
        existingDraft.logo_storage_path &&
        existingDraft.logo_storage_path !== newlyUploadedStoragePath
      ) {
        await supabaseAdmin.storage
          .from(ARTWORK_BUCKET)
          .remove([existingDraft.logo_storage_path]);
      }
    } else {
      const { data: createdDraft, error: createError } =
        await supabaseAdmin
          .from("product_customization_drafts")
          .insert(draftPayload)
          .select("id")
          .single<{ id: string }>();

      if (createError || !createdDraft) {
        if (newlyUploadedStoragePath) {
          await supabaseAdmin.storage
            .from(ARTWORK_BUCKET)
            .remove([newlyUploadedStoragePath]);
        }

        return {
          success: false,
          message:
            createError?.message ??
            "Não foi possível guardar a personalização.",
          draftId: null,
          redirectUrl: null,
        };
      }

      savedDraftId = createdDraft.id;
    }

    const cartFormData = new FormData();

    cartFormData.set("productId", product.id);
    cartFormData.set("variantId", variant.id);
    cartFormData.set("quantity", String(quantity));
    cartFormData.set("customizationDraftId", savedDraftId);
    cartFormData.set("printingTechniqueId", "");
    cartFormData.set("personalizationNotes", notes ?? "");

    const cartInitialState: AddToCartActionState = {
      success: false,
      message: "",
    };

    const cartResult = await addToCartAction(
      cartInitialState,
      cartFormData,
    );

    if (!cartResult.success) {
      await supabaseAdmin
        .from("product_customization_drafts")
        .update({
          status: "personalizing",
          flow_step: "personalization",
          converted_cart_item_id: null,
          converted_at: null,
        })
        .eq("id", savedDraftId);

      return {
        success: false,
        message: cartResult.message,
        draftId: savedDraftId,
        redirectUrl: null,
      };
    }

    return {
      success: true,
      message:
        "Maquete confirmada e encomenda preparada para checkout.",
      draftId: savedDraftId,
      redirectUrl: "/checkout",
    };
  } catch (error) {
    if (newlyUploadedStoragePath) {
      try {
        const supabaseAdmin = createSupabaseAdminClient();

        await supabaseAdmin.storage
          .from(ARTWORK_BUCKET)
          .remove([newlyUploadedStoragePath]);
      } catch {
        // Mantém o erro principal.
      }
    }

    return {
      success: false,
      message:
        error instanceof Error
          ? `Erro ao confirmar a maquete: ${error.message}`
          : "Ocorreu um erro inesperado ao confirmar a maquete.",
      draftId: null,
      redirectUrl: null,
    };
  }
}
