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
} as const;

export function localizeGuideConfig(config: GuideConfig, locale: SiteLocale): GuideConfig {
  if (locale === "pt") return config;
  const en = locale === "en";
  const name = names[locale][config.slug as keyof typeof names.en] ?? config.h1;
  return {
    ...config,
    title: name,
    h1: name,
    description: en ? `A practical guide to ${name.toLowerCase()}, covering objectives, audience, quantity, budget, timing and customisation.` : `Guide pratique pour ${name.toLowerCase()}, avec objectifs, public, quantité, budget, délais et personnalisation.`,
    eyebrow: en ? "Practical guide · 360 Merchandising" : "Guide pratique · 360 Merchandising",
    intro: en ? "A useful selection begins with the requirement, not the product. Define the objective, recipient, context, budget, quantity and deadline before comparing references and customisation options." : "Une sélection utile commence par le besoin, pas par le produit. Définissez l’objectif, le destinataire, le contexte, le budget, la quantité et le délai avant de comparer les références et la personnalisation.",
    takeaways: en ? ["Define the objective and audience first", "Compare product and customisation costs together", "Confirm stock and lead time", "Prioritise usefulness and brand consistency"] : ["Définir d’abord l’objectif et le public", "Comparer ensemble produit et personnalisation", "Confirmer le stock et le délai", "Privilégier l’utilité et la cohérence de marque"],
    sections: en ? [
      { title: "1. Define the objective", text: "Clarify the behaviour or experience the merchandise should support and the context in which it will be received." },
      { title: "2. Set budget, quantity and timing", text: "Compare cost per person and total investment, allowing time for selection, artwork approval, production and shipping." },
      { title: "3. Match the product to the recipient", text: "Usefulness, context and perceived quality help reduce waste and increase the likelihood that the product will be used." },
      { title: "4. Validate customisation", text: "Confirm the compatible component, location, print area, technique and number of colours before ordering." },
    ] : [
      { title: "1. Définissez l’objectif", text: "Précisez le comportement ou l’expérience que le merchandising doit soutenir et son contexte de remise." },
      { title: "2. Fixez le budget, la quantité et le délai", text: "Comparez le coût par personne et l’investissement total, en prévoyant la sélection, la validation, la production et l’expédition." },
      { title: "3. Adaptez le produit au destinataire", text: "L’utilité, le contexte et la qualité perçue limitent le gaspillage et augmentent les chances d’utilisation." },
      { title: "4. Validez la personnalisation", text: "Confirmez le composant, l’emplacement, la zone, la technique et le nombre de couleurs avant de commander." },
    ],
    faq: en ? [
      { question: "Is there one best product for every company?", answer: "No. The right product depends on the objective, recipient, budget, quantity, deadline and context." },
      { question: "Should I define the budget first?", answer: "Yes. A target range per unit and the expected quantity make product comparison more efficient." },
      { question: "When should stock be confirmed?", answer: "Before finalising customisation and early enough to allow production and shipping." },
    ] : [
      { question: "Existe-t-il un produit idéal pour toutes les entreprises ?", answer: "Non. Le bon choix dépend de l’objectif, du destinataire, du budget, de la quantité, du délai et du contexte." },
      { question: "Faut-il commencer par définir le budget ?", answer: "Oui. Une fourchette par unité et la quantité prévue rendent la comparaison plus efficace." },
      { question: "Quand faut-il confirmer le stock ?", answer: "Avant de finaliser la personnalisation et suffisamment tôt pour la production et l’expédition." },
    ],
  };
}
