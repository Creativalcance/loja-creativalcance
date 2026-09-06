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
import { localizePath, SITE_LOCALES, type SiteLocale } from "@/lib/i18n/config";
import { getCurrentLocale } from "@/lib/i18n/server";

const icons = [Layers3, FileText, BookOpen];
const copy = {
  pt: { title: "360 Merchandising — autor editorial", description: "Perfil editorial da 360 Merchandising, responsável pelos guias, páginas técnicas e conteúdos de apoio à escolha de merchandising e brindes personalizados.", og: "Conheça os temas, princípios e metodologia usados nos conteúdos editoriais da 360 Merchandising.", back: "← Voltar aos guias", author: "Autor editorial", intro: "Os guias e conteúdos institucionais da plataforma são publicados sob autoria editorial da 360 Merchandising. A abordagem combina informação do catálogo com critérios práticos de escolha, sem transformar recomendações gerais em características não confirmadas de produtos concretos.", principles: "Princípios de autoria", principleItems: ["Distinguir dados de catálogo de orientação editorial", "Não inventar estatísticas, reviews ou certificações", "Indicar a origem quando são usados dados externos", "Rever conteúdos quando a informação muda"], areas: [["Brindes e merchandising", "Critérios de escolha por objetivo, público, quantidade, orçamento e ocasião."], ["Personalização", "Explicação das relações entre produto, componente, localização, técnica e área disponível."], ["Conteúdo de apoio à compra", "Guias sobre welcome kits, eventos, sustentabilidade, aplicações e contextos de utilização."]], method: "Metodologia", methodHeading: "Como os conteúdos são criados e revistos", methodText: "Consulte os princípios usados para separar factos, dados de catálogo, orientação editorial e fontes externas.", publications: "Publicações", guides: "Consultar os guias da 360", guidesText: "Explore conteúdos sobre escolha de brindes, merchandising, welcome kits, eventos, orçamento e sustentabilidade." },
  en: { title: "360 Merchandising — editorial author", description: "Editorial profile for 360 Merchandising, responsible for guides, technical pages and content that supports merchandise and promotional product selection.", og: "Discover the topics, principles and methodology behind 360 Merchandising editorial content.", back: "← Back to guides", author: "Editorial author", intro: "The platform’s guides and institutional content are published under the editorial authorship of 360 Merchandising. Our approach combines catalogue information with practical selection criteria, without turning general recommendations into unconfirmed claims about specific products.", principles: "Authorship principles", principleItems: ["Separate catalogue data from editorial guidance", "Never invent statistics, reviews or certifications", "State the source when external data is used", "Review content when information changes"], areas: [["Promotional products and merchandise", "Selection criteria by objective, audience, quantity, budget and occasion."], ["Customisation", "Explaining the relationship between product, component, position, technique and available area."], ["Purchase guidance", "Guides to welcome kits, events, sustainability, applications and use cases."]], method: "Methodology", methodHeading: "How content is created and reviewed", methodText: "See the principles used to separate facts, catalogue data, editorial guidance and external sources.", publications: "Publications", guides: "Browse the 360 guides", guidesText: "Explore content about promotional product selection, merchandise, welcome kits, events, budgets and sustainability." },
  fr: { title: "360 Merchandising — auteur éditorial", description: "Profil éditorial de 360 Merchandising, responsable des guides, pages techniques et contenus d’aide au choix du merchandising et des objets publicitaires.", og: "Découvrez les thèmes, principes et la méthodologie des contenus éditoriaux de 360 Merchandising.", back: "← Retour aux guides", author: "Auteur éditorial", intro: "Les guides et contenus institutionnels de la plateforme sont publiés sous la responsabilité éditoriale de 360 Merchandising. Notre approche associe les informations du catalogue à des critères de choix pratiques, sans transformer des recommandations générales en caractéristiques non confirmées de produits précis.", principles: "Principes d’auteur", principleItems: ["Distinguer les données du catalogue des conseils éditoriaux", "Ne jamais inventer de statistiques, avis ou certifications", "Indiquer la source des données externes", "Réviser le contenu lorsque l’information change"], areas: [["Objets publicitaires et merchandising", "Critères de choix par objectif, public, quantité, budget et occasion."], ["Personnalisation", "Explication des liens entre produit, composant, emplacement, technique et zone disponible."], ["Aide à l’achat", "Guides sur les welcome kits, événements, durabilité, applications et contextes d’utilisation."]], method: "Méthodologie", methodHeading: "Comment les contenus sont créés et révisés", methodText: "Consultez les principes utilisés pour distinguer faits, données du catalogue, conseils éditoriaux et sources externes.", publications: "Publications", guides: "Consulter les guides 360", guidesText: "Explorez les contenus sur le choix des objets, le merchandising, les welcome kits, les événements, le budget et la durabilité." },
} satisfies Record<SiteLocale, { title: string; description: string; og: string; back: string; author: string; intro: string; principles: string; principleItems: string[]; areas: string[][]; method: string; methodHeading: string; methodText: string; publications: string; guides: string; guidesText: string }>;

export async function generateMetadata(): Promise<Metadata> { const locale = await getCurrentLocale(); const t = copy[locale]; const path = localizePath("/autores/360-merchandising", locale); return { title: t.title, description: t.description, alternates: { canonical: path }, openGraph: { type: "profile", locale: SITE_LOCALES[locale].htmlLang.replace("-", "_"), title: t.title, description: t.og, url: path } }; }

export default async function AuthorPage() {
  const locale = await getCurrentLocale(); const t = copy[locale];
  const areas = t.areas.map(([title, text], index) => ({ title, text, icon: icons[index] }));
  const structuredData = buildAuthorStructuredData(localizePath("/autores/360-merchandising", locale));

  return (
    <main className="min-h-screen bg-neutral-50">
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <Link
            href={localizePath("/guias", locale)}
            className="text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
          >
            {t.back}
          </Link>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#e85f00]">
                {t.author}
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950 md:text-6xl">
                360 Merchandising
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-neutral-600">
                {t.intro}
              </p>
            </div>

            <aside className="rounded-3xl border border-neutral-200 bg-neutral-50 p-6 shadow-sm">
              <ShieldCheck className="h-6 w-6 text-[#e85f00]" />
              <h2 className="mt-4 text-lg font-semibold text-neutral-950">
                {t.principles}
              </h2>
              <ul className="mt-4 space-y-3">
                {t.principleItems.map((item) => (
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
            href={localizePath("/metodologia-editorial", locale)}
            className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">
              {t.method}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">
              {t.methodHeading}
            </h2>
            <p className="mt-3 text-sm leading-6 text-neutral-600">
              {t.methodText}
            </p>
          </Link>

          <Link
            href={localizePath("/guias", locale)}
            className="rounded-3xl border border-neutral-200 bg-neutral-950 p-7 text-white shadow-sm transition hover:-translate-y-1 hover:bg-neutral-900"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/45">
              {t.publications}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              {t.guides}
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/65">
              {t.guidesText}
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
