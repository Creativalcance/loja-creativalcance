import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { getSelectionPages } from "@/lib/seo/selection-pages";
import {
  buildCollectionStructuredData,
  serializeJsonLd,
} from "@/lib/seo/structured-data";

export const metadata: Metadata = {
  title: "Seleções 360: melhores brindes por contexto e critérios",
  description:
    "Seleções orientadas para comparar brindes por contexto de utilização, com critérios explícitos e sem rankings artificiais.",
  alternates: { canonical: "/selecoes" },
  openGraph: {
    type: "website",
    locale: "pt_PT",
    title: "Seleções 360: melhores brindes por contexto e critérios",
    description:
      "Compare opções para empresas, eventos, congressos, colaboradores, sustentabilidade e tecnologia com metodologia transparente.",
    url: "/selecoes",
  },
};

export default function SelectionsHubPage() {
  const pages = getSelectionPages();
  const structuredData = buildCollectionStructuredData({
    name: "Seleções 360",
    description:
      "Seleções editoriais de merchandising orientadas por critérios e contexto de utilização.",
    path: "/selecoes",
    breadcrumbLabel: "Seleções 360",
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

        <div className="mt-12 grid gap-10 lg:grid-cols-[1.35fr_0.65fr] lg:items-start">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#ff7a1a]">
              Seleções editoriais transparentes
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">
              Seleções 360: o que significa “melhor” em cada contexto
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-white/65">
              Em merchandising, “melhor” depende do objetivo. Estas páginas
              organizam opções do catálogo ativo por contexto e explicam os
              critérios utilizados, sem transformar uma recomendação numa
              promessa universal.
            </p>
          </div>

          <aside className="rounded-3xl border border-[#ff6a00]/30 bg-[#ff6a00]/10 p-7">
            <ShieldCheck className="h-6 w-6 text-[#ff9b57]" />
            <h2 className="mt-4 text-xl font-semibold">Critérios visíveis</h2>
            <p className="mt-3 text-sm leading-6 text-white/65">
              Cada seleção identifica os critérios, explica a metodologia e
              mantém preço, stock e personalização dependentes dos dados reais
              de cada produto.
            </p>
            <Link
              href="/metodologia-editorial"
              className="mt-5 inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-100"
            >
              Metodologia editorial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </aside>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {pages.map((page) => (
            <Link
              key={page.slug}
              href={`/selecoes/${page.slug}`}
              className="group rounded-3xl border border-white/10 bg-white/[0.04] p-7 transition hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.07]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
                {page.eyebrow}
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                {page.h1}
              </h2>
              <p className="mt-4 line-clamp-4 text-sm leading-6 text-white/60">
                {page.description}
              </p>
              <span className="mt-6 inline-flex items-center text-sm font-semibold">
                Ver critérios e opções
                <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>

        <section className="mt-14 rounded-3xl border border-white/10 bg-white/[0.04] p-7 md:p-9">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <Sparkles className="h-6 w-6 text-[#ff9b57]" />
              <h2 className="mt-4 text-2xl font-semibold tracking-tight">
                O que estas páginas não fazem
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                "Não inventam avaliações ou reviews.",
                "Não atribuem pontuações sem dados verificáveis.",
                "Não garantem stock futuro nem prazo universal.",
                "Não substituem a configuração final do produto.",
              ].map((item) => (
                <div key={item} className="flex gap-3 text-sm leading-6 text-white/65">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
    </main>
  );
}
