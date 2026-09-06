import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, CheckCircle2, Database, ShieldCheck } from "lucide-react";
import { getCatalogInsights } from "@/lib/seo/catalog-insights";
import {
  buildEditorialStructuredData,
  serializeJsonLd,
} from "@/lib/seo/structured-data";
import { localizePath, SITE_LOCALES, type SiteLocale } from "@/lib/i18n/config";
import { getCurrentLocale } from "@/lib/i18n/server";

export const revalidate = 3600;

const copy = {
  pt: { title: "360 Insights: dados do catálogo de merchandising", description: "Indicadores agregados do catálogo ativo da 360 Merchandising, com metodologia transparente e sem extrapolar dados de catálogo para o mercado.", og: "Indicadores agregados e metodologia para transformar dados operacionais do catálogo em informação citável e verificável.", unavailable: "Indisponível", noUpdate: "Atualização não disponível", back: "← Voltar à página inicial", eyebrow: "Dados próprios · 360 Insights", heading: "Dados do catálogo, apresentados com contexto e metodologia", intro: "O 360 Insights transforma dados operacionais da plataforma em indicadores agregados. Nesta fase começamos por métricas simples e verificáveis do catálogo ativo, sem as apresentar como dados de mercado ou comportamento de compra.", source: "Fonte dos dados", sourceText: "As métricas abaixo são calculadas diretamente sobre a base de produtos da 360 Merchandising e atualizadas periodicamente pela própria página.", updated: "Última geração", claims: [["O que podemos afirmar", "Podemos descrever quantas referências da nossa própria base cumprem um critério objetivo no momento em que os dados são calculados."], ["O que não inferimos", "Estes números não representam quota de mercado, preferência dos consumidores, vendas do setor, popularidade nacional ou desempenho de uma campanha."], ["Próximos indicadores", "Só serão publicados novos indicadores quando a definição, fonte e qualidade do dado forem suficientemente claras para serem explicadas e reproduzidas."]], transparency: "Transparência editorial", transparencyHeading: "Dados próprios só criam autoridade quando são explicáveis", transparencyText: "A nossa metodologia distingue dados de catálogo, recomendações editoriais e informação externa. Não publicamos estatísticas estimadas como se fossem observações reais da plataforma.", methodology: "Metodologia editorial", metrics: [["Produtos ativos", "Referências com estado ativo e disponíveis na base de catálogo da plataforma."], ["Produtos personalizáveis", "Referências ativas assinaladas na base como personalizáveis."], ["Mínimo compatível com 50 un.", "Referências ativas cujo mínimo de encomenda registado é igual ou inferior a 50 unidades."], ["Mínimo compatível com 100 un.", "Referências ativas cujo mínimo de encomenda registado é igual ou inferior a 100 unidades."]] },
  en: { title: "360 Insights: merchandise catalogue data", description: "Aggregated indicators from the active 360 Merchandising catalogue, with transparent methodology and no extrapolation to the wider market.", og: "Aggregated indicators and methodology that turn operational catalogue data into verifiable, citable information.", unavailable: "Unavailable", noUpdate: "Update unavailable", back: "← Back to homepage", eyebrow: "First-party data · 360 Insights", heading: "Catalogue data presented with context and methodology", intro: "360 Insights turns operational platform data into aggregated indicators. We begin with simple, verifiable metrics from the active catalogue, without presenting them as market or purchasing-behaviour data.", source: "Data source", sourceText: "The metrics below are calculated directly from the 360 Merchandising product database and refreshed periodically by this page.", updated: "Last generated", claims: [["What we can state", "We can describe how many products in our own database meet an objective criterion when the data is calculated."], ["What we do not infer", "These figures do not represent market share, consumer preference, industry sales, national popularity or campaign performance."], ["Future indicators", "New indicators will only be published when their definition, source and data quality are clear enough to explain and reproduce."]], transparency: "Editorial transparency", transparencyHeading: "First-party data only builds authority when it can be explained", transparencyText: "Our methodology distinguishes catalogue data, editorial recommendations and external information. We do not publish estimated statistics as if they were real platform observations.", methodology: "Editorial methodology", metrics: [["Active products", "Products marked active and available in the platform catalogue database."], ["Customisable products", "Active products marked as customisable in the database."], ["Minimum compatible with 50 units", "Active products with a recorded minimum order of 50 units or fewer."], ["Minimum compatible with 100 units", "Active products with a recorded minimum order of 100 units or fewer."]] },
  fr: { title: "360 Insights : données du catalogue de merchandising", description: "Indicateurs agrégés du catalogue actif de 360 Merchandising, avec une méthodologie transparente et sans extrapolation au marché.", og: "Des indicateurs agrégés et une méthodologie qui transforment les données opérationnelles du catalogue en informations vérifiables et citables.", unavailable: "Indisponible", noUpdate: "Mise à jour indisponible", back: "← Retour à l’accueil", eyebrow: "Données propriétaires · 360 Insights", heading: "Les données du catalogue, présentées avec contexte et méthodologie", intro: "360 Insights transforme les données opérationnelles de la plateforme en indicateurs agrégés. Nous commençons par des mesures simples et vérifiables du catalogue actif, sans les présenter comme des données de marché ou de comportement d’achat.", source: "Source des données", sourceText: "Les mesures ci-dessous sont calculées directement à partir de la base produits de 360 Merchandising et actualisées périodiquement par cette page.", updated: "Dernière génération", claims: [["Ce que nous pouvons affirmer", "Nous pouvons indiquer combien de références de notre base répondent à un critère objectif au moment du calcul."], ["Ce que nous n’en déduisons pas", "Ces chiffres ne représentent ni part de marché, ni préférence des consommateurs, ni ventes du secteur, ni popularité nationale, ni performance de campagne."], ["Prochains indicateurs", "De nouveaux indicateurs ne seront publiés que lorsque leur définition, leur source et la qualité des données seront assez claires pour être expliquées et reproduites."]], transparency: "Transparence éditoriale", transparencyHeading: "Les données propriétaires ne font autorité que lorsqu’elles sont explicables", transparencyText: "Notre méthodologie distingue les données de catalogue, les recommandations éditoriales et les informations externes. Nous ne publions pas de statistiques estimées comme s’il s’agissait d’observations réelles.", methodology: "Méthodologie éditoriale", metrics: [["Produits actifs", "Références actives et disponibles dans la base catalogue de la plateforme."], ["Produits personnalisables", "Références actives signalées comme personnalisables dans la base."], ["Minimum compatible avec 50 unités", "Références actives dont la commande minimale enregistrée est de 50 unités ou moins."], ["Minimum compatible avec 100 unités", "Références actives dont la commande minimale enregistrée est de 100 unités ou moins."]] },
} satisfies Record<SiteLocale, { title: string; description: string; og: string; unavailable: string; noUpdate: string; back: string; eyebrow: string; heading: string; intro: string; source: string; sourceText: string; updated: string; claims: string[][]; transparency: string; transparencyHeading: string; transparencyText: string; methodology: string; metrics: string[][] }>;

export async function generateMetadata(): Promise<Metadata> { const locale = await getCurrentLocale(); const t = copy[locale]; const path = localizePath("/insights", locale); return { title: t.title, description: t.description, alternates: { canonical: path }, openGraph: { type: "website", locale: SITE_LOCALES[locale].htmlLang.replace("-", "_"), title: t.title, description: t.og, url: path } }; }

function formatMetric(value: number | null, locale: SiteLocale): string {
  return value === null ? copy[locale].unavailable : value.toLocaleString(SITE_LOCALES[locale].intlLocale);
}

function formatUpdatedAt(value: string, locale: SiteLocale): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return copy[locale].noUpdate;
  }

  return new Intl.DateTimeFormat(SITE_LOCALES[locale].intlLocale, {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  }).format(date);
}

export default async function InsightsPage() {
  const locale = await getCurrentLocale(); const t = copy[locale];
  const insights = await getCatalogInsights();
  const structuredData = buildEditorialStructuredData({
    name: "360 Insights",
    description: t.description,
    path: localizePath("/insights", locale),
    breadcrumbLabel: "360 Insights",
  });

  const metrics = [
    {
      label: t.metrics[0][0],
      value: insights.activeProducts,
      description: t.metrics[0][1],
    },
    {
      label: t.metrics[1][0],
      value: insights.customizableProducts,
      description: t.metrics[1][1],
    },
    {
      label: t.metrics[2][0],
      value: insights.productsFor50Units,
      description: t.metrics[2][1],
    },
    {
      label: t.metrics[3][0],
      value: insights.productsFor100Units,
      description: t.metrics[3][1],
    },
  ];

  return (
    <main className="min-h-screen bg-neutral-50">
      <section className="border-b border-neutral-200 bg-neutral-950 text-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <Link
            href={localizePath("/", locale)}
            className="text-sm font-medium text-white/50 transition hover:text-white"
          >
            {t.back}
          </Link>

          <div className="mt-12 grid gap-10 lg:grid-cols-[1.3fr_0.7fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#ff7a1a]">
                {t.eyebrow}
              </p>
              <h1 className="mt-4 max-w-5xl text-4xl font-semibold tracking-tight md:text-6xl">
                {t.heading}
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-white/65">
                {t.intro}
              </p>
            </div>

            <aside className="rounded-3xl border border-white/10 bg-white/[0.05] p-7">
              <Database className="h-6 w-6 text-[#ff9b57]" />
              <h2 className="mt-4 text-xl font-semibold">{t.source}</h2>
              <p className="mt-3 text-sm leading-6 text-white/65">
                {t.sourceText}
              </p>
              <p className="mt-4 text-xs leading-5 text-white/40">
                {t.updated}: {formatUpdatedAt(insights.generatedAt, locale)}
              </p>
            </aside>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <article
              key={metric.label}
              className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
            >
              <BarChart3 className="h-5 w-5 text-[#e85f00]" />
              <p className="mt-5 text-3xl font-semibold tracking-tight text-neutral-950">
                {formatMetric(metric.value, locale)}
              </p>
              <h2 className="mt-2 text-sm font-semibold text-neutral-900">
                {metric.label}
              </h2>
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                {metric.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <div className="grid gap-8 lg:grid-cols-3">
            <article>
              <ShieldCheck className="h-6 w-6 text-emerald-600" />
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-950">{t.claims[0][0]}</h2>
              <p className="mt-4 leading-7 text-neutral-600">
                {t.claims[0][1]}
              </p>
            </article>

            <article>
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-950">{t.claims[1][0]}</h2>
              <p className="mt-4 leading-7 text-neutral-600">
                {t.claims[1][1]}
              </p>
            </article>

            <article>
              <Database className="h-6 w-6 text-emerald-600" />
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-950">{t.claims[2][0]}</h2>
              <p className="mt-4 leading-7 text-neutral-600">
                {t.claims[2][1]}
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <div className="rounded-3xl bg-[#162334] p-7 text-white md:p-9">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
                {t.transparency}
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                {t.transparencyHeading}
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-white/65">
                {t.transparencyText}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                href={localizePath("/metodologia-editorial", locale)}
                className="inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#162334]"
              >
                {t.methodology}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href={localizePath("/selecoes", locale)}
                className="inline-flex items-center rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Seleções 360
              </Link>
            </div>
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
    </main>
  );
}
