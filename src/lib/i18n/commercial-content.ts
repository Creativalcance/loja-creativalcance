import type { SiteLocale } from "@/lib/i18n/config";
import type { CommercialLandingConfig } from "@/lib/seo/commercial-pages";

const names = {
  en: {
    "brindes-para-empresas": "Custom promotional products for companies",
    "brindes-com-logotipo": "Promotional products with your logo",
    "brindes-ecologicos": "Eco-friendly promotional products",
    "brindes-tecnologicos": "Custom tech gifts",
    "brindes-premium": "Premium corporate gifts",
    "presentes-corporativos": "Custom corporate gifts",
    "brindes-personalizados-ate-5-euros": "Custom gifts up to €5 per unit",
    "brindes-personalizados-ate-10-euros": "Custom gifts up to €10 per unit",
    "brindes-personalizados-ate-20-euros": "Custom gifts up to €20 per unit",
    "brindes-para-50-unidades": "Custom gifts for orders of 50 units",
    "brindes-para-100-unidades": "Custom gifts for orders of 100 units",
    "brindes-para-250-unidades": "Custom gifts for orders of 250 units",
    "brindes-para-500-unidades": "Custom gifts for orders of 500 units",
    "brindes-para-1000-unidades": "Custom gifts for orders of 1,000 units",
    "brindes-para-clientes": "Custom gifts for clients and loyalty",
    "brindes-para-feiras": "Custom gifts for trade shows",
    "brindes-para-team-building": "Custom gifts for team building",
    "brindes-para-lancamento-produto": "Custom merchandise for product launches",
  },
  fr: {
    "brindes-para-empresas": "Objets publicitaires personnalisés pour entreprises",
    "brindes-com-logotipo": "Objets publicitaires avec votre logo",
    "brindes-ecologicos": "Objets publicitaires écologiques",
    "brindes-tecnologicos": "Cadeaux technologiques personnalisés",
    "brindes-premium": "Cadeaux d’entreprise premium",
    "presentes-corporativos": "Cadeaux d’entreprise personnalisés",
    "brindes-personalizados-ate-5-euros": "Cadeaux personnalisés jusqu’à 5 € par unité",
    "brindes-personalizados-ate-10-euros": "Cadeaux personnalisés jusqu’à 10 € par unité",
    "brindes-personalizados-ate-20-euros": "Cadeaux personnalisés jusqu’à 20 € par unité",
    "brindes-para-50-unidades": "Cadeaux personnalisés pour 50 unités",
    "brindes-para-100-unidades": "Cadeaux personnalisés pour 100 unités",
    "brindes-para-250-unidades": "Cadeaux personnalisés pour 250 unités",
    "brindes-para-500-unidades": "Cadeaux personnalisés pour 500 unités",
    "brindes-para-1000-unidades": "Cadeaux personnalisés pour 1 000 unités",
    "brindes-para-clientes": "Cadeaux personnalisés pour clients et fidélisation",
    "brindes-para-feiras": "Objets publicitaires pour salons professionnels",
    "brindes-para-team-building": "Cadeaux personnalisés pour le team building",
    "brindes-para-lancamento-produto": "Merchandising pour lancements de produits",
  },
} as const;

const groupNames = {
  en: { commercial: "Business solutions", budget: "Solutions by budget", quantity: "Solutions by quantity", occasion: "Solutions by occasion" },
  fr: { commercial: "Solutions d’entreprise", budget: "Solutions par budget", quantity: "Solutions par quantité", occasion: "Solutions par occasion" },
} as const;

export function localizeCommercialConfig(config: CommercialLandingConfig, locale: SiteLocale): CommercialLandingConfig {
  if (locale === "pt") return config;
  const en = locale === "en";
  const name = names[locale][config.slug as keyof typeof names.en] ?? config.h1;
  return {
    ...config,
    title: name,
    h1: name,
    description: en ? `Explore ${name.toLowerCase()} using live catalogue data, quantity, budget and customisation criteria.` : `Découvrez ${name.toLowerCase()} à partir du catalogue actif, de la quantité, du budget et des critères de personnalisation.`,
    eyebrow: groupNames[locale][config.group],
    intro: en ? "Use this selection to narrow down the active catalogue according to your business goal. Compare the intended recipient, real use, quantity, budget and delivery date before choosing a product." : "Utilisez cette sélection pour réduire le catalogue actif selon votre objectif. Comparez le destinataire, l’usage réel, la quantité, le budget et la date de livraison avant de choisir.",
    sections: en ? [
      { title: "Start with the objective", text: "Define the audience, context and result you want before comparing individual products." },
      { title: "Compare the full configuration", text: "Review minimum quantities, stock, price tiers, materials, variants and available customisation for each reference." },
      { title: "Confirm before ordering", text: "Validate artwork, print area, technique, final price and lead time for the selected combination." },
    ] : [
      { title: "Commencez par l’objectif", text: "Définissez le public, le contexte et le résultat attendu avant de comparer les produits." },
      { title: "Comparez la configuration complète", text: "Vérifiez les quantités minimales, le stock, les tarifs, les matériaux, les variantes et la personnalisation disponible." },
      { title: "Confirmez avant de commander", text: "Validez le fichier, la zone, la technique, le prix final et le délai pour la combinaison choisie." },
    ],
    highlights: en ? ["Active catalogue products", "Clear quantity and budget criteria", "Compatible customisation options", "Final validation before production"] : ["Produits du catalogue actif", "Critères clairs de quantité et de budget", "Options de personnalisation compatibles", "Validation finale avant production"],
    selectionNote: en ? "The products shown are an initial catalogue selection. Confirm stock, minimum quantity, price and final customisation on the product page." : "Les produits affichés constituent une première sélection. Confirmez le stock, la quantité minimale, le prix et la personnalisation finale sur la page produit.",
  };
}
