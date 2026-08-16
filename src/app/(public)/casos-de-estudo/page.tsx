import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ClipboardCheck, FileCheck2, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Casos de estudo de merchandising",
  description:
    "Área preparada para casos de estudo documentados da 360 Merchandising. Os casos serão publicados apenas quando existirem dados e autorização suficientes.",
  alternates: { canonical: "/casos-de-estudo" },
  robots: {
    index: false,
    follow: true,
  },
};

const criteria = [
  {
    title: "Contexto verificável",
    text: "O caso deve explicar o objetivo, público, quantidade, prazo e desafio sem criar resultados que não tenham sido documentados.",
    icon: ClipboardCheck,
  },
  {
    title: "Solução documentada",
    text: "Produtos, materiais e técnicas mencionados devem corresponder ao projeto efetivamente executado.",
    icon: FileCheck2,
  },
  {
    title: "Publicação responsável",
    text: "Nome, marca, imagens, resultados ou testemunhos só devem ser publicados quando exista base e autorização para o fazer.",
    icon: ShieldCheck,
  },
];

export default function CaseStudiesPage() {
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
              Casos de estudo
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950 md:text-6xl">
              Projetos reais, apenas quando estiverem documentados
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-neutral-600">
              Esta área fica preparada para receber casos de estudo da 360.
              Ainda não publicamos casos fictícios nem utilizamos exemplos como
              se fossem projetos de clientes. Até existirem casos validados, a
              página permanece fora do índice dos motores de pesquisa.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <div className="grid gap-5 md:grid-cols-3">
          {criteria.map(({ title, text, icon: Icon }) => (
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

        <div className="mt-12 rounded-3xl bg-neutral-950 p-8 text-white md:flex md:items-center md:justify-between md:gap-8">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Tem um projeto para desenvolver?
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
              Para campanhas, eventos, welcome kits ou necessidades específicas,
              envie o contexto e a equipa 360 prepara uma proposta.
            </p>
          </div>
          <Link
            href="/contacto"
            className="mt-5 inline-flex shrink-0 items-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-100 md:mt-0"
          >
            Fazer pedido personalizado
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
