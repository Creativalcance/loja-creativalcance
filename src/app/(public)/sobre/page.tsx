import type { Metadata } from "next";
import { notFound } from "next/navigation";
import InstitutionalPage from "@/components/seo/InstitutionalPage";
import { getInstitutionalPage } from "@/lib/seo/institutional-pages";
import { localizePath, SITE_LOCALES } from "@/lib/i18n/config";
import { getCurrentLocale } from "@/lib/i18n/server";
import {
  buildEditorialStructuredData,
  serializeJsonLd,
} from "@/lib/seo/structured-data";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const config = getInstitutionalPage("sobre", locale);
  return config ? {
      title: config.title,
      description: config.description,
      alternates: { canonical: localizePath("/sobre", locale) },
      openGraph: {
        type: "website",
        locale: SITE_LOCALES[locale].htmlLang.replace("-", "_"),
        title: config.title,
        description: config.description,
        url: localizePath("/sobre", locale),
      },
    }
  : { title: "Page not found", robots: { index: false } };
}

export default async function Page() {
  const locale = await getCurrentLocale();
  const config = getInstitutionalPage("sobre", locale);
  if (!config) {
    return notFound();
  }

  const structuredData = buildEditorialStructuredData({
    name: config.h1,
    description: config.description,
    path: localizePath("/sobre", locale),
    breadcrumbLabel: config.eyebrow,
  });

  return (
    <>
      <InstitutionalPage config={config} locale={locale} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
    </>
  );
}
