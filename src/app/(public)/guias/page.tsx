import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { getGuides } from "@/lib/seo/guide-pages";
import {
  buildCollectionStructuredData,
  serializeJsonLd,
} from "@/lib/seo/structured-data";

export const metadata: Metadata = {
  title: "Guias de merchandising e brindes personalizados",
  description:
    "Guias práticos sobre brindes personalizados, merchandising corporativo, welcome kits, eventos, sustentabilidade, orçamento e personalização.",
  alternates: { canonical: "/guias" },
  openGraph: {
    type: "website",
    locale: "pt_PT",
    title: "Guias de merchandising e brindes personalizados",
    description:
      "Critérios práticos para escolher, personalizar e planear merchandising empresarial.",
    url: "/guias",
  },
};

export default function GuidesPage() {
  const guides = getGuides();
  const structuredData = buildCollectionStructuredData({
    name: "Guias de merchandising e brindes personalizados",
    description:
      "Critérios práticos para escolher, personalizar e planear merchandising empresarial.",
    path: "/guias",
    breadcrumbLabel: "Guias",
  });

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <Link
          href="/"
          className="text-sm font-medium text-white/50 transition hover:text-white"
        >
          ← Voltar à página inicial
        </Link>

        <div className="mt-12 max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#ff7a1a]">
            Centro de conhecimento
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">
            Guias para escolher merchandising com critérios claros
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/65">
            Conteúdos práticos para transformar uma necessidade empresarial em
            critérios de produto, orçamento, quantidade, prazo, personalização e
            sustentabilidade.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {guides.map((guide) => (
            <Link
              key={guide.slug}
              href={`/guias/${guide.slug}`}
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
                Ler guia
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
              Passe do guia para uma seleção concreta
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
              Depois de definir os seus critérios, use o Smart Merch para
              explorar produtos por necessidade, quantidade, orçamento ou prazo.
            </p>
          </div>
          <Link
            href="/smart-merch"
            className="mt-5 inline-flex shrink-0 items-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-100 md:mt-0"
          >
            Experimentar Smart Merch
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
