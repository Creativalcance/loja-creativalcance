import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GuidePage from "@/components/seo/GuidePage";
import { getGuide, getGuides } from "@/lib/seo/guide-pages";
import { getLandingProducts } from "@/lib/seo/landing-products";
import {
  buildEditorialStructuredData,
  serializeJsonLd,
} from "@/lib/seo/structured-data";

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
  const config = getGuide(slug);

  if (!config) {
    return { title: "Guia não encontrado", robots: { index: false } };
  }

  const path = `/guias/${config.slug}`;

  return {
    title: config.title,
    description: config.description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
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

export default async function GuideDetailPage({ params }: GuidePageProps) {
  const { slug } = await params;
  const config = getGuide(slug);

  if (!config) {
    return notFound();
  }

  const products = await getLandingProducts(config.productQueries, 8);
  const path = `/guias/${config.slug}`;
  const structuredData = buildEditorialStructuredData({
    name: config.h1,
    description: config.description,
    path,
    breadcrumbParentPath: "/guias",
    breadcrumbParentLabel: "Guias",
    breadcrumbLabel: config.h1,
    article: true,
  });

  return (
    <>
      <GuidePage config={config} products={products} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
    </>
  );
}
