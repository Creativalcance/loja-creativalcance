import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Palette, ScanLine } from "lucide-react";
import { getPersonalizationPages } from "@/lib/seo/personalization-pages";
import {
  buildCollectionStructuredData,
  serializeJsonLd,
} from "@/lib/seo/structured-data";

export const metadata: Metadata = {
  title: "Técnicas de personalização de merchandising",
  description:
    "Centro de personalização da 360 Merchandising: serigrafia, tampografia, gravação laser, transfer, hot stamping e critérios de configuração.",
  alternates: { canonical: "/personalizacao" },
  openGraph: {
    type: "website",
    locale: "pt_PT",
    title: "Técnicas de personalização de merchandising",
    description:
      "Perceba como produto, componente, localização, área, cores e quantidade influenciam a personalização.",
    url: "/personalizacao",
  },
};

export default function PersonalizationHubPage() {
  const techniques = getPersonalizationPages();
  const structuredData = buildCollectionStructuredData({
    name: "Técnicas de personalização de merchandising",
    description:
      "Centro de informação sobre técnicas e critérios de personalização de produtos.",
    path: "/personalizacao",
    breadcrumbLabel: "Personalização",
  });

  return (
    <main className="min-h-screen bg-neutral-50">
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <Link
            href="/"
            className="text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
          >
            ← Voltar à página inicial
          </Link>
          <div className="mt-10 max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#e85f00]">
              Centro de personalização
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950 md:text-6xl">
              Perceba as técnicas antes de configurar o produto
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-neutral-600">
              A personalização depende da combinação entre produto, variante,
              componente, localização, área e técnica. Este centro explica como
              interpretar essas opções sem substituir a configuração específica
              apresentada em cada produto.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {techniques.map((technique) => (
            <Link
              key={technique.slug}
              href={`/personalizacao/${technique.slug}`}
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
                Ver técnica
                <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-neutral-200 bg-neutral-950 p-8 text-white md:flex md:items-center md:justify-between md:gap-8">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-white/65">
              <ScanLine className="h-4 w-4" /> Configuração por produto
            </div>
            <h2 className="mt-3 text-2xl font-semibold">
              A técnica disponível é sempre específica da referência
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">
              Consulte a página do produto para confirmar variante, localização,
              área, técnica, quantidade e preço aplicáveis à configuração que
              pretende encomendar.
            </p>
          </div>
          <Link
            href="/categorias"
            className="mt-5 inline-flex shrink-0 items-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-100 md:mt-0"
          >
            Explorar produtos
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
