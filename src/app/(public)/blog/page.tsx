import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Building2,
  Gift,
  Lightbulb,
  Megaphone,
  Palette,
} from "lucide-react";

const articles = [
  {
    title: "Como escolher brindes promocionais para empresas",
    description:
      "Critérios essenciais para seleccionar produtos úteis, coerentes com a marca e adequados ao público-alvo.",
    href: "/contacto",
    icon: Gift,
    category: "Brindes promocionais",
  },
  {
    title: "Merchandising corporativo: mais do que oferecer produtos",
    description:
      "Como transformar merchandising em ferramenta de posicionamento, retenção e experiência de marca.",
    href: "/contacto",
    icon: Building2,
    category: "Merchandising",
  },
  {
    title: "Personalização: técnicas, materiais e impacto visual",
    description:
      "Serigrafia, gravação laser, impressão UV e outras técnicas aplicadas a campanhas B2B.",
    href: "/contacto",
    icon: Palette,
    category: "Personalização",
  },
  {
    title: "Como planear uma campanha promocional B2B",
    description:
      "Da escolha do produto ao prazo de entrega, passando por quantidades, orçamento e logística.",
    href: "/contacto",
    icon: Megaphone,
    category: "Estratégia",
  },
];

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-12">
      <section className="mx-auto max-w-7xl">
        <Link
          href="/"
          className="text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
        >
          ← Voltar à página inicial
        </Link>

        <div className="mt-8">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
            Guias B2B
          </p>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950">
            Conteúdos para comprar melhor merchandising corporativo
          </h1>

          <p className="mt-4 max-w-3xl text-neutral-600">
            Guias, ideias e recomendações para empresas que procuram brindes
            promocionais, gifts empresariais, vestuário personalizado e soluções
            de branding com impacto.
          </p>
        </div>

        <section className="mt-10 rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <BookOpen className="h-8 w-8 text-neutral-500" />

              <h2 className="mt-6 text-2xl font-semibold tracking-tight text-neutral-950">
                Centro editorial em desenvolvimento
              </h2>

              <p className="mt-3 max-w-2xl text-neutral-600">
                Esta área será usada para SEO, conteúdos técnicos, guias de
                compra, comparativos de materiais, técnicas de personalização e
                páginas orientadas a intenção comercial.
              </p>
            </div>

            <Link
              href="/pesquisa"
              className="inline-flex items-center rounded-2xl bg-neutral-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              Ver produtos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </section>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {articles.map((article) => {
            const Icon = article.icon;

            return (
              <article
                key={article.title}
                className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
              >
                <Icon className="h-7 w-7 text-neutral-500" />

                <p className="mt-6 text-xs font-medium uppercase tracking-[0.16em] text-neutral-400">
                  {article.category}
                </p>

                <h2 className="mt-3 text-xl font-semibold text-neutral-950">
                  {article.title}
                </h2>

                <p className="mt-3 text-sm leading-6 text-neutral-600">
                  {article.description}
                </p>

                <Link
                  href={article.href}
                  className="mt-6 inline-flex items-center text-sm font-semibold text-neutral-950"
                >
                  Pedir apoio
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </article>
            );
          })}
        </div>

        <section className="mt-12 rounded-3xl border border-neutral-200 bg-neutral-950 p-8 text-white shadow-sm">
          <Lightbulb className="h-8 w-8 text-white/70" />

          <h2 className="mt-6 text-2xl font-semibold tracking-tight">
            Próxima fase editorial
          </h2>

          <p className="mt-3 max-w-3xl text-white/70">
            Depois de estabilizarmos checkout, encomendas e integração com o fornecedor,
            esta área deverá receber artigos programáticos para dominar pesquisas
            como brindes promocionais, merchandising corporativo, brindes
            personalizados, gifts empresariais e vestuário promocional.
          </p>
        </section>
      </section>
    </main>
  );
}
