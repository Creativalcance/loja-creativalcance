import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Building2, Sparkles } from "lucide-react";
import { getIndustryPages } from "@/lib/seo/landing-pages";
import {
  buildCollectionStructuredData,
  serializeJsonLd,
} from "@/lib/seo/structured-data";

export const metadata: Metadata = {
  title: "Merchandising personalizado por indústria",
  description:
    "Explore soluções de merchandising para hotelaria, universidades, startups, tecnologia, saúde, turismo e restauração.",
  alternates: { canonical: "/industrias" },
  openGraph: {
    type: "website",
    locale: "pt_PT",
    title: "Merchandising personalizado por indústria",
    description:
      "Soluções de merchandising adaptadas a diferentes setores e contextos empresariais.",
    url: "/industrias",
  },
};

export default function IndustriesPage() {
  const pages = getIndustryPages();
  const structuredData = buildCollectionStructuredData({
    name: "Merchandising personalizado por indústria",
    description:
      "Soluções de merchandising adaptadas a diferentes setores e contextos empresariais.",
    path: "/industrias",
    breadcrumbLabel: "Indústrias",
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
            Soluções por setor
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">
            Merchandising por indústria
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/65">
            Explore contextos, ideias e produtos de acordo com o setor em que
            atua. Cada indústria tem públicos, ocasiões e necessidades de
            utilização diferentes.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {pages.map((page) => (
            <Link
              key={page.slug}
              href={`/industrias/${page.slug}`}
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
                Explorar setor
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
              Precisa de uma seleção para o seu setor?
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
              Use o Smart Merch para cruzar a sua necessidade com quantidade,
              orçamento e prazo.
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
