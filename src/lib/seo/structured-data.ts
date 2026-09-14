import { getSiteLocale, SITE_LOCALES } from "@/lib/i18n/config";
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
  locale?: "pt" | "en" | "fr" | "es" | "de" | "it";
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

function getStructuredDataLocale(path: string) {
  const locale = getSiteLocale(path.split("/").filter(Boolean)[0]);
  return {
    language: SITE_LOCALES[locale].htmlLang,
    homePath: SITE_LOCALES[locale].pathPrefix || "/",
  };
}

export function buildProductStructuredData(
  input: ProductStructuredDataInput,
): Record<string, unknown> {
  const localeCode = input.locale ?? "pt";
  const prefix = localeCode === "pt" ? "" : `/${localeCode}`;
  const language = SITE_LOCALES[localeCode].htmlLang;
  const labels = (localeCode === "es" ? ({ categories: "Categor\u00EDas" }) : localeCode === "de" ? ({ categories: "Kategorien" }) : localeCode === "it" ? ({ categories: "Categorie" }) : localeCode === "en" ? { categories: "Categories" } : localeCode === "fr" ? { categories: "Catégories" } : { categories: "Categorias" });
  const productPath = `${prefix}/produto/${encodeURIComponent(input.slug)}`;
  const productUrl = absoluteUrl(productPath);
  const categoryName = input.categoryName?.trim() || null;
  const subcategoryName = input.subcategoryName?.trim() || null;
  const categoryLabel = [categoryName, subcategoryName]
    .filter(Boolean)
    .join(" > ");
  const primaryPrice = getPrimaryValidPrice(input.prices);

  const breadcrumbs: BreadcrumbItem[] = [
    { name: SITE_NAME, url: absoluteUrl(prefix || "/") },
    { name: labels.categories, url: absoluteUrl(`${prefix}/categorias`) },
  ];

  if (categoryName) {
    const categoryPath = `${prefix}/categorias/${encodeURIComponent(categoryName)}`;

    breadcrumbs.push({
      name: categoryName,
      url: absoluteUrl(categoryPath),
    });

    if (subcategoryName) {
      breadcrumbs.push({
        name: subcategoryName,
        url: absoluteUrl(
          `${categoryPath}/${encodeURIComponent(subcategoryName)}`,
        ),
      });
    }
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
    inLanguage: language,
  });

  return {
    "@context": "https://schema.org",
    "@graph": [product, buildBreadcrumbList(breadcrumbs)],
  };
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

type CollectionStructuredDataInput = {
  name: string;
  description: string;
  path: string;
  breadcrumbLabel: string;
  breadcrumbParentPath?: string;
  breadcrumbParentLabel?: string;
};

export function buildCollectionStructuredData(
  input: CollectionStructuredDataInput,
): Record<string, unknown> {
  const pageUrl = absoluteUrl(input.path);
  const locale = getStructuredDataLocale(input.path);
  const breadcrumbs: BreadcrumbItem[] = [
    { name: SITE_NAME, url: absoluteUrl(locale.homePath) },
  ];

  if (input.breadcrumbParentPath && input.breadcrumbParentLabel) {
    breadcrumbs.push({
      name: input.breadcrumbParentLabel,
      url: absoluteUrl(input.breadcrumbParentPath),
    });
  }

  breadcrumbs.push({
    name: input.breadcrumbLabel,
    url: pageUrl,
  });

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${pageUrl}#collectionpage`,
        url: pageUrl,
        name: input.name,
        description: input.description,
        inLanguage: locale.language,
        isPartOf: {
          "@id": `${absoluteUrl(locale.homePath)}#website`,
        },
      },
      buildBreadcrumbList(breadcrumbs),
    ],
  };
}

type EditorialStructuredDataInput = {
  name: string;
  description: string;
  path: string;
  breadcrumbParentPath?: string;
  breadcrumbParentLabel?: string;
  breadcrumbLabel: string;
  article?: boolean;
};

export function buildEditorialStructuredData(
  input: EditorialStructuredDataInput,
): Record<string, unknown> {
  const pageUrl = absoluteUrl(input.path);
  const locale = getStructuredDataLocale(input.path);
  const breadcrumbs: BreadcrumbItem[] = [
    { name: SITE_NAME, url: absoluteUrl(locale.homePath) },
  ];

  if (input.breadcrumbParentPath && input.breadcrumbParentLabel) {
    breadcrumbs.push({
      name: input.breadcrumbParentLabel,
      url: absoluteUrl(input.breadcrumbParentPath),
    });
  }

  breadcrumbs.push({ name: input.breadcrumbLabel, url: pageUrl });

  const page = {
    "@type": input.article ? "Article" : "WebPage",
    "@id": `${pageUrl}#${input.article ? "article" : "webpage"}`,
    url: pageUrl,
    name: input.name,
    headline: input.article ? input.name : undefined,
    description: input.description,
    inLanguage: locale.language,
    isPartOf: {
      "@id": `${absoluteUrl(locale.homePath)}#website`,
    },
    author: input.article
      ? {
          "@id": `${absoluteUrl(`${locale.homePath === "/" ? "" : locale.homePath}/autores/360-merchandising`)}#author`,
        }
      : undefined,
    publisher: input.article
      ? {
          "@id": `${absoluteUrl(locale.homePath)}#organization`,
        }
      : undefined,
  };

  return {
    "@context": "https://schema.org",
    "@graph": [removeEmptyValues(page), buildBreadcrumbList(breadcrumbs)],
  };
}


export function buildAuthorStructuredData(path = "/autores/360-merchandising"): Record<string, unknown> {
  const authorUrl = absoluteUrl(path);
  const locale = getStructuredDataLocale(path);
  const prefix = locale.homePath === "/" ? "" : locale.homePath;
  const labels = (locale.language === "es-ES" ? ({ title: "autor editorial", breadcrumb: "Autor editorial", description: "Perfil editorial responsable de las gu\u00EDas, p\u00E1ginas t\u00E9cnicas y orientaciones de compra publicadas por 360 Merchandising." }) : locale.language === "de-DE" ? ({ title: "Redaktion", breadcrumb: "Redaktion", description: "Redaktionelles Profil, verantwortlich f\u00FCr die von 360 Merchandising ver\u00F6ffentlichten Ratgeber, technischen Seiten und Kaufberatung." }) : locale.language === "it-IT" ? ({ title: "autore editoriale", breadcrumb: "Autore editoriale", description: "Profilo editoriale responsabile delle guide, pagine tecniche e indicazioni all'acquisto pubblicate da 360 Merchandising." }) : locale.language === "en-GB"
    ? { title: "editorial author", breadcrumb: "Editorial author", description: "Editorial profile responsible for the guides, technical pages and purchase guidance published by 360 Merchandising." }
    : locale.language === "fr-FR"
      ? { title: "auteur éditorial", breadcrumb: "Auteur éditorial", description: "Profil éditorial responsable des guides, pages techniques et contenus d’aide à l’achat publiés par 360 Merchandising." }
      : { title: "autor editorial", breadcrumb: "Autor editorial", description: "Perfil editorial responsável pelos guias, páginas técnicas e conteúdos de apoio à compra publicados pela 360 Merchandising." });

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfilePage",
        "@id": `${authorUrl}#profilepage`,
        url: authorUrl,
        name: `${SITE_NAME} — ${labels.title}`,
        description: labels.description,
        inLanguage: locale.language,
        isPartOf: {
          "@id": `${absoluteUrl(locale.homePath)}#website`,
        },
        mainEntity: {
          "@id": `${authorUrl}#author`,
        },
      },
      {
        "@type": "Organization",
        "@id": `${authorUrl}#author`,
        name: SITE_NAME,
        url: absoluteUrl(`${prefix}/sobre`),
        logo: absoluteUrl("/brand/360-merchandising.png"),
        description:
          "Entidade editorial responsável pelos conteúdos institucionais e guias da 360 Merchandising.",
        publishingPrinciples: absoluteUrl(`${prefix}/metodologia-editorial`),
      },
      buildBreadcrumbList([
        { name: SITE_NAME, url: absoluteUrl(locale.homePath) },
        { name: labels.breadcrumb, url: authorUrl },
      ]),
    ],
  };
}

type SelectionStructuredDataInput = {
  name: string;
  description: string;
  path: string;
  breadcrumbLabel: string;
  items: Array<{
    name: string;
    slug: string;
  }>;
};

export function buildSelectionStructuredData(
  input: SelectionStructuredDataInput,
): Record<string, unknown> {
  const pageUrl = absoluteUrl(input.path);
  const locale = getStructuredDataLocale(input.path);
  const prefix = locale.homePath === "/" ? "" : locale.homePath;
  const labels = (locale.language === "es-ES" ? ({ products: "productos relacionados", selections: "Selecciones 360" }) : locale.language === "de-DE" ? ({ products: "verwandte Produkte", selections: "360-Auswahl" }) : locale.language === "it-IT" ? ({ products: "prodotti correlati", selections: "Selezioni 360" }) : locale.language === "en-GB"
    ? { products: "related products", selections: "360 Selections" }
    : locale.language === "fr-FR"
      ? { products: "produits associés", selections: "Sélections 360" }
      : { products: "produtos relacionados", selections: "Seleções 360" });
  const itemList = {
    "@type": "ItemList",
    "@id": `${pageUrl}#itemlist`,
    name: `${input.name} — ${labels.products}`,
    numberOfItems: input.items.length,
    itemListElement: input.items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: absoluteUrl(`${prefix}/produto/${encodeURIComponent(item.slug)}`),
    })),
  };

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${pageUrl}#collectionpage`,
        url: pageUrl,
        name: input.name,
        description: input.description,
        inLanguage: locale.language,
        isPartOf: {
          "@id": `${absoluteUrl(locale.homePath)}#website`,
        },
        mainEntity: {
          "@id": `${pageUrl}#itemlist`,
        },
      },
      itemList,
      buildBreadcrumbList([
        { name: SITE_NAME, url: absoluteUrl(locale.homePath) },
        { name: labels.selections, url: absoluteUrl(`${prefix}/selecoes`) },
        { name: input.breadcrumbLabel, url: pageUrl },
      ]),
    ],
  };
}
