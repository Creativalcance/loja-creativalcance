import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, CheckCircle2, Database, ShieldCheck } from "lucide-react";
import { getCatalogInsights } from "@/lib/seo/catalog-insights";
import {
  buildEditorialStructuredData,
  serializeJsonLd,
} from "@/lib/seo/structured-data";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "360 Insights: dados do catálogo de merchandising",
  description:
    "Indicadores agregados do catálogo ativo da 360 Merchandising, com metodologia transparente e sem extrapolar dados de catálogo para o mercado.",
  alternates: { canonical: "/insights" },
  openGraph: {
    type: "website",
    locale: "pt_PT",
    title: "360 Insights: dados do catálogo de merchandising",
    description:
      "Indicadores agregados e metodologia para transformar dados operacionais do catálogo em informação citável e verificável.",
    url: "/insights",
  },
};

function formatMetric(value: number | null): string {
  return value === null ? "Indisponível" : value.toLocaleString("pt-PT");
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Atualização não disponível";
  }

  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  }).format(date);
}

export default async function InsightsPage() {
  const insights = await getCatalogInsights();
  const structuredData = buildEditorialStructuredData({
    name: "360 Insights",
    description:
      "Indicadores agregados do catálogo ativo da 360 Merchandising com metodologia explícita.",
    path: "/insights",
    breadcrumbLabel: "360 Insights",
  });

  const metrics = [
    {
      label: "Produtos ativos",
      value: insights.activeProducts,
      description:
        "Referências com estado ativo e disponíveis na base de catálogo da plataforma.",
    },
    {
      label: "Produtos personalizáveis",
      value: insights.customizableProducts,
      description:
        "Referências ativas assinaladas na base como personalizáveis.",
    },
    {
      label: "Mínimo compatível com 50 un.",
      value: insights.productsFor50Units,
      description:
        "Referências ativas cujo mínimo de encomenda registado é igual ou inferior a 50 unidades.",
    },
    {
      label: "Mínimo compatível com 100 un.",
      value: insights.productsFor100Units,
      description:
        "Referências ativas cujo mínimo de encomenda registado é igual ou inferior a 100 unidades.",
    },
  ];

  return (
    <main className="min-h-screen bg-neutral-50">
      <section className="border-b border-neutral-200 bg-neutral-950 text-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <Link
            href="/"
            className="text-sm font-medium text-white/50 transition hover:text-white"
          >
            ← Voltar à página inicial
          </Link>

          <div className="mt-12 grid gap-10 lg:grid-cols-[1.3fr_0.7fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#ff7a1a]">
                Dados próprios · 360 Insights
              </p>
              <h1 className="mt-4 max-w-5xl text-4xl font-semibold tracking-tight md:text-6xl">
                Dados do catálogo, apresentados com contexto e metodologia
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-white/65">
                O 360 Insights transforma dados operacionais da plataforma em
                indicadores agregados. Nesta fase começamos por métricas simples
                e verificáveis do catálogo ativo, sem as apresentar como dados de
                mercado ou comportamento de compra.
              </p>
            </div>

            <aside className="rounded-3xl border border-white/10 bg-white/[0.05] p-7">
              <Database className="h-6 w-6 text-[#ff9b57]" />
              <h2 className="mt-4 text-xl font-semibold">Fonte dos dados</h2>
              <p className="mt-3 text-sm leading-6 text-white/65">
                As métricas abaixo são calculadas diretamente sobre a base de
                produtos da 360 Merchandising e atualizadas periodicamente pela
                própria página.
              </p>
              <p className="mt-4 text-xs leading-5 text-white/40">
                Última geração: {formatUpdatedAt(insights.generatedAt)}
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
                {formatMetric(metric.value)}
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
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-950">
                O que podemos afirmar
              </h2>
              <p className="mt-4 leading-7 text-neutral-600">
                Podemos descrever quantas referências da nossa própria base
                cumprem um critério objetivo no momento em que os dados são
                calculados.
              </p>
            </article>

            <article>
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-950">
                O que não inferimos
              </h2>
              <p className="mt-4 leading-7 text-neutral-600">
                Estes números não representam quota de mercado, preferência dos
                consumidores, vendas do setor, popularidade nacional ou
                desempenho de uma campanha.
              </p>
            </article>

            <article>
              <Database className="h-6 w-6 text-emerald-600" />
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-950">
                Próximos indicadores
              </h2>
              <p className="mt-4 leading-7 text-neutral-600">
                Só serão publicados novos indicadores quando a definição, fonte
                e qualidade do dado forem suficientemente claras para serem
                explicadas e reproduzidas.
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
                Transparência editorial
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                Dados próprios só criam autoridade quando são explicáveis
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-white/65">
                A nossa metodologia distingue dados de catálogo, recomendações
                editoriais e informação externa. Não publicamos estatísticas
                estimadas como se fossem observações reais da plataforma.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                href="/metodologia-editorial"
                className="inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#162334]"
              >
                Metodologia editorial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/selecoes"
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
