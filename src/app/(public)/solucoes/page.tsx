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
import { localizePath, SITE_LOCALES, type SiteLocale } from "@/lib/i18n/config";
import { getCurrentLocale } from "@/lib/i18n/server";

const copy = {
  pt: { title: "Soluções de brindes personalizados por orçamento e quantidade", description: "Explore brindes personalizados por orçamento, quantidade, tipo de necessidade e ocasião, com critérios comerciais claros e produtos do catálogo ativo.", back: "Voltar à página inicial", eyebrow: "Pesquisa comercial orientada", heading: "Soluções de brindes por orçamento, quantidade e necessidade", intro: "Quando já sabe quanto pode investir, quantas unidades precisa ou em que contexto vai utilizar o merchandising, estas páginas ajudam a reduzir o catálogo antes da configuração final.", smartTitle: "Prefere descrever o pedido?", smartText: "Use o Smart Merch para combinar quantidade, orçamento, prazo e tipo de produto.", smart: "Experimentar Smart Merch", explore: "Explorar solução", breadcrumb: "Soluções", bottom: [["Aplicações", "Welcome kits, eventos, congressos, Natal e colaboradores."], ["Indústrias", "Hotelaria, universidades, startups, saúde, restauração e outros setores."], ["Guias", "Conteúdo para comparar orçamento, quantidade, personalização e sustentabilidade."], ["Seleções 360", "Páginas “melhores para” com critérios explícitos e opções do catálogo ativo."]] },
  en: { title: "Custom promotional product solutions by budget and quantity", description: "Explore custom gifts by budget, quantity, business need and occasion using clear criteria and active catalogue products.", back: "Back to homepage", eyebrow: "Guided business search", heading: "Promotional product solutions by budget, quantity and need", intro: "If you know your budget, required quantity or merchandising context, these pages help narrow the catalogue before final configuration.", smartTitle: "Prefer to describe your request?", smartText: "Use Smart Merch to combine quantity, budget, deadline and product type.", smart: "Try Smart Merch", explore: "Explore solution", breadcrumb: "Solutions", bottom: [["Applications", "Welcome kits, events, conferences, Christmas and employee programmes."], ["Industries", "Hospitality, universities, startups, healthcare, restaurants and other sectors."], ["Guides", "Content to compare budget, quantity, customisation and sustainability."], ["360 Selections", "Best-for pages with explicit criteria and active catalogue options."]] },
  fr: { title: "Solutions d’objets personnalisés par budget et quantité", description: "Explorez les objets personnalisés par budget, quantité, besoin et occasion avec des critères clairs et le catalogue actif.", back: "Retour à l’accueil", eyebrow: "Recherche commerciale guidée", heading: "Solutions par budget, quantité et besoin", intro: "Si vous connaissez votre budget, la quantité ou le contexte d’utilisation, ces pages vous aident à réduire le catalogue avant la configuration finale.", smartTitle: "Vous préférez décrire votre demande ?", smartText: "Utilisez Smart Merch pour combiner quantité, budget, délai et type de produit.", smart: "Essayer Smart Merch", explore: "Explorer la solution", breadcrumb: "Solutions", bottom: [["Applications", "Welcome kits, événements, congrès, Noël et collaborateurs."], ["Secteurs", "Hôtellerie, universités, startups, santé, restauration et autres secteurs."], ["Guides", "Contenus pour comparer budget, quantité, personnalisation et durabilité."], ["Sélections 360", "Pages de sélection avec critères explicites et produits du catalogue actif."]] },

es: { title: "Soluciones de productos promocionales personalizados por presupuesto y cantidad", description: "Explora regalos personalizados por presupuesto, cantidad, necesidad empresarial y ocasi\u00F3n, con criterios claros y productos del cat\u00E1logo activo.", back: "Volver al inicio", eyebrow: "B\u00FAsqueda guiada para empresas", heading: "Soluciones promocionales por presupuesto, cantidad y necesidad", intro: "Si conoces tu presupuesto, la cantidad necesaria o el contexto del merchandising, estas p\u00E1ginas te ayudan a acotar el cat\u00E1logo antes de la configuraci\u00F3n final.", smartTitle: "\u00BFPrefieres describir tu solicitud?", smartText: "Utiliza Smart Merch para combinar cantidad, presupuesto, plazo y tipo de producto.", smart: "Probar Smart Merch", explore: "Explorar soluci\u00F3n", breadcrumb: "Soluciones", bottom: [["Aplicaciones", "Kits de bienvenida, eventos, congresos, Navidad y programas para empleados."], ["Sectores", "Hosteler\u00EDa, universidades, startups, salud, restauraci\u00F3n y otros sectores."], ["Gu\u00EDas", "Contenidos para comparar presupuesto, cantidad, personalizaci\u00F3n y sostenibilidad."], ["Selecciones 360", "Selecciones por contexto con criterios expl\u00EDcitos y opciones del cat\u00E1logo activo."]] },
de: { title: "L\u00F6sungen f\u00FCr personalisierte Werbeartikel nach Budget und Menge", description: "Entdecken Sie personalisierte Geschenke nach Budget, Menge, Gesch\u00E4ftsbedarf und Anlass mit klaren Kriterien und Produkten aus dem aktiven Katalog.", back: "Zur Startseite", eyebrow: "Gef\u00FChrte Produktsuche f\u00FCr Unternehmen", heading: "Werbeartikell\u00F6sungen nach Budget, Menge und Bedarf", intro: "Wenn Budget, ben\u00F6tigte Menge oder Merchandising-Kontext feststehen, helfen diese Seiten, den Katalog vor der abschlie\u00DFenden Konfiguration einzugrenzen.", smartTitle: "M\u00F6chten Sie Ihre Anfrage lieber beschreiben?", smartText: "Kombinieren Sie mit Smart Merch Menge, Budget, Termin und Produkttyp.", smart: "Smart Merch ausprobieren", explore: "L\u00F6sung ansehen", breadcrumb: "L\u00F6sungen", bottom: [["Einsatzbereiche", "Willkommenspakete, Veranstaltungen, Konferenzen, Weihnachten und Mitarbeiterprogramme."], ["Branchen", "Hotellerie, Hochschulen, Start-ups, Gesundheit, Gastronomie und weitere Branchen."], ["Ratgeber", "Inhalte zum Vergleich von Budget, Menge, Personalisierung und Nachhaltigkeit."], ["360-Auswahl", "Kontextbezogene Auswahlseiten mit klaren Kriterien und Optionen aus dem aktiven Katalog."]] },
it: { title: "Soluzioni di prodotti promozionali personalizzati per budget e quantit\u00E0", description: "Esplora regali personalizzati per budget, quantit\u00E0, esigenze aziendali e occasione, con criteri chiari e prodotti del catalogo attivo.", back: "Torna alla pagina iniziale", eyebrow: "Ricerca guidata per le aziende", heading: "Soluzioni promozionali per budget, quantit\u00E0 ed esigenza", intro: "Se conosci il budget, la quantit\u00E0 necessaria o il contesto del merchandising, queste pagine ti aiutano a restringere il catalogo prima della configurazione finale.", smartTitle: "Preferisci descrivere la tua richiesta?", smartText: "Usa Smart Merch per combinare quantit\u00E0, budget, scadenza e tipo di prodotto.", smart: "Prova Smart Merch", explore: "Esplora la soluzione", breadcrumb: "Soluzioni", bottom: [["Applicazioni", "Kit di benvenuto, eventi, congressi, Natale e programmi per dipendenti."], ["Settori", "Ospitalit\u00E0, universit\u00E0, startup, sanit\u00E0, ristorazione e altri settori."], ["Guide", "Contenuti per confrontare budget, quantit\u00E0, personalizzazione e sostenibilit\u00E0."], ["Selezioni 360", "Selezioni per contesto con criteri espliciti e opzioni del catalogo attivo."]] },
} as const;

const groupCopy = {
  pt: [["Por objetivo comercial", "Brindes para empresas, presentes corporativos, tecnologia, opções premium e personalização com logótipo."], ["Por orçamento unitário", "Comece por referências com preços base dentro de um teto definido."], ["Por quantidade", "Reduza o catálogo a produtos com mínimos compatíveis com o volume pretendido."], ["Por ocasião", "Explore necessidades como clientes, feiras, team building e lançamentos."]],
  en: [["By business objective", "Company gifts, corporate presents, technology, premium options and logo customisation."], ["By unit budget", "Start with products whose base prices fit a defined limit."], ["By quantity", "Narrow the catalogue to products with compatible minimum quantities."], ["By occasion", "Explore needs such as clients, trade shows, team building and launches."]],
  fr: [["Par objectif commercial", "Objets d’entreprise, cadeaux corporate, technologie, options premium et personnalisation avec logo."], ["Par budget unitaire", "Commencez par les références dont le prix de base respecte un plafond."], ["Par quantité", "Limitez le catalogue aux produits dont le minimum est compatible."], ["Par occasion", "Explorez les besoins liés aux clients, salons, team building et lancements."]],

es: [["Por objetivo empresarial", "Regalos para empresas, obsequios corporativos, tecnolog\u00EDa, opciones pr\u00E9mium y personalizaci\u00F3n con logotipo."], ["Por presupuesto unitario", "Empieza por productos cuyos precios base encajen en un l\u00EDmite definido."], ["Por cantidad", "Acota el cat\u00E1logo a los productos con cantidades m\u00EDnimas compatibles."], ["Por ocasi\u00F3n", "Explora necesidades para clientes, ferias, actividades de equipo y lanzamientos."]],
de: [["Nach Gesch\u00E4ftsziel", "Firmengeschenke, Unternehmenspr\u00E4sente, Technologie, Premiumoptionen und Personalisierung mit Logo."], ["Nach St\u00FCckbudget", "Beginnen Sie mit Produkten, deren Grundpreis innerhalb einer festgelegten Grenze liegt."], ["Nach Menge", "Grenzen Sie den Katalog auf Produkte mit passenden Mindestmengen ein."], ["Nach Anlass", "Entdecken Sie Anforderungen f\u00FCr Kunden, Messen, Teambuilding und Produkteinf\u00FChrungen."]],
it: [["Per obiettivo aziendale", "Regali aziendali, omaggi d'impresa, tecnologia, opzioni premium e personalizzazione con logo."], ["Per budget unitario", "Inizia dai prodotti il cui prezzo base rientra in un limite definito."], ["Per quantit\u00E0", "Restringi il catalogo ai prodotti con quantit\u00E0 minime compatibili."], ["Per occasione", "Esplora esigenze per clienti, fiere, team building e lanci."]],
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale(); const t = copy[locale]; const path = localizePath("/solucoes", locale);
  return { title: t.title, description: t.description, alternates: { canonical: path }, openGraph: { type: "website", locale: SITE_LOCALES[locale].htmlLang.replace("-", "_"), title: t.title, description: t.description, url: path } };
}

const GROUP_BASE: Array<{
  group: CommercialLandingGroup;
  icon: typeof BriefcaseBusiness;
}> = [
  { group: "commercial", icon: BriefcaseBusiness }, { group: "budget", icon: BadgeEuro }, { group: "quantity", icon: Boxes }, { group: "occasion", icon: CalendarDays },
];

function getGroups(locale: SiteLocale) { return GROUP_BASE.map((item, index) => ({ ...item, title: groupCopy[locale][index][0], description: groupCopy[locale][index][1] })); }

export default async function CommercialSolutionsPage() {
  const locale = await getCurrentLocale(); const t = copy[locale]; const path = localizePath("/solucoes", locale);
  const structuredData = buildCollectionStructuredData({
    name: t.title, description: t.description, path, breadcrumbLabel: t.breadcrumb,
  });

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <Link
          href={localizePath("/", locale)}
          className="text-sm font-medium text-white/50 transition hover:text-white"
        >
          ← {t.back}
        </Link>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1.35fr_0.65fr] lg:items-start">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#ff7a1a]">
              {t.eyebrow}
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">
              {t.heading}
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-white/65">
              {t.intro}
            </p>
          </div>

          <aside className="rounded-3xl border border-[#ff6a00]/30 bg-[#ff6a00]/10 p-7">
            <Sparkles className="h-6 w-6 text-[#ff9b57]" />
            <h2 className="mt-4 text-xl font-semibold">{t.smartTitle}</h2>
            <p className="mt-3 text-sm leading-6 text-white/65">
              {t.smartText}
            </p>
            <Link
              href={localizePath("/smart-merch", locale)}
              className="mt-5 inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-100"
            >
              {t.smart}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </aside>
        </div>

        <div className="mt-14 space-y-12">
          {getGroups(locale).map((groupConfig) => {
            const pages = getCommercialPagesByGroup(groupConfig.group, locale);
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
                      href={localizePath(`/solucoes/${page.slug}`, locale)}
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
                        {t.explore}
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
          {t.bottom.map(([title, description], index) => {
            const paths = ["/aplicacoes", "/industrias", "/guias", "/selecoes"];
            return <Link key={title} href={localizePath(paths[index], locale)} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition hover:bg-white/[0.07]"><h2 className="text-lg font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-white/55">{description}</p></Link>;
          })}
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
    </main>
  );
}
