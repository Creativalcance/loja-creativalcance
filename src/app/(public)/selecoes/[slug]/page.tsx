import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SelectionPage from "@/components/seo/SelectionPage";
import { getCommercialLandingProducts } from "@/lib/seo/landing-products";
import { getSelectionPage, getSelectionPages } from "@/lib/seo/selection-pages";
import {
  buildSelectionStructuredData,
  serializeJsonLd,
} from "@/lib/seo/structured-data";

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
  const config = getSelectionPage(slug);

  if (!config) {
    return { title: "Seleção não encontrada", robots: { index: false } };
  }

  const path = `/selecoes/${config.slug}`;

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

export default async function SelectionDetailPage({
  params,
}: SelectionDetailPageProps) {
  const { slug } = await params;
  const config = getSelectionPage(slug);

  if (!config) {
    return notFound();
  }

  const products = await getCommercialLandingProducts(config.productQueries, {
    requireCustomizable: true,
    limit: 12,
  });
  const path = `/selecoes/${config.slug}`;
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
      <SelectionPage config={config} products={products} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
    </>
  );
}
