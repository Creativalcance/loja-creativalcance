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

es: { title: "360 Insights: datos del cat\u00E1logo de merchandising", description: "Indicadores agregados del cat\u00E1logo activo de 360 Merchandising, con metodolog\u00EDa transparente y sin extrapolaciones al conjunto del mercado.", og: "Indicadores agregados y metodolog\u00EDa que convierten datos operativos del cat\u00E1logo en informaci\u00F3n verificable y citable.", unavailable: "No disponible", noUpdate: "Actualizaci\u00F3n no disponible", back: "\u2190 Volver al inicio", eyebrow: "Datos propios \u00B7 360 Insights", heading: "Datos del cat\u00E1logo con contexto y metodolog\u00EDa", intro: "360 Insights convierte los datos operativos de la plataforma en indicadores agregados. Empezamos con m\u00E9tricas sencillas y verificables del cat\u00E1logo activo, sin presentarlas como datos de mercado o comportamiento de compra.", source: "Fuente de los datos", sourceText: "Las m\u00E9tricas siguientes se calculan directamente a partir de la base de datos de productos de 360 Merchandising y esta p\u00E1gina las actualiza peri\u00F3dicamente.", updated: "\u00DAltima generaci\u00F3n", claims: [["Qu\u00E9 podemos afirmar", "Podemos indicar cu\u00E1ntos productos de nuestra propia base de datos cumplen un criterio objetivo en el momento del c\u00E1lculo."], ["Qu\u00E9 no deducimos", "Estas cifras no representan cuota de mercado, preferencias del consumidor, ventas del sector, popularidad nacional ni rendimiento de campa\u00F1as."], ["Futuros indicadores", "Solo se publicar\u00E1n nuevos indicadores cuando su definici\u00F3n, fuente y calidad de datos sean lo bastante claras como para explicarlos y reproducirlos."]], transparency: "Transparencia editorial", transparencyHeading: "Los datos propios solo generan credibilidad cuando pueden explicarse", transparencyText: "Nuestra metodolog\u00EDa distingue los datos del cat\u00E1logo, las recomendaciones editoriales y la informaci\u00F3n externa. No publicamos estad\u00EDsticas estimadas como si fueran observaciones reales de la plataforma.", methodology: "Metodolog\u00EDa editorial", metrics: [["Productos activos", "Productos marcados como activos y disponibles en la base de datos del cat\u00E1logo de la plataforma."], ["Productos personalizables", "Productos activos marcados como personalizables en la base de datos."], ["Pedido m\u00EDnimo compatible con 50 unidades", "Productos activos con un pedido m\u00EDnimo registrado de 50 unidades o menos."], ["Pedido m\u00EDnimo compatible con 100 unidades", "Productos activos con un pedido m\u00EDnimo registrado de 100 unidades o menos."]] },
de: { title: "360 Insights: Daten aus dem Merchandising-Katalog", description: "Zusammengefasste Kennzahlen aus dem aktiven Katalog von 360 Merchandising, mit transparenter Methodik und ohne Hochrechnung auf den Gesamtmarkt.", og: "Zusammengefasste Kennzahlen und eine Methodik, die operative Katalogdaten in \u00FCberpr\u00FCfbare, zitierf\u00E4hige Informationen umwandeln.", unavailable: "Nicht verf\u00FCgbar", noUpdate: "Aktualisierung nicht verf\u00FCgbar", back: "\u2190 Zur Startseite", eyebrow: "Eigene Daten \u00B7 360 Insights", heading: "Katalogdaten mit Kontext und Methodik", intro: "360 Insights wandelt operative Plattformdaten in zusammengefasste Kennzahlen um. Wir beginnen mit einfachen, \u00FCberpr\u00FCfbaren Kennzahlen aus dem aktiven Katalog, ohne sie als Markt- oder Kaufverhaltensdaten darzustellen.", source: "Datenquelle", sourceText: "Die folgenden Kennzahlen werden direkt aus der Produktdatenbank von 360 Merchandising berechnet und auf dieser Seite regelm\u00E4\u00DFig aktualisiert.", updated: "Zuletzt erstellt", claims: [["Was wir aussagen k\u00F6nnen", "Wir k\u00F6nnen angeben, wie viele Produkte in unserer eigenen Datenbank zum Berechnungszeitpunkt ein objektives Kriterium erf\u00FCllen."], ["Was wir nicht ableiten", "Diese Zahlen stehen nicht f\u00FCr Marktanteile, Verbraucherpr\u00E4ferenzen, Branchenums\u00E4tze, landesweite Beliebtheit oder Kampagnenerfolg."], ["K\u00FCnftige Kennzahlen", "Neue Kennzahlen werden erst ver\u00F6ffentlicht, wenn Definition, Quelle und Datenqualit\u00E4t ausreichend klar sind, um sie zu erl\u00E4utern und zu reproduzieren."]], transparency: "Redaktionelle Transparenz", transparencyHeading: "Eigene Daten schaffen nur dann Glaubw\u00FCrdigkeit, wenn sie erkl\u00E4rbar sind", transparencyText: "Unsere Methodik unterscheidet Katalogdaten, redaktionelle Empfehlungen und externe Informationen. Wir ver\u00F6ffentlichen keine gesch\u00E4tzten Statistiken als tats\u00E4chliche Plattformbeobachtungen.", methodology: "Redaktionelle Methodik", metrics: [["Aktive Produkte", "Als aktiv und verf\u00FCgbar markierte Produkte in der Katalogdatenbank der Plattform."], ["Personalisierbare Produkte", "Aktive Produkte, die in der Datenbank als personalisierbar markiert sind."], ["Mindestmenge von h\u00F6chstens 50 St\u00FCck", "Aktive Produkte mit einer erfassten Mindestbestellmenge von h\u00F6chstens 50 St\u00FCck."], ["Mindestmenge von h\u00F6chstens 100 St\u00FCck", "Aktive Produkte mit einer erfassten Mindestbestellmenge von h\u00F6chstens 100 St\u00FCck."]] },
it: { title: "360 Insights: dati del catalogo di merchandising", description: "Indicatori aggregati del catalogo attivo di 360 Merchandising, con metodologia trasparente e senza estrapolazioni all'intero mercato.", og: "Indicatori aggregati e una metodologia che trasformano i dati operativi del catalogo in informazioni verificabili e citabili.", unavailable: "Non disponibile", noUpdate: "Aggiornamento non disponibile", back: "\u2190 Torna alla pagina iniziale", eyebrow: "Dati proprietari \u00B7 360 Insights", heading: "Dati del catalogo con contesto e metodologia", intro: "360 Insights trasforma i dati operativi della piattaforma in indicatori aggregati. Iniziamo con metriche semplici e verificabili del catalogo attivo, senza presentarle come dati di mercato o di comportamento d'acquisto.", source: "Fonte dei dati", sourceText: "Le metriche seguenti sono calcolate direttamente dal database dei prodotti di 360 Merchandising e aggiornate periodicamente da questa pagina.", updated: "Ultima generazione", claims: [["Cosa possiamo affermare", "Possiamo indicare quanti prodotti del nostro database soddisfano un criterio oggettivo al momento del calcolo."], ["Cosa non deduciamo", "Questi dati non rappresentano quote di mercato, preferenze dei consumatori, vendite del settore, popolarit\u00E0 nazionale o risultati delle campagne."], ["Indicatori futuri", "Nuovi indicatori verranno pubblicati solo quando definizione, fonte e qualit\u00E0 dei dati saranno abbastanza chiare da consentirne la spiegazione e la riproduzione."]], transparency: "Trasparenza editoriale", transparencyHeading: "I dati proprietari creano autorevolezza solo quando possono essere spiegati", transparencyText: "La nostra metodologia distingue dati del catalogo, raccomandazioni editoriali e informazioni esterne. Non pubblichiamo statistiche stimate come se fossero osservazioni reali della piattaforma.", methodology: "Metodologia editoriale", metrics: [["Prodotti attivi", "Prodotti contrassegnati come attivi e disponibili nel database del catalogo della piattaforma."], ["Prodotti personalizzabili", "Prodotti attivi contrassegnati come personalizzabili nel database."], ["Minimo compatibile con 50 unit\u00E0", "Prodotti attivi con un ordine minimo registrato pari o inferiore a 50 unit\u00E0."], ["Minimo compatibile con 100 unit\u00E0", "Prodotti attivi con un ordine minimo registrato pari o inferiore a 100 unit\u00E0."]] },
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
