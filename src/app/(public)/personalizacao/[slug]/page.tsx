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
import { localizePath, SITE_LOCALES } from "@/lib/i18n/config";
import { getCurrentLocale } from "@/lib/i18n/server";

const copy = {
  pt: { missing: "Técnica não encontrada", back: "Voltar a personalização", eyebrow: "Personalização · Técnica", checklist: "Checklist antes de configurar", search: "Pesquisar produtos", compare: "Comparar também", view: "Ver técnica", breadcrumb: "Personalização" },
  en: { missing: "Technique not found", back: "Back to customisation", eyebrow: "Customisation · Technique", checklist: "Checklist before configuring", search: "Search products", compare: "Compare with", view: "View technique", breadcrumb: "Customisation" },
  fr: { missing: "Technique introuvable", back: "Retour à la personnalisation", eyebrow: "Personnalisation · Technique", checklist: "Checklist avant la configuration", search: "Rechercher des produits", compare: "Comparer aussi", view: "Voir la technique", breadcrumb: "Personnalisation" },
} as const;

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
  const locale = await getCurrentLocale();
  const config = getPersonalizationPage(slug, locale);

  if (!config) {
    return { title: copy[locale].missing, robots: { index: false } };
  }

  const path = localizePath(`/personalizacao/${config.slug}`, locale);

  return {
    title: config.title,
    description: config.description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: SITE_LOCALES[locale].htmlLang.replace("-", "_"),
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
  const locale = await getCurrentLocale();
  const t = copy[locale];
  const config = getPersonalizationPage(slug, locale);

  if (!config) {
    return notFound();
  }

  const related = getRelatedPersonalizationPages(config, locale);
  const path = localizePath(`/personalizacao/${config.slug}`, locale);
  const structuredData = buildEditorialStructuredData({
    name: config.h1,
    description: config.description,
    path,
    breadcrumbParentPath: localizePath("/personalizacao", locale),
    breadcrumbParentLabel: t.breadcrumb,
    breadcrumbLabel: config.h1,
  });

  return (
    <main className="min-h-screen bg-neutral-50">
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <Link
            href={localizePath("/personalizacao", locale)}
            className="text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
          >
            ← {t.back}
          </Link>
          <div className="mt-10 max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#e85f00]">
              {t.eyebrow}
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
              {t.checklist}
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
              href={localizePath("/pesquisa", locale)}
              className="mt-6 inline-flex items-center rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              <Search className="mr-2 h-4 w-4" />
              {t.search}
            </Link>
          </aside>
        </div>

        {related.length > 0 ? (
          <section className="mt-16 border-t border-neutral-200 pt-12">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">
              {t.compare}
            </p>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {related.map((item) => (
                <Link
                  key={item.slug}
                  href={localizePath(`/personalizacao/${item.slug}`, locale)}
                  className="group rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <h2 className="text-xl font-semibold tracking-tight text-neutral-950">
                    {item.h1}
                  </h2>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-neutral-600">
                    {item.description}
                  </p>
                  <span className="mt-5 inline-flex items-center text-sm font-semibold text-neutral-950">
                    {t.view}
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
