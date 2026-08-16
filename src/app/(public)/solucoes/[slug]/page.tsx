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
  const config = getCommercialPage(slug);

  if (!config) {
    return { title: "Solução não encontrada", robots: { index: false } };
  }

  const path = `/solucoes/${config.slug}`;

  return {
    title: config.title,
    description: config.description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "pt_PT",
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
  const config = getCommercialPage(slug);

  if (!config) {
    return notFound();
  }

  const products = await getCommercialLandingProducts(config.productQueries, {
    maxUnitPrice: config.productFilter?.maxUnitPrice,
    targetQuantity: config.productFilter?.targetQuantity,
    requireCustomizable: config.productFilter?.requireCustomizable,
    limit: 12,
  });
  const path = `/solucoes/${config.slug}`;
  const structuredData = buildCollectionStructuredData({
    name: config.h1,
    description: config.description,
    path,
    breadcrumbParentPath: "/solucoes",
    breadcrumbParentLabel: "Soluções",
    breadcrumbLabel: config.h1,
  });

  return (
    <>
      <CommercialLandingPage config={config} products={products} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
    </>
  );
}
