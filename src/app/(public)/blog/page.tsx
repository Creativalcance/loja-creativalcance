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
import { localizePath, type SiteLocale } from "@/lib/i18n/config";
import { getCurrentLocale } from "@/lib/i18n/server";

const themeIcons = [Gift, Building2, Palette, Megaphone, Leaf];
const themeHrefs = ["/guias/como-escolher-brindes-personalizados-empresas", "/guias/merchandising-corporativo-guia", "/personalizacao", "/guias/brindes-para-eventos-guia", "/sustentabilidade"];
const copy = {
  pt: { title: "Blog de merchandising, brindes e marketing promocional", description: "Conteúdos e recursos da 360 Merchandising sobre brindes personalizados, merchandising corporativo, personalização, eventos e sustentabilidade.", back: "← Voltar à página inicial", heading: "Conteúdo para decidir melhor antes de encomendar", intro: "Reunimos guias, critérios e temas de apoio para empresas que precisam de escolher merchandising, configurar personalização e planear ações com quantidades, orçamento e prazos concretos.", guideHeading: "Guias práticos e permanentes", guideText: "O centro de guias organiza os temas que exigem uma resposta mais completa: escolha de brindes, merchandising corporativo, welcome kits, eventos, sustentabilidade e orçamento.", allGuides: "Ver todos os guias", explore: "Explorar", featured: "Guias em destaque", read: "Ler guia", ctaHeading: "Já sabe o que precisa mas não sabe que produto escolher?", ctaText: "Use o Smart Merch para cruzar a sua necessidade com quantidade, orçamento, prazo ou tipo de produto e continuar diretamente para o catálogo.", cta: "Experimentar Smart Merch", themes: [["Brindes personalizados", "Critérios para escolher produtos por objetivo, público, quantidade e orçamento."], ["Merchandising corporativo", "Como organizar produtos de marca para clientes, equipas, eventos e campanhas."], ["Personalização", "Compreender técnicas, componentes, localizações e áreas antes de configurar."], ["Eventos e congressos", "Planeamento de públicos, quantidades, distribuição e prazos em ações presenciais."], ["Sustentabilidade", "Materiais, certificações e dados ambientais para comparar referências com mais contexto."]] },
  en: { title: "Corporate merchandise and promotional marketing blog", description: "360 Merchandising content and resources about promotional products, corporate merchandise, customisation, events and sustainability.", back: "← Back to homepage", heading: "Content to help you decide before ordering", intro: "Guides, criteria and practical topics for companies choosing merchandise, configuring customisation and planning actions with specific quantities, budgets and deadlines.", guideHeading: "Practical, evergreen guides", guideText: "Our guide centre covers topics that need a fuller answer: promotional product selection, corporate merchandise, welcome kits, events, sustainability and budgets.", allGuides: "View all guides", explore: "Explore", featured: "Featured guides", read: "Read guide", ctaHeading: "Know what you need but not which product to choose?", ctaText: "Use Smart Merch to combine your need with quantity, budget, deadline or product type and continue directly to the catalogue.", cta: "Try Smart Merch", themes: [["Promotional products", "Criteria for choosing products by objective, audience, quantity and budget."], ["Corporate merchandise", "How to organise branded products for clients, teams, events and campaigns."], ["Customisation", "Understand techniques, components, positions and areas before configuring."], ["Events and conferences", "Plan audiences, quantities, distribution and deadlines for in-person activities."], ["Sustainability", "Materials, certifications and environmental data for better-informed comparisons."]] },
  fr: { title: "Blog sur le merchandising et les objets publicitaires", description: "Contenus et ressources de 360 Merchandising sur les objets publicitaires, le merchandising d’entreprise, la personnalisation, les événements et la durabilité.", back: "← Retour à l’accueil", heading: "Des contenus pour mieux décider avant de commander", intro: "Des guides, critères et thèmes pratiques pour choisir le merchandising, configurer la personnalisation et planifier des actions selon vos quantités, votre budget et vos délais.", guideHeading: "Guides pratiques et durables", guideText: "Notre centre de guides traite les sujets qui demandent une réponse complète : choix des objets, merchandising d’entreprise, welcome kits, événements, durabilité et budget.", allGuides: "Voir tous les guides", explore: "Explorer", featured: "Guides à la une", read: "Lire le guide", ctaHeading: "Vous savez ce dont vous avez besoin, mais pas quel produit choisir ?", ctaText: "Utilisez Smart Merch pour croiser votre besoin avec la quantité, le budget, le délai ou le type de produit, puis accédez directement au catalogue.", cta: "Essayer Smart Merch", themes: [["Objets publicitaires personnalisés", "Des critères pour choisir selon l’objectif, le public, la quantité et le budget."], ["Merchandising d’entreprise", "Organiser les produits de marque pour clients, équipes, événements et campagnes."], ["Personnalisation", "Comprendre techniques, composants, emplacements et zones avant de configurer."], ["Événements et congrès", "Planifier publics, quantités, distribution et délais des actions en présentiel."], ["Durabilité", "Matières, certifications et données environnementales pour mieux comparer."]] },

es: { title: "Blog de merchandising corporativo y marketing promocional", description: "Contenidos y recursos de 360 Merchandising sobre productos promocionales, merchandising corporativo, personalizaci\u00F3n, eventos y sostenibilidad.", back: "\u2190 Volver al inicio", heading: "Contenidos para ayudarte a decidir antes de comprar", intro: "Gu\u00EDas, criterios y temas pr\u00E1cticos para empresas que eligen merchandising, configuran personalizaciones y planifican acciones con cantidades, presupuestos y plazos concretos.", guideHeading: "Gu\u00EDas pr\u00E1cticas de consulta", guideText: "Nuestro centro de gu\u00EDas aborda temas que necesitan una respuesta m\u00E1s completa: selecci\u00F3n de productos promocionales, merchandising corporativo, kits de bienvenida, eventos, sostenibilidad y presupuestos.", allGuides: "Ver todas las gu\u00EDas", explore: "Explorar", featured: "Gu\u00EDas destacadas", read: "Leer gu\u00EDa", ctaHeading: "\u00BFSabes lo que necesitas, pero no qu\u00E9 producto elegir?", ctaText: "Utiliza Smart Merch para combinar tus necesidades con la cantidad, el presupuesto, el plazo o el tipo de producto y acceder directamente al cat\u00E1logo.", cta: "Probar Smart Merch", themes: [["Productos promocionales", "Criterios para elegir productos seg\u00FAn el objetivo, el p\u00FAblico, la cantidad y el presupuesto."], ["Merchandising corporativo", "C\u00F3mo organizar productos de marca para clientes, equipos, eventos y campa\u00F1as."], ["Personalizaci\u00F3n", "Comprende las t\u00E9cnicas, los componentes, las posiciones y las \u00E1reas antes de configurar."], ["Eventos y congresos", "Planifica el p\u00FAblico, las cantidades, la distribuci\u00F3n y los plazos de las actividades presenciales."], ["Sostenibilidad", "Materiales, certificaciones y datos medioambientales para comparar con m\u00E1s informaci\u00F3n."]] },
de: { title: "Blog f\u00FCr Unternehmensmerchandising und Werbemarketing", description: "Inhalte und Ressourcen von 360 Merchandising zu Werbeartikeln, Unternehmensmerchandising, Personalisierung, Veranstaltungen und Nachhaltigkeit.", back: "\u2190 Zur Startseite", heading: "Inhalte als Entscheidungshilfe vor der Bestellung", intro: "Ratgeber, Kriterien und praktische Themen f\u00FCr Unternehmen, die Merchandising ausw\u00E4hlen, Personalisierungen konfigurieren und Ma\u00DFnahmen mit konkreten Mengen, Budgets und Terminen planen.", guideHeading: "Praktische, zeitlose Ratgeber", guideText: "Unser Ratgeberbereich behandelt Themen, die ausf\u00FChrlichere Antworten ben\u00F6tigen: Auswahl von Werbeartikeln, Unternehmensmerchandising, Willkommenspakete, Veranstaltungen, Nachhaltigkeit und Budgets.", allGuides: "Alle Ratgeber ansehen", explore: "Entdecken", featured: "Ausgew\u00E4hlte Ratgeber", read: "Ratgeber lesen", ctaHeading: "Sie kennen Ihren Bedarf, aber wissen nicht, welches Produkt passt?", ctaText: "Kombinieren Sie mit Smart Merch Ihren Bedarf mit Menge, Budget, Termin oder Produkttyp und gelangen Sie direkt zum Katalog.", cta: "Smart Merch ausprobieren", themes: [["Werbeartikel", "Kriterien f\u00FCr die Produktauswahl nach Ziel, Zielgruppe, Menge und Budget."], ["Unternehmensmerchandising", "So organisieren Sie Markenprodukte f\u00FCr Kunden, Teams, Veranstaltungen und Kampagnen."], ["Personalisierung", "Informieren Sie sich vor der Konfiguration \u00FCber Techniken, Komponenten, Positionen und Fl\u00E4chen."], ["Veranstaltungen und Konferenzen", "Planen Sie Zielgruppen, Mengen, Verteilung und Termine f\u00FCr Pr\u00E4senzveranstaltungen."], ["Nachhaltigkeit", "Materialien, Zertifizierungen und Umweltdaten f\u00FCr fundiertere Vergleiche."]] },
it: { title: "Blog di merchandising aziendale e marketing promozionale", description: "Contenuti e risorse di 360 Merchandising su prodotti promozionali, merchandising aziendale, personalizzazione, eventi e sostenibilit\u00E0.", back: "\u2190 Torna alla pagina iniziale", heading: "Contenuti per aiutarti a decidere prima di ordinare", intro: "Guide, criteri e temi pratici per aziende che scelgono merchandising, configurano personalizzazioni e pianificano attivit\u00E0 con quantit\u00E0, budget e scadenze specifiche.", guideHeading: "Guide pratiche sempre utili", guideText: "Il nostro centro guide approfondisce temi che richiedono risposte pi\u00F9 complete: scelta di prodotti promozionali, merchandising aziendale, kit di benvenuto, eventi, sostenibilit\u00E0 e budget.", allGuides: "Vedi tutte le guide", explore: "Esplora", featured: "Guide in evidenza", read: "Leggi la guida", ctaHeading: "Sai cosa ti serve ma non quale prodotto scegliere?", ctaText: "Usa Smart Merch per combinare le tue esigenze con quantit\u00E0, budget, scadenza o tipo di prodotto e accedere direttamente al catalogo.", cta: "Prova Smart Merch", themes: [["Prodotti promozionali", "Criteri per scegliere prodotti in base a obiettivo, pubblico, quantit\u00E0 e budget."], ["Merchandising aziendale", "Come organizzare prodotti con il marchio per clienti, team, eventi e campagne."], ["Personalizzazione", "Comprendi tecniche, componenti, posizioni e aree prima della configurazione."], ["Eventi e congressi", "Pianifica pubblico, quantit\u00E0, distribuzione e scadenze per le attivit\u00E0 in presenza."], ["Sostenibilit\u00E0", "Materiali, certificazioni e dati ambientali per confronti pi\u00F9 consapevoli."]] },
} satisfies Record<SiteLocale, { title: string; description: string; back: string; heading: string; intro: string; guideHeading: string; guideText: string; allGuides: string; explore: string; featured: string; read: string; ctaHeading: string; ctaText: string; cta: string; themes: string[][] }>;

export async function generateMetadata(): Promise<Metadata> { const locale = await getCurrentLocale(); const t = copy[locale]; return { title: t.title, description: t.description, alternates: { canonical: localizePath("/blog", locale) } }; }

export default async function BlogPage() {
  const locale = await getCurrentLocale(); const t = copy[locale];
  const guides = getGuides(locale);
  const themes = t.themes.map(([title, description], index) => ({ title, description, href: themeHrefs[index], icon: themeIcons[index] }));

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-12">
      <section className="mx-auto max-w-7xl">
        <Link
          href={localizePath("/", locale)}
          className="text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
        >
          {t.back}
        </Link>

        <div className="mt-8 max-w-4xl">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
            Blog 360 Merchandising
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950 md:text-5xl">
            {t.heading}
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-neutral-600">
            {t.intro}
          </p>
        </div>

        <section className="mt-10 rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <BookOpen className="h-8 w-8 text-neutral-500" />
              <h2 className="mt-6 text-2xl font-semibold tracking-tight text-neutral-950">
                {t.guideHeading}
              </h2>
              <p className="mt-3 max-w-2xl text-neutral-600">
                {t.guideText}
              </p>
            </div>
            <Link
              href={localizePath("/guias", locale)}
              className="inline-flex items-center rounded-2xl bg-neutral-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              {t.allGuides}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </section>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          {themes.map(({ title, description, href, icon: Icon }) => (
            <Link
              key={title}
              href={localizePath(href, locale)}
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
                {t.explore}
                <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>

        <section className="mt-12">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">
            {t.featured}
          </p>
          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {guides.map((guide) => (
              <Link
                key={guide.slug}
                href={localizePath(`/guias/${guide.slug}`, locale)}
                className="group rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <h2 className="text-xl font-semibold tracking-tight text-neutral-950">
                  {guide.h1}
                </h2>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-neutral-600">
                  {guide.description}
                </p>
                <span className="mt-5 inline-flex items-center text-sm font-semibold text-neutral-950">
                  {t.read}
                  <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-3xl border border-neutral-200 bg-neutral-950 p-8 text-white shadow-sm">
          <Lightbulb className="h-8 w-8 text-white/70" />
          <h2 className="mt-6 text-2xl font-semibold tracking-tight">
            {t.ctaHeading}
          </h2>
          <p className="mt-3 max-w-3xl text-white/70">
            {t.ctaText}
          </p>
          <Link
            href={localizePath("/smart-merch", locale)}
            className="mt-6 inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-100"
          >
            {t.cta}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </section>
      </section>
    </main>
  );
}
