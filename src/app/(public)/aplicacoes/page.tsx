import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, BriefcaseBusiness, Sparkles } from "lucide-react";
import { getApplicationPages } from "@/lib/seo/landing-pages";
import {
  buildCollectionStructuredData,
  serializeJsonLd,
} from "@/lib/seo/structured-data";

export const metadata: Metadata = {
  title: "Aplicações de merchandising e brindes personalizados",
  description:
    "Explore soluções de merchandising para welcome kits, eventos, congressos, Natal, colaboradores e outras necessidades empresariais.",
  alternates: { canonical: "/aplicacoes" },
  openGraph: {
    type: "website",
    locale: "pt_PT",
    title: "Aplicações de merchandising e brindes personalizados",
    description:
      "Soluções de merchandising organizadas por objetivo, ocasião e necessidade.",
    url: "/aplicacoes",
  },
};

export default function ApplicationsPage() {
  const pages = getApplicationPages();
  const structuredData = buildCollectionStructuredData({
    name: "Aplicações de merchandising e brindes personalizados",
    description:
      "Soluções de merchandising organizadas por objetivo, ocasião e necessidade.",
    path: "/aplicacoes",
    breadcrumbLabel: "Aplicações",
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
            Soluções por necessidade
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">
            Aplicações de merchandising
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/65">
            Encontre ideias, critérios de escolha e produtos de acordo com o
            objetivo da sua ação: receber colaboradores, organizar um evento,
            preparar um congresso ou criar uma campanha de Natal.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {pages.map((page) => (
            <Link
              key={page.slug}
              href={`/aplicacoes/${page.slug}`}
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
                Explorar solução
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
              Ainda não sabe que produto escolher?
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
              Descreva a necessidade, quantidade, orçamento ou prazo e use o
              Smart Merch para explorar o catálogo.
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
