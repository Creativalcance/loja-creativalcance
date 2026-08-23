import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupplierServiceCode } from "@/lib/stricker/service-code";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

type SupplierCustomizationOption = {
  service_code: string;
  product_id: string;
  variant_id: string | null;
  location_id: string | null;
  location_name: string | null;
  customization_type_name: string | null;
  table_code: string | null;
  table_code_option: string | null;
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
  currentServiceCode?: string | null;
};

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

function getOptionScore(
  option: SupplierCustomizationOption,
  params: ResolveCustomizationServiceCodeParams,
): number {
  let score = 0;

  if (
    isSupplierServiceCode(params.currentServiceCode) &&
    option.service_code === params.currentServiceCode
  ) {
    score += 10_000;
  }

  if (params.variantId && option.variant_id === params.variantId) {
    score += 1_000;
  } else if (option.variant_id) {
    return -1;
  }

  if (params.locationId && option.location_id === params.locationId) {
    score += 500;
  }

  if (
    params.tableCodeOption &&
    normalize(option.table_code_option) === normalize(params.tableCodeOption)
  ) {
    score += 400;
  }

  if (
    params.tableCode &&
    normalize(option.table_code) === normalize(params.tableCode)
  ) {
    score += 300;
  }

  if (
    codesBelongToSameFamily(option.table_code_option, params.tableCodeOption) ||
    codesBelongToSameFamily(option.table_code, params.tableCode) ||
    codesBelongToSameFamily(option.table_code_option, params.tableCode) ||
    codesBelongToSameFamily(option.table_code, params.tableCodeOption)
  ) {
    score += 150;
  }

  if (
    params.techniqueName &&
    normalize(option.customization_type_name) === normalize(params.techniqueName)
  ) {
    score += 100;
  }

  if (locationNamesMatch(option.location_name, params.locationName)) {
    score += 80;
  }

  if (option.is_default) {
    score += 10;
  }

  return score;
}

export async function resolveCustomizationServiceCode(
  params: ResolveCustomizationServiceCodeParams,
): Promise<string | null> {
  const { data, error } = await params.supabaseAdmin
    .from("product_customization_options")
    .select(
      "service_code,product_id,variant_id,location_id,location_name,customization_type_name,table_code,table_code_option,is_default",
    )
    .eq("product_id", params.productId)
    .eq("is_active", true);

  if (error) {
    throw new Error(
      `Não foi possível validar a opção de personalização: ${error.message}`,
    );
  }

  const ranked = ((data ?? []) as SupplierCustomizationOption[])
    .filter((option) => isSupplierServiceCode(option.service_code))
    .map((option) => ({
      option,
      score: getOptionScore(option, params),
    }))
    .filter((entry) => entry.score >= 0)
    .sort((left, right) => right.score - left.score);

  if (ranked.length === 0 || ranked[0].score === 0) {
    return null;
  }

  const bestScore = ranked[0].score;
  const bestServiceCodes = new Set(
    ranked
      .filter((entry) => entry.score === bestScore)
      .map((entry) => entry.option.service_code),
  );

  return bestServiceCodes.size === 1
    ? ranked[0].option.service_code
    : null;
}
