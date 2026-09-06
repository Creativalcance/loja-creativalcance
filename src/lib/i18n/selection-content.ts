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
} as const;

export function localizeSelectionConfig(config: SelectionConfig, locale: SiteLocale): SelectionConfig {
  if (locale === "pt") return config;
  const en = locale === "en";
  const name = names[locale][config.slug as keyof typeof names.en] ?? config.h1;
  return {
    ...config,
    title: name,
    h1: name,
    description: en ? `A criteria-led selection of ${name.toLowerCase()}, based on the active catalogue rather than artificial rankings.` : `Sélection de ${name.toLowerCase()} fondée sur des critères et le catalogue actif, sans classement artificiel.`,
    eyebrow: en ? "360 Selection · Transparent criteria" : "Sélection 360 · Critères transparents",
    intro: en ? "There is no universally best promotional product. The right option depends on the recipient, purpose, real use, quantity, budget, deadline and compatible customisation." : "Il n’existe pas d’objet publicitaire universellement meilleur. Le bon choix dépend du destinataire, de l’objectif, de l’usage, de la quantité, du budget, du délai et de la personnalisation compatible.",
    methodology: en ? "Products come from the active catalogue using relevant search terms. Stock and catalogue prominence influence their order, but this is not an absolute quality ranking." : "Les produits proviennent du catalogue actif à partir de termes pertinents. Le stock et les mises en avant influencent l’ordre, sans constituer un classement absolu de qualité.",
    criteria: en ? ["Likely usefulness for the recipient", "Compatible customisation", "Current stock and availability", "Fit with the intended context", "Budget, quantity and delivery timing"] : ["Utilité probable pour le destinataire", "Personnalisation compatible", "Stock et disponibilité actuels", "Adéquation au contexte prévu", "Budget, quantité et délai de livraison"],
    faq: en ? [
      { question: "Is this an absolute product ranking?", answer: "No. It is a selection based on explicit criteria and current catalogue data." },
      { question: "What should I confirm before ordering?", answer: "Confirm stock, minimum quantity, price, variant, materials, customisation and delivery time." },
      { question: "Can the best option change?", answer: "Yes. It changes with the audience, objective, quantity, budget, deadline and available stock." },
    ] : [
      { question: "S’agit-il d’un classement absolu ?", answer: "Non. Il s’agit d’une sélection fondée sur des critères explicites et les données actuelles du catalogue." },
      { question: "Que faut-il confirmer avant de commander ?", answer: "Confirmez le stock, la quantité minimale, le prix, la variante, les matériaux, la personnalisation et le délai." },
      { question: "La meilleure option peut-elle changer ?", answer: "Oui. Elle varie selon le public, l’objectif, la quantité, le budget, le délai et le stock." },
    ],
    relatedSolutionLabel: en ? "View the related business solution" : "Voir la solution commerciale associée",
  };
}
