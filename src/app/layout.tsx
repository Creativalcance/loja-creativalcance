import type { Metadata, Viewport } from "next";
import CookieConsentManager from "@/components/privacy/CookieConsentManager";
import { absoluteUrl, getSiteUrl } from "@/lib/seo/site";
import { SITE_LOCALES } from "@/lib/i18n/config";
import { localizePath, type SiteLocale } from "@/lib/i18n/config";
import { getCurrentLocale } from "@/lib/i18n/server";
import "./globals.css";

const metadataCopy = {
  pt: { title: "360 Merchandising | Brindes Promocionais Personalizados", description: "Loja online de brindes personalizados, merchandising corporativo, vestuário promocional e gifts empresariais para empresas e particulares em Portugal.", ogTitle: "360 Merchandising | A forma inteligente de comprar merchandising", ogDescription: "Encontre merchandising, brindes promocionais e gifts empresariais personalizados para a sua empresa.", twitter: "A forma inteligente de comprar merchandising.", keywords: ["merchandising personalizado", "brindes promocionais", "merchandising corporativo", "brindes para empresas", "vestuário personalizado", "gifts empresariais", "Portugal"] },
  en: { title: "360 Merchandising | Custom Promotional Products", description: "Online store for custom promotional products, corporate merchandise, branded clothing and business gifts for companies and individuals.", ogTitle: "360 Merchandising | The smart way to buy merchandise", ogDescription: "Discover custom merchandise, promotional products and business gifts for your company.", twitter: "The smart way to buy merchandise.", keywords: ["custom merchandise", "promotional products", "corporate merchandise", "business gifts", "custom clothing", "branded products", "Europe"] },
  fr: { title: "360 Merchandising | Objets Publicitaires Personnalisés", description: "Boutique en ligne d’objets publicitaires personnalisés, de merchandising d’entreprise, de vêtements promotionnels et de cadeaux d’affaires.", ogTitle: "360 Merchandising | La façon intelligente d’acheter du merchandising", ogDescription: "Découvrez du merchandising, des objets publicitaires et des cadeaux d’affaires personnalisés pour votre entreprise.", twitter: "La façon intelligente d’acheter du merchandising.", keywords: ["merchandising personnalisé", "objets publicitaires", "merchandising d’entreprise", "cadeaux d’affaires", "vêtements personnalisés", "produits de marque", "Europe"] },

es: { title: "360 Merchandising \u2014 Productos promocionales personalizados", description: "Tienda online de productos promocionales personalizados, merchandising corporativo, ropa de marca y regalos empresariales para empresas y particulares.", ogTitle: "360 Merchandising \u2014 La forma inteligente de comprar merchandising", ogDescription: "Descubre merchandising, productos promocionales y regalos empresariales personalizados para tu empresa.", twitter: "La forma inteligente de comprar merchandising.", keywords: ["merchandising personalizado", "productos promocionales", "merchandising corporativo", "regalos empresariales", "ropa personalizada", "productos de marca", "Europa"] },
de: { title: "360 Merchandising \u2014 Personalisierte Werbeartikel", description: "Onlineshop f\u00FCr personalisierte Werbeartikel, Unternehmensmerchandising, Markenkleidung und Firmengeschenke f\u00FCr Unternehmen und Privatpersonen.", ogTitle: "360 Merchandising \u2014 Merchandising clever einkaufen", ogDescription: "Entdecken Sie personalisiertes Merchandising, Werbeartikel und Firmengeschenke f\u00FCr Ihr Unternehmen.", twitter: "Merchandising clever einkaufen.", keywords: ["personalisiertes Merchandising", "Werbeartikel", "Unternehmensmerchandising", "Firmengeschenke", "personalisierte Kleidung", "Markenprodukte", "Europa"] },
it: { title: "360 Merchandising \u2014 Prodotti promozionali personalizzati", description: "Negozio online di prodotti promozionali personalizzati, merchandising aziendale, abbigliamento con logo e regali aziendali per imprese e privati.", ogTitle: "360 Merchandising \u2014 Il modo intelligente di acquistare merchandising", ogDescription: "Scopri merchandising, prodotti promozionali e regali aziendali personalizzati per la tua impresa.", twitter: "Il modo intelligente di acquistare merchandising.", keywords: ["merchandising personalizzato", "prodotti promozionali", "merchandising aziendale", "regali aziendali", "abbigliamento personalizzato", "prodotti con marchio", "Europa"] },
} satisfies Record<SiteLocale, { title: string; description: string; ogTitle: string; ogDescription: string; twitter: string; keywords: string[] }>;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale(); const t = metadataCopy[locale];
  return {
    title: { default: t.title, template: "%s | 360 Merchandising" }, description: t.description,
    metadataBase: new URL(getSiteUrl()), applicationName: "360 Merchandising", keywords: t.keywords,
    icons: {
      icon: [{ url: "/brand/favicon.png", type: "image/png", sizes: "192x192" }],
      shortcut: "/brand/favicon.png",
      apple: [{ url: "/brand/favicon.png", type: "image/png", sizes: "192x192" }],
    },
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
        <CookieConsentManager locale={locale} />
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </body>
    </html>
  );
}
