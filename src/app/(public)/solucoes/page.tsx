import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeEuro,
  Boxes,
  BriefcaseBusiness,
  CalendarDays,
  Sparkles,
} from "lucide-react";
import {
  getCommercialPagesByGroup,
  type CommercialLandingGroup,
} from "@/lib/seo/commercial-pages";
import {
  buildCollectionStructuredData,
  serializeJsonLd,
} from "@/lib/seo/structured-data";

export const metadata: Metadata = {
  title: "Soluções de brindes personalizados por orçamento e quantidade",
  description:
    "Explore brindes personalizados por orçamento, quantidade, tipo de necessidade e ocasião, com critérios comerciais claros e produtos do catálogo ativo.",
  alternates: { canonical: "/solucoes" },
  openGraph: {
    type: "website",
    locale: "pt_PT",
    title: "Soluções de brindes personalizados por orçamento e quantidade",
    description:
      "Páginas comerciais para explorar merchandising por orçamento, quantidade, utilização e ocasião.",
    url: "/solucoes",
  },
};

const GROUPS: Array<{
  group: CommercialLandingGroup;
  title: string;
  description: string;
  icon: typeof BriefcaseBusiness;
}> = [
  {
    group: "commercial",
    title: "Por objetivo comercial",
    description:
      "Brindes para empresas, presentes corporativos, tecnologia, opções premium e personalização com logótipo.",
    icon: BriefcaseBusiness,
  },
  {
    group: "budget",
    title: "Por orçamento unitário",
    description:
      "Comece por referências com escalões de preço base dentro de um teto definido e valide depois a configuração final.",
    icon: BadgeEuro,
  },
  {
    group: "quantity",
    title: "Por quantidade",
    description:
      "Reduza o catálogo a produtos cujo mínimo de encomenda registado é compatível com o volume que pretende comprar.",
    icon: Boxes,
  },
  {
    group: "occasion",
    title: "Por ocasião",
    description:
      "Explore necessidades comerciais específicas como clientes, feiras, team building e lançamentos de produto.",
    icon: CalendarDays,
  },
];

export default function CommercialSolutionsPage() {
  const structuredData = buildCollectionStructuredData({
    name: "Soluções de brindes personalizados",
    description:
      "Soluções comerciais de merchandising organizadas por orçamento, quantidade, objetivo e ocasião.",
    path: "/solucoes",
    breadcrumbLabel: "Soluções",
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
              Pesquisa comercial orientada
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">
              Soluções de brindes por orçamento, quantidade e necessidade
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-white/65">
              Quando já sabe quanto pode investir, quantas unidades precisa ou
              em que contexto vai utilizar o merchandising, estas páginas ajudam
              a reduzir o catálogo com critérios explícitos antes da configuração
              final.
            </p>
          </div>

          <aside className="rounded-3xl border border-[#ff6a00]/30 bg-[#ff6a00]/10 p-7">
            <Sparkles className="h-6 w-6 text-[#ff9b57]" />
            <h2 className="mt-4 text-xl font-semibold">Prefere descrever o pedido?</h2>
            <p className="mt-3 text-sm leading-6 text-white/65">
              Use o Smart Merch para combinar vários critérios numa pesquisa,
              incluindo quantidade, orçamento, prazo e tipo de produto.
            </p>
            <Link
              href="/smart-merch"
              className="mt-5 inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-100"
            >
              Experimentar Smart Merch
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </aside>
        </div>

        <div className="mt-14 space-y-12">
          {GROUPS.map((groupConfig) => {
            const pages = getCommercialPagesByGroup(groupConfig.group);
            const Icon = groupConfig.icon;

            return (
              <section key={groupConfig.group}>
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-[#ff9b57]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight">
                      {groupConfig.title}
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">
                      {groupConfig.description}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {pages.map((page) => (
                    <Link
                      key={page.slug}
                      href={`/solucoes/${page.slug}`}
                      className="group rounded-3xl border border-white/10 bg-white/[0.04] p-7 transition hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.07]"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
                        {page.eyebrow}
                      </p>
                      <h3 className="mt-3 text-2xl font-semibold tracking-tight">
                        {page.h1}
                      </h3>
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
              </section>
            );
          })}
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/aplicacoes"
            className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition hover:bg-white/[0.07]"
          >
            <h2 className="text-lg font-semibold">Aplicações</h2>
            <p className="mt-2 text-sm leading-6 text-white/55">
              Welcome kits, eventos, congressos, Natal e colaboradores.
            </p>
          </Link>
          <Link
            href="/industrias"
            className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition hover:bg-white/[0.07]"
          >
            <h2 className="text-lg font-semibold">Indústrias</h2>
            <p className="mt-2 text-sm leading-6 text-white/55">
              Hotelaria, universidades, startups, saúde, restauração e outros
              setores.
            </p>
          </Link>
          <Link
            href="/guias"
            className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition hover:bg-white/[0.07]"
          >
            <h2 className="text-lg font-semibold">Guias</h2>
            <p className="mt-2 text-sm leading-6 text-white/55">
              Conteúdo para comparar orçamento, quantidade, personalização e
              sustentabilidade.
            </p>
          </Link>
          <Link
            href="/selecoes"
            className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition hover:bg-white/[0.07]"
          >
            <h2 className="text-lg font-semibold">Seleções 360</h2>
            <p className="mt-2 text-sm leading-6 text-white/55">
              Páginas “melhores para” com critérios explícitos, contexto e
              opções do catálogo ativo.
            </p>
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
