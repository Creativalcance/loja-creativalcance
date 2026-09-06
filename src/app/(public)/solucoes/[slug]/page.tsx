import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CommercialLandingPage from "@/components/seo/CommercialLandingPage";
import {
  getCommercialPage,
  getCommercialPages,
} from "@/lib/seo/commercial-pages";
import { getCommercialLandingProducts } from "@/lib/seo/landing-products";
import {
  buildCollectionStructuredData,
  serializeJsonLd,
} from "@/lib/seo/structured-data";
import { localizePath, SITE_LOCALES } from "@/lib/i18n/config";
import { getCurrentLocale } from "@/lib/i18n/server";

type CommercialSolutionPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getCommercialPages().map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({
  params,
}: CommercialSolutionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getCurrentLocale();
  const config = getCommercialPage(slug, locale);

  if (!config) {
    return { title: locale === "en" ? "Solution not found" : locale === "fr" ? "Solution introuvable" : "Solução não encontrada", robots: { index: false } };
  }

  const path = localizePath(`/solucoes/${config.slug}`, locale);

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

export default async function CommercialSolutionPage({
  params,
}: CommercialSolutionPageProps) {
  const { slug } = await params;
  const locale = await getCurrentLocale();
  const config = getCommercialPage(slug, locale);

  if (!config) {
    return notFound();
  }

  const products = await getCommercialLandingProducts(config.productQueries, {
    maxUnitPrice: config.productFilter?.maxUnitPrice,
    targetQuantity: config.productFilter?.targetQuantity,
    requireCustomizable: config.productFilter?.requireCustomizable,
    limit: 12,
  });
  const path = localizePath(`/solucoes/${config.slug}`, locale);
  const structuredData = buildCollectionStructuredData({
    name: config.h1,
    description: config.description,
    path,
    breadcrumbParentPath: localizePath("/solucoes", locale),
    breadcrumbParentLabel: locale === "en" ? "Solutions" : locale === "fr" ? "Solutions" : "Soluções",
    breadcrumbLabel: config.h1,
  });

  return (
    <>
      <CommercialLandingPage config={config} products={products} locale={locale} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
    </>
  );
}
