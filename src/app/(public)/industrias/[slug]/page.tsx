import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SeoLandingPage from "@/components/seo/SeoLandingPage";
import { getIndustryPage, getIndustryPages } from "@/lib/seo/landing-pages";
import { getLandingProducts } from "@/lib/seo/landing-products";
import {
  buildCollectionStructuredData,
  serializeJsonLd,
} from "@/lib/seo/structured-data";

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
  const config = getIndustryPage(slug);

  if (!config) {
    return { title: "Indústria não encontrada", robots: { index: false } };
  }

  const path = `/industrias/${config.slug}`;

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

export default async function IndustryPage({ params }: IndustryPageProps) {
  const { slug } = await params;
  const config = getIndustryPage(slug);

  if (!config) {
    return notFound();
  }

  const products = await getLandingProducts(config.productQueries, 12);
  const path = `/industrias/${config.slug}`;
  const structuredData = buildCollectionStructuredData({
    name: config.h1,
    description: config.description,
    path,
    breadcrumbParentPath: "/industrias",
    breadcrumbParentLabel: "Indústrias",
    breadcrumbLabel: config.h1,
  });

  return (
    <>
      <SeoLandingPage config={config} products={products} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
    </>
  );
}
