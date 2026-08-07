"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  calculateSellingPrice,
  type PricingMode,
} from "@/lib/pricing/calculate-selling-price";

type PriceEntityType = "product_price" | "printing_price" | "printing_setup";

type ProductPriceRow = {
  id: string;
  supplier_price: number;
  margin_percentage: number | null;
  markup_percentage: number | null;
  fixed_markup: number | null;
  manual_price: number | null;
  final_price: number;
  pricing_mode: PricingMode;
  is_manual_override: boolean;
  override_reason: string | null;
};

type PrintingPriceRow = {
  id: string;
  supplier_price: number;
  handling_cost: number | null;
  margin_percentage: number | null;
  markup_percentage: number | null;
  fixed_markup: number | null;
  manual_price: number | null;
  final_price: number;
  pricing_mode: PricingMode;
  is_manual_override: boolean;
  override_reason: string | null;
};

export type UpdateAdminPriceState = {
  success: boolean;
  message: string;
};

function getFormString(
  formData: FormData,
  key: string,
): string | null {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const cleanValue = value.trim();

  return cleanValue.length > 0 ? cleanValue : null;
}

function getFormNumber(
  formData: FormData,
  key: string,
): number | null {
  const value = getFormString(formData, key);

  if (!value) {
    return null;
  }

  const parsed = Number(
    value
      .replace(/\s/g, "")
      .replace(",", "."),
  );

  return Number.isFinite(parsed) ? parsed : null;
}

function getPricingMode(value: string | null): PricingMode | null {
  if (
    value === "automatic" ||
    value === "margin" ||
    value === "markup" ||
    value === "fixed_markup" ||
    value === "manual"
  ) {
    return value;
  }

  return null;
}

async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

async function updateProductPrice(params: {
  entityId: string;
  pricingMode: PricingMode;
  marginPercentage: number | null;
  markupPercentage: number | null;
  fixedMarkup: number | null;
  manualPrice: number | null;
  reason: string | null;
  changedBy: string | null;
}): Promise<void> {
  const supabaseAdmin = createSupabaseAdminClient();

  const { data, error } = await supabaseAdmin
    .from("product_prices")
    .select(
      `
        id,
        supplier_price,
        margin_percentage,
        markup_percentage,
        fixed_markup,
        manual_price,
        final_price,
        pricing_mode,
        is_manual_override,
        override_reason
      `,
    )
    .eq("id", params.entityId)
    .single<ProductPriceRow>();

  if (error || !data) {
    throw new Error(
      error?.message ?? "O preço do produto não foi encontrado.",
    );
  }

  const automaticMargin =
    params.marginPercentage ??
    data.margin_percentage ??
    0;

  const calculatedPrice = calculateSellingPrice({
    supplierPrice: data.supplier_price,
    handlingCost: 0,
    pricingMode: params.pricingMode,
    automaticMarginPercentage: automaticMargin,
    marginPercentage: params.marginPercentage,
    markupPercentage: params.markupPercentage,
    fixedMarkup: params.fixedMarkup,
    manualPrice: params.manualPrice,
    minimumProfit: 0,
    roundingMode: "nearest_cent",
  });

  const isManualOverride = params.pricingMode !== "automatic";

  const nextValues = {
    pricing_mode: params.pricingMode,
    margin_percentage: calculatedPrice.marginPercentage,
    markup_percentage:
      params.pricingMode === "markup"
        ? params.markupPercentage
        : calculatedPrice.markupPercentage,
    fixed_markup:
      params.pricingMode === "fixed_markup"
        ? params.fixedMarkup
        : null,
    manual_price:
      params.pricingMode === "manual"
        ? params.manualPrice
        : null,
    final_price: calculatedPrice.finalPrice,
    is_manual_override: isManualOverride,
    override_reason: params.reason,
    override_updated_at: new Date().toISOString(),
    override_updated_by: params.changedBy,
  };

  const previousValues = {
    pricing_mode: data.pricing_mode,
    margin_percentage: data.margin_percentage,
    markup_percentage: data.markup_percentage,
    fixed_markup: data.fixed_markup,
    manual_price: data.manual_price,
    final_price: data.final_price,
    is_manual_override: data.is_manual_override,
    override_reason: data.override_reason,
  };

  const { error: updateError } = await supabaseAdmin
    .from("product_prices")
    .update(nextValues)
    .eq("id", params.entityId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const { error: logError } = await supabaseAdmin
    .from("price_change_logs")
    .insert({
      entity_type: "product_price",
      entity_id: params.entityId,
      previous_values: previousValues,
      new_values: nextValues,
      reason: params.reason,
      changed_by: params.changedBy,
    });

  if (logError) {
    throw new Error(
      `O preço foi atualizado, mas não foi possível guardar o histórico: ${logError.message}`,
    );
  }
}

async function updatePrintingPrice(params: {
  entityId: string;
  pricingMode: PricingMode;
  marginPercentage: number | null;
  markupPercentage: number | null;
  fixedMarkup: number | null;
  manualPrice: number | null;
  reason: string | null;
  changedBy: string | null;
}): Promise<void> {
  const supabaseAdmin = createSupabaseAdminClient();

  const { data, error } = await supabaseAdmin
    .from("printing_price_tables")
    .select(
      `
        id,
        supplier_price,
        handling_cost,
        margin_percentage,
        markup_percentage,
        fixed_markup,
        manual_price,
        final_price,
        pricing_mode,
        is_manual_override,
        override_reason
      `,
    )
    .eq("id", params.entityId)
    .single<PrintingPriceRow>();

  if (error || !data) {
    throw new Error(
      error?.message ??
        "O preço da personalização não foi encontrado.",
    );
  }

  const automaticMargin =
    params.marginPercentage ??
    data.margin_percentage ??
    0;

  const calculatedPrice = calculateSellingPrice({
    supplierPrice: data.supplier_price,
    handlingCost: 0,
    pricingMode: params.pricingMode,
    automaticMarginPercentage: automaticMargin,
    marginPercentage: params.marginPercentage,
    markupPercentage: params.markupPercentage,
    fixedMarkup: params.fixedMarkup,
    manualPrice: params.manualPrice,
    minimumProfit: 0,
    roundingMode: "nearest_cent",
  });

  const isManualOverride = params.pricingMode !== "automatic";

  const nextValues = {
    pricing_mode: params.pricingMode,
    margin_percentage: calculatedPrice.marginPercentage,
    markup_percentage:
      params.pricingMode === "markup"
        ? params.markupPercentage
        : calculatedPrice.markupPercentage,
    fixed_markup:
      params.pricingMode === "fixed_markup"
        ? params.fixedMarkup
        : null,
    manual_price:
      params.pricingMode === "manual"
        ? params.manualPrice
        : null,
    base_price: calculatedPrice.costPrice,
    final_price: calculatedPrice.finalPrice,
    is_manual_override: isManualOverride,
    override_reason: params.reason,
    override_updated_at: new Date().toISOString(),
    override_updated_by: params.changedBy,
  };

  const previousValues = {
    pricing_mode: data.pricing_mode,
    margin_percentage: data.margin_percentage,
    markup_percentage: data.markup_percentage,
    fixed_markup: data.fixed_markup,
    manual_price: data.manual_price,
    final_price: data.final_price,
    is_manual_override: data.is_manual_override,
    override_reason: data.override_reason,
  };

  const { error: updateError } = await supabaseAdmin
    .from("printing_price_tables")
    .update(nextValues)
    .eq("id", params.entityId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const { error: logError } = await supabaseAdmin
    .from("price_change_logs")
    .insert({
      entity_type: "printing_price",
      entity_id: params.entityId,
      previous_values: previousValues,
      new_values: nextValues,
      reason: params.reason,
      changed_by: params.changedBy,
    });

  if (logError) {
    throw new Error(
      `O preço foi atualizado, mas não foi possível guardar o histórico: ${logError.message}`,
    );
  }
}

async function updatePrintingSetup(params: {
  entityId: string; pricingMode: PricingMode; marginPercentage: number | null;
  markupPercentage: number | null; fixedMarkup: number | null;
  manualPrice: number | null; reason: string | null; changedBy: string | null;
}): Promise<void> {
  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .from("printing_price_tables")
    .select("id,supplier_handling_cost,handling_cost,handling_margin_rate,handling_markup_rate,handling_pricing_mode,handling_manual_price,handling_is_manual_override,handling_override_reason")
    .eq("id", params.entityId).single();
  if (error || !data) throw new Error(error?.message ?? "O setup não foi encontrado.");

  const calculated = calculateSellingPrice({
    supplierPrice: Number(data.supplier_handling_cost ?? 0), handlingCost: 0,
    pricingMode: params.pricingMode,
    automaticMarginPercentage: params.marginPercentage ?? Number(data.handling_margin_rate ?? 0.3) * 100,
    marginPercentage: params.marginPercentage, markupPercentage: params.markupPercentage,
    fixedMarkup: params.fixedMarkup, manualPrice: params.manualPrice,
    minimumProfit: 0, roundingMode: "nearest_cent",
  });
  const nextValues = {
    handling_cost: calculated.finalPrice,
    handling_margin_rate: calculated.marginPercentage / 100,
    handling_markup_rate: calculated.markupPercentage / 100,
    handling_pricing_mode: params.pricingMode,
    handling_manual_price: params.pricingMode === "manual" ? params.manualPrice : null,
    handling_is_manual_override: params.pricingMode !== "automatic",
    handling_override_reason: params.reason,
    handling_override_updated_at: new Date().toISOString(),
    handling_override_updated_by: params.changedBy,
  };
  const { error: updateError } = await supabaseAdmin.from("printing_price_tables").update(nextValues).eq("id", params.entityId);
  if (updateError) throw new Error(updateError.message);
  await supabaseAdmin.from("price_change_logs").insert({
    entity_type: "printing_setup", entity_id: params.entityId,
    previous_values: data, new_values: nextValues,
    reason: params.reason, changed_by: params.changedBy,
  });
}

export async function updateAdminPriceAction(
  _previousState: UpdateAdminPriceState,
  formData: FormData,
): Promise<UpdateAdminPriceState> {
  try {
    const entityType = getFormString(
      formData,
      "entityType",
    ) as PriceEntityType | null;

    const entityId = getFormString(formData, "entityId");
    const pricingMode = getPricingMode(
      getFormString(formData, "pricingMode"),
    );

    const marginPercentage = getFormNumber(
      formData,
      "marginPercentage",
    );

    const markupPercentage = getFormNumber(
      formData,
      "markupPercentage",
    );

    const fixedMarkup = getFormNumber(
      formData,
      "fixedMarkup",
    );

    const manualPrice = getFormNumber(
      formData,
      "manualPrice",
    );

    const reason = getFormString(formData, "reason");

    if (
      entityType !== "product_price" &&
      entityType !== "printing_price" &&
      entityType !== "printing_setup"
    ) {
      return {
        success: false,
        message: "Tipo de preço inválido.",
      };
    }

    if (!entityId) {
      return {
        success: false,
        message: "O identificador do preço é obrigatório.",
      };
    }

    if (!pricingMode) {
      return {
        success: false,
        message: "Selecione um modo de cálculo válido.",
      };
    }

    if (
      pricingMode === "margin" &&
      (
        marginPercentage === null ||
        marginPercentage < 0 ||
        marginPercentage >= 100
      )
    ) {
      return {
        success: false,
        message:
          "A margem deve ser igual ou superior a 0% e inferior a 100%.",
      };
    }

    if (
      pricingMode === "markup" &&
      (
        markupPercentage === null ||
        markupPercentage < 0
      )
    ) {
      return {
        success: false,
        message: "O markup deve ser igual ou superior a 0%.",
      };
    }

    if (
      pricingMode === "fixed_markup" &&
      (
        fixedMarkup === null ||
        fixedMarkup < 0
      )
    ) {
      return {
        success: false,
        message:
          "O valor fixo deve ser igual ou superior a zero.",
      };
    }

    if (
      pricingMode === "manual" &&
      (
        manualPrice === null ||
        manualPrice < 0
      )
    ) {
      return {
        success: false,
        message:
          "O preço manual deve ser igual ou superior a zero.",
      };
    }

    const changedBy = await getAuthenticatedUserId();

    if (entityType === "product_price") {
      await updateProductPrice({
        entityId,
        pricingMode,
        marginPercentage,
        markupPercentage,
        fixedMarkup,
        manualPrice,
        reason,
        changedBy,
      });
    } else if (entityType === "printing_price") {
      await updatePrintingPrice({
        entityId,
        pricingMode,
        marginPercentage,
        markupPercentage,
        fixedMarkup,
        manualPrice,
        reason,
        changedBy,
      });
    } else {
      await updatePrintingSetup({
        entityId, pricingMode, marginPercentage, markupPercentage,
        fixedMarkup, manualPrice, reason, changedBy,
      });
    }

    revalidatePath("/admin/precos");
    revalidatePath("/categorias");
    revalidatePath("/pesquisa");

    return {
      success: true,
      message: "Preço atualizado com sucesso.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o preço.",
    };
  }
}
