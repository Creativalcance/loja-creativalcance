import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SelectionPage from "@/components/seo/SelectionPage";
import { getCommercialLandingProducts } from "@/lib/seo/landing-products";
import { getSelectionPage, getSelectionPages } from "@/lib/seo/selection-pages";
import {
  buildSelectionStructuredData,
  serializeJsonLd,
} from "@/lib/seo/structured-data";
import { localizePath, SITE_LOCALES } from "@/lib/i18n/config";
import { getCurrentLocale } from "@/lib/i18n/server";

type SelectionDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getSelectionPages().map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({
  params,
}: SelectionDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getCurrentLocale();
  const config = getSelectionPage(slug, locale);

  if (!config) {
    return { title: locale === "en" ? "Selection not found" : locale === "fr" ? "Sélection introuvable" : "Seleção não encontrada", robots: { index: false } };
  }

  const path = localizePath(`/selecoes/${config.slug}`, locale);

  return {
    title: config.title,
    description: config.description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: SITE_LOCALES[locale].htmlLang.replace("-", "_"),
      title: config.title,
      description: config.description,
      url: path,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export default async function SelectionDetailPage({
  params,
}: SelectionDetailPageProps) {
  const { slug } = await params;
  const locale = await getCurrentLocale();
  const config = getSelectionPage(slug, locale);

  if (!config) {
    return notFound();
  }

  const products = await getCommercialLandingProducts(config.productQueries, {
    requireCustomizable: true,
    limit: 12,
  });
  const path = localizePath(`/selecoes/${config.slug}`, locale);
  const structuredData = buildSelectionStructuredData({
    name: config.h1,
    description: config.description,
    path,
    breadcrumbLabel: config.h1,
    items: products.map((product) => ({
      name: product.name,
      slug: product.slug,
    })),
  });

  return (
    <>
      <SelectionPage config={config} products={products} locale={locale} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
    </>
  );
}
