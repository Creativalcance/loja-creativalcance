import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "360 Merchandising | Brindes Promocionais Personalizados",
    template: "%s | 360 Merchandising",
  },
  description:
    "Plataforma B2B premium para brindes promocionais, merchandising corporativo, vestuário promocional e gifts empresariais personalizados.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
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
  authors: [{ name: "360 Merchandising" }],
  creator: "360 Merchandising",
  publisher: "360 Merchandising",
  alternates: { canonical: "/" },
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

export default function RootLayout({ children }: RootLayoutProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "/#organization",
        name: "360 Merchandising",
        url: "/",
        logo: "/brand/360-merchandising.png",
      },
      {
        "@type": "WebSite",
        "@id": "/#website",
        url: "/",
        name: "360 Merchandising",
        inLanguage: "pt-PT",
        publisher: { "@id": "/#organization" },
        potentialAction: {
          "@type": "SearchAction",
          target: "/pesquisa?q={search_term_string}",
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <html lang="pt-PT">
      <body>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </body>
    </html>
  );
}
