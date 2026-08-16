import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BookOpen,
  Building2,
  Gift,
  Leaf,
  Lightbulb,
  Megaphone,
  Palette,
} from "lucide-react";
import { getGuides } from "@/lib/seo/guide-pages";

export const metadata: Metadata = {
  title: "Blog de merchandising, brindes e marketing promocional",
  description:
    "Conteúdos e recursos da 360 Merchandising sobre brindes personalizados, merchandising corporativo, personalização, eventos e sustentabilidade.",
  alternates: { canonical: "/blog" },
};

const themes = [
  {
    title: "Brindes personalizados",
    description:
      "Critérios para escolher produtos por objetivo, público, quantidade e orçamento.",
    href: "/guias/como-escolher-brindes-personalizados-empresas",
    icon: Gift,
  },
  {
    title: "Merchandising corporativo",
    description:
      "Como organizar produtos de marca para clientes, equipas, eventos e campanhas.",
    href: "/guias/merchandising-corporativo-guia",
    icon: Building2,
  },
  {
    title: "Personalização",
    description:
      "Compreender técnicas, componentes, localizações e áreas antes de configurar.",
    href: "/personalizacao",
    icon: Palette,
  },
  {
    title: "Eventos e congressos",
    description:
      "Planeamento de públicos, quantidades, distribuição e prazos em ações presenciais.",
    href: "/guias/brindes-para-eventos-guia",
    icon: Megaphone,
  },
  {
    title: "Sustentabilidade",
    description:
      "Materiais, certificações e dados ambientais para comparar referências com mais contexto.",
    href: "/sustentabilidade",
    icon: Leaf,
  },
];

export default function BlogPage() {
  const guides = getGuides();

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-12">
      <section className="mx-auto max-w-7xl">
        <Link
          href="/"
          className="text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
        >
          ← Voltar à página inicial
        </Link>

        <div className="mt-8 max-w-4xl">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
            Blog 360 Merchandising
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950 md:text-5xl">
            Conteúdo para decidir melhor antes de encomendar
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-neutral-600">
            Reunimos guias, critérios e temas de apoio para empresas que precisam
            de escolher merchandising, configurar personalização e planear ações
            com quantidades, orçamento e prazos concretos.
          </p>
        </div>

        <section className="mt-10 rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <BookOpen className="h-8 w-8 text-neutral-500" />
              <h2 className="mt-6 text-2xl font-semibold tracking-tight text-neutral-950">
                Guias práticos e permanentes
              </h2>
              <p className="mt-3 max-w-2xl text-neutral-600">
                O centro de guias organiza os temas que exigem uma resposta mais
                completa: escolha de brindes, merchandising corporativo, welcome
                kits, eventos, sustentabilidade e orçamento.
              </p>
            </div>
            <Link
              href="/guias"
              className="inline-flex items-center rounded-2xl bg-neutral-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              Ver todos os guias
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </section>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          {themes.map(({ title, description, href, icon: Icon }) => (
            <Link
              key={title}
              href={href}
              className="group rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <Icon className="h-7 w-7 text-neutral-500" />
              <h2 className="mt-6 text-xl font-semibold text-neutral-950">
                {title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                {description}
              </p>
              <span className="mt-6 inline-flex items-center text-sm font-semibold text-neutral-950">
                Explorar
                <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>

        <section className="mt-12">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">
            Guias em destaque
          </p>
          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {guides.map((guide) => (
              <Link
                key={guide.slug}
                href={`/guias/${guide.slug}`}
                className="group rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <h2 className="text-xl font-semibold tracking-tight text-neutral-950">
                  {guide.h1}
                </h2>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-neutral-600">
                  {guide.description}
                </p>
                <span className="mt-5 inline-flex items-center text-sm font-semibold text-neutral-950">
                  Ler guia
                  <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-3xl border border-neutral-200 bg-neutral-950 p-8 text-white shadow-sm">
          <Lightbulb className="h-8 w-8 text-white/70" />
          <h2 className="mt-6 text-2xl font-semibold tracking-tight">
            Já sabe o que precisa mas não sabe que produto escolher?
          </h2>
          <p className="mt-3 max-w-3xl text-white/70">
            Use o Smart Merch para cruzar a sua necessidade com quantidade,
            orçamento, prazo ou tipo de produto e continuar diretamente para o
            catálogo.
          </p>
          <Link
            href="/smart-merch"
            className="mt-6 inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-100"
          >
            Experimentar Smart Merch
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </section>
      </section>
    </main>
  );
}
