import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { getSelectionPages } from "@/lib/seo/selection-pages";
import {
  buildCollectionStructuredData,
  serializeJsonLd,
} from "@/lib/seo/structured-data";
import { localizePath, SITE_LOCALES, type SiteLocale } from "@/lib/i18n/config";
import { getCurrentLocale } from "@/lib/i18n/server";

const copy = {
  pt: {
    title: "Seleções 360: melhores brindes por contexto e critérios", description: "Seleções orientadas para comparar brindes por contexto de utilização, com critérios explícitos e sem rankings artificiais.", ogDescription: "Compare opções para empresas, eventos, congressos, colaboradores, sustentabilidade e tecnologia com metodologia transparente.",
    back: "← Voltar à página inicial", eyebrow: "Seleções editoriais transparentes", heading: "Seleções 360: o que significa “melhor” em cada contexto", intro: "Em merchandising, “melhor” depende do objetivo. Estas páginas organizam opções do catálogo ativo por contexto e explicam os critérios utilizados, sem transformar uma recomendação numa promessa universal.",
    criteria: "Critérios visíveis", criteriaText: "Cada seleção identifica os critérios, explica a metodologia e mantém preço, stock e personalização dependentes dos dados reais de cada produto.", methodology: "Metodologia editorial", view: "Ver critérios e opções", limits: "O que estas páginas não fazem",
    limitations: ["Não inventam avaliações ou reviews.", "Não atribuem pontuações sem dados verificáveis.", "Não garantem stock futuro nem prazo universal.", "Não substituem a configuração final do produto."],
  },
  en: {
    title: "360 Selections: the best promotional products by context", description: "Selections designed to compare promotional products by use case, with explicit criteria and no artificial rankings.", ogDescription: "Compare options for companies, events, conferences, teams, sustainability and technology with a transparent methodology.",
    back: "← Back to homepage", eyebrow: "Transparent editorial selections", heading: "360 Selections: what “best” means in each context", intro: "In merchandise, “best” depends on the objective. These pages organise options from the active catalogue by context and explain the criteria used, without turning a recommendation into a universal promise.",
    criteria: "Visible criteria", criteriaText: "Each selection identifies its criteria, explains the methodology and keeps price, stock and customisation tied to the actual data for each product.", methodology: "Editorial methodology", view: "View criteria and options", limits: "What these pages do not do",
    limitations: ["They do not invent ratings or reviews.", "They do not assign scores without verifiable data.", "They do not guarantee future stock or a universal deadline.", "They do not replace the final product configuration."],
  },
  fr: {
    title: "Sélections 360 : les meilleurs objets publicitaires selon le contexte", description: "Des sélections conçues pour comparer les objets publicitaires selon leur usage, avec des critères explicites et sans classement artificiel.", ogDescription: "Comparez des options pour entreprises, événements, congrès, équipes, durabilité et technologie selon une méthodologie transparente.",
    back: "← Retour à l’accueil", eyebrow: "Sélections éditoriales transparentes", heading: "Sélections 360 : ce que signifie « meilleur » selon le contexte", intro: "En merchandising, le « meilleur » dépend de l’objectif. Ces pages organisent les options du catalogue actif par contexte et expliquent les critères utilisés, sans transformer une recommandation en promesse universelle.",
    criteria: "Critères visibles", criteriaText: "Chaque sélection présente ses critères et sa méthodologie. Prix, stock et personnalisation restent liés aux données réelles de chaque produit.", methodology: "Méthodologie éditoriale", view: "Voir les critères et options", limits: "Ce que ces pages ne font pas",
    limitations: ["Elles n’inventent ni avis ni évaluations.", "Elles n’attribuent aucun score sans données vérifiables.", "Elles ne garantissent ni stock futur ni délai universel.", "Elles ne remplacent pas la configuration finale du produit."],
  },
} satisfies Record<SiteLocale, { title: string; description: string; ogDescription: string; back: string; eyebrow: string; heading: string; intro: string; criteria: string; criteriaText: string; methodology: string; view: string; limits: string; limitations: string[] }>;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale(); const t = copy[locale]; const path = localizePath("/selecoes", locale);
  return { title: t.title, description: t.description, alternates: { canonical: path }, openGraph: { type: "website", locale: SITE_LOCALES[locale].htmlLang.replace("-", "_"), title: t.title, description: t.ogDescription, url: path } };
}

export default async function SelectionsHubPage() {
  const locale = await getCurrentLocale();
  const t = copy[locale];
  const pages = getSelectionPages(locale);
  const path = localizePath("/selecoes", locale);
  const structuredData = buildCollectionStructuredData({
    name: "Seleções 360",
    description: t.description,
    path,
    breadcrumbLabel: "Seleções 360",
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

        <div className="mt-12 grid gap-10 lg:grid-cols-[1.35fr_0.65fr] lg:items-start">
          <div className="max-w-4xl">
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

          <aside className="rounded-3xl border border-[#ff6a00]/30 bg-[#ff6a00]/10 p-7">
            <ShieldCheck className="h-6 w-6 text-[#ff9b57]" />
            <h2 className="mt-4 text-xl font-semibold">{t.criteria}</h2>
            <p className="mt-3 text-sm leading-6 text-white/65">
              {t.criteriaText}
            </p>
            <Link
              href={localizePath("/metodologia-editorial", locale)}
              className="mt-5 inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-100"
            >
              {t.methodology}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </aside>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {pages.map((page) => (
            <Link
              key={page.slug}
              href={localizePath(`/selecoes/${page.slug}`, locale)}
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
                {t.view}
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
                {t.limits}
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {t.limitations.map((item) => (
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
