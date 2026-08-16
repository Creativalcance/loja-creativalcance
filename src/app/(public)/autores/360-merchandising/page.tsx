import Link from "next/link";
import type { Metadata } from "next";
import {
  BookOpen,
  CheckCircle2,
  FileText,
  Layers3,
  ShieldCheck,
} from "lucide-react";
import {
  buildAuthorStructuredData,
  serializeJsonLd,
} from "@/lib/seo/structured-data";

export const metadata: Metadata = {
  title: "360 Merchandising — autor editorial",
  description:
    "Perfil editorial da 360 Merchandising, responsável pelos guias, páginas técnicas e conteúdos de apoio à escolha de merchandising e brindes personalizados.",
  alternates: { canonical: "/autores/360-merchandising" },
  openGraph: {
    type: "profile",
    locale: "pt_PT",
    title: "360 Merchandising — autor editorial",
    description:
      "Conheça os temas, princípios e metodologia usados nos conteúdos editoriais da 360 Merchandising.",
    url: "/autores/360-merchandising",
  },
};

const areas = [
  {
    title: "Brindes e merchandising",
    text: "Critérios de escolha por objetivo, público, quantidade, orçamento e ocasião.",
    icon: Layers3,
  },
  {
    title: "Personalização",
    text: "Explicação das relações entre produto, componente, localização, técnica e área disponível.",
    icon: FileText,
  },
  {
    title: "Conteúdo de apoio à compra",
    text: "Guias sobre welcome kits, eventos, sustentabilidade, aplicações e contextos de utilização.",
    icon: BookOpen,
  },
];

export default function AuthorPage() {
  const structuredData = buildAuthorStructuredData();

  return (
    <main className="min-h-screen bg-neutral-50">
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <Link
            href="/guias"
            className="text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
          >
            ← Voltar aos guias
          </Link>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#e85f00]">
                Autor editorial
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950 md:text-6xl">
                360 Merchandising
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-neutral-600">
                Os guias e conteúdos institucionais da plataforma são publicados
                sob autoria editorial da 360 Merchandising. A abordagem combina
                informação do catálogo com critérios práticos de escolha, sem
                transformar recomendações gerais em características não
                confirmadas de produtos concretos.
              </p>
            </div>

            <aside className="rounded-3xl border border-neutral-200 bg-neutral-50 p-6 shadow-sm">
              <ShieldCheck className="h-6 w-6 text-[#e85f00]" />
              <h2 className="mt-4 text-lg font-semibold text-neutral-950">
                Princípios de autoria
              </h2>
              <ul className="mt-4 space-y-3">
                {[
                  "Distinguir dados de catálogo de orientação editorial",
                  "Não inventar estatísticas, reviews ou certificações",
                  "Indicar a origem quando são usados dados externos",
                  "Rever conteúdos quando a informação muda",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex gap-3 text-sm leading-6 text-neutral-600"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <div className="grid gap-5 md:grid-cols-3">
          {areas.map(({ title, text, icon: Icon }) => (
            <article
              key={title}
              className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm"
            >
              <Icon className="h-6 w-6 text-neutral-500" />
              <h2 className="mt-6 text-xl font-semibold tracking-tight text-neutral-950">
                {title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-neutral-600">{text}</p>
            </article>
          ))}
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <Link
            href="/metodologia-editorial"
            className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">
              Metodologia
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">
              Como os conteúdos são criados e revistos
            </h2>
            <p className="mt-3 text-sm leading-6 text-neutral-600">
              Consulte os princípios usados para separar factos, dados de
              catálogo, orientação editorial e fontes externas.
            </p>
          </Link>

          <Link
            href="/guias"
            className="rounded-3xl border border-neutral-200 bg-neutral-950 p-7 text-white shadow-sm transition hover:-translate-y-1 hover:bg-neutral-900"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/45">
              Publicações
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              Consultar os guias da 360
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/65">
              Explore conteúdos sobre escolha de brindes, merchandising,
              welcome kits, eventos, orçamento e sustentabilidade.
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
