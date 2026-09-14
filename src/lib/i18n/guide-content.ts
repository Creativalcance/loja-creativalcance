import type { SiteLocale } from "@/lib/i18n/config";
import type { GuideConfig } from "@/lib/seo/guide-pages";

const names = {
  en: {
    "como-escolher-brindes-personalizados-empresas": "How to choose custom promotional products for companies",
    "merchandising-corporativo-guia": "Corporate merchandise: how to turn products into brand experiences",
    "welcome-kit-empresarial": "Employee welcome kits: what to include and how to plan",
    "brindes-ecologicos-sustentaveis": "Eco-friendly promotional products: how to compare them",
    "brindes-para-eventos-guia": "Promotional products for events: how to choose, quantify and plan",
    "como-planear-merchandising-por-orcamento": "How to plan merchandise by budget and quantity",
  },
  fr: {
    "como-escolher-brindes-personalizados-empresas": "Comment choisir des objets publicitaires personnalisés pour les entreprises",
    "merchandising-corporativo-guia": "Merchandising d’entreprise : transformer les produits en expérience de marque",
    "welcome-kit-empresarial": "Welcome kit d’entreprise : contenu et planification",
    "brindes-ecologicos-sustentaveis": "Objets publicitaires écologiques : comment les comparer",
    "brindes-para-eventos-guia": "Objets publicitaires pour événements : choix, quantité et planification",
    "como-planear-merchandising-por-orcamento": "Planifier le merchandising selon le budget et la quantité",
  },

es: {
    "como-escolher-brindes-personalizados-empresas": "C\u00F3mo elegir productos promocionales personalizados para empresas",
    "merchandising-corporativo-guia": "Merchandising corporativo: c\u00F3mo convertir productos en experiencias de marca",
    "welcome-kit-empresarial": "Kits de bienvenida para empleados: qu\u00E9 incluir y c\u00F3mo planificar",
    "brindes-ecologicos-sustentaveis": "Productos promocionales ecol\u00F3gicos: c\u00F3mo compararlos",
    "brindes-para-eventos-guia": "Productos promocionales para eventos: c\u00F3mo elegir, cuantificar y planificar",
    "como-planear-merchandising-por-orcamento": "C\u00F3mo planificar merchandising seg\u00FAn presupuesto y cantidad",
},
de: {
    "como-escolher-brindes-personalizados-empresas": "So w\u00E4hlen Sie personalisierte Werbeartikel f\u00FCr Unternehmen",
    "merchandising-corporativo-guia": "Unternehmensmerchandising: Produkte in Markenerlebnisse verwandeln",
    "welcome-kit-empresarial": "Willkommenspakete f\u00FCr Mitarbeitende: Inhalt und Planung",
    "brindes-ecologicos-sustentaveis": "Umweltfreundliche Werbeartikel: So vergleichen Sie sie",
    "brindes-para-eventos-guia": "Werbeartikel f\u00FCr Veranstaltungen: Auswahl, Mengen und Planung",
    "como-planear-merchandising-por-orcamento": "Merchandising nach Budget und Menge planen",
},
it: {
    "como-escolher-brindes-personalizados-empresas": "Come scegliere prodotti promozionali personalizzati per aziende",
    "merchandising-corporativo-guia": "Merchandising aziendale: trasformare i prodotti in esperienze di marca",
    "welcome-kit-empresarial": "Kit di benvenuto per dipendenti: cosa includere e come pianificare",
    "brindes-ecologicos-sustentaveis": "Prodotti promozionali ecologici: come confrontarli",
    "brindes-para-eventos-guia": "Prodotti promozionali per eventi: come scegliere, quantificare e pianificare",
    "como-planear-merchandising-por-orcamento": "Come pianificare il merchandising per budget e quantit\u00E0",
},
} as const;

export function localizeGuideConfig(config: GuideConfig, locale: SiteLocale): GuideConfig {
  if (locale === "pt") return config;
  const en = locale === "en";
  const name = names[locale][config.slug as keyof typeof names.en] ?? config.h1;
  return {
    ...config,
    title: name,
    h1: name,
    description: (locale === "es" ? (`Gu\u00EDa pr\u00E1ctica sobre ${name.toLowerCase()}, con objetivos, p\u00FAblico, cantidad, presupuesto, plazos y personalizaci\u00F3n.`) : locale === "de" ? (`Ein praktischer Ratgeber zu ${name.toLowerCase()} mit Zielen, Zielgruppe, Menge, Budget, Terminen und Personalisierung.`) : locale === "it" ? (`Guida pratica su ${name.toLowerCase()}, con obiettivi, pubblico, quantit\u00E0, budget, tempi e personalizzazione.`) : en ? `A practical guide to ${name.toLowerCase()}, covering objectives, audience, quantity, budget, timing and customisation.` : `Guide pratique pour ${name.toLowerCase()}, avec objectifs, public, quantité, budget, délais et personnalisation.`),
    eyebrow: (locale === "es" ? ("Gu\u00EDa pr\u00E1ctica \u00B7 360 Merchandising") : locale === "de" ? ("Praktischer Ratgeber \u00B7 360 Merchandising") : locale === "it" ? ("Guida pratica \u00B7 360 Merchandising") : en ? "Practical guide · 360 Merchandising" : "Guide pratique · 360 Merchandising"),
    intro: (locale === "es" ? ("Una selecci\u00F3n \u00FAtil empieza por la necesidad, no por el producto. Define el objetivo, destinatario, contexto, presupuesto, cantidad y plazo antes de comparar referencias y personalizaciones.") : locale === "de" ? ("Eine sinnvolle Auswahl beginnt mit dem Bedarf, nicht mit dem Produkt. Definieren Sie Ziel, Empf\u00E4nger, Kontext, Budget, Menge und Termin, bevor Sie Referenzen und Personalisierung vergleichen.") : locale === "it" ? ("Una selezione utile inizia dall'esigenza, non dal prodotto. Definisci obiettivo, destinatario, contesto, budget, quantit\u00E0 e scadenza prima di confrontare riferimenti e personalizzazioni.") : en ? "A useful selection begins with the requirement, not the product. Define the objective, recipient, context, budget, quantity and deadline before comparing references and customisation options." : "Une sélection utile commence par le besoin, pas par le produit. Définissez l’objectif, le destinataire, le contexte, le budget, la quantité et le délai avant de comparer les références et la personnalisation."),
    takeaways: (locale === "es" ? (["Define primero el objetivo y el p\u00FAblico", "Compara juntos los costes de producto y personalizaci\u00F3n", "Confirma stock y plazo", "Prioriza la utilidad y la coherencia de marca"]) : locale === "de" ? (["Zuerst Ziel und Zielgruppe festlegen", "Produkt- und Personalisierungskosten gemeinsam vergleichen", "Bestand und Lieferzeit best\u00E4tigen", "Nutzen und Markenkonsistenz priorisieren"]) : locale === "it" ? (["Definisci prima obiettivo e pubblico", "Confronta insieme i costi di prodotto e personalizzazione", "Conferma disponibilit\u00E0 e tempi", "Dai priorit\u00E0 all'utilit\u00E0 e alla coerenza del marchio"]) : en ? ["Define the objective and audience first", "Compare product and customisation costs together", "Confirm stock and lead time", "Prioritise usefulness and brand consistency"] : ["Définir d’abord l’objectif et le public", "Comparer ensemble produit et personnalisation", "Confirmer le stock et le délai", "Privilégier l’utilité et la cohérence de marque"]),
    sections: (locale === "es" ? ([
    { title: "1. Define el objetivo", text: "Aclara qu\u00E9 comportamiento o experiencia debe apoyar el merchandising y en qu\u00E9 contexto se entregar\u00E1." },
    { title: "2. Fija presupuesto, cantidad y plazo", text: "Compara el coste por persona y la inversi\u00F3n total, reservando tiempo para selecci\u00F3n, aprobaci\u00F3n del dise\u00F1o, producci\u00F3n y env\u00EDo." },
    { title: "3. Adapta el producto al destinatario", text: "La utilidad, el contexto y la calidad percibida ayudan a reducir desperdicios y aumentan la probabilidad de uso del producto." },
    { title: "4. Valida la personalizaci\u00F3n", text: "Confirma el componente, ubicaci\u00F3n, \u00E1rea de impresi\u00F3n, t\u00E9cnica y n\u00FAmero de colores compatibles antes de comprar." },
]) : locale === "de" ? ([
    { title: "1. Ziel festlegen", text: "Kl\u00E4ren Sie, welches Verhalten oder Erlebnis das Merchandising unterst\u00FCtzen soll und in welchem Kontext es \u00FCbergeben wird." },
    { title: "2. Budget, Menge und Termin festlegen", text: "Vergleichen Sie Kosten pro Person und Gesamtinvestition. Planen Sie Zeit f\u00FCr Auswahl, Druckfreigabe, Produktion und Versand ein." },
    { title: "3. Produkt auf den Empf\u00E4nger abstimmen", text: "Nutzen, Kontext und wahrgenommene Qualit\u00E4t helfen, Verschwendung zu verringern und die Nutzung des Produkts wahrscheinlicher zu machen." },
    { title: "4. Personalisierung pr\u00FCfen", text: "Best\u00E4tigen Sie vor der Bestellung kompatible Komponente, Position, Druckfl\u00E4che, Technik und Farbanzahl." },
]) : locale === "it" ? ([
    { title: "1. Definisci l'obiettivo", text: "Chiarisci il comportamento o l'esperienza che il merchandising deve favorire e il contesto in cui verr\u00E0 ricevuto." },
    { title: "2. Definisci budget, quantit\u00E0 e tempi", text: "Confronta costo per persona e investimento totale, prevedendo tempo per scelta, approvazione della grafica, produzione e spedizione." },
    { title: "3. Abbina il prodotto al destinatario", text: "Utilit\u00E0, contesto e qualit\u00E0 percepita aiutano a ridurre gli sprechi e aumentano la probabilit\u00E0 che il prodotto venga usato." },
    { title: "4. Verifica la personalizzazione", text: "Conferma componente, posizione, area di stampa, tecnica e numero di colori compatibili prima di ordinare." },
]) : en ? [
      { title: "1. Define the objective", text: "Clarify the behaviour or experience the merchandise should support and the context in which it will be received." },
      { title: "2. Set budget, quantity and timing", text: "Compare cost per person and total investment, allowing time for selection, artwork approval, production and shipping." },
      { title: "3. Match the product to the recipient", text: "Usefulness, context and perceived quality help reduce waste and increase the likelihood that the product will be used." },
      { title: "4. Validate customisation", text: "Confirm the compatible component, location, print area, technique and number of colours before ordering." },
    ] : [
      { title: "1. Définissez l’objectif", text: "Précisez le comportement ou l’expérience que le merchandising doit soutenir et son contexte de remise." },
      { title: "2. Fixez le budget, la quantité et le délai", text: "Comparez le coût par personne et l’investissement total, en prévoyant la sélection, la validation, la production et l’expédition." },
      { title: "3. Adaptez le produit au destinataire", text: "L’utilité, le contexte et la qualité perçue limitent le gaspillage et augmentent les chances d’utilisation." },
      { title: "4. Validez la personnalisation", text: "Confirmez le composant, l’emplacement, la zone, la technique et le nombre de couleurs avant de commander." },
    ]),
    faq: (locale === "es" ? ([
    { question: "\u00BFHay un producto ideal para todas las empresas?", answer: "No. El producto adecuado depende del objetivo, destinatario, presupuesto, cantidad, plazo y contexto." },
    { question: "\u00BFDebo definir primero el presupuesto?", answer: "S\u00ED. Un rango objetivo por unidad y la cantidad prevista hacen m\u00E1s eficiente la comparaci\u00F3n." },
    { question: "\u00BFCu\u00E1ndo debe confirmarse el stock?", answer: "Antes de finalizar la personalizaci\u00F3n y con antelaci\u00F3n suficiente para producir y enviar." },
]) : locale === "de" ? ([
    { question: "Gibt es ein bestes Produkt f\u00FCr jedes Unternehmen?", answer: "Nein. Das passende Produkt h\u00E4ngt von Ziel, Empf\u00E4nger, Budget, Menge, Termin und Kontext ab." },
    { question: "Sollte ich zuerst das Budget festlegen?", answer: "Ja. Eine Zielspanne pro St\u00FCck und die geplante Menge erleichtern den Produktvergleich." },
    { question: "Wann sollte der Bestand best\u00E4tigt werden?", answer: "Vor Abschluss der Personalisierung und rechtzeitig f\u00FCr Produktion und Versand." },
]) : locale === "it" ? ([
    { question: "Esiste un prodotto ideale per ogni azienda?", answer: "No. Il prodotto giusto dipende da obiettivo, destinatario, budget, quantit\u00E0, scadenza e contesto." },
    { question: "Devo definire prima il budget?", answer: "S\u00EC. Una fascia obiettivo per unit\u00E0 e la quantit\u00E0 prevista rendono il confronto pi\u00F9 efficiente." },
    { question: "Quando va confermata la disponibilit\u00E0?", answer: "Prima di finalizzare la personalizzazione e con sufficiente anticipo per produzione e spedizione." },
]) : en ? [
      { question: "Is there one best product for every company?", answer: "No. The right product depends on the objective, recipient, budget, quantity, deadline and context." },
      { question: "Should I define the budget first?", answer: "Yes. A target range per unit and the expected quantity make product comparison more efficient." },
      { question: "When should stock be confirmed?", answer: "Before finalising customisation and early enough to allow production and shipping." },
    ] : [
      { question: "Existe-t-il un produit idéal pour toutes les entreprises ?", answer: "Non. Le bon choix dépend de l’objectif, du destinataire, du budget, de la quantité, du délai et du contexte." },
      { question: "Faut-il commencer par définir le budget ?", answer: "Oui. Une fourchette par unité et la quantité prévue rendent la comparaison plus efficace." },
      { question: "Quand faut-il confirmer le stock ?", answer: "Avant de finaliser la personnalisation et suffisamment tôt pour la production et l’expédition." },
    ]),
  };
}
