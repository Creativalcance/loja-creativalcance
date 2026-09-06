import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Palette, ScanLine } from "lucide-react";
import { getPersonalizationPages } from "@/lib/seo/personalization-pages";
import {
  buildCollectionStructuredData,
  serializeJsonLd,
} from "@/lib/seo/structured-data";
import { localizePath, SITE_LOCALES } from "@/lib/i18n/config";
import { getCurrentLocale } from "@/lib/i18n/server";

const copy = {
  pt: { title: "Técnicas de personalização de merchandising", description: "Centro de personalização da 360 Merchandising: serigrafia, tampografia, gravação laser, transfer, hot stamping e critérios de configuração.", back: "Voltar à página inicial", eyebrow: "Centro de personalização", heading: "Perceba as técnicas antes de configurar o produto", intro: "A personalização depende da combinação entre produto, variante, componente, localização, área e técnica. Este centro explica como interpretar essas opções sem substituir a configuração específica apresentada em cada produto.", view: "Ver técnica", setup: "Configuração por produto", setupTitle: "A técnica disponível é sempre específica da referência", setupText: "Consulte a página do produto para confirmar variante, localização, área, técnica, quantidade e preço aplicáveis à configuração que pretende encomendar.", explore: "Explorar produtos", breadcrumb: "Personalização" },
  en: { title: "Merchandise customisation techniques", description: "360 Merchandising customisation centre: screen printing, pad printing, laser engraving, transfer, hot stamping and configuration criteria.", back: "Back to homepage", eyebrow: "Customisation centre", heading: "Understand the techniques before configuring a product", intro: "Customisation depends on the combination of product, variant, component, location, area and technique. This centre explains the options without replacing the specific configuration shown on each product.", view: "View technique", setup: "Product-specific configuration", setupTitle: "The available technique is always specific to the product reference", setupText: "Check the product page to confirm the variant, location, area, technique, quantity and price that apply to your configuration.", explore: "Explore products", breadcrumb: "Customisation" },
  fr: { title: "Techniques de personnalisation du merchandising", description: "Centre de personnalisation 360 Merchandising : sérigraphie, tampographie, gravure laser, transfert, marquage à chaud et critères de configuration.", back: "Retour à l’accueil", eyebrow: "Centre de personnalisation", heading: "Comprendre les techniques avant de configurer un produit", intro: "La personnalisation dépend de la combinaison du produit, de la variante, du composant, de l’emplacement, de la zone et de la technique. Ce centre explique les options sans remplacer la configuration propre à chaque produit.", view: "Voir la technique", setup: "Configuration par produit", setupTitle: "La technique disponible est toujours propre à la référence", setupText: "Consultez la page produit pour confirmer la variante, l’emplacement, la zone, la technique, la quantité et le prix applicables.", explore: "Explorer les produits", breadcrumb: "Personnalisation" },
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const t = copy[locale];
  const path = localizePath("/personalizacao", locale);
  return { title: t.title, description: t.description, alternates: { canonical: path }, openGraph: { type: "website", locale: SITE_LOCALES[locale].htmlLang.replace("-", "_"), title: t.title, description: t.description, url: path } };
}

export default async function PersonalizationHubPage() {
  const locale = await getCurrentLocale();
  const t = copy[locale];
  const techniques = getPersonalizationPages(locale);
  const path = localizePath("/personalizacao", locale);
  const structuredData = buildCollectionStructuredData({
    name: t.title,
    description: t.description,
    path,
    breadcrumbLabel: t.breadcrumb,
  });

  return (
    <main className="min-h-screen bg-neutral-50">
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <Link
            href={localizePath("/", locale)}
            className="text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
          >
            ← {t.back}
          </Link>
          <div className="mt-10 max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#e85f00]">
              {t.eyebrow}
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950 md:text-6xl">
              {t.heading}
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-neutral-600">
              {t.intro}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {techniques.map((technique) => (
            <Link
              key={technique.slug}
              href={localizePath(`/personalizacao/${technique.slug}`, locale)}
              className="group rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <Palette className="h-6 w-6 text-neutral-500" />
              <h2 className="mt-6 text-2xl font-semibold tracking-tight text-neutral-950">
                {technique.h1}
              </h2>
              <p className="mt-4 line-clamp-3 text-sm leading-6 text-neutral-600">
                {technique.description}
              </p>
              <span className="mt-6 inline-flex items-center text-sm font-semibold text-neutral-950">
                {t.view}
                <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-neutral-200 bg-neutral-950 p-8 text-white md:flex md:items-center md:justify-between md:gap-8">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-white/65">
              <ScanLine className="h-4 w-4" /> {t.setup}
            </div>
            <h2 className="mt-3 text-2xl font-semibold">
              {t.setupTitle}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">
              {t.setupText}
            </p>
          </div>
          <Link
            href={localizePath("/categorias", locale)}
            className="mt-5 inline-flex shrink-0 items-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-100 md:mt-0"
          >
            {t.explore}
          </Link>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
    </main>
  );
}
