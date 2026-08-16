import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, Search } from "lucide-react";
import {
  getPersonalizationPage,
  getPersonalizationPages,
  getRelatedPersonalizationPages,
} from "@/lib/seo/personalization-pages";
import {
  buildEditorialStructuredData,
  serializeJsonLd,
} from "@/lib/seo/structured-data";

type PersonalizationPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getPersonalizationPages().map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({
  params,
}: PersonalizationPageProps): Promise<Metadata> {
  const { slug } = await params;
  const config = getPersonalizationPage(slug);

  if (!config) {
    return { title: "Técnica não encontrada", robots: { index: false } };
  }

  const path = `/personalizacao/${config.slug}`;

  return {
    title: config.title,
    description: config.description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "pt_PT",
      title: config.title,
      description: config.description,
      url: path,
    },
  };
}

export default async function PersonalizationDetailPage({
  params,
}: PersonalizationPageProps) {
  const { slug } = await params;
  const config = getPersonalizationPage(slug);

  if (!config) {
    return notFound();
  }

  const related = getRelatedPersonalizationPages(config);
  const path = `/personalizacao/${config.slug}`;
  const structuredData = buildEditorialStructuredData({
    name: config.h1,
    description: config.description,
    path,
    breadcrumbParentPath: "/personalizacao",
    breadcrumbParentLabel: "Personalização",
    breadcrumbLabel: config.h1,
  });

  return (
    <main className="min-h-screen bg-neutral-50">
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <Link
            href="/personalizacao"
            className="text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
          >
            ← Voltar a personalização
          </Link>
          <div className="mt-10 max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#e85f00]">
              Personalização · Técnica
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950 md:text-6xl">
              {config.h1}
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-neutral-600">
              {config.intro}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-10">
            {config.sections.map((section) => (
              <article key={section.title}>
                <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">
                  {section.title}
                </h2>
                <p className="mt-4 leading-8 text-neutral-600">{section.text}</p>
              </article>
            ))}
          </div>

          <aside className="h-fit rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-950">
              Checklist antes de configurar
            </h2>
            <ul className="mt-5 space-y-3">
              {config.checkpoints.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6 text-neutral-600">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/pesquisa"
              className="mt-6 inline-flex items-center rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              <Search className="mr-2 h-4 w-4" />
              Pesquisar produtos
            </Link>
          </aside>
        </div>

        {related.length > 0 ? (
          <section className="mt-16 border-t border-neutral-200 pt-12">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">
              Comparar também
            </p>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {related.map((item) => (
                <Link
                  key={item.slug}
                  href={`/personalizacao/${item.slug}`}
                  className="group rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <h2 className="text-xl font-semibold tracking-tight text-neutral-950">
                    {item.h1}
                  </h2>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-neutral-600">
                    {item.description}
                  </p>
                  <span className="mt-5 inline-flex items-center text-sm font-semibold text-neutral-950">
                    Ver técnica
                    <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
    </main>
  );
}
