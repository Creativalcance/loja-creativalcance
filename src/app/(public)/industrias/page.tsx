import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Building2, Sparkles } from "lucide-react";
import { getIndustryPages } from "@/lib/seo/landing-pages";
import {
  buildCollectionStructuredData,
  serializeJsonLd,
} from "@/lib/seo/structured-data";
import { localizePath, SITE_LOCALES } from "@/lib/i18n/config";
import { getCurrentLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const title = locale === "en" ? "Custom merchandise by industry" : locale === "fr" ? "Merchandising personnalisé par secteur" : "Merchandising personalizado por indústria";
  const description = locale === "en" ? "Explore merchandise for hospitality, universities, startups, technology, healthcare, tourism and restaurants." : locale === "fr" ? "Explorez le merchandising pour l’hôtellerie, les universités, les startups, la technologie, la santé, le tourisme et la restauration." : "Explore soluções de merchandising para hotelaria, universidades, startups, tecnologia, saúde, turismo e restauração.";
  const path = localizePath("/industrias", locale);
  return { title, description, alternates: { canonical: path }, openGraph: { type: "website", locale: SITE_LOCALES[locale].htmlLang.replace("-", "_"), title, description, url: path } };
}

export default async function IndustriesPage() {
  const locale = await getCurrentLocale();
  const copy = locale === "en" ? { back: "Back to homepage", eyebrow: "Solutions by industry", title: "Merchandise by industry", intro: "Explore ideas and products suited to your industry. Every sector has different audiences, occasions and use cases.", explore: "Explore industry", need: "Need a selection for your industry?", needText: "Use Smart Merch to combine your requirement with quantity, budget and deadline.", try: "Try Smart Merch" } : locale === "fr" ? { back: "Retour à l’accueil", eyebrow: "Solutions par secteur", title: "Merchandising par secteur", intro: "Découvrez des idées et produits adaptés à votre secteur. Chaque activité possède ses publics, occasions et usages.", explore: "Explorer le secteur", need: "Besoin d’une sélection pour votre secteur ?", needText: "Utilisez Smart Merch pour croiser votre besoin avec la quantité, le budget et le délai.", try: "Essayer Smart Merch" } : { back: "Voltar à página inicial", eyebrow: "Soluções por setor", title: "Merchandising por indústria", intro: "Explore contextos, ideias e produtos de acordo com o setor em que atua. Cada indústria tem públicos, ocasiões e necessidades de utilização diferentes.", explore: "Explorar setor", need: "Precisa de uma seleção para o seu setor?", needText: "Use o Smart Merch para cruzar a sua necessidade com quantidade, orçamento e prazo.", try: "Experimentar Smart Merch" };
  const pages = getIndustryPages(locale);
  const path = localizePath("/industrias", locale);
  const structuredData = buildCollectionStructuredData({
    name: copy.title,
    description: copy.intro,
    path,
    breadcrumbLabel: copy.title,
  });

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <Link
          href={localizePath("/", locale)}
          className="text-sm font-medium text-white/50 transition hover:text-white"
        >
          ← {copy.back}
        </Link>

        <div className="mt-12 max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#ff7a1a]">
            {copy.eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">
            {copy.title}
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/65">
            {copy.intro}
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {pages.map((page) => (
            <Link
              key={page.slug}
              href={localizePath(`/industrias/${page.slug}`, locale)}
              className="group rounded-3xl border border-white/10 bg-white/[0.04] p-7 transition hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.07]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
                <Building2 className="h-5 w-5" />
              </div>
              <h2 className="mt-6 text-2xl font-semibold tracking-tight">
                {page.h1}
              </h2>
              <p className="mt-4 line-clamp-3 text-sm leading-6 text-white/60">
                {page.description}
              </p>
              <span className="mt-6 inline-flex items-center text-sm font-semibold">
                {copy.explore}
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
              {copy.need}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
              {copy.needText}
            </p>
          </div>
          <Link
            href={localizePath("/smart-merch", locale)}
            className="mt-5 inline-flex shrink-0 items-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-100 md:mt-0"
          >
            {copy.try}
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
