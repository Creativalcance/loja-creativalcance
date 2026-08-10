import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import ProductCustomizationEditor, {
  type ProductEditorLocation,
  type ProductEditorPrice,
  type ProductEditorVariant,
} from "@/components/product/ProductCustomizationEditor";
import {
  buildStrickerLocationImageUrl,
  buildStrickerPrintingLinesImageUrl,
} from "@/lib/stricker/images";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

type ProductImage = {
  external_url: string | null;
  storage_url: string | null;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
  image_type: string;
};

type ProductPrice = {
  variant_id: string | null;
  final_price: number;
  quantity_min: number;
  quantity_max: number | null;
  currency: string;
};

type ProductVariant = {
  id: string;
  sku: string;
  color_name: string | null;
  color_hex: string | null;
  size: string | null;
  material: string | null;
  optional_image_1_url: string | null;
  optional_image_2_url: string | null;
};

type ProductCustomizationComponent = {
  id: string;
  variant_id: string | null;
  component_code: string | null;
  component_name: string | null;
};

type ProductCustomizationLocation = {
  id: string;
  variant_id: string | null;
  component_id: string | null;
  external_location_id: string;
  location_code: string | null;
  location_name: string | null;
  location_index: number | null;
  max_printing_area_mm: string | null;
  max_area_cm2: number | null;
  location_image_url: string | null;
  location_storage_url: string | null;
  area_image_url: string | null;
  area_storage_url: string | null;
  printing_lines_image_url: string | null;
  printing_lines_storage_url: string | null;
  is_default: boolean;
  is_active: boolean;
  raw_payload: JsonRecord | null;
};

type PrintingPriceTable = {
  id: string;
  table_code: string;
  table_code_option: string | null;
  technique_name: string | null;
  quantity_min: number;
  quantity_max: number | null;
  supplier_price: number;
  final_price: number;
  supplier_handling_cost: number;
  handling_cost: number;
  handling_cost_code: string | null;
  currency: string;
  price_by_area: boolean;
  area_cm2: number | null;
};

type ProductCustomizationOption = {
  id: string;
  variant_id: string | null;
  location_id: string | null;
  customization_type_name: string | null;
  table_code: string | null;
  table_code_option: string | null;
  service_code: string | null;
  is_active: boolean;
};

type ProductDetail = {
  id: string;
  supplier_id: string | null;
  sku: string;
  name: string;
  slug: string;
  short_description: string | null;
  is_customizable: boolean;
  product_images: ProductImage[] | null;
  product_variants: ProductVariant[] | null;
  product_prices: ProductPrice[] | null;
  product_customization_components:
    | ProductCustomizationComponent[]
    | null;
  product_customization_locations:
    | ProductCustomizationLocation[]
    | null;
};

type ProductPersonalizePageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    draft?: string;
    cor?: string;
    quantidade?: string;
    local?: string;
  }>;
};

function getPrimaryImage(product: ProductDetail): ProductImage | null {
  const images = [...(product.product_images ?? [])];

  if (images.length === 0) {
    return null;
  }

  return (
    images.find((image) => image.is_primary) ??
    images.sort((a, b) => a.sort_order - b.sort_order)[0] ??
    null
  );
}

function getPayloadRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as JsonRecord;
}

function getNullableString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function getSlotString(
  record: JsonRecord,
  prefix: string,
  index: number,
): string | null {
  return getNullableString(record[`${prefix}${index}`]);
}

function splitCodes(value: string | null): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(/[,;|]/g)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function normalizeComparable(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function codeBelongsToSlot(
  optionCode: string | null,
  slotCode: string,
): boolean {
  if (!optionCode) {
    return false;
  }

  return (
    optionCode === slotCode ||
    optionCode.startsWith(`${slotCode}-`) ||
    slotCode.startsWith(`${optionCode}-`)
  );
}

function getLocationIndex(
  location: ProductCustomizationLocation,
): number {
  if (location.location_index && location.location_index > 0) {
    return location.location_index;
  }

  const match = location.external_location_id.match(/:L(\d+)$/i);
  const parsed = match?.[1] ? Number(match[1]) : null;

  if (parsed && Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return 1;
}

function getSlotImageFilenames(
  location: ProductCustomizationLocation,
): string[] {
  const payload = getPayloadRecord(location.raw_payload);
  const index = getLocationIndex(location);

  return splitCodes(getSlotString(payload, "AreaImage", index));
}

function getSlotLocationImageFilenames(
  location: ProductCustomizationLocation,
): string[] {
  const payload = getPayloadRecord(location.raw_payload);
  const index = getLocationIndex(location);

  return splitCodes(getSlotString(payload, "LocationImage", index));
}

function buildTechniqueImageUrls(params: {
  location: ProductCustomizationLocation;
  techniqueIndexes: number[];
}): string[] {
  const areaFiles = getSlotImageFilenames(params.location);
  const locationFiles = getSlotLocationImageFilenames(params.location);
  const indexes = params.techniqueIndexes.length > 0
    ? params.techniqueIndexes
    : [0];
  const urls: Array<string | null> = [];

  for (const index of indexes) {
    const locationFile = locationFiles[index] ?? null;
    const areaFile = areaFiles[index] ?? null;

    urls.push(
      buildStrickerPrintingLinesImageUrl(areaFile),
      buildStrickerLocationImageUrl(areaFile),
      buildStrickerLocationImageUrl(locationFile),
      buildStrickerPrintingLinesImageUrl(locationFile),
    );
  }

  return Array.from(
    new Set(urls.filter((url): url is string => Boolean(url))),
  );
}

function getTableCodesForLocation(
  location: ProductCustomizationLocation,
): string[] {
  const payload = getPayloadRecord(location.raw_payload);
  const index = getLocationIndex(location);

  return Array.from(
    new Set(splitCodes(getSlotString(payload, "TableCodes", index))),
  );
}

function buildComponentMap(
  components: ProductCustomizationComponent[],
): Map<string, ProductCustomizationComponent> {
  return new Map(
    components.map((component) => [component.id, component]),
  );
}

function getComponentForLocation(params: {
  location: ProductCustomizationLocation;
  componentsById: Map<string, ProductCustomizationComponent>;
}): ProductCustomizationComponent | null {
  if (!params.location.component_id) {
    return null;
  }

  return (
    params.componentsById.get(params.location.component_id) ?? null
  );
}

function getLocationImageUrl(
  location: ProductCustomizationLocation,
): string | null {
  return (
    location.location_storage_url ??
    location.location_image_url ??
    null
  );
}

function getAreaImageUrl(
  location: ProductCustomizationLocation,
): string | null {
  return location.area_storage_url ?? location.area_image_url ?? null;
}

function getPrintingLinesImageUrl(
  location: ProductCustomizationLocation,
): string | null {
  return (
    location.printing_lines_storage_url ??
    location.printing_lines_image_url
  );
}

function getPreferredLocationPreviewUrl(
  location: ProductCustomizationLocation,
): string | null {
  return (
    location.printing_lines_storage_url ??
    location.printing_lines_image_url ??
    location.area_storage_url ??
    location.area_image_url ??
    location.location_storage_url ??
    location.location_image_url ??
    null
  );
}

function getUniqueCustomizationLocations(
  locations: ProductCustomizationLocation[],
): ProductCustomizationLocation[] {
  const map = new Map<string, ProductCustomizationLocation>();

  for (const location of locations) {
    const key = [
      location.variant_id ?? "color",
      location.component_id ?? "component",
      location.location_code ?? location.location_name ?? location.id,
      location.max_printing_area_mm ?? "area",
    ].join(":");

    if (!map.has(key)) {
      map.set(key, location);
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.is_default && !b.is_default) {
      return -1;
    }

    if (!a.is_default && b.is_default) {
      return 1;
    }

    return getLocationIndex(a) - getLocationIndex(b);
  });
}

function getVariantLabel(variant: ProductVariant | null): string | null {
  if (!variant) {
    return null;
  }

  if (variant.color_name && variant.size) {
    return `${variant.color_name} · ${variant.size}`;
  }

  return variant.color_name ?? variant.size ?? null;
}

function buildEditorLocations(params: {
  locations: ProductCustomizationLocation[];
  componentsById: Map<string, ProductCustomizationComponent>;
  printingPrices: PrintingPriceTable[];
  customizationOptions: ProductCustomizationOption[];
}): ProductEditorLocation[] {
  const rows: ProductEditorLocation[] = [];

  for (const location of params.locations) {
    const component = getComponentForLocation({
      location,
      componentsById: params.componentsById,
    });

    const payload = getPayloadRecord(location.raw_payload);
    const locationIndex = getLocationIndex(location);
    const rawTechniques = splitCodes(
      getSlotString(payload, "CustomizationTypes", locationIndex),
    );
    const rawTableCodes = splitCodes(
      getSlotString(payload, "TableCodes", locationIndex),
    );
    const slotTableCodes = Array.from(new Set(rawTableCodes));

    const locationOptions = params.customizationOptions.filter(
      (option) =>
        option.is_active &&
        (option.location_id === location.id ||
          slotTableCodes.some(
            (slotCode) =>
              codeBelongsToSlot(option.table_code, slotCode) ||
              codeBelongsToSlot(option.table_code_option, slotCode),
          )),
    );

    const optionTechniques = locationOptions
      .map((option) => option.customization_type_name?.trim() ?? "")
      .filter((technique) => technique.length > 0);

    const safeTechniques = Array.from(
      new Set(
        rawTechniques.length > 0
          ? rawTechniques
          : optionTechniques.length > 0
            ? optionTechniques
            : ["Personalização"],
      ),
    );

    for (const technique of safeTechniques) {
      const matchingRawIndexes = rawTechniques.reduce<number[]>(
        (indexes, rawTechnique, index) => {
          if (
            normalizeComparable(rawTechnique) ===
            normalizeComparable(technique)
          ) {
            indexes.push(index);
          }

          return indexes;
        },
        [],
      );

      const techniqueSlotCodes = Array.from(
        new Set(
          matchingRawIndexes
            .map((index) => rawTableCodes[index] ?? null)
            .filter((code): code is string => Boolean(code)),
        ),
      );

      const techniqueOptions = locationOptions.filter((option) =>
        techniqueSlotCodes.length > 0
          ? techniqueSlotCodes.some(
              (slotCode) =>
                codeBelongsToSlot(option.table_code, slotCode) ||
                codeBelongsToSlot(option.table_code_option, slotCode),
            )
          : normalizeComparable(
              option.customization_type_name ?? "",
            ) === normalizeComparable(technique),
      );

      const techniqueTableCodes = Array.from(
        new Set(
          techniqueOptions
            .flatMap((option) => [option.table_code, option.table_code_option])
            .filter((code): code is string => Boolean(code)),
        ),
      );

      const locationName =
        location.location_name ??
        location.location_code ??
        `Local ${getLocationIndex(location)}`;

      const techniqueImageUrls = buildTechniqueImageUrls({
        location,
        techniqueIndexes: matchingRawIndexes,
      });
      const techniqueImageUrl = techniqueImageUrls[0] ?? null;

      rows.push({
        id: `${location.id}:${technique}`,
        source_location_id: location.id,
        variant_id: location.variant_id,
        technique,
        component_name:
          component?.component_name ??
          component?.component_code ??
          null,
        location_name: locationName,
        preview_image_url:
          techniqueImageUrl ?? getPreferredLocationPreviewUrl(location),
        preview_image_urls: techniqueImageUrls,
        location_image_url: getLocationImageUrl(location),
        area_image_url: techniqueImageUrl ?? getAreaImageUrl(location),
        printing_lines_image_url:
          techniqueImageUrl ?? getPrintingLinesImageUrl(location),
        max_printing_area_mm: location.max_printing_area_mm,
        max_area_cm2: location.max_area_cm2,
        table_codes:
          techniqueTableCodes.length > 0
            ? techniqueTableCodes
            : getTableCodesForLocation(location),
        is_recommended: location.is_default,
        price_tiers: params.printingPrices
          .filter((price) => {
            const codeMatches =
              techniqueOptions.length > 0
                ? techniqueOptions.some((option) =>
                    option.table_code_option
                      ? option.table_code_option === price.table_code_option
                      : option.table_code === price.table_code ||
                        option.table_code === price.table_code_option,
                  )
                : getTableCodesForLocation(location).some(
                    (code) =>
                      code === price.table_code ||
                      code === price.table_code_option,
                  );
            return codeMatches;
          })
          .map((price) => ({
            id: price.id,
            table_code: price.table_code,
            table_code_option: price.table_code_option,
            quantity_min: price.quantity_min,
            quantity_max: price.quantity_max,
            supplier_price: price.supplier_price,
            final_price: price.final_price,
            supplier_handling_cost: price.supplier_handling_cost,
            handling_cost: price.handling_cost,
            handling_cost_code: price.handling_cost_code,
            currency: price.currency,
            price_by_area: price.price_by_area,
            area_cm2: price.area_cm2,
          })),
      });
    }
  }

  return rows;
}

export default async function ProductPersonalizePage({
  params,
  searchParams,
}: ProductPersonalizePageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;

  const selectedDraftId =
    resolvedSearchParams?.draft?.trim() ?? null;

  const selectedColorId =
    resolvedSearchParams?.cor?.trim() ?? null;

  const selectedQuantity = Number(
    resolvedSearchParams?.quantidade ?? 0,
  );

  const selectedLocationId =
    resolvedSearchParams?.local?.trim() ?? null;

  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("products")
    .select(
      `
        id,
        supplier_id,
        sku,
        name,
        slug,
        short_description,
        is_customizable,
        product_images (
          external_url,
          storage_url,
          alt_text,
          is_primary,
          sort_order,
          image_type
        ),
        product_variants (
          id,
          sku,
          color_name,
          color_hex,
          size,
          material,
          optional_image_1_url,
          optional_image_2_url
        ),
        product_prices (
          variant_id,
          final_price,
          quantity_min,
          quantity_max,
          currency
        ),
        product_customization_components (
          id,
          variant_id,
          component_code,
          component_name
        ),
        product_customization_locations (
          id,
          variant_id,
          component_id,
          external_location_id,
          location_code,
          location_name,
          location_index,
          max_printing_area_mm,
          max_area_cm2,
          location_image_url,
          location_storage_url,
          area_image_url,
          area_storage_url,
          printing_lines_image_url,
          printing_lines_storage_url,
          is_default,
          is_active,
          raw_payload
        )
      `,
    )
    .eq("slug", slug)
    .eq("status", "active")
    .eq("is_active", true)
    .maybeSingle();

  if (!data) {
    notFound();
  }

  const product = data as unknown as ProductDetail;

  const primaryImage = getPrimaryImage(product);

  const productImageUrl =
    primaryImage?.storage_url ??
    primaryImage?.external_url ??
    null;

  const variants = product.product_variants ?? [];

  const selectedVariant =
    variants.find((variant) => variant.id === selectedColorId) ??
    null;

  const components =
    product.product_customization_components ?? [];

  const componentsById = buildComponentMap(components);

  const customizationLocations = getUniqueCustomizationLocations(
    (product.product_customization_locations ?? []).filter(
      (location) => location.is_active,
    ),
  );

  const activeVariantId = selectedVariant?.id ?? variants[0]?.id ?? null;

  const { data: customizationOptionData } = activeVariantId
    ? await supabase
        .from("product_customization_options")
        .select(
          "id,variant_id,location_id,customization_type_name,table_code,table_code_option,service_code,is_active",
        )
        .eq("product_id", product.id)
        .eq("variant_id", activeVariantId)
        .eq("is_active", true)
    : { data: [] };

  const customizationOptions = (customizationOptionData ?? []) as ProductCustomizationOption[];

  const tableCodes = Array.from(
    new Set(
      customizationOptions
        .flatMap((option) => [option.table_code, option.table_code_option])
        .filter((code): code is string => Boolean(code)),
    ),
  );
  const { data: printingPriceData } = tableCodes.length
    ? await supabase
        .from("printing_price_tables")
        .select(
          "id,table_code,table_code_option,technique_name,quantity_min,quantity_max,supplier_price,final_price,supplier_handling_cost,handling_cost,handling_cost_code,currency,price_by_area,area_cm2",
        )
        .eq("supplier_id", product.supplier_id)
        .eq("is_active", true)
        .or(
          `table_code.in.(${tableCodes.map((code) => `"${code.replace(/"/g, "")}"`).join(",")}),table_code_option.in.(${tableCodes.map((code) => `"${code.replace(/"/g, "")}"`).join(",")})`,
        )
        .order("quantity_min", { ascending: true })
    : { data: [] };

  const editorVariants: ProductEditorVariant[] = variants.map(
    (variant) => ({
      id: variant.id,
      sku: variant.sku,
      color_name: variant.color_name,
      color_hex: variant.color_hex,
      size: variant.size,
      image_url:
        variant.optional_image_1_url ??
        variant.optional_image_2_url,
    }),
  );

  const editorLocations = buildEditorLocations({
    locations: activeVariantId
      ? customizationLocations.filter(
          (location) => location.variant_id === activeVariantId,
        )
      : customizationLocations,
    componentsById,
    printingPrices: (printingPriceData ?? []) as PrintingPriceTable[],
    customizationOptions,
  });

  const editorPrices: ProductEditorPrice[] = (
    product.product_prices ?? []
  ).map((price) => ({
    variant_id: price.variant_id,
    final_price: price.final_price,
    quantity_min: price.quantity_min,
    quantity_max: price.quantity_max,
    currency: price.currency,
  }));

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-12">
      <section className="mx-auto max-w-7xl">
        <Link
          href={`/produto/${product.slug}`}
          className="inline-flex items-center text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao produto
        </Link>

        <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
                Passo 2 · Personalização
              </p>

              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-neutral-950">
                {product.name}
              </h1>

              <p className="mt-4 max-w-3xl text-neutral-600">
                Escolhe a localização e a técnica, carrega o
                logótipo e confirma a maquete para avançar
                diretamente para o checkout.
              </p>
            </div>

            <div className="rounded-2xl bg-neutral-50 px-5 py-4 text-sm text-neutral-600">
              {selectedQuantity > 0 ? (
                <p>
                  Quantidade:{" "}
                  <span className="font-semibold text-neutral-950">
                    {selectedQuantity.toLocaleString("pt-PT")} un.
                  </span>
                </p>
              ) : null}

              {selectedVariant ? (
                <p className="mt-1">
                  Cor / tamanho:{" "}
                  <span className="font-semibold text-neutral-950">
                    {getVariantLabel(selectedVariant) ??
                      "Selecionado"}
                  </span>
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {editorLocations.length > 0 ? (
          <ProductCustomizationEditor
            productId={product.id}
            supplierId={product.supplier_id}
            productName={product.name}
            productSlug={product.slug}
            productImageUrl={productImageUrl}
            variants={editorVariants}
            locations={editorLocations}
            productPrices={editorPrices}
            initialDraftId={selectedDraftId}
            initialVariantId={selectedColorId}
            initialLocationId={selectedLocationId}
            initialQuantity={
              selectedQuantity > 0 ? selectedQuantity : 1
            }
          />
        ) : (
          <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-neutral-950">
              Este produto ainda não tem áreas de personalização
              disponíveis
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-neutral-600">
              Pode voltar ao produto e adicionar ao carrinho sem
              personalização.
            </p>

            <Link
              href={`/produto/${product.slug}`}
              className="mt-6 inline-flex items-center justify-center rounded-2xl bg-neutral-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Voltar ao produto
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
