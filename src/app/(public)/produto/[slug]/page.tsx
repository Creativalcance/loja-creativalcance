import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import ProductDirectPurchasePanel, {
  type ProductPurchaseColor,
  type ProductPurchasePrice,
  type ProductPurchaseStock,
} from "@/components/product/ProductDirectPurchasePanel";
import ProductCustomizationOptions, {
  type ProductCustomizationOption,
} from "@/components/product/ProductCustomizationOptions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  supplier_price: number;
  quantity_min: number;
  quantity_max: number | null;
  currency: string;
};

type ProductStock = {
  variant_id: string | null;
  available_quantity: number;
  incoming_quantity: number;
  expected_restock_date: string | null;
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

type ProductDetail = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  brand: string | null;
  material: string | null;
  dimensions: string | null;
  weight: number | null;
  country_of_origin: string | null;
  min_order_quantity: number;
  lead_time_days: number | null;
  is_customizable: boolean;
  product_images: ProductImage[] | null;
  product_prices: ProductPrice[] | null;
  product_stocks: ProductStock[] | null;
  product_variants: ProductVariant[] | null;
  product_customization_components: ProductCustomizationComponent[] | null;
  product_customization_locations: ProductCustomizationLocation[] | null;
};

type ProductPageProps = {
  params: Promise<{
    slug: string;
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

function getTotalStock(product: ProductDetail): number {
  return (product.product_stocks ?? []).reduce(
    (total, stock) => total + stock.available_quantity,
    0,
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

function getLocationIndex(location: ProductCustomizationLocation): number {
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

function getCustomizationTypesForLocation(
  location: ProductCustomizationLocation,
): string[] {
  const payload = getPayloadRecord(location.raw_payload);
  const index = getLocationIndex(location);

  return Array.from(
    new Set(splitCodes(getSlotString(payload, "CustomizationTypes", index))),
  );
}

function buildComponentMap(
  components: ProductCustomizationComponent[],
): Map<string, ProductCustomizationComponent> {
  return new Map(components.map((component) => [component.id, component]));
}

function getComponentForLocation(params: {
  location: ProductCustomizationLocation;
  componentsById: Map<string, ProductCustomizationComponent>;
}): ProductCustomizationComponent | null {
  if (!params.location.component_id) {
    return null;
  }

  return params.componentsById.get(params.location.component_id) ?? null;
}

function getLocationImageCandidates(
  location: ProductCustomizationLocation,
): string[] {
  return [
    location.location_storage_url,
    location.area_storage_url,
    location.printing_lines_storage_url,
    location.location_image_url,
    location.area_image_url,
    location.printing_lines_image_url,
  ].filter((url): url is string => Boolean(url?.trim()));
}

function getCustomizationKey(params: {
  technique: string;
  componentName: string | null;
  locationName: string;
  maxPrintingAreaMm: string | null;
}): string {
  return [
    params.technique,
    params.componentName ?? "component",
    params.locationName,
    params.maxPrintingAreaMm ?? "area",
  ]
    .join(":")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function buildCustomizationOptions(params: {
  productSlug: string;
  locations: ProductCustomizationLocation[];
  componentsById: Map<string, ProductCustomizationComponent>;
}): ProductCustomizationOption[] {
  const map = new Map<string, ProductCustomizationOption>();

  for (const location of params.locations) {
    const component = getComponentForLocation({
      location,
      componentsById: params.componentsById,
    });

    const customizationTypes = getCustomizationTypesForLocation(location);

    const technique = customizationTypes[0] ?? "Personalização";
    const componentName =
      component?.component_name ?? component?.component_code ?? null;
    const locationName =
      location.location_name ?? location.location_code ?? `Local ${getLocationIndex(location)}`;
    const imageUrls = getLocationImageCandidates(location);

    const option: ProductCustomizationOption = {
      id: location.id,
      technique,
      componentName,
      locationName,
      maxPrintingAreaMm: location.max_printing_area_mm,
      maxAreaCm2: location.max_area_cm2,
      imageUrls,
      isRecommended: location.is_default,
      href: `/produto/${params.productSlug}/personalizar?local=${encodeURIComponent(
        location.id,
      )}`,
    };

    const key = getCustomizationKey({
      technique: option.technique,
      componentName: option.componentName,
      locationName: option.locationName,
      maxPrintingAreaMm: option.maxPrintingAreaMm,
    });

    const existingOption = map.get(key);

    if (!existingOption) {
      map.set(key, option);
      continue;
    }

    const shouldReplace =
      (!existingOption.isRecommended && option.isRecommended) ||
      (existingOption.imageUrls.length === 0 && option.imageUrls.length > 0);

    if (shouldReplace) {
      map.set(key, option);
    }
  }

  return Array.from(map.values())
    .sort((a, b) => {
      if (a.isRecommended && !b.isRecommended) {
        return -1;
      }

      if (!a.isRecommended && b.isRecommended) {
        return 1;
      }

      const techniqueComparison = a.technique.localeCompare(
        b.technique,
        "pt-PT",
      );

      if (techniqueComparison !== 0) {
        return techniqueComparison;
      }

      return a.locationName.localeCompare(b.locationName, "pt-PT");
    })
    .slice(0, 24);
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("products")
    .select(
      `
        id,
        sku,
        name,
        slug,
        short_description,
        description,
        brand,
        material,
        dimensions,
        weight,
        country_of_origin,
        min_order_quantity,
        lead_time_days,
        is_customizable,
        product_images (
          external_url,
          storage_url,
          alt_text,
          is_primary,
          sort_order,
          image_type
        ),
        product_prices (
          variant_id,
          final_price,
          supplier_price,
          quantity_min,
          quantity_max,
          currency
        ),
        product_stocks (
          variant_id,
          available_quantity,
          incoming_quantity,
          expected_restock_date
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
  const imageUrl = primaryImage?.storage_url ?? primaryImage?.external_url;

  const prices = [...(product.product_prices ?? [])].sort(
    (a, b) => a.quantity_min - b.quantity_min,
  );

  const colors = product.product_variants ?? [];
  const components = product.product_customization_components ?? [];
  const componentsById = buildComponentMap(components);

  const activeCustomizationLocations = (
    product.product_customization_locations ?? []
  ).filter((location) => location.is_active);

  const customizationOptions = buildCustomizationOptions({
    productSlug: product.slug,
    locations: activeCustomizationLocations,
    componentsById,
  });

  const purchaseColors: ProductPurchaseColor[] = colors.map((color) => ({
    id: color.id,
    sku: color.sku,
    color_name: color.color_name,
    color_hex: color.color_hex,
    size: color.size,
    image_url: color.optional_image_1_url ?? color.optional_image_2_url,
  }));

  const purchasePrices: ProductPurchasePrice[] = prices.map((price) => ({
    variant_id: price.variant_id,
    final_price: price.final_price,
    supplier_price: price.supplier_price,
    quantity_min: price.quantity_min,
    quantity_max: price.quantity_max,
    currency: price.currency,
  }));

  const purchaseStocks: ProductPurchaseStock[] = (
    product.product_stocks ?? []
  ).map((stock) => ({
    variant_id: stock.variant_id,
    available_quantity: stock.available_quantity,
    incoming_quantity: stock.incoming_quantity,
    expected_restock_date: stock.expected_restock_date,
  }));

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-12">
      <section className="mx-auto max-w-7xl">
        <Link
          href="/pesquisa"
          className="inline-flex items-center text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar à pesquisa
        </Link>

        <ProductDirectPurchasePanel
          productId={product.id}
          productSlug={product.slug}
          productSku={product.sku}
          productName={product.name}
          shortDescription={product.short_description}
          productImageUrl={imageUrl ?? null}
          minimumQuantity={product.min_order_quantity}
          totalStock={getTotalStock(product)}
          isCustomizable={customizationOptions.length > 0}
          prices={purchasePrices}
          colors={purchaseColors}
          stocks={purchaseStocks}
        />

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-neutral-950">
              Informação adicional
            </h2>

            <p className="mt-4 leading-8 text-neutral-600">
              {product.description ??
                "Produto disponível para encomenda online."}
            </p>

            <dl className="mt-8 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-neutral-500">Marca</dt>
                <dd className="mt-1 font-medium text-neutral-950">
                  {product.brand ?? "—"}
                </dd>
              </div>

              <div>
                <dt className="text-neutral-500">Material</dt>
                <dd className="mt-1 font-medium text-neutral-950">
                  {product.material ?? "—"}
                </dd>
              </div>

              <div>
                <dt className="text-neutral-500">Dimensões</dt>
                <dd className="mt-1 font-medium text-neutral-950">
                  {product.dimensions ?? "—"}
                </dd>
              </div>

              <div>
                <dt className="text-neutral-500">Peso</dt>
                <dd className="mt-1 font-medium text-neutral-950">
                  {product.weight ? `${product.weight} g` : "—"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-neutral-950">
              Cores disponíveis
            </h2>

            {colors.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {colors.slice(0, 60).map((color) => (
                  <span
                    key={color.id}
                    className="inline-flex items-center rounded-full bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-700 ring-1 ring-neutral-200"
                  >
                    {color.color_hex ? (
                      <span
                        className="mr-2 h-3 w-3 rounded-full border border-neutral-300"
                        style={{ backgroundColor: color.color_hex }}
                      />
                    ) : null}

                    {color.color_name ?? color.size ?? color.sku}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-neutral-600">
                Cores disponíveis mediante confirmação.
              </p>
            )}
          </section>
        </div>

        <ProductCustomizationOptions options={customizationOptions} />
      </section>
    </main>
  );
}