import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Droplets,
  Leaf,
  Recycle,
  ShieldCheck,
  Trees,
} from "lucide-react";
import {
  buildEditorialStructuredData,
  serializeJsonLd,
} from "@/lib/seo/structured-data";

export const metadata: Metadata = {
  title: "Merchandising sustentável e brindes ecológicos",
  description:
    "Centro 360 de sustentabilidade: materiais reciclados, FSC, Our Nature, CO₂, H₂O e critérios para comparar merchandising com informação ambiental.",
  alternates: { canonical: "/sustentabilidade" },
  openGraph: {
    type: "website",
    locale: "pt_PT",
    title: "Merchandising sustentável e brindes ecológicos",
    description:
      "Critérios para comparar produtos através de materiais, certificações, reutilização e dados ambientais disponíveis.",
    url: "/sustentabilidade",
  },
};

const indicators = [
  {
    title: "Materiais reciclados",
    text: "Quando a referência identifica materiais reciclados, a composição e a percentagem descrita no produto ajudam a contextualizar essa característica.",
    icon: Recycle,
  },
  {
    title: "FSC™",
    text: "A informação FSC identifica referências em que o fornecedor indica materiais certificados FSC™.",
    icon: Trees,
  },
  {
    title: "Our Nature",
    text: "O catálogo pode identificar referências integradas na linha Our Nature do fornecedor.",
    icon: Leaf,
  },
  {
    title: "CO₂",
    text: "Quando disponível, o campo CO₂ é apresentado em kg de CO₂ equivalente e serve como dado adicional de comparação.",
    icon: ShieldCheck,
  },
  {
    title: "H₂O",
    text: "Quando disponível, o campo H₂O acrescenta informação sobre a utilização de água associada ao desenvolvimento do produto.",
    icon: Droplets,
  },
];

export default function SustainabilityPage() {
  const structuredData = buildEditorialStructuredData({
    name: "Merchandising sustentável e brindes ecológicos",
    description:
      "Critérios para comparar produtos através de materiais, certificações, reutilização e dados ambientais disponíveis.",
    path: "/sustentabilidade",
    breadcrumbLabel: "Sustentabilidade",
  });

  return (
    <main className="min-h-screen bg-neutral-50">
      <section className="border-b border-neutral-200 bg-[#10281f] text-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <Link
            href="/"
            className="text-sm font-medium text-white/55 transition hover:text-white"
          >
            ← Voltar à página inicial
          </Link>
          <div className="mt-10 max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
              Centro 360 · Sustentabilidade
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">
              Comparar sustentabilidade com informação concreta
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-white/70">
              A escolha de merchandising sustentável deve apoiar-se nos dados
              efetivamente disponíveis para cada referência: composição,
              materiais, certificações, reutilização e indicadores ambientais.
              Nem todos os produtos apresentam o mesmo nível de informação.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          {indicators.map(({ title, text, icon: Icon }) => (
            <article
              key={title}
              className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
            >
              <Icon className="h-6 w-6 text-emerald-700" />
              <h2 className="mt-5 text-lg font-semibold text-neutral-950">
                {title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-neutral-600">{text}</p>
            </article>
          ))}
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-3">
          <article>
            <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">
              Comece pela composição
            </h2>
            <p className="mt-4 leading-8 text-neutral-600">
              Compare o material declarado, a composição e as propriedades do
              produto. Termos como reciclado, FSC ou outras características só
              devem ser usados quando estão associados à referência concreta.
            </p>
          </article>
          <article>
            <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">
              Considere a utilização real
            </h2>
            <p className="mt-4 leading-8 text-neutral-600">
              Durabilidade, reutilização e adequação ao destinatário também são
              critérios importantes. Um produto deve fazer sentido para o uso
              previsto, não apenas para a mensagem da campanha.
            </p>
          </article>
          <article>
            <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">
              Comunique apenas o que está documentado
            </h2>
            <p className="mt-4 leading-8 text-neutral-600">
              Evite extrapolar características ambientais. A comunicação deve
              refletir os materiais, certificações e indicadores efetivamente
              disponibilizados para o produto selecionado.
            </p>
          </article>
        </div>

        <div className="mt-14 rounded-3xl border border-emerald-200 bg-emerald-50 p-8 md:flex md:items-center md:justify-between md:gap-8">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">
              Quer explorar alternativas com materiais específicos?
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
              Use a pesquisa para procurar termos como reciclado, rPET, bambu,
              cortiça ou FSC e confirme sempre os detalhes na página da
              referência.
            </p>
          </div>
          <Link
            href="/pesquisa?q=reciclado"
            className="mt-5 inline-flex shrink-0 items-center rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 md:mt-0"
          >
            Pesquisar produtos
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>

        <div className="mt-10 text-sm text-neutral-500">
          <Link
            href="/guias/brindes-ecologicos-sustentaveis"
            className="font-semibold text-neutral-950 hover:underline"
          >
            Ler o guia: brindes ecológicos e sustentáveis →
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
