import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ClipboardCheck, FileCheck2, ShieldCheck } from "lucide-react";
import { localizePath, type SiteLocale } from "@/lib/i18n/config";
import { getCurrentLocale } from "@/lib/i18n/server";

const icons = [ClipboardCheck, FileCheck2, ShieldCheck];
const copy = {
  pt: { title: "Casos de estudo de merchandising", description: "Área preparada para casos de estudo documentados da 360 Merchandising. Os casos serão publicados apenas quando existirem dados e autorização suficientes.", back: "← Voltar à página inicial", eyebrow: "Casos de estudo", heading: "Projetos reais, apenas quando estiverem documentados", intro: "Esta área fica preparada para receber casos de estudo da 360. Ainda não publicamos casos fictícios nem utilizamos exemplos como se fossem projetos de clientes. Até existirem casos validados, a página permanece fora do índice dos motores de pesquisa.", criteria: [["Contexto verificável", "O caso deve explicar o objetivo, público, quantidade, prazo e desafio sem criar resultados que não tenham sido documentados."], ["Solução documentada", "Produtos, materiais e técnicas mencionados devem corresponder ao projeto efetivamente executado."], ["Publicação responsável", "Nome, marca, imagens, resultados ou testemunhos só devem ser publicados quando exista base e autorização para o fazer."]], ctaHeading: "Tem um projeto para desenvolver?", ctaText: "Para campanhas, eventos, welcome kits ou necessidades específicas, envie o contexto e a equipa 360 prepara uma proposta.", cta: "Fazer pedido personalizado" },
  en: { title: "Merchandise case studies", description: "A space for documented 360 Merchandising case studies. Cases will only be published when sufficient data and permission are available.", back: "← Back to homepage", eyebrow: "Case studies", heading: "Real projects, published only when documented", intro: "This area is ready for 360 case studies. We do not publish fictional cases or present examples as client projects. Until validated cases are available, this page remains excluded from search engine indexes.", criteria: [["Verifiable context", "The case must explain the objective, audience, quantity, deadline and challenge without inventing undocumented results."], ["Documented solution", "The products, materials and techniques mentioned must match the project that was actually delivered."], ["Responsible publication", "Names, brands, images, results or testimonials are only published when there is evidence and permission to do so."]], ctaHeading: "Have a project to develop?", ctaText: "For campaigns, events, welcome kits or specific needs, send us the context and the 360 team will prepare a proposal.", cta: "Request a custom proposal" },
  fr: { title: "Études de cas de merchandising", description: "Un espace destiné aux études de cas documentées de 360 Merchandising. Elles ne seront publiées que lorsque les données et autorisations seront suffisantes.", back: "← Retour à l’accueil", eyebrow: "Études de cas", heading: "Des projets réels, publiés uniquement lorsqu’ils sont documentés", intro: "Cet espace est prêt à accueillir les études de cas 360. Nous ne publions aucun cas fictif et ne présentons pas d’exemples comme des projets clients. Jusqu’à la disponibilité de cas validés, cette page reste hors de l’index des moteurs de recherche.", criteria: [["Contexte vérifiable", "Le cas doit expliquer l’objectif, le public, la quantité, le délai et le défi sans inventer de résultats non documentés."], ["Solution documentée", "Les produits, matières et techniques mentionnés doivent correspondre au projet réellement réalisé."], ["Publication responsable", "Noms, marques, images, résultats ou témoignages ne sont publiés que lorsqu’il existe des preuves et une autorisation."]], ctaHeading: "Vous avez un projet à développer ?", ctaText: "Pour une campagne, un événement, un welcome kit ou un besoin spécifique, envoyez-nous le contexte et l’équipe 360 préparera une proposition.", cta: "Demander une proposition" },
} satisfies Record<SiteLocale, { title: string; description: string; back: string; eyebrow: string; heading: string; intro: string; criteria: string[][]; ctaHeading: string; ctaText: string; cta: string }>;

export async function generateMetadata(): Promise<Metadata> { const locale = await getCurrentLocale(); const t = copy[locale]; return { title: t.title, description: t.description, alternates: { canonical: localizePath("/casos-de-estudo", locale) }, robots: { index: false, follow: true } }; }

export default async function CaseStudiesPage() {
  const locale = await getCurrentLocale(); const t = copy[locale];
  const criteria = t.criteria.map(([title, text], index) => ({ title, text, icon: icons[index] }));
  return (
    <main className="min-h-screen bg-neutral-50">
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <Link
            href={localizePath("/", locale)}
            className="text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
          >
            {t.back}
          </Link>

          <div className="mt-10 max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#e85f00]">
              {t.eyebrow}
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950 md:text-6xl">
              {t.heading}
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-neutral-600">
              {t.intro}
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
              {t.ctaHeading}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
              {t.ctaText}
            </p>
          </div>
          <Link
            href={localizePath("/contacto", locale)}
            className="mt-5 inline-flex shrink-0 items-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-100 md:mt-0"
          >
            {t.cta}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
