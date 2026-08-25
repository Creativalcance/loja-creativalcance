import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupplierServiceCode } from "@/lib/stricker/service-code";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

type SupplierCustomizationOption = {
  service_code: string;
  product_id: string;
  variant_id: string | null;
  location_id: string | null;
  printing_price_table_id: string | null;
  location_name: string | null;
  customization_type_name: string | null;
  table_code: string | null;
  table_code_option: string | null;
  max_colors: number | null;
  is_default: boolean;
};

export type ResolveCustomizationServiceCodeParams = {
  supabaseAdmin: SupabaseAdminClient;
  productId: string;
  variantId: string | null;
  locationId: string | null;
  locationName: string | null;
  techniqueName: string | null;
  tableCode: string | null;
  tableCodeOption: string | null;
  priceTableId?: string | null;
  selectedColorCount?: number | null;
  currentServiceCode?: string | null;
};

export function getCustomizationServiceCodeHints(value: unknown): {
  priceTableId: string | null;
  selectedColorCount: number | null;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { priceTableId: null, selectedColorCount: null };
  }

  const data = value as Record<string, unknown>;
  const pricing =
    data.pricing && typeof data.pricing === "object" && !Array.isArray(data.pricing)
      ? (data.pricing as Record<string, unknown>)
      : {};
  const priceTableId =
    typeof pricing.priceTableId === "string" && pricing.priceTableId.trim()
      ? pricing.priceTableId.trim()
      : null;
  const printColorMode =
    typeof data.printColorMode === "string" ? data.printColorMode : "";
  const parsedColorCount = printColorMode.startsWith("colors:")
    ? Number(printColorMode.split(":")[1])
    : null;

  return {
    priceTableId,
    selectedColorCount:
      parsedColorCount && Number.isInteger(parsedColorCount) && parsedColorCount > 0
        ? parsedColorCount
        : null,
  };
}

function normalize(value: string | null): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function codesBelongToSameFamily(
  left: string | null,
  right: string | null,
): boolean {
  const normalizedLeft = normalize(left);
  const normalizedRight = normalize(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  return (
    normalizedLeft === normalizedRight ||
    normalizedLeft.startsWith(`${normalizedRight}-`) ||
    normalizedRight.startsWith(`${normalizedLeft}-`)
  );
}

function locationNamesMatch(
  left: string | null,
  right: string | null,
): boolean {
  const normalizedLeft = normalize(left);
  const normalizedRight = normalize(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

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
    corpo: ["body"],
    body: ["corpo"],
  };

  return (aliases[normalizedLeft] ?? []).includes(normalizedRight);
}

function getUniqueServiceCode(
  options: SupplierCustomizationOption[],
): string | null {
  const codes = new Set(options.map((option) => option.service_code));
  return codes.size === 1 ? options[0]?.service_code ?? null : null;
}

function getOptionColorCount(option: SupplierCustomizationOption): number | null {
  const match = option.table_code_option?.trim().match(/-(\d+)$/);
  if (match) {
    const count = Number(match[1]);
    if (Number.isInteger(count) && count > 0) return count;
  }

  return option.max_colors && option.max_colors > 0
    ? option.max_colors
    : null;
}

function narrowRequired(
  candidates: SupplierCustomizationOption[],
  requested: boolean,
  predicate: (option: SupplierCustomizationOption) => boolean,
): SupplierCustomizationOption[] {
  if (!requested) return candidates;
  return candidates.filter(predicate);
}

export async function resolveCustomizationServiceCode(
  params: ResolveCustomizationServiceCodeParams,
): Promise<string | null> {
  const { data, error } = await params.supabaseAdmin
    .from("product_customization_options")
    .select(
      "service_code,product_id,variant_id,location_id,printing_price_table_id,location_name,customization_type_name,table_code,table_code_option,max_colors,is_default",
    )
    .eq("product_id", params.productId)
    .eq("is_active", true);

  if (error) {
    throw new Error(
      `Não foi possível validar a opção de personalização: ${error.message}`,
    );
  }

  const productOptions = ((data ?? []) as SupplierCustomizationOption[]).filter(
    (option) => isSupplierServiceCode(option.service_code),
  );

  // O ServiceCode recebido do editor é apenas uma pista. Tem de continuar a
  // corresponder à variante, localização, técnica, tabela e número de cores
  // selecionados; um código antigo não pode sobrepor-se a essas escolhas.
  if (isSupplierServiceCode(params.currentServiceCode)) {
    const exactCurrentServiceCode = productOptions.filter(
      (option) => option.service_code === params.currentServiceCode,
    );

    if (exactCurrentServiceCode.length > 0) {
      productOptions.splice(0, productOptions.length, ...exactCurrentServiceCode);
    }
  }

  let candidates = productOptions;

  const exactVariant = candidates.filter(
    (option) => params.variantId && option.variant_id === params.variantId,
  );
  if (exactVariant.length > 0) {
    candidates = exactVariant;
  } else {
    candidates = candidates.filter((option) => !option.variant_id);
  }

  const exactLocation = candidates.filter(
    (option) => params.locationId && option.location_id === params.locationId,
  );
  if (exactLocation.length > 0) {
    candidates = exactLocation;
  } else if (params.locationName) {
    const matchingLocationName = candidates.filter((option) =>
      locationNamesMatch(option.location_name, params.locationName),
    );
    if (matchingLocationName.length > 0) candidates = matchingLocationName;
  }

  candidates = narrowRequired(
    candidates,
    Boolean(params.priceTableId),
    (option) => option.printing_price_table_id === params.priceTableId,
  );

  candidates = narrowRequired(
    candidates,
    Boolean(params.tableCodeOption),
    (option) =>
      normalize(option.table_code_option) === normalize(params.tableCodeOption),
  );

  candidates = narrowRequired(
    candidates,
    Boolean(params.tableCode),
    (option) =>
      normalize(option.table_code) === normalize(params.tableCode),
  );

  if (params.selectedColorCount && params.selectedColorCount > 0) {
    candidates = candidates.filter(
      (option) => getOptionColorCount(option) === params.selectedColorCount,
    );
  }

  if (params.techniqueName) {
    candidates = candidates.filter(
      (option) =>
        normalize(option.customization_type_name) === normalize(params.techniqueName),
    );
  }

  const uniqueCode = getUniqueServiceCode(candidates);
  if (uniqueCode) return uniqueCode;

  if (params.tableCodeOption || candidates.length === 0) {
    return null;
  }

  const sameFamily = productOptions.filter(
    (option) =>
      codesBelongToSameFamily(option.table_code, params.tableCode) ||
      codesBelongToSameFamily(option.table_code_option, params.tableCodeOption),
  );

  if (sameFamily.length === 0) {
    return null;
  }

  return getUniqueServiceCode(sameFamily);
}
