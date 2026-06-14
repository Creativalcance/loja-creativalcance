import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Package, Palette, Truck } from "lucide-react";
import AddToCartForm from "@/components/product/AddToCartForm";
import ProductCustomizationSimulator, {
  type ProductSimulatorLocation,
  type ProductSimulatorVariant,
} from "@/components/product/ProductCustomizationSimulator";
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
  final_price: number;
  supplier_price: number;
  quantity_min: number;
  quantity_max: number | null;
  currency: string;
};

type ProductStock = {
  available_quantity: number;
  incoming_quantity: number;
  expected_restock_date: string | null;
};

type PrintingTechniqueForCart = {
  id: string;
  name: string;
  setup_cost: number | null;
  price_per_unit: number | null;
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

function formatPrice(value: number, currency: string): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency,
  }).format(value);
}

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

function getLowestPrice(prices: ProductPrice[]): ProductPrice | null {
  if (prices.length === 0) {
    return null;
  }

  return [...prices].sort((a, b) => a.final_price - b.final_price)[0] ?? null;
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

function getTableCodesForLocation(
  location: ProductCustomizationLocation,
): string[] {
  const payload = getPayloadRecord(location.raw_payload);
  const index = getLocationIndex(location);

  const slotCodes = splitCodes(getSlotString(payload, "TableCodes", index));

  return Array.from(new Set(slotCodes));
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

function getLocationImageUrl(
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
      location.variant_id ?? "variant",
      location.component_id ?? "component",
      location.location_code ?? location.location_name ?? location.id,
      location.max_printing_area_mm ?? "area",
    ].join(":");

    if (!map.has(key)) {
      map.set(key, location);
    }
  }

  return Array.from(map.values())
    .sort((a, b) => {
      if (a.is_default && !b.is_default) {
        return -1;
      }

      if (!a.is_default && b.is_default) {
        return 1;
      }

      return getLocationIndex(a) - getLocationIndex(b);
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
          final_price,
          supplier_price,
          quantity_min,
          quantity_max,
          currency
        ),
        product_stocks (
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

  const variants = product.product_variants ?? [];
  const components = product.product_customization_components ?? [];
  const componentsById = buildComponentMap(components);

  const customizationLocations = getUniqueCustomizationLocations(
    (product.product_customization_locations ?? []).filter(
      (location) => location.is_active,
    ),
  );

  const totalStock = getTotalStock(product);
  const lowestPrice = getLowestPrice(prices);

  const { data: activeTechniquesData } = await supabase
    .from("printing_techniques")
    .select("id, name, setup_cost, price_per_unit")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const activeTechniques =
    (activeTechniquesData ?? []) as PrintingTechniqueForCart[];

  const cartVariants = variants.map((variant) => ({
    id: variant.id,
    sku: variant.sku,
    color_name: variant.color_name,
    color_hex: variant.color_hex,
    size: variant.size,
  }));

  const cartPrices = prices.map((price) => ({
    quantity_min: price.quantity_min,
    quantity_max: price.quantity_max,
    final_price: price.final_price,
    currency: price.currency,
  }));

  const simulatorVariants: ProductSimulatorVariant[] = variants.map(
    (variant) => ({
      id: variant.id,
      sku: variant.sku,
      color_name: variant.color_name,
      color_hex: variant.color_hex,
      size: variant.size,
      image_url: variant.optional_image_1_url ?? variant.optional_image_2_url,
    }),
  );

  const simulatorLocations: ProductSimulatorLocation[] =
    customizationLocations.map((location) => {
      const component = getComponentForLocation({
        location,
        componentsById,
      });

      return {
        id: location.id,
        variant_id: location.variant_id,
        component_name:
          component?.component_name ?? component?.component_code ?? null,
        location_name: location.location_name,
        image_url: getLocationImageUrl(location),
        max_printing_area_mm: location.max_printing_area_mm,
        max_area_cm2: location.max_area_cm2,
        table_codes: getTableCodesForLocation(location),
        customization_types: getCustomizationTypesForLocation(location),
        is_default: location.is_default,
      };
    });

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

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.8fr)]">
          <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
            <div className="aspect-square bg-neutral-100">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={primaryImage?.alt_text ?? product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-neutral-400">
                  Sem imagem disponível
                </div>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
              {product.sku}
            </p>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950">
              {product.name}
            </h1>

            {product.short_description ? (
              <p className="mt-5 text-lg leading-8 text-neutral-600">
                {product.short_description}
              </p>
            ) : null}

            {lowestPrice ? (
              <p className="mt-6 text-sm text-neutral-500">
                Desde{" "}
                <span className="text-2xl font-semibold text-neutral-950">
                  {formatPrice(lowestPrice.final_price, lowestPrice.currency)}
                </span>{" "}
                / un.
              </p>
            ) : null}

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
                <Package className="h-5 w-5 text-neutral-500" />
                <p className="mt-4 text-sm text-neutral-500">Quantidade mín.</p>
                <p className="mt-1 font-semibold text-neutral-950">
                  {product.min_order_quantity.toLocaleString("pt-PT")} un.
                </p>
              </div>

              <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
                <Truck className="h-5 w-5 text-neutral-500" />
                <p className="mt-4 text-sm text-neutral-500">Stock</p>
                <p className="mt-1 font-semibold text-neutral-950">
                  {totalStock.toLocaleString("pt-PT")} un.
                </p>
              </div>

              <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
                <Palette className="h-5 w-5 text-neutral-500" />
                <p className="mt-4 text-sm text-neutral-500">Personalização</p>
                <p className="mt-1 font-semibold text-neutral-950">
                  {customizationLocations.length > 0
                    ? "Disponível"
                    : "Sob consulta"}
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-neutral-950">
                Escalões de preço
              </h2>

              {prices.length > 0 ? (
                <div className="mt-5 divide-y divide-neutral-100">
                  {prices.slice(0, 8).map((price, index) => (
                    <div
                      key={`${price.quantity_min}-${
                        price.quantity_max ?? "plus"
                      }-${price.final_price}-${index}`}
                      className="flex items-center justify-between gap-4 py-3"
                    >
                      <p className="text-sm text-neutral-600">
                        {price.quantity_min.toLocaleString("pt-PT")}
                        {price.quantity_max
                          ? ` a ${price.quantity_max.toLocaleString("pt-PT")}`
                          : "+"}{" "}
                        unidades
                      </p>

                      <p className="font-semibold text-neutral-950">
                        {formatPrice(price.final_price, price.currency)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-neutral-600">
                  Preço sob consulta.
                </p>
              )}
            </div>

            <AddToCartForm
              productId={product.id}
              productSku={product.sku}
              productName={product.name}
              minimumQuantity={product.min_order_quantity}
              prices={cartPrices}
              variants={cartVariants}
              printingTechniques={activeTechniques}
            />
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-neutral-950">
              Descrição
            </h2>

            <p className="mt-4 leading-8 text-neutral-600">
              {product.description ??
                "Produto disponível para orçamento e personalização."}
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
              Variantes disponíveis
            </h2>

            {variants.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {variants.slice(0, 36).map((variant) => (
                  <span
                    key={variant.id}
                    className="inline-flex items-center rounded-full bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-700 ring-1 ring-neutral-200"
                  >
                    {variant.color_hex ? (
                      <span
                        className="mr-2 h-3 w-3 rounded-full border border-neutral-300"
                        style={{ backgroundColor: variant.color_hex }}
                      />
                    ) : null}
                    {variant.color_name ?? variant.size ?? variant.sku}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-neutral-600">
                Sem variantes registadas.
              </p>
            )}
          </section>
        </div>

        <section className="mt-8">
          <ProductCustomizationSimulator
            productName={product.name}
            productSku={product.sku}
            productImageUrl={imageUrl ?? null}
            variants={simulatorVariants}
            locations={simulatorLocations}
          />
        </section>
      </section>
    </main>
  );
}