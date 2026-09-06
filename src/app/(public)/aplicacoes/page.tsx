import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, BriefcaseBusiness, Sparkles } from "lucide-react";
import { getApplicationPages } from "@/lib/seo/landing-pages";
import {
  buildCollectionStructuredData,
  serializeJsonLd,
} from "@/lib/seo/structured-data";
import { localizePath, SITE_LOCALES } from "@/lib/i18n/config";
import { getCurrentLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const title = locale === "en" ? "Merchandise applications and custom promotional products" : locale === "fr" ? "Applications de merchandising et objets personnalisés" : "Aplicações de merchandising e brindes personalizados";
  const description = locale === "en" ? "Explore merchandise solutions for welcome kits, events, conferences, Christmas campaigns and employees." : locale === "fr" ? "Explorez des solutions pour les welcome kits, événements, congrès, campagnes de Noël et collaborateurs." : "Explore soluções de merchandising para welcome kits, eventos, congressos, Natal, colaboradores e outras necessidades empresariais.";
  const path = localizePath("/aplicacoes", locale);
  return { title, description, alternates: { canonical: path }, openGraph: { type: "website", locale: SITE_LOCALES[locale].htmlLang.replace("-", "_"), title, description, url: path } };
}

export default async function ApplicationsPage() {
  const locale = await getCurrentLocale();
  const copy = locale === "en" ? { back: "Back to homepage", eyebrow: "Solutions by requirement", title: "Merchandise applications", intro: "Find ideas, selection criteria and products for onboarding, events, conferences, Christmas campaigns and employee engagement.", explore: "Explore solution", unsure: "Not sure which product to choose?", unsureText: "Describe your requirement, quantity, budget or deadline and use Smart Merch to explore the catalogue.", try: "Try Smart Merch" } : locale === "fr" ? { back: "Retour à l’accueil", eyebrow: "Solutions par besoin", title: "Applications du merchandising", intro: "Découvrez des idées, critères et produits pour l’accueil, les événements, les congrès, Noël et l’engagement des collaborateurs.", explore: "Explorer la solution", unsure: "Vous ne savez pas quel produit choisir ?", unsureText: "Décrivez votre besoin, quantité, budget ou délai et utilisez Smart Merch pour explorer le catalogue.", try: "Essayer Smart Merch" } : { back: "Voltar à página inicial", eyebrow: "Soluções por necessidade", title: "Aplicações de merchandising", intro: "Encontre ideias, critérios de escolha e produtos de acordo com o objetivo da sua ação: receber colaboradores, organizar um evento, preparar um congresso ou criar uma campanha de Natal.", explore: "Explorar solução", unsure: "Ainda não sabe que produto escolher?", unsureText: "Descreva a necessidade, quantidade, orçamento ou prazo e use o Smart Merch para explorar o catálogo.", try: "Experimentar Smart Merch" };
  const pages = getApplicationPages(locale);
  const path = localizePath("/aplicacoes", locale);
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
              href={localizePath(`/aplicacoes/${page.slug}`, locale)}
              className="group rounded-3xl border border-white/10 bg-white/[0.04] p-7 transition hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.07]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
                <BriefcaseBusiness className="h-5 w-5" />
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
              {copy.unsure}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
              {copy.unsureText}
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
