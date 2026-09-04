import type { Metadata, Viewport } from "next";
import GoogleAnalyticsTag from "@/components/analytics/GoogleAnalyticsTag";
import { absoluteUrl, getSiteUrl } from "@/lib/seo/site";
import { SITE_LOCALES } from "@/lib/i18n/config";
import { getCurrentLocale } from "@/lib/i18n/server";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "360 Merchandising | Brindes Promocionais Personalizados",
    template: "%s | 360 Merchandising",
  },
  description:
    "Loja online de brindes personalizados, merchandising corporativo, vestuário promocional e gifts empresariais para empresas e particulares em Portugal.",
  metadataBase: new URL(getSiteUrl()),
  applicationName: "360 Merchandising",
  keywords: [
    "merchandising personalizado",
    "brindes promocionais",
    "merchandising corporativo",
    "brindes para empresas",
    "vestuário personalizado",
    "gifts empresariais",
    "Portugal",
  ],
  authors: [
    { name: "360 Merchandising", url: "/autores/360-merchandising" },
  ],
  creator: "360 Merchandising",
  publisher: "360 Merchandising",
  openGraph: {
    type: "website",
    locale: "pt_PT",
    siteName: "360 Merchandising",
    title: "360 Merchandising | A forma inteligente de comprar merchandising",
    description:
      "Encontre merchandising, brindes promocionais e gifts empresariais personalizados para a sua empresa.",
    images: [
      {
        url: "/brand/360-merchandising.png",
        width: 2000,
        height: 452,
        alt: "360 Merchandising",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "360 Merchandising",
    description: "A forma inteligente de comprar merchandising.",
    images: ["/brand/360-merchandising.png"],
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
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${getSiteUrl()}/#organization`,
        name: "360 Merchandising",
        url: absoluteUrl("/"),
        logo: absoluteUrl("/brand/360-merchandising.png"),
        description:
          "Plataforma online de brindes personalizados, merchandising corporativo e gifts, com catálogo, personalização, conteúdos de apoio e compra online.",
        publishingPrinciples: absoluteUrl("/metodologia-editorial"),
      },
      {
        "@type": "WebSite",
        "@id": `${getSiteUrl()}/#website`,
        url: absoluteUrl("/"),
        name: "360 Merchandising",
        inLanguage: SITE_LOCALES[locale].htmlLang,
        publisher: { "@id": `${getSiteUrl()}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: `${getSiteUrl()}/pesquisa?q={search_term_string}`,
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
