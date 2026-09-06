import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SeoLandingPage from "@/components/seo/SeoLandingPage";
import {
  getApplicationPage,
  getApplicationPages,
} from "@/lib/seo/landing-pages";
import { getLandingProducts } from "@/lib/seo/landing-products";
import {
  buildCollectionStructuredData,
  serializeJsonLd,
} from "@/lib/seo/structured-data";
import { localizePath, SITE_LOCALES } from "@/lib/i18n/config";
import { getCurrentLocale } from "@/lib/i18n/server";

type ApplicationPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getApplicationPages().map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({
  params,
}: ApplicationPageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getCurrentLocale();
  const config = getApplicationPage(slug, locale);

  if (!config) {
    return { title: "Aplicação não encontrada", robots: { index: false } };
  }

  const path = localizePath(`/aplicacoes/${config.slug}`, locale);

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

export default async function ApplicationPage({ params }: ApplicationPageProps) {
  const { slug } = await params;
  const locale = await getCurrentLocale();
  const config = getApplicationPage(slug, locale);

  if (!config) {
    return notFound();
  }

  const products = await getLandingProducts(config.productQueries, 12);
  const path = localizePath(`/aplicacoes/${config.slug}`, locale);
  const structuredData = buildCollectionStructuredData({
    name: config.h1,
    description: config.description,
    path,
    breadcrumbParentPath: localizePath("/aplicacoes", locale),
    breadcrumbParentLabel: locale === "en" ? "Applications" : locale === "fr" ? "Applications" : "Aplicações",
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
