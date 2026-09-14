import type { SiteLocale } from "@/lib/i18n/config";
import type { SelectionConfig } from "@/lib/seo/selection-pages";

const names = {
  en: {
    "melhores-brindes-para-empresas": "Best promotional products for companies: criteria and options",
    "melhores-brindes-para-eventos": "Best promotional products for events: criteria and options",
    "melhores-brindes-para-congressos": "Best promotional products for conferences: criteria and options",
    "melhores-brindes-para-colaboradores": "Best employee gifts: usefulness, culture and recognition",
    "melhores-brindes-sustentaveis": "Best sustainable promotional products: comparison criteria",
    "melhores-brindes-tecnologicos": "Best tech gifts: usefulness, specifications and context",
  },
  fr: {
    "melhores-brindes-para-empresas": "Meilleurs objets publicitaires pour entreprises : critères et options",
    "melhores-brindes-para-eventos": "Meilleurs objets publicitaires pour événements : critères et options",
    "melhores-brindes-para-congressos": "Meilleurs objets publicitaires pour congrès : critères et options",
    "melhores-brindes-para-colaboradores": "Meilleurs cadeaux pour collaborateurs : utilité et reconnaissance",
    "melhores-brindes-sustentaveis": "Meilleurs objets publicitaires durables : critères de comparaison",
    "melhores-brindes-tecnologicos": "Meilleurs cadeaux technologiques : utilité et spécifications",
  },

es: {
    "melhores-brindes-para-empresas": "Los mejores productos promocionales para empresas: criterios y opciones",
    "melhores-brindes-para-eventos": "Los mejores productos promocionales para eventos: criterios y opciones",
    "melhores-brindes-para-congressos": "Los mejores productos promocionales para congresos: criterios y opciones",
    "melhores-brindes-para-colaboradores": "Los mejores regalos para empleados: utilidad, cultura y reconocimiento",
    "melhores-brindes-sustentaveis": "Los mejores productos promocionales sostenibles: criterios de comparaci\u00F3n",
    "melhores-brindes-tecnologicos": "Los mejores regalos tecnol\u00F3gicos: utilidad, especificaciones y contexto",
},
de: {
    "melhores-brindes-para-empresas": "Die besten Werbeartikel f\u00FCr Unternehmen: Kriterien und Optionen",
    "melhores-brindes-para-eventos": "Die besten Werbeartikel f\u00FCr Veranstaltungen: Kriterien und Optionen",
    "melhores-brindes-para-congressos": "Die besten Werbeartikel f\u00FCr Konferenzen: Kriterien und Optionen",
    "melhores-brindes-para-colaboradores": "Die besten Mitarbeitergeschenke: Nutzen, Kultur und Anerkennung",
    "melhores-brindes-sustentaveis": "Die besten nachhaltigen Werbeartikel: Vergleichskriterien",
    "melhores-brindes-tecnologicos": "Die besten Technikgeschenke: Nutzen, Spezifikationen und Kontext",
},
it: {
    "melhores-brindes-para-empresas": "I migliori prodotti promozionali per aziende: criteri e opzioni",
    "melhores-brindes-para-eventos": "I migliori prodotti promozionali per eventi: criteri e opzioni",
    "melhores-brindes-para-congressos": "I migliori prodotti promozionali per congressi: criteri e opzioni",
    "melhores-brindes-para-colaboradores": "I migliori regali per dipendenti: utilit\u00E0, cultura e riconoscimento",
    "melhores-brindes-sustentaveis": "I migliori prodotti promozionali sostenibili: criteri di confronto",
    "melhores-brindes-tecnologicos": "I migliori regali tecnologici: utilit\u00E0, specifiche e contesto",
},
} as const;

export function localizeSelectionConfig(config: SelectionConfig, locale: SiteLocale): SelectionConfig {
  if (locale === "pt") return config;
  const en = locale === "en";
  const name = names[locale][config.slug as keyof typeof names.en] ?? config.h1;
  return {
    ...config,
    title: name,
    h1: name,
    description: (locale === "es" ? (`Una selecci\u00F3n de ${name.toLowerCase()} con criterios claros, basada en el cat\u00E1logo activo y sin clasificaciones artificiales.`) : locale === "de" ? (`Eine kriterienbasierte Auswahl zu ${name.toLowerCase()}, gest\u00FCtzt auf den aktiven Katalog statt auf k\u00FCnstliche Ranglisten.`) : locale === "it" ? (`Una selezione di ${name.toLowerCase()} guidata da criteri chiari, basata sul catalogo attivo e non su classifiche artificiali.`) : en ? `A criteria-led selection of ${name.toLowerCase()}, based on the active catalogue rather than artificial rankings.` : `Sélection de ${name.toLowerCase()} fondée sur des critères et le catalogue actif, sans classement artificiel.`),
    eyebrow: (locale === "es" ? ("Selecci\u00F3n 360 \u00B7 Criterios transparentes") : locale === "de" ? ("360-Auswahl \u00B7 Transparente Kriterien") : locale === "it" ? ("Selezione 360 \u00B7 Criteri trasparenti") : en ? "360 Selection · Transparent criteria" : "Sélection 360 · Critères transparents"),
    intro: (locale === "es" ? ("No existe un producto promocional universalmente mejor. La opci\u00F3n adecuada depende del destinatario, objetivo, uso real, cantidad, presupuesto, plazo y personalizaci\u00F3n compatible.") : locale === "de" ? ("Es gibt keinen universell besten Werbeartikel. Die passende Option h\u00E4ngt von Empf\u00E4nger, Zweck, tats\u00E4chlicher Nutzung, Menge, Budget, Termin und kompatibler Personalisierung ab.") : locale === "it" ? ("Non esiste un prodotto promozionale universalmente migliore. L'opzione giusta dipende da destinatario, scopo, uso reale, quantit\u00E0, budget, scadenza e personalizzazione compatibile.") : en ? "There is no universally best promotional product. The right option depends on the recipient, purpose, real use, quantity, budget, deadline and compatible customisation." : "Il n’existe pas d’objet publicitaire universellement meilleur. Le bon choix dépend du destinataire, de l’objectif, de l’usage, de la quantité, du budget, du délai et de la personnalisation compatible."),
    methodology: (locale === "es" ? ("Los productos proceden del cat\u00E1logo activo mediante t\u00E9rminos de b\u00FAsqueda relevantes. El stock y la visibilidad en el cat\u00E1logo influyen en el orden, pero no constituyen una clasificaci\u00F3n absoluta de calidad.") : locale === "de" ? ("Die Produkte werden anhand relevanter Suchbegriffe aus dem aktiven Katalog ausgew\u00E4hlt. Bestand und Hervorhebung im Katalog beeinflussen die Reihenfolge, bilden aber keine absolute Qualit\u00E4tsrangliste.") : locale === "it" ? ("I prodotti provengono dal catalogo attivo attraverso termini di ricerca pertinenti. Disponibilit\u00E0 e visibilit\u00E0 nel catalogo influenzano l'ordine, ma non costituiscono una classifica assoluta di qualit\u00E0.") : en ? "Products come from the active catalogue using relevant search terms. Stock and catalogue prominence influence their order, but this is not an absolute quality ranking." : "Les produits proviennent du catalogue actif à partir de termes pertinents. Le stock et les mises en avant influencent l’ordre, sans constituer un classement absolu de qualité."),
    criteria: (locale === "es" ? (["Utilidad probable para el destinatario", "Personalizaci\u00F3n compatible", "Stock y disponibilidad actuales", "Adecuaci\u00F3n al contexto previsto", "Presupuesto, cantidad y plazo de entrega"]) : locale === "de" ? (["Voraussichtlicher Nutzen f\u00FCr den Empf\u00E4nger", "Kompatible Personalisierung", "Aktueller Bestand und Verf\u00FCgbarkeit", "Eignung f\u00FCr den vorgesehenen Kontext", "Budget, Menge und Liefertermin"]) : locale === "it" ? (["Probabile utilit\u00E0 per il destinatario", "Personalizzazione compatibile", "Scorte e disponibilit\u00E0 attuali", "Adeguatezza al contesto previsto", "Budget, quantit\u00E0 e tempi di consegna"]) : en ? ["Likely usefulness for the recipient", "Compatible customisation", "Current stock and availability", "Fit with the intended context", "Budget, quantity and delivery timing"] : ["Utilité probable pour le destinataire", "Personnalisation compatible", "Stock et disponibilité actuels", "Adéquation au contexte prévu", "Budget, quantité et délai de livraison"]),
    faq: (locale === "es" ? ([
    { question: "\u00BFEs una clasificaci\u00F3n absoluta de productos?", answer: "No. Es una selecci\u00F3n basada en criterios expl\u00EDcitos y datos actuales del cat\u00E1logo." },
    { question: "\u00BFQu\u00E9 debo confirmar antes de comprar?", answer: "Confirma stock, cantidad m\u00EDnima, precio, variante, materiales, personalizaci\u00F3n y plazo de entrega." },
    { question: "\u00BFPuede cambiar la mejor opci\u00F3n?", answer: "S\u00ED. Cambia con el p\u00FAblico, objetivo, cantidad, presupuesto, plazo y stock disponible." },
]) : locale === "de" ? ([
    { question: "Ist dies eine absolute Produktrangliste?", answer: "Nein. Es handelt sich um eine Auswahl anhand klarer Kriterien und aktueller Katalogdaten." },
    { question: "Was sollte ich vor der Bestellung best\u00E4tigen?", answer: "Best\u00E4tigen Sie Bestand, Mindestmenge, Preis, Variante, Materialien, Personalisierung und Lieferzeit." },
    { question: "Kann sich die beste Option \u00E4ndern?", answer: "Ja. Sie \u00E4ndert sich mit Zielgruppe, Ziel, Menge, Budget, Termin und verf\u00FCgbarem Bestand." },
]) : locale === "it" ? ([
    { question: "\u00C8 una classifica assoluta dei prodotti?", answer: "No. \u00C8 una selezione basata su criteri espliciti e dati aggiornati del catalogo." },
    { question: "Cosa devo confermare prima di ordinare?", answer: "Conferma disponibilit\u00E0, quantit\u00E0 minima, prezzo, variante, materiali, personalizzazione e tempi di consegna." },
    { question: "L'opzione migliore pu\u00F2 cambiare?", answer: "S\u00EC. Cambia con pubblico, obiettivo, quantit\u00E0, budget, scadenza e disponibilit\u00E0." },
]) : en ? [
      { question: "Is this an absolute product ranking?", answer: "No. It is a selection based on explicit criteria and current catalogue data." },
      { question: "What should I confirm before ordering?", answer: "Confirm stock, minimum quantity, price, variant, materials, customisation and delivery time." },
      { question: "Can the best option change?", answer: "Yes. It changes with the audience, objective, quantity, budget, deadline and available stock." },
    ] : [
      { question: "S’agit-il d’un classement absolu ?", answer: "Non. Il s’agit d’une sélection fondée sur des critères explicites et les données actuelles du catalogue." },
      { question: "Que faut-il confirmer avant de commander ?", answer: "Confirmez le stock, la quantité minimale, le prix, la variante, les matériaux, la personnalisation et le délai." },
      { question: "La meilleure option peut-elle changer ?", answer: "Oui. Elle varie selon le public, l’objectif, la quantité, le budget, le délai et le stock." },
    ]),
    relatedSolutionLabel: (locale === "es" ? ("Ver la soluci\u00F3n empresarial relacionada") : locale === "de" ? ("Passende Unternehmensl\u00F6sung ansehen") : locale === "it" ? ("Vedi la soluzione aziendale correlata") : en ? "View the related business solution" : "Voir la solution commerciale associée"),
  };
}
