import { buildProductGallery } from "@/lib/catalog/product-gallery";
import { getMaterialClaims, materialMessages } from "@/lib/catalog/materials-collection";
import Link from "next/link";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import ProductDirectPurchasePanel, {
  type ProductPurchaseColor,
  type ProductPurchaseCustomizationDraft,
  type ProductPurchasePrice,
  type ProductPurchaseStock,
} from "@/components/product/ProductDirectPurchasePanel";
import { getEffectiveMinimumOrderQuantity } from "@/lib/commerce/minimum-order-quantity";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildStrickerProductHighResolutionImageUrl } from "@/lib/stricker/images";
import {
  buildProductMetaDescription,
  buildProductMetadata,
} from "@/lib/seo/metadata";
import {
  buildProductStructuredData,
  serializeJsonLd,
} from "@/lib/seo/structured-data";
import { localizePath } from "@/lib/i18n/config";
import { localizeProductColors } from "@/lib/i18n/colors";
import { getLocalizedProductText } from "@/lib/i18n/catalog";
import { getMessages } from "@/lib/i18n/messages";
import { getCurrentLocale } from "@/lib/i18n/server";

type ProductImage = {
  variant_id: string | null;
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

type ProductFutureStock = {
  variant_id: string | null;
  warehouse_code: string;
  expected_date: string;
  expected_quantity: number;
};

type ProductVariant = {
  id: string;
  sku: string;
  color_name: string | null;
  color_code: string | null;
  color_label?: string | null;
  color_hex: string | null;
  size: string | null;
  material: string | null;
  optional_image_1_url: string | null;
  optional_image_2_url: string | null;
};

type ProductDetail = {
  all_image_list: string | null;
  properties: unknown;
  id: string;
  supplier_id: string | null;
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
  type_name: string | null;
  subtype_name: string | null;
  min_order_quantity: number;
  lead_time_days: number | null;
  is_customizable: boolean;
  product_images: ProductImage[] | null;
  product_prices: ProductPrice[] | null;
  product_stocks: ProductStock[] | null;
  product_future_stocks: ProductFutureStock[] | null;
  product_variants: ProductVariant[] | null;
  product_customization_locations: { id: string }[] | null;
};

type ProductMetadataRow = {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  brand: string | null;
  material: string | null;
  product_images: ProductImage[] | null;
  product_variants: ProductVariant[] | null;
};

type ProductPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    maquete?: string;
  }>;
};

type CustomizationDraftRecord = {
  id: string;
  user_id: string | null;
  session_id: string | null;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  component_name: string | null;
  location_name: string | null;
  technique_name: string | null;
  logo_file_name: string | null;
  technical_preview_url: string | null;
  product_unit_price: number;
  personalization_unit_price: number;
  setup_cost: number;
  extras_total: number;
  estimated_total: number;
  currency: string;
  artwork_status: string;
  status: string;
};

const CART_SESSION_COOKIE = "loja_creativ_cart_session";

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

function getMetadataImageUrl(product: ProductMetadataRow): string | null {
  const images = [...(product.product_images ?? [])];
  const primaryImage =
    images.find((image) => image.is_primary) ??
    images.sort((a, b) => a.sort_order - b.sort_order)[0] ??
    null;

  const productImageUrl =
    primaryImage?.storage_url?.trim() ||
    primaryImage?.external_url?.trim() ||
    null;

  if (productImageUrl) {
    return (
      buildStrickerProductHighResolutionImageUrl(productImageUrl) ??
      productImageUrl
    );
  }

  for (const variant of product.product_variants ?? []) {
    const variantImageUrl =
      variant.optional_image_1_url?.trim() ||
      variant.optional_image_2_url?.trim() ||
      null;

    if (variantImageUrl) {
      return (
        buildStrickerProductHighResolutionImageUrl(variantImageUrl) ??
        variantImageUrl
      );
    }
  }

  return null;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("products")
    .select(
      `
        id,
        name,
        slug,
        short_description,
        description,
        brand,
        material,
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
          color_code,
          color_hex,
          size,
          material,
          optional_image_1_url,
          optional_image_2_url
        )
      `,
    )
    .eq("slug", slug)
    .eq("status", "active")
    .eq("is_active", true)
    .maybeSingle();

  if (!data) {
    return {
      title:
        (locale === "es" ? ("Producto no encontrado") : locale === "de" ? ("Produkt nicht gefunden") : locale === "it" ? ("Prodotto non trovato") : locale === "en"
          ? "Product not found"
          : locale === "fr"
            ? "Produit introuvable"
            : "Produto não encontrado"),
      robots: { index: false, follow: false },
    };
  }

  const product = data as unknown as ProductMetadataRow;
  const localized = await getLocalizedProductText({ productId: product.id, locale });

  return buildProductMetadata({
    name: localized?.name ?? product.name,
    slug: product.slug,
    shortDescription: localized?.shortDescription ?? product.short_description,
    description: localized?.description ?? product.description,
    brand: product.brand,
    material: product.material,
    imageUrl: getMetadataImageUrl(product),
    locale,
  });
}

function getTotalStock(product: ProductDetail): number {
  return (product.product_stocks ?? []).reduce(
    (total, stock) => total + stock.available_quantity,
    0,
  );
}

function buildCategoryHref(product: ProductDetail): string {
  const categoryName = product.type_name?.trim();

  if (!categoryName) {
    return "/categorias";
  }

  return `/categorias/${encodeURIComponent(categoryName)}`;
}

export default async function ProductDetailPage({
  params,
  searchParams,
}: ProductPageProps) {
  const locale = await getCurrentLocale();
  const labels = getMessages(locale);
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const customizationDraftId =
    resolvedSearchParams?.maquete?.trim() ?? null;
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("products")
    .select(
      `
        id,
        sku,
        supplier_id,
        name,
        slug,
        properties,
        all_image_list:supplier_payload->>AllImageList,
        short_description,
        description,
        brand,
        material,
        dimensions,
        weight,
        country_of_origin,
        type_name,
        subtype_name,
        min_order_quantity,
        lead_time_days,
        is_customizable,
        product_images (
          variant_id,
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
        product_future_stocks (
          variant_id,
          warehouse_code,
          expected_date,
          expected_quantity
        ),
        product_variants (
          id,
          sku,
          color_name,
          color_code,
          color_hex,
          size,
          material,
          optional_image_1_url,
          optional_image_2_url
        ),
        product_customization_locations (id)
      `,
    )
    .eq("slug", slug)
    .eq("status", "active")
    .eq("is_active", true)
    .eq("product_customization_locations.is_active", true)
    .limit(1, { referencedTable: "product_customization_locations" })
    .maybeSingle();

  if (!data) {
    notFound();
  }

  const product = data as unknown as ProductDetail;
  const baseSlug = product.slug;
  const localized = await getLocalizedProductText({ productId: product.id, locale });
  if (localized) {
    product.name = localized.name || product.name;
    product.short_description = localized.shortDescription ?? product.short_description;
    product.description = localized.description ?? product.description;
    product.material = localized.material ?? product.material;
    product.type_name = localized.typeName ?? product.type_name;
    product.subtype_name = localized.subtypeName ?? product.subtype_name;
  }
  let customizationDraft: ProductPurchaseCustomizationDraft | null = null;

  if (customizationDraftId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const cookieStore = await cookies();
    const sessionId =
      cookieStore.get(CART_SESSION_COOKIE)?.value ?? null;

    const supabaseAdmin = createSupabaseAdminClient();

    const { data: draftData } = await supabaseAdmin
      .from("product_customization_drafts")
      .select(
        `
          id,
          user_id,
          session_id,
          product_id,
          variant_id,
          quantity,
          component_name,
          location_name,
          technique_name,
          logo_file_name,
          technical_preview_url,
          product_unit_price,
          personalization_unit_price,
          setup_cost,
          extras_total,
          estimated_total,
          currency,
          artwork_status,
          status
        `,
      )
      .eq("id", customizationDraftId)
      .eq("product_id", product.id)
      .maybeSingle<CustomizationDraftRecord>();

    const belongsToUser =
      Boolean(user?.id) && draftData?.user_id === user?.id;

    const belongsToSession =
      Boolean(sessionId) && draftData?.user_id === null && draftData?.session_id === sessionId;

    if (
      draftData &&
      (belongsToUser || belongsToSession) &&
      ["draft", "ready"].includes(draftData.status)
    ) {
      customizationDraft = {
        id: draftData.id,
        variant_id: draftData.variant_id,
        quantity: draftData.quantity,
        component_name: draftData.component_name,
        location_name: draftData.location_name,
        technique_name: draftData.technique_name,
        logo_file_name: draftData.logo_file_name,
        technical_preview_url: draftData.technical_preview_url,
        product_unit_price: draftData.product_unit_price,
        personalization_unit_price:
          draftData.personalization_unit_price,
        setup_cost: draftData.setup_cost,
        extras_total: draftData.extras_total,
        estimated_total: draftData.estimated_total,
        currency: draftData.currency,
        artwork_status: draftData.artwork_status,
      };
    }
  }
  const primaryImage = getPrimaryImage(product);
  const imageUrl = primaryImage?.storage_url ?? primaryImage?.external_url;
  const highResolutionImageUrl =
    buildStrickerProductHighResolutionImageUrl(
      primaryImage?.external_url,
    );

  const prices = [...(product.product_prices ?? [])].sort(
    (a, b) => a.quantity_min - b.quantity_min,
  );

  const colors = await localizeProductColors(product.product_variants ?? [], product.supplier_id, locale);
  const purchaseColors: ProductPurchaseColor[] = colors.map((color) => ({
    id: color.id,
    sku: color.sku,
    color_name: color.color_name,
    color_code: color.color_code,
    color_label: color.color_label,
    color_hex: color.color_hex,
    size: color.size,
    image_url: color.optional_image_1_url ?? color.optional_image_2_url,
    high_resolution_image_url:
      buildStrickerProductHighResolutionImageUrl(
        color.optional_image_1_url ?? color.optional_image_2_url,
      ),
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

  const purchaseFutureStocks = (
    product.product_future_stocks ?? []
  ).map((stock) => ({
    variant_id: stock.variant_id,
    warehouse_code: stock.warehouse_code,
    expected_date: stock.expected_date,
    expected_quantity: stock.expected_quantity,
  }));

  const structuredDataImageUrl = highResolutionImageUrl ?? imageUrl ?? null;
  const structuredData = buildProductStructuredData({
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    description: buildProductMetaDescription({
      name: product.name,
      slug: product.slug,
      shortDescription: product.short_description,
      description: product.description,
      brand: product.brand,
      material: product.material,
      imageUrl: structuredDataImageUrl,
      locale,
    }),
    imageUrl: structuredDataImageUrl,
    brand: product.brand,
    material: product.material,
    categoryName: product.type_name,
    subcategoryName: product.subtype_name,
    totalStock: getTotalStock(product),
    locale,
    prices: prices.map((price) => ({
      final_price: Number(price.final_price),
      currency: price.currency,
    })),
  });

  const categoryHref = localizePath(buildCategoryHref(product), locale);
  const backLabel = product.type_name
    ? `${labels.product.backTo} ${product.type_name}`
    : labels.product.back;

  return (
    <main className="min-h-screen max-w-full overflow-x-hidden bg-neutral-50 px-4 py-8 sm:px-6 sm:py-12">
      <section className="mx-auto min-w-0 max-w-7xl">
        <Link
          href={categoryHref}
          className="inline-flex items-center text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {backLabel}
        </Link>

        {getMaterialClaims(product.properties).length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {getMaterialClaims(product.properties).map(claim => (
              <li key={claim} className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-900">
                {materialMessages[locale][claim === "fsc" ? "fsc" : "recycled"]}
              </li>
            ))}
          </ul>
        ) : null}

        <ProductDirectPurchasePanel
          locale={locale}
  productId={product.id}
  productSlug={baseSlug}
  productSku={product.sku}
  productName={product.name}
  shortDescription={product.short_description}
  productDescription={product.description}
  productImageUrl={imageUrl ?? null}
  productGallery={buildProductGallery({
    sku: product.sku,
    allImageList: product.all_image_list,
    images: product.product_images ?? [],
    variants: product.product_variants ?? [],
  })}
  brand={product.brand}
  material={product.material}
  dimensions={product.dimensions}
  weight={product.weight}
  minimumQuantity={getEffectiveMinimumOrderQuantity(product.min_order_quantity)}
  totalStock={getTotalStock(product)}
  isCustomizable={Boolean(product.product_customization_locations?.length)}
  prices={purchasePrices}
  colors={purchaseColors}
  stocks={purchaseStocks}
  futureStocks={purchaseFutureStocks}
  customizationDraft={customizationDraft}
/>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
    </main>
  );
}
