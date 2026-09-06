import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SeoLandingPage from "@/components/seo/SeoLandingPage";
import { getIndustryPage, getIndustryPages } from "@/lib/seo/landing-pages";
import { getLandingProducts } from "@/lib/seo/landing-products";
import {
  buildCollectionStructuredData,
  serializeJsonLd,
} from "@/lib/seo/structured-data";
import { localizePath, SITE_LOCALES } from "@/lib/i18n/config";
import { getCurrentLocale } from "@/lib/i18n/server";

type IndustryPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getIndustryPages().map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({
  params,
}: IndustryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getCurrentLocale();
  const config = getIndustryPage(slug, locale);

  if (!config) {
    return { title: "Indústria não encontrada", robots: { index: false } };
  }

  const path = localizePath(`/industrias/${config.slug}`, locale);

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

export default async function IndustryPage({ params }: IndustryPageProps) {
  const { slug } = await params;
  const locale = await getCurrentLocale();
  const config = getIndustryPage(slug, locale);

  if (!config) {
    return notFound();
  }

  const products = await getLandingProducts(config.productQueries, 12);
  const path = localizePath(`/industrias/${config.slug}`, locale);
  const structuredData = buildCollectionStructuredData({
    name: config.h1,
    description: config.description,
    path,
    breadcrumbParentPath: localizePath("/industrias", locale),
    breadcrumbParentLabel: locale === "en" ? "Industries" : locale === "fr" ? "Secteurs" : "Indústrias",
    breadcrumbLabel: config.h1,
  });

  return (
    <>
      <SeoLandingPage config={config} products={products} locale={locale} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
    </>
  );
}
