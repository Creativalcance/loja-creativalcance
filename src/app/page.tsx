import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Gift,
  LayoutGrid,
  Palette,
  Shirt,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import SiteFooter from "@/components/layout/SiteFooter";
import SiteHeader from "@/components/layout/SiteHeader";
import SmartMerchSearchForm from "@/components/smart-merch/SmartMerchSearchForm";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStrickerLanguage, localizePath, type SiteLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { getCurrentLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const localizedPath = localizePath("/", locale);
  const metadataByLocale: Record<SiteLocale, { title: string; description: string }> = {
    pt: { title: "360 Merchandising | Brindes Personalizados e Merchandising", description: "Encontre brindes personalizados, merchandising corporativo, gifts empresariais e vestuário promocional com pesquisa inteligente, preços por quantidade e personalização." },
    en: { title: "360 Merchandising | Custom Merchandise and Corporate Gifts", description: "Find custom merchandise, promotional products, corporate gifts and branded clothing with smart search, quantity pricing and customisation." },
    fr: { title: "360 Merchandising | Objets personnalisés et cadeaux d’entreprise", description: "Trouvez des objets personnalisés, du merchandising, des cadeaux d’entreprise et des vêtements promotionnels avec recherche intelligente et tarifs dégressifs." },
  };
  const content = metadataByLocale[locale];

  return {
    title: { absolute: content.title },
    description: content.description,
    alternates: {
      canonical: localizedPath,
      languages: { "pt-PT": "/", "en-GB": "/en", "fr-FR": "/fr", "x-default": "/" },
    },
  };
}

type ProductImage = {
  external_url: string | null;
  storage_url: string | null;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
  image_type?: string | null;
};

type ProductPrice = {
  final_price: number | string | null;
  quantity_min: number | null;
  currency: string | null;
};

type ProductStock = {
  available_quantity: number | null;
};

type ProductVariant = {
  optional_image_1_url: string | null;
  optional_image_2_url: string | null;
};

type HomepageProduct = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  short_description: string | null;
  type_name: string | null;
  subtype_name: string | null;
  material: string | null;
  is_featured: boolean;
  is_customizable: boolean;
  min_order_quantity: number | null;
  product_images: ProductImage[] | null;
  product_prices: ProductPrice[] | null;
  product_stocks: ProductStock[] | null;
  product_variants: ProductVariant[] | null;
};

type ProductTranslation = {
  product_id: string;
  language: string;
  name: string;
  slug: string;
  short_description: string | null;
  type_name: string | null;
  subtype_name: string | null;
  material: string | null;
};

type CategoryDefinition = {
  title: string;
  description: string;
  keywords: string[];
  icon: LucideIcon;
};

type CategoryCard = CategoryDefinition & {
  product: HomepageProduct | null;
  imageUrl: string | null;
  href: string;
};

const categoryKeywords = [
  ["brinde", "promocional", "caneta", "esferografica", "garrafa", "caderno", "bloco", "saco", "lanyard", "porta chaves", "porta-chaves"],
  ["merchandising", "corporativo", "empresa", "office", "escritorio", "mochila", "powerbank", "tecnologia", "agenda", "usb"],
  ["vestuario", "vestuário", "textil", "t-shirt", "tshirt", "shirt", "polo", "sweat", "casaco", "colete", "roupa", "avental"],
  ["gift", "gifts", "presente", "premium", "executivo", "caixa", "conjunto", "garrafa", "gourmet", "vinho"],
] as const;

const categoryIcons = [Gift, Building2, Shirt, Sparkles] as const;

function getCategoryDefinitions(locale: SiteLocale): CategoryDefinition[] {
  return getMessages(locale).home.categoryCards.map(([title, description], index) => ({
    title,
    description,
    keywords: [...(categoryKeywords[index] ?? [])],
    icon: categoryIcons[index] ?? Gift,
  }));
}

/*const categoryDefinitions: CategoryDefinition[] = [
  {
    title: "Brindes Promocionais",
    description:
      "Produtos personalizados para campanhas, eventos, feiras e ativações de marca.",
    keywords: [
      "brinde",
      "promocional",
      "caneta",
      "esferografica",
      "garrafa",
      "caderno",
      "bloco",
      "saco",
      "lanyard",
      "porta chaves",
      "porta-chaves",
    ],
    icon: Gift,
  },
  {
    title: "Merchandising Corporativo",
    description:
      "Soluções de branding para empresas, equipas, clientes e ações comerciais.",
    keywords: [
      "merchandising",
      "corporativo",
      "empresa",
      "office",
      "escritorio",
      "mochila",
      "powerbank",
      "tecnologia",
      "agenda",
      "usb",
    ],
    icon: Building2,
  },
  {
    title: "Vestuário Promocional",
    description:
      "T-shirts, polos, sweats, casacos e vestuário personalizado para empresas.",
    keywords: [
      "vestuario",
      "vestuário",
      "textil",
      "t-shirt",
      "tshirt",
      "shirt",
      "polo",
      "sweat",
      "casaco",
      "colete",
      "roupa",
      "avental",
    ],
    icon: Shirt,
  },
  {
    title: "Gifts Empresariais",
    description:
      "Presentes corporativos para clientes, equipas, eventos e campanhas especiais.",
    keywords: [
      "gift",
      "gifts",
      "presente",
      "premium",
      "executivo",
      "caixa",
      "conjunto",
      "garrafa",
      "gourmet",
      "vinho",
    ],
    icon: Sparkles,
  },
];*/

const buyingStepIcons = [LayoutGrid, Palette, ShoppingCart, CheckCircle2] as const;

function getBuyingSteps(locale: SiteLocale) {
  return getMessages(locale).home.steps.map(([title, description], index) => ({
    title,
    description,
    icon: buyingStepIcons[index] ?? LayoutGrid,
  }));
}

/*const buyingSteps = [
  {
    title: "Escolhe a categoria",
    description:
      "Explora o catálogo por famílias de produto e encontra rapidamente opções para a tua campanha.",
    icon: LayoutGrid,
  },
  {
    title: "Define cor e quantidade",
    description:
      "Consulta stock, escalões de preço e disponibilidade antes de avançar com a encomenda.",
    icon: Palette,
  },
  {
    title: "Cria maquete ou compra direto",
    description:
      "Personaliza o produto quando aplicável ou adiciona diretamente ao carrinho.",
    icon: ShoppingCart,
  },
  {
    title: "Finaliza a encomenda",
    description:
      "Revê os dados no checkout e confirma a compra de forma simples e segura.",
    icon: CheckCircle2,
  },
];*/

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getCleanUrl(value: string | null | undefined): string | null {
  const cleanValue = value?.trim();

  if (!cleanValue) {
    return null;
  }

  const normalizedValue = normalizeText(cleanValue);

  const isPlaceholder =
    normalizedValue.includes("placeholder") ||
    normalizedValue.includes("placehold") ||
    normalizedValue.includes("dummy") ||
    normalizedValue.includes("mock") ||
    normalizedValue.includes("sem-imagem") ||
    normalizedValue.includes("no-image") ||
    normalizedValue.includes("fallback");

  return isPlaceholder ? null : cleanValue;
}

function isDemoProduct(product: HomepageProduct): boolean {
  return normalizeText(product.sku).startsWith("lc-");
}

function buildCategoryHref(product: HomepageProduct | null): string {
  const categoryName = product?.type_name?.trim();

  if (!categoryName) {
    return "/categorias";
  }

  return `/categorias/${encodeURIComponent(categoryName)}`;
}

function formatPrice(value: number | string | null, currency: string | null, locale: SiteLocale) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "Sob consulta";
  }

  return new Intl.NumberFormat(locale === "en" ? "en-GB" : locale === "fr" ? "fr-FR" : "pt-PT", {
    style: "currency",
    currency: currency ?? "EUR",
  }).format(numericValue);
}

function getPrimaryImage(product: HomepageProduct): ProductImage | null {
  const images = product.product_images ?? [];

  if (images.length === 0) {
    return null;
  }

  const primaryImage = images.find((image) => image.is_primary);

  if (primaryImage) {
    return primaryImage;
  }

  return [...images].sort((a, b) => a.sort_order - b.sort_order)[0] ?? null;
}

function getVariantImageUrl(product: HomepageProduct): string | null {
  const variants = product.product_variants ?? [];

  for (const variant of variants) {
    const imageUrl =
      getCleanUrl(variant.optional_image_1_url) ??
      getCleanUrl(variant.optional_image_2_url);

    if (imageUrl) {
      return imageUrl;
    }
  }

  return null;
}

function getImageUrl(product: HomepageProduct | null): string | null {
  if (!product) {
    return null;
  }

  const image = getPrimaryImage(product);

  return (
    getCleanUrl(image?.storage_url) ??
    getCleanUrl(image?.external_url) ??
    getVariantImageUrl(product)
  );
}

function getBestPrice(product: HomepageProduct): ProductPrice | null {
  const prices = product.product_prices ?? [];

  if (prices.length === 0) {
    return null;
  }

  return (
    [...prices].sort((a, b) => {
      const quantityA = a.quantity_min ?? 0;
      const quantityB = b.quantity_min ?? 0;

      return quantityA - quantityB;
    })[0] ?? null
  );
}

function getTotalStock(product: HomepageProduct): number {
  return (product.product_stocks ?? []).reduce((total, stock) => {
    return total + (stock.available_quantity ?? 0);
  }, 0);
}

function sortProductsByStockAvailability(
  products: HomepageProduct[],
): HomepageProduct[] {
  return [...products].sort((productA, productB) => {
    const productAHasStock = getTotalStock(productA) > 0;
    const productBHasStock = getTotalStock(productB) > 0;

    if (productAHasStock === productBHasStock) {
      return 0;
    }

    return productAHasStock ? -1 : 1;
  });
}

function productMatchesCategory(
  product: HomepageProduct,
  category: CategoryDefinition,
): boolean {
  const haystack = normalizeText(
    [
      product.name,
      product.short_description,
      product.type_name,
      product.subtype_name,
      product.material,
    ]
      .filter(Boolean)
      .join(" "),
  );

  return category.keywords.some((keyword) =>
    haystack.includes(normalizeText(keyword)),
  );
}

function findProductForCategory(params: {
  products: HomepageProduct[];
  category: CategoryDefinition;
  fallbackIndex: number;
  usedProductIds: Set<string>;
}): HomepageProduct | null {
  const availableProducts = params.products.filter(
    (product) => !params.usedProductIds.has(product.id),
  );

  const matchedProduct =
    availableProducts.find((product) =>
      productMatchesCategory(product, params.category),
    ) ?? null;

  if (matchedProduct) {
    return matchedProduct;
  }

  return (
    availableProducts[params.fallbackIndex] ??
    availableProducts[0] ??
    params.products[0] ??
    null
  );
}

function buildCategoryCards(
  products: HomepageProduct[],
  categoryDefinitions: CategoryDefinition[],
  locale: SiteLocale,
): CategoryCard[] {
  const usedProductIds = new Set<string>();

  return categoryDefinitions.map((category, index) => {
    const product = findProductForCategory({
      products,
      category,
      fallbackIndex: index,
      usedProductIds,
    });

    if (product) {
      usedProductIds.add(product.id);
    }

    return {
      ...category,
      product,
      imageUrl: getImageUrl(product),
      href: localizePath(buildCategoryHref(product), locale),
    };
  });
}

function ProductMiniCard({ product, locale }: { product: HomepageProduct; locale: SiteLocale }) {
  const messages = getMessages(locale).home;
  const imageUrl = getImageUrl(product);
  const bestPrice = getBestPrice(product);

  return (
    <Link
      href={localizePath(`/produto/${product.slug}`, locale)}
      className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] transition hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.07]"
    >
      <div className="aspect-square bg-white">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="h-full w-full object-contain p-6 transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm text-neutral-400">
            {messages.available}
          </div>
        )}
      </div>

      <div className="p-5">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/40">
          {product.sku}
        </p>

        <h3 className="mt-3 line-clamp-2 text-base font-semibold text-white">
          {product.name}
        </h3>

        <div className="mt-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs text-white/45">{messages.from}</p>

            <p className="mt-1 text-base font-semibold text-white">
              {bestPrice
                ? formatPrice(bestPrice.final_price, bestPrice.currency, locale)
                : messages.quote}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-white/45">{messages.stock}</p>

            <p className="mt-1 text-sm font-semibold text-white">
              {getTotalStock(product).toLocaleString(locale === "en" ? "en-GB" : locale === "fr" ? "fr-FR" : "pt-PT")}
            </p>
          </div>
        </div>

        <span className="mt-5 inline-flex items-center text-sm font-semibold text-white">
          {messages.product}
          <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}

export default async function HomePage() {
  const locale = await getCurrentLocale();
  const messages = getMessages(locale).home;
  const categoryDefinitions = getCategoryDefinitions(locale);
  const buyingSteps = getBuyingSteps(locale);
  const benefits = messages.benefits;
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
        id,
        sku,
        name,
        slug,
        short_description,
        type_name,
        subtype_name,
        material,
        is_featured,
        is_customizable,
        min_order_quantity,
        product_images (
          external_url,
          storage_url,
          alt_text,
          is_primary,
          sort_order,
          image_type
        ),
        product_variants (
          optional_image_1_url,
          optional_image_2_url
        ),
        product_prices (
          final_price,
          quantity_min,
          currency
        ),
        product_stocks (
          available_quantity
        )
      `,
    )
    .eq("status", "active")
    .eq("is_active", true)
    .order("is_purchasable", { ascending: false })
    .order("is_featured", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(500);

  let allProducts = (error ? [] : ((data ?? []) as unknown as HomepageProduct[])).filter(
    (product) => product.slug && !isDemoProduct(product),
  );
  if (error) {
  console.error("Homepage products query error:", error);
}

  if (locale !== "pt" && allProducts.length > 0) {
    const requestedLanguage = getStrickerLanguage(locale);
    const fallbackLanguages = requestedLanguage === "EN"
      ? ["EN"]
      : [requestedLanguage, "EN"];
    const { data: translationData, error: translationError } = await supabase
      .from("product_translations")
      .select("product_id,language,name,slug,short_description,type_name,subtype_name,material")
      .in("product_id", allProducts.map((product) => product.id))
      .in("language", fallbackLanguages)
      .returns<ProductTranslation[]>();

    if (translationError) {
      console.error("Homepage product translations query error:", translationError);
    } else {
      const translationsByProduct = new Map<string, ProductTranslation>();

      for (const language of [...fallbackLanguages].reverse()) {
        for (const translation of translationData ?? []) {
          if (translation.language === language) {
            translationsByProduct.set(translation.product_id, translation);
          }
        }
      }

      allProducts = allProducts.map((product) => {
        const translation = translationsByProduct.get(product.id);
        return translation
          ? {
              ...product,
              name: translation.name,
              short_description: translation.short_description,
              type_name: translation.type_name,
              subtype_name: translation.subtype_name,
              material: translation.material,
            }
          : product;
      });
    }
  }

  const productsWithImages = allProducts.filter((product) => getImageUrl(product));
  const products = productsWithImages.length >= 4 ? productsWithImages : allProducts;

  const productsOrderedByStock = sortProductsByStockAvailability(products);
  const categoryCards = buildCategoryCards(productsOrderedByStock, categoryDefinitions, locale);
  const featuredProducts = sortProductsByStockAvailability(
    products.filter((product) => product.is_featured),
  );
  const productHighlights =
    featuredProducts.length >= 4
      ? featuredProducts.slice(0, 8)
      : productsOrderedByStock.slice(0, 8);

  return (
    <>
      <SiteHeader />

      <main className="min-h-screen bg-neutral-950 text-white">
        <section className="mx-auto w-full max-w-7xl px-6 pb-10 pt-14 lg:pb-12 lg:pt-16">
          <div className="max-w-5xl">
            <p className="mb-5 inline-flex items-center rounded-full border border-white/15 px-4 py-2 text-sm text-white/70">
              <Sparkles className="mr-2 h-4 w-4" />
              360 Smart Merch — {messages.badge}
            </p>

            <h1 className="text-5xl font-semibold tracking-tight text-white md:text-7xl">
              {messages.title}
            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-8 text-white/70">
              {messages.intro}
            </p>

            <div className="mt-10 max-w-4xl">
              <SmartMerchSearchForm locale={locale} />
            </div>

            <div className="mt-6 flex flex-col gap-4 sm:flex-row">
              <Link
                href={localizePath("/categorias", locale)}
                className="inline-flex items-center justify-center rounded-full border border-white/30 !bg-transparent px-6 py-3 text-sm font-semibold !text-white transition hover:border-white/60 hover:!bg-white/10"
              >
                {messages.seeCategories}
                <LayoutGrid className="ml-2 h-4 w-4" />
              </Link>

              <Link
                href="#produtos-em-destaque"
                className="inline-flex items-center justify-center rounded-full border border-white/20 !bg-transparent px-6 py-3 text-sm font-semibold !text-white transition hover:border-white/40 hover:!bg-white/10"
              >
                {messages.highlights}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section id="categorias" className="mx-auto w-full max-w-7xl px-6 pb-20">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/45">
                {messages.categories}
              </p>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-5xl">
                {messages.categoryTitle}
              </h2>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/55">
                {messages.categoryIntro}
              </p>
            </div>

            <Link
              href={localizePath("/categorias", locale)}
              className="inline-flex items-center text-sm font-semibold text-white"
            >
              {messages.allCategories}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {categoryCards.map((category) => {
              const Icon = category.icon;

              return (
                <Link
                  key={category.title}
                  href={category.href}
                  aria-label={`${messages.explore} ${category.title}`}
                  className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] transition hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.06]"
                >
                  <div className="aspect-[4/3] bg-white">
                    {category.imageUrl ? (
                      <img
                        src={category.imageUrl}
                        alt={category.product?.name ?? category.title}
                        className="h-full w-full object-contain p-6 transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-neutral-400">
                        <Icon className="h-10 w-10" />
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <Icon className="h-6 w-6 text-white/70" />

                    <h3 className="mt-5 text-xl font-semibold text-white">
                      {category.title}
                    </h3>

                    <p className="mt-3 text-sm leading-6 text-white/60">
                      {category.description}
                    </p>

                    <span className="mt-6 inline-flex items-center text-sm font-medium text-white">
                      {messages.seeProducts}
                      <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="border-y border-white/10 bg-white/[0.03]">
          <div className="mx-auto w-full max-w-7xl px-6 py-20">
            <div className="max-w-3xl">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/45">
                {messages.howToBuy}
              </p>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-5xl">
                {messages.howTitle}
              </h2>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {buyingSteps.map((step, index) => {
                const Icon = step.icon;

                return (
                  <div
                    key={step.title}
                    className="rounded-3xl border border-white/10 bg-neutral-950 p-6"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-neutral-950">
                        <Icon className="h-5 w-5" />
                      </div>

                      <span className="text-sm font-semibold text-white/30">
                        0{index + 1}
                      </span>
                    </div>

                    <h3 className="mt-6 text-xl font-semibold text-white">
                      {step.title}
                    </h3>

                    <p className="mt-3 text-sm leading-6 text-white/60">
                      {step.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section
          id="produtos-em-destaque"
          className="mx-auto w-full max-w-7xl px-6 py-20"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/45">
                {messages.products}
              </p>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-5xl">
                {messages.highlights}
              </h2>
            </div>

            <Link
              href={localizePath("/categorias", locale)}
              className="inline-flex items-center text-sm font-semibold text-white"
            >
              {messages.exploreCatalog}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>

          {productHighlights.length > 0 ? (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {productHighlights.map((product) => (
                <ProductMiniCard key={product.id} product={product} locale={locale} />
              ))}
            </div>
          ) : (
            <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center text-white/60">
              {messages.catalogPreparing}
            </div>
          )}
        </section>

        <section className="mx-auto w-full max-w-7xl px-6 pb-20">
          <div className="grid gap-10 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 md:p-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/45">
                {messages.b2b}
              </p>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-5xl">
                {messages.b2bTitle}
              </h2>

              <p className="mt-5 text-sm leading-7 text-white/60">
                {messages.b2bIntro}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {benefits.map((benefit) => (
                <div
                  key={benefit}
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-neutral-950 p-4"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />

                  <p className="text-sm leading-6 text-white/70">{benefit}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-6 pb-24">
          <div className="rounded-[2rem] bg-white p-8 text-neutral-950 md:p-12">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">
                  {messages.catalog}
                </p>

                <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl">
                  {messages.ctaTitle}
                </h2>
              </div>

              <Link
                href={localizePath("/categorias", locale)}
                className="inline-flex shrink-0 items-center justify-center rounded-full bg-neutral-950 px-7 py-4 text-sm font-semibold !text-white transition hover:bg-neutral-800"
              >
                <span className="!text-white">{messages.seeCategories}</span>
                <ArrowRight className="ml-2 h-4 w-4 !text-white" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
