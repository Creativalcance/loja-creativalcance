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

function narrowIfMatches(
  candidates: SupplierCustomizationOption[],
  requested: boolean,
  predicate: (option: SupplierCustomizationOption) => boolean,
): SupplierCustomizationOption[] {
  if (!requested) return candidates;

  const matches = candidates.filter(predicate);
  return matches.length > 0 ? matches : candidates;
}

function optionMatchesVariant(
  option: SupplierCustomizationOption,
  variantId: string | null,
): boolean {
  if (!variantId) return option.variant_id === null;
  return option.variant_id === variantId || option.variant_id === null;
}

function optionMatchesLocation(
  option: SupplierCustomizationOption,
  locationId: string | null,
  locationName: string | null,
): boolean {
  if (locationId && option.location_id === locationId) {
    return true;
  }

  if (locationName && locationNamesMatch(option.location_name, locationName)) {
    return true;
  }

  return !locationId && !locationName;
}

function optionMatchesTechnique(
  option: SupplierCustomizationOption,
  techniqueName: string | null,
): boolean {
  if (!techniqueName) return true;
  return normalize(option.customization_type_name) === normalize(techniqueName);
}

function optionMatchesTableFamily(
  option: SupplierCustomizationOption,
  tableCode: string | null,
  tableCodeOption: string | null,
): boolean {
  if (tableCodeOption) {
    if (
      normalize(option.table_code_option) === normalize(tableCodeOption) ||
      codesBelongToSameFamily(option.table_code_option, tableCodeOption)
    ) {
      return true;
    }
  }

  if (tableCode) {
    return (
      codesBelongToSameFamily(option.table_code, tableCode) ||
      codesBelongToSameFamily(option.table_code_option, tableCode)
    );
  }

  return !tableCodeOption;
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

  /*
   * O ServiceCode vem de CustomizationOptions e identifica a combinação
   * produto + localização + técnica do fornecedor. A escolha Pantone é
   * enviada separadamente nos campos Color1...Color5 do ServiceOrderV1.
   * Por isso, quando o editor já transporta um ServiceCode oficial, apenas
   * confirmamos que pertence ao produto/variante/local/técnica/tabela.
   * Não o voltamos a inferir a partir do número ou da referência das cores.
   */
  if (isSupplierServiceCode(params.currentServiceCode)) {
    let currentCandidates = productOptions.filter(
      (option) => option.service_code === params.currentServiceCode,
    );

    currentCandidates = currentCandidates.filter((option) =>
      optionMatchesVariant(option, params.variantId),
    );

    if (params.locationId || params.locationName) {
      currentCandidates = currentCandidates.filter((option) =>
        optionMatchesLocation(option, params.locationId, params.locationName),
      );
    }

    if (params.techniqueName) {
      currentCandidates = currentCandidates.filter((option) =>
        optionMatchesTechnique(option, params.techniqueName),
      );
    }

    if (params.tableCode || params.tableCodeOption) {
      currentCandidates = currentCandidates.filter((option) =>
        optionMatchesTableFamily(option, params.tableCode, params.tableCodeOption),
      );
    }

    if (currentCandidates.length > 0) {
      return params.currentServiceCode;
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

  if (params.techniqueName) {
    const techniqueMatches = candidates.filter(
      (option) =>
        normalize(option.customization_type_name) === normalize(params.techniqueName),
    );
    if (techniqueMatches.length > 0) {
      candidates = techniqueMatches;
    }
  }

  /*
   * printing_price_tables guarda TableCode já especializado por área
   * (ex.: SCR1-01), enquanto CustomizationOptions pode guardar a família
   * base (ex.: SCR1). São a mesma família Stricker, não códigos distintos.
   */
  if (params.tableCode) {
    const tableMatches = candidates.filter(
      (option) =>
        codesBelongToSameFamily(option.table_code, params.tableCode) ||
        codesBelongToSameFamily(option.table_code_option, params.tableCode),
    );
    if (tableMatches.length > 0) {
      candidates = tableMatches;
    }
  }

  if (params.tableCodeOption) {
    const optionMatches = candidates.filter(
      (option) =>
        normalize(option.table_code_option) === normalize(params.tableCodeOption),
    );
    if (optionMatches.length > 0) {
      candidates = optionMatches;
    }
  }

  // O ID interno da tabela ajuda a desempatar, mas nunca pode invalidar um
  // ServiceCode oficial se a sincronização associou a mesma opção a outro
  // registo de preço equivalente.
  candidates = narrowIfMatches(
    candidates,
    Boolean(params.priceTableId),
    (option) => option.printing_price_table_id === params.priceTableId,
  );

  // O número de cores seleciona TableCodeOption/preço. É apenas um critério
  // de desempate quando ainda não existe um ServiceCode transportado pelo editor.
  candidates = narrowIfMatches(
    candidates,
    Boolean(params.selectedColorCount && params.selectedColorCount > 0),
    (option) => getOptionColorCount(option) === params.selectedColorCount,
  );

  const uniqueCode = getUniqueServiceCode(candidates);
  if (uniqueCode) return uniqueCode;

  const sameFamily = productOptions.filter(
    (option) =>
      optionMatchesVariant(option, params.variantId) &&
      optionMatchesTechnique(option, params.techniqueName) &&
      optionMatchesTableFamily(option, params.tableCode, params.tableCodeOption) &&
      (!params.locationId && !params.locationName
        ? true
        : optionMatchesLocation(option, params.locationId, params.locationName)),
  );

  return getUniqueServiceCode(sameFamily);
}
