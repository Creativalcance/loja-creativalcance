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

es: { title: "360 Merchandising \u2014 autor editorial", description: "Perfil editorial de 360 Merchandising, responsable de las gu\u00EDas, p\u00E1ginas t\u00E9cnicas y contenidos que ayudan a elegir merchandising y productos promocionales.", og: "Descubre los temas, principios y metodolog\u00EDa de los contenidos editoriales de 360 Merchandising.", back: "\u2190 Volver a las gu\u00EDas", author: "Autor editorial", intro: "Las gu\u00EDas y los contenidos institucionales de la plataforma se publican bajo la autor\u00EDa editorial de 360 Merchandising. Combinamos la informaci\u00F3n del cat\u00E1logo con criterios pr\u00E1cticos de selecci\u00F3n, sin convertir recomendaciones generales en afirmaciones no confirmadas sobre productos concretos.", principles: "Principios editoriales", principleItems: ["Separar los datos del cat\u00E1logo de las orientaciones editoriales", "No inventar estad\u00EDsticas, opiniones ni certificaciones", "Indicar la fuente cuando se utilicen datos externos", "Revisar el contenido cuando cambie la informaci\u00F3n"], areas: [["Productos promocionales y merchandising", "Criterios de selecci\u00F3n seg\u00FAn objetivo, p\u00FAblico, cantidad, presupuesto y ocasi\u00F3n."], ["Personalizaci\u00F3n", "Explicaci\u00F3n de la relaci\u00F3n entre producto, componente, posici\u00F3n, t\u00E9cnica y \u00E1rea disponible."], ["Orientaci\u00F3n de compra", "Gu\u00EDas sobre kits de bienvenida, eventos, sostenibilidad, aplicaciones y casos de uso."]], method: "Metodolog\u00EDa", methodHeading: "C\u00F3mo se crean y revisan los contenidos", methodText: "Consulta los principios utilizados para distinguir hechos, datos del cat\u00E1logo, orientaciones editoriales y fuentes externas.", publications: "Publicaciones", guides: "Explorar las gu\u00EDas 360", guidesText: "Explora contenidos sobre selecci\u00F3n de productos promocionales, merchandising, kits de bienvenida, eventos, presupuestos y sostenibilidad." },
de: { title: "360 Merchandising \u2014 Redaktion", description: "Redaktionelles Profil von 360 Merchandising, verantwortlich f\u00FCr Ratgeber, technische Seiten und Inhalte zur Auswahl von Merchandising und Werbeartikeln.", og: "Entdecken Sie Themen, Grunds\u00E4tze und Methodik der redaktionellen Inhalte von 360 Merchandising.", back: "\u2190 Zur\u00FCck zu den Ratgebern", author: "Redaktion", intro: "Die Ratgeber und Unternehmensinhalte der Plattform werden unter der redaktionellen Verantwortung von 360 Merchandising ver\u00F6ffentlicht. Wir verbinden Kataloginformationen mit praktischen Auswahlkriterien, ohne aus allgemeinen Empfehlungen unbest\u00E4tigte Aussagen zu einzelnen Produkten abzuleiten.", principles: "Redaktionelle Grunds\u00E4tze", principleItems: ["Katalogdaten von redaktioneller Beratung trennen", "Keine Statistiken, Bewertungen oder Zertifizierungen erfinden", "Bei externen Daten die Quelle angeben", "Inhalte bei ge\u00E4nderten Informationen \u00FCberarbeiten"], areas: [["Werbeartikel und Merchandising", "Auswahlkriterien nach Ziel, Zielgruppe, Menge, Budget und Anlass."], ["Personalisierung", "Erl\u00E4uterung des Zusammenhangs zwischen Produkt, Komponente, Position, Technik und verf\u00FCgbarer Fl\u00E4che."], ["Kaufberatung", "Ratgeber zu Willkommenspaketen, Veranstaltungen, Nachhaltigkeit, Einsatzbereichen und Anwendungsf\u00E4llen."]], method: "Methodik", methodHeading: "So werden Inhalte erstellt und gepr\u00FCft", methodText: "Erfahren Sie, wie wir Fakten, Katalogdaten, redaktionelle Beratung und externe Quellen voneinander trennen.", publications: "Ver\u00F6ffentlichungen", guides: "360-Ratgeber durchst\u00F6bern", guidesText: "Entdecken Sie Inhalte zur Auswahl von Werbeartikeln, Merchandising, Willkommenspaketen, Veranstaltungen, Budgets und Nachhaltigkeit." },
it: { title: "360 Merchandising \u2014 autore editoriale", description: "Profilo editoriale di 360 Merchandising, responsabile di guide, pagine tecniche e contenuti a supporto della scelta di merchandising e prodotti promozionali.", og: "Scopri i temi, i principi e la metodologia dei contenuti editoriali di 360 Merchandising.", back: "\u2190 Torna alle guide", author: "Autore editoriale", intro: "Le guide e i contenuti istituzionali della piattaforma sono pubblicati sotto la responsabilit\u00E0 editoriale di 360 Merchandising. Uniamo le informazioni del catalogo a criteri pratici di scelta, senza trasformare raccomandazioni generali in affermazioni non confermate su prodotti specifici.", principles: "Principi editoriali", principleItems: ["Distinguere i dati del catalogo dalle indicazioni editoriali", "Non inventare statistiche, recensioni o certificazioni", "Indicare la fonte quando si usano dati esterni", "Rivedere i contenuti quando le informazioni cambiano"], areas: [["Prodotti promozionali e merchandising", "Criteri di scelta per obiettivo, pubblico, quantit\u00E0, budget e occasione."], ["Personalizzazione", "Spiegazione del rapporto tra prodotto, componente, posizione, tecnica e area disponibile."], ["Guida all'acquisto", "Guide a kit di benvenuto, eventi, sostenibilit\u00E0, applicazioni e casi d'uso."]], method: "Metodologia", methodHeading: "Come vengono creati e rivisti i contenuti", methodText: "Consulta i principi usati per distinguere fatti, dati del catalogo, indicazioni editoriali e fonti esterne.", publications: "Pubblicazioni", guides: "Esplora le guide 360", guidesText: "Esplora contenuti sulla scelta di prodotti promozionali, merchandising, kit di benvenuto, eventi, budget e sostenibilit\u00E0." },
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
