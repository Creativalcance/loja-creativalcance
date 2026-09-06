import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { getGuides } from "@/lib/seo/guide-pages";
import {
  buildCollectionStructuredData,
  serializeJsonLd,
} from "@/lib/seo/structured-data";
import { localizePath, SITE_LOCALES, type SiteLocale } from "@/lib/i18n/config";
import { getCurrentLocale } from "@/lib/i18n/server";

const copy: Record<SiteLocale, {
  title: string; description: string; ogDescription: string; back: string;
  eyebrow: string; heading: string; intro: string; read: string;
  ctaHeading: string; ctaText: string; ctaButton: string; breadcrumb: string;
}> = {
  pt: {
    title: "Guias de merchandising e brindes personalizados",
    description: "Guias práticos sobre brindes personalizados, merchandising corporativo, welcome kits, eventos, sustentabilidade, orçamento e personalização.",
    ogDescription: "Critérios práticos para escolher, personalizar e planear merchandising empresarial.",
    back: "← Voltar à página inicial", eyebrow: "Centro de conhecimento",
    heading: "Guias para escolher merchandising com critérios claros",
    intro: "Conteúdos práticos para transformar uma necessidade empresarial em critérios de produto, orçamento, quantidade, prazo, personalização e sustentabilidade.",
    read: "Ler guia", ctaHeading: "Passe do guia para uma seleção concreta",
    ctaText: "Depois de definir os seus critérios, use o Smart Merch para explorar produtos por necessidade, quantidade, orçamento ou prazo.",
    ctaButton: "Experimentar Smart Merch", breadcrumb: "Guias",
  },
  en: {
    title: "Corporate merchandise and promotional product guides",
    description: "Practical guides to promotional products, corporate merchandise, welcome kits, events, sustainability, budgets and customisation.",
    ogDescription: "Practical criteria for choosing, customising and planning corporate merchandise.",
    back: "← Back to homepage", eyebrow: "Knowledge centre",
    heading: "Guides for choosing merchandise with clear criteria",
    intro: "Practical content that turns a business need into clear criteria for product, budget, quantity, timing, customisation and sustainability.",
    read: "Read guide", ctaHeading: "Turn guidance into a concrete selection",
    ctaText: "Once your criteria are clear, use Smart Merch to explore products by need, quantity, budget or deadline.",
    ctaButton: "Try Smart Merch", breadcrumb: "Guides",
  },
  fr: {
    title: "Guides de merchandising et objets publicitaires personnalisés",
    description: "Guides pratiques sur les objets publicitaires, le merchandising d’entreprise, les welcome kits, les événements, la durabilité, le budget et la personnalisation.",
    ogDescription: "Des critères pratiques pour choisir, personnaliser et planifier votre merchandising d’entreprise.",
    back: "← Retour à l’accueil", eyebrow: "Centre de connaissances",
    heading: "Des guides pour choisir votre merchandising selon des critères clairs",
    intro: "Des contenus pratiques pour traduire un besoin professionnel en critères de produit, budget, quantité, délai, personnalisation et durabilité.",
    read: "Lire le guide", ctaHeading: "Passez du guide à une sélection concrète",
    ctaText: "Une fois vos critères définis, utilisez Smart Merch pour explorer les produits par besoin, quantité, budget ou délai.",
    ctaButton: "Essayer Smart Merch", breadcrumb: "Guides",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const t = copy[locale];
  const path = localizePath("/guias", locale);
  return {
    title: t.title, description: t.description, alternates: { canonical: path },
    openGraph: { type: "website", locale: SITE_LOCALES[locale].htmlLang.replace("-", "_"), title: t.title, description: t.ogDescription, url: path },
  };
}

export default async function GuidesPage() {
  const locale = await getCurrentLocale();
  const t = copy[locale];
  const guides = getGuides(locale);
  const path = localizePath("/guias", locale);
  const structuredData = buildCollectionStructuredData({
    name: t.title, description: t.ogDescription, path, breadcrumbLabel: t.breadcrumb,
  });

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <Link
          href={localizePath("/", locale)}
          className="text-sm font-medium text-white/50 transition hover:text-white"
        >
          {t.back}
        </Link>

        <div className="mt-12 max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#ff7a1a]">
            {t.eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">
            {t.heading}
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/65">
            {t.intro}
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {guides.map((guide) => (
            <Link
              key={guide.slug}
              href={localizePath(`/guias/${guide.slug}`, locale)}
              className="group rounded-3xl border border-white/10 bg-white/[0.04] p-7 transition hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.07]"
            >
              <BookOpen className="h-6 w-6 text-[#ff9b57]" />
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
                {guide.eyebrow}
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                {guide.h1}
              </h2>
              <p className="mt-4 line-clamp-3 text-sm leading-6 text-white/60">
                {guide.description}
              </p>
              <span className="mt-6 inline-flex items-center text-sm font-semibold">
                {t.read}
                <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-[#ff6a00]/30 bg-[#ff6a00]/10 p-7 md:flex md:items-center md:justify-between md:gap-8">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#ff9b57]">
              <Sparkles className="h-4 w-4" /> 360 Smart Merch
            </div>
            <h2 className="mt-3 text-2xl font-semibold">
              {t.ctaHeading}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
              {t.ctaText}
            </p>
          </div>
          <Link
            href={localizePath("/smart-merch", locale)}
            className="mt-5 inline-flex shrink-0 items-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-100 md:mt-0"
          >
            {t.ctaButton}
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
