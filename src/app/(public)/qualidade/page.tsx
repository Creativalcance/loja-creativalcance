import type { Metadata } from "next";
import { notFound } from "next/navigation";
import InstitutionalPage from "@/components/seo/InstitutionalPage";
import { getInstitutionalPage } from "@/lib/seo/institutional-pages";
import {
  buildEditorialStructuredData,
  serializeJsonLd,
} from "@/lib/seo/structured-data";

const config = getInstitutionalPage("qualidade");

export const metadata: Metadata = config
  ? {
      title: config.title,
      description: config.description,
      alternates: { canonical: "/qualidade" },
      openGraph: {
        type: "website",
        locale: "pt_PT",
        title: config.title,
        description: config.description,
        url: "/qualidade",
      },
    }
  : { title: "Página não encontrada", robots: { index: false } };

export default function Page() {
  if (!config) {
    return notFound();
  }

  const structuredData = buildEditorialStructuredData({
    name: config.h1,
    description: config.description,
    path: "/qualidade",
    breadcrumbLabel: config.eyebrow,
  });

  return (
    <>
      <InstitutionalPage config={config} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
    </>
  );
}
