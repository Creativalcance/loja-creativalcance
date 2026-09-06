import type { SiteLocale } from "@/lib/i18n/config";
import type { PersonalizationConfig } from "@/lib/seo/personalization-pages";

const names = {
  en: { serigrafia: "Screen printing", tampografia: "Pad printing", "gravacao-laser": "Laser engraving", transfer: "Transfer printing", "hot-stamping": "Hot stamping" },
  fr: { serigrafia: "Sérigraphie", tampografia: "Tampographie", "gravacao-laser": "Gravure laser", transfer: "Transfert", "hot-stamping": "Marquage à chaud" },
} as const;

export function localizePersonalizationConfig(config: PersonalizationConfig, locale: SiteLocale): PersonalizationConfig {
  if (locale === "pt") return config;
  const name = names[locale][config.slug as keyof typeof names.en] ?? config.h1;
  const en = locale === "en";
  return {
    ...config,
    title: en ? `${name} for custom promotional products` : `${name} pour objets publicitaires personnalisés`,
    h1: en ? `${name} for custom merchandise` : `${name} pour le merchandising personnalisé`,
    description: en ? `Learn how to assess ${name.toLowerCase()} by product, variant, location, print area and quantity.` : `Découvrez comment évaluer la ${name.toLowerCase()} selon le produit, la variante, l’emplacement, la zone et la quantité.`,
    intro: en ? `${name} is available only for compatible product and location combinations. Confirm the exact option shown for the selected variant before preparing artwork or ordering.` : `${name} est uniquement disponible pour les combinaisons compatibles de produit et d’emplacement. Confirmez l’option exacte de la variante avant de préparer le fichier ou de commander.`,
    sections: en ? [
      { title: "Confirm the available combination", text: "Customisation is defined by product, variant, component and location. Select only an option offered for the exact reference." },
      { title: "Use the actual print area", text: "Prepare artwork for the dimensions shown in the configurator rather than estimating the area from the general product image." },
      { title: "Review quantity and final price", text: "The technique, number of colours, quantity and applicable pricing table determine the final customisation cost." },
    ] : [
      { title: "Confirmez la combinaison disponible", text: "La personnalisation dépend du produit, de la variante, du composant et de l’emplacement. Choisissez uniquement une option proposée pour la référence exacte." },
      { title: "Respectez la zone réelle", text: "Préparez le fichier selon les dimensions du configurateur, sans estimer la zone à partir de la photo générale du produit." },
      { title: "Vérifiez la quantité et le prix final", text: "La technique, le nombre de couleurs, la quantité et le tarif applicable déterminent le coût final de personnalisation." },
    ],
    checkpoints: en ? ["Selected product and variant", "Available component and location", "Print area dimensions", "Number of colours", "Quantity and final price"] : ["Produit et variante sélectionnés", "Composant et emplacement disponibles", "Dimensions de la zone", "Nombre de couleurs", "Quantité et prix final"],
  };
}
