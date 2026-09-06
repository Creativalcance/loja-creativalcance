import type { Metadata, Viewport } from "next";
import GoogleAnalyticsTag from "@/components/analytics/GoogleAnalyticsTag";
import { absoluteUrl, getSiteUrl } from "@/lib/seo/site";
import { SITE_LOCALES } from "@/lib/i18n/config";
import { localizePath, type SiteLocale } from "@/lib/i18n/config";
import { getCurrentLocale } from "@/lib/i18n/server";
import "./globals.css";

const metadataCopy = {
  pt: { title: "360 Merchandising | Brindes Promocionais Personalizados", description: "Loja online de brindes personalizados, merchandising corporativo, vestuário promocional e gifts empresariais para empresas e particulares em Portugal.", ogTitle: "360 Merchandising | A forma inteligente de comprar merchandising", ogDescription: "Encontre merchandising, brindes promocionais e gifts empresariais personalizados para a sua empresa.", twitter: "A forma inteligente de comprar merchandising.", keywords: ["merchandising personalizado", "brindes promocionais", "merchandising corporativo", "brindes para empresas", "vestuário personalizado", "gifts empresariais", "Portugal"] },
  en: { title: "360 Merchandising | Custom Promotional Products", description: "Online store for custom promotional products, corporate merchandise, branded clothing and business gifts for companies and individuals.", ogTitle: "360 Merchandising | The smart way to buy merchandise", ogDescription: "Discover custom merchandise, promotional products and business gifts for your company.", twitter: "The smart way to buy merchandise.", keywords: ["custom merchandise", "promotional products", "corporate merchandise", "business gifts", "custom clothing", "branded products", "Europe"] },
  fr: { title: "360 Merchandising | Objets Publicitaires Personnalisés", description: "Boutique en ligne d’objets publicitaires personnalisés, de merchandising d’entreprise, de vêtements promotionnels et de cadeaux d’affaires.", ogTitle: "360 Merchandising | La façon intelligente d’acheter du merchandising", ogDescription: "Découvrez du merchandising, des objets publicitaires et des cadeaux d’affaires personnalisés pour votre entreprise.", twitter: "La façon intelligente d’acheter du merchandising.", keywords: ["merchandising personnalisé", "objets publicitaires", "merchandising d’entreprise", "cadeaux d’affaires", "vêtements personnalisés", "produits de marque", "Europe"] },
} satisfies Record<SiteLocale, { title: string; description: string; ogTitle: string; ogDescription: string; twitter: string; keywords: string[] }>;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale(); const t = metadataCopy[locale];
  return {
    title: { default: t.title, template: "%s | 360 Merchandising" }, description: t.description,
    metadataBase: new URL(getSiteUrl()), applicationName: "360 Merchandising", keywords: t.keywords,
    authors: [{ name: "360 Merchandising", url: localizePath("/autores/360-merchandising", locale) }], creator: "360 Merchandising", publisher: "360 Merchandising",
    openGraph: { type: "website", locale: SITE_LOCALES[locale].htmlLang.replace("-", "_"), siteName: "360 Merchandising", title: t.ogTitle, description: t.ogDescription, images: [{ url: "/brand/360-merchandising.png", width: 2000, height: 452, alt: "360 Merchandising" }] },
    twitter: { card: "summary_large_image", title: "360 Merchandising", description: t.twitter, images: ["/brand/360-merchandising.png"] },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#162334",
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default async function RootLayout({ children }: RootLayoutProps) {
  const locale = await getCurrentLocale();
  const t = metadataCopy[locale];
  const homePath = localizePath("/", locale);
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${absoluteUrl(homePath)}#organization`,
        name: "360 Merchandising",
        url: absoluteUrl(homePath),
        logo: absoluteUrl("/brand/360-merchandising.png"),
        description: t.description,
        publishingPrinciples: absoluteUrl(localizePath("/metodologia-editorial", locale)),
      },
      {
        "@type": "WebSite",
        "@id": `${absoluteUrl(homePath)}#website`,
        url: absoluteUrl(homePath),
        name: "360 Merchandising",
        inLanguage: SITE_LOCALES[locale].htmlLang,
        publisher: { "@id": `${absoluteUrl(homePath)}#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: `${absoluteUrl(localizePath("/pesquisa", locale))}?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <html lang={SITE_LOCALES[locale].htmlLang}>
      <body>
        <GoogleAnalyticsTag />
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </body>
    </html>
  );
}
