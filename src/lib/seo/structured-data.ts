import { absoluteUrl, SITE_NAME } from "@/lib/seo/site";

type ProductPriceForSchema = {
  final_price: number;
  currency: string;
};

type ProductStructuredDataInput = {
  name: string;
  slug: string;
  sku: string;
  description: string;
  imageUrl?: string | null;
  brand?: string | null;
  material?: string | null;
  categoryName?: string | null;
  subcategoryName?: string | null;
  totalStock: number;
  prices: ProductPriceForSchema[];
};

type BreadcrumbItem = {
  name: string;
  url: string;
};

function removeEmptyValues<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => {
      if (item === undefined || item === null || item === "") {
        return false;
      }

      if (Array.isArray(item) && item.length === 0) {
        return false;
      }

      return true;
    }),
  ) as T;
}

function getPrimaryValidPrice(
  prices: ProductPriceForSchema[],
): ProductPriceForSchema | null {
  return (
    prices.find(
      (price) =>
        Number.isFinite(price.final_price) &&
        price.final_price > 0 &&
        Boolean(price.currency?.trim()),
    ) ?? null
  );
}

function buildBreadcrumbList(items: BreadcrumbItem[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function buildProductStructuredData(
  input: ProductStructuredDataInput,
): Record<string, unknown> {
  const productPath = `/produto/${encodeURIComponent(input.slug)}`;
  const productUrl = absoluteUrl(productPath);
  const categoryName = input.categoryName?.trim() || null;
  const subcategoryName = input.subcategoryName?.trim() || null;
  const categoryLabel = [categoryName, subcategoryName]
    .filter(Boolean)
    .join(" > ");
  const primaryPrice = getPrimaryValidPrice(input.prices);

  const breadcrumbs: BreadcrumbItem[] = [
    { name: SITE_NAME, url: absoluteUrl("/") },
    { name: "Categorias", url: absoluteUrl("/categorias") },
  ];

  if (categoryName) {
    breadcrumbs.push({
      name: categoryName,
      url: absoluteUrl(`/categorias/${encodeURIComponent(categoryName)}`),
    });
  }

  breadcrumbs.push({ name: input.name, url: productUrl });

  const offer = primaryPrice
    ? removeEmptyValues({
        "@type": "Offer",
        url: productUrl,
        priceCurrency: primaryPrice.currency,
        price: primaryPrice.final_price,
        availability:
          input.totalStock > 0
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        itemCondition: "https://schema.org/NewCondition",
        inventoryLevel: {
          "@type": "QuantitativeValue",
          value: Math.max(0, input.totalStock),
        },
      })
    : undefined;

  const product = removeEmptyValues({
    "@type": "Product",
    "@id": `${productUrl}#product`,
    name: input.name,
    sku: input.sku,
    url: productUrl,
    description: input.description,
    image: input.imageUrl ? [input.imageUrl] : undefined,
    brand: input.brand?.trim()
      ? {
          "@type": "Brand",
          name: input.brand.trim(),
        }
      : undefined,
    material: input.material?.trim() || undefined,
    category: categoryLabel || undefined,
    offers: offer,
  });

  return {
    "@context": "https://schema.org",
    "@graph": [product, buildBreadcrumbList(breadcrumbs)],
  };
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
