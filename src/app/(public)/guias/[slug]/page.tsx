import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GuidePage from "@/components/seo/GuidePage";
import { getGuide, getGuides } from "@/lib/seo/guide-pages";
import { getLandingProducts } from "@/lib/seo/landing-products";
import {
  buildEditorialStructuredData,
  serializeJsonLd,
} from "@/lib/seo/structured-data";
import { localizePath, SITE_LOCALES } from "@/lib/i18n/config";
import { getCurrentLocale } from "@/lib/i18n/server";

type GuidePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getGuides().map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({
  params,
}: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getCurrentLocale();
  const config = getGuide(slug, locale);

  if (!config) {
    return { title: locale === "en" ? "Guide not found" : locale === "fr" ? "Guide introuvable" : "Guia não encontrado", robots: { index: false } };
  }

  const path = localizePath(`/guias/${config.slug}`, locale);

  return {
    title: config.title,
    description: config.description,
    authors: [
      { name: "360 Merchandising", url: localizePath("/autores/360-merchandising", locale) },
    ],
    alternates: { canonical: path },
    openGraph: {
      type: "article",
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

export default async function GuideDetailPage({ params }: GuidePageProps) {
  const { slug } = await params;
  const locale = await getCurrentLocale();
  const config = getGuide(slug, locale);

  if (!config) {
    return notFound();
  }

  const products = await getLandingProducts(config.productQueries, 8);
  const path = localizePath(`/guias/${config.slug}`, locale);
  const structuredData = buildEditorialStructuredData({
    name: config.h1,
    description: config.description,
    path,
    breadcrumbParentPath: localizePath("/guias", locale),
    breadcrumbParentLabel: locale === "en" ? "Guides" : locale === "fr" ? "Guides" : "Guias",
    breadcrumbLabel: config.h1,
    article: true,
  });

  return (
    <>
      <GuidePage config={config} products={products} locale={locale} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
    </>
  );
}
