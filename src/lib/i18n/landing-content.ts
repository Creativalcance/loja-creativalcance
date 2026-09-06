import type { SiteLocale } from "@/lib/i18n/config";
import type { SeoLandingConfig } from "@/lib/seo/landing-pages";

type Descriptor = { title: string; h1: string; subject: string; eyebrow: string };

const descriptors: Record<"en" | "fr", Record<string, Descriptor>> = {
  en: {
    "welcome-kits": { title: "Custom welcome kits for companies", h1: "Custom welcome kits for companies and teams", subject: "welcome kits", eyebrow: "Applications · Welcome kits" },
    eventos: { title: "Custom promotional products for events", h1: "Custom merchandise and promotional products for events", subject: "events", eyebrow: "Applications · Events" },
    congressos: { title: "Custom products and kits for conferences", h1: "Custom promotional products for conferences and congresses", subject: "conferences", eyebrow: "Applications · Conferences" },
    natal: { title: "Custom corporate Christmas gifts", h1: "Custom Christmas gifts and promotional products for companies", subject: "corporate Christmas campaigns", eyebrow: "Applications · Christmas" },
    colaboradores: { title: "Custom gifts for employees", h1: "Custom merchandise and gifts for employees", subject: "employees and internal teams", eyebrow: "Applications · Employees" },
    hotelaria: { title: "Custom merchandise for hospitality", h1: "Custom merchandise and gifts for hotels", subject: "hotels and hospitality", eyebrow: "Industries · Hospitality" },
    universidades: { title: "Custom merchandise for universities", h1: "Custom merchandise and promotional products for universities", subject: "universities and education", eyebrow: "Industries · Universities" },
    startups: { title: "Custom merchandise for startups", h1: "Merchandise and welcome kits for startups", subject: "startups and growing teams", eyebrow: "Industries · Startups" },
    tecnologia: { title: "Custom merchandise for technology companies", h1: "Merchandise for technology and SaaS companies", subject: "technology and SaaS companies", eyebrow: "Industries · Technology" },
    saude: { title: "Custom promotional products for healthcare", h1: "Custom merchandise for healthcare organisations and clinics", subject: "healthcare organisations and clinics", eyebrow: "Industries · Healthcare" },
    restauracao: { title: "Custom merchandise for restaurants", h1: "Custom merchandise for restaurants and food service", subject: "restaurants and food service", eyebrow: "Industries · Food service" },
    turismo: { title: "Custom merchandise for tourism", h1: "Custom merchandise for tourism and visitor experiences", subject: "tourism and visitor experiences", eyebrow: "Industries · Tourism" },
  },
  fr: {
    "welcome-kits": { title: "Welcome kits personnalisés pour entreprises", h1: "Welcome kits personnalisés pour entreprises et équipes", subject: "les welcome kits", eyebrow: "Applications · Welcome kits" },
    eventos: { title: "Objets publicitaires personnalisés pour événements", h1: "Merchandising et objets publicitaires pour événements", subject: "les événements", eyebrow: "Applications · Événements" },
    congressos: { title: "Objets et kits personnalisés pour congrès", h1: "Objets publicitaires pour congrès et conférences", subject: "les congrès et conférences", eyebrow: "Applications · Congrès" },
    natal: { title: "Cadeaux de Noël personnalisés pour entreprises", h1: "Cadeaux et objets de Noël personnalisés pour entreprises", subject: "les campagnes de Noël", eyebrow: "Applications · Noël" },
    colaboradores: { title: "Cadeaux personnalisés pour collaborateurs", h1: "Merchandising et cadeaux personnalisés pour collaborateurs", subject: "les collaborateurs et équipes", eyebrow: "Applications · Collaborateurs" },
    hotelaria: { title: "Merchandising personnalisé pour l’hôtellerie", h1: "Merchandising et cadeaux personnalisés pour hôtels", subject: "les hôtels et l’hôtellerie", eyebrow: "Secteurs · Hôtellerie" },
    universidades: { title: "Merchandising personnalisé pour universités", h1: "Merchandising et objets publicitaires pour universités", subject: "les universités et l’enseignement", eyebrow: "Secteurs · Universités" },
    startups: { title: "Merchandising personnalisé pour startups", h1: "Merchandising et welcome kits pour startups", subject: "les startups et équipes en croissance", eyebrow: "Secteurs · Startups" },
    tecnologia: { title: "Merchandising pour entreprises technologiques", h1: "Merchandising pour entreprises technologiques et SaaS", subject: "les entreprises technologiques et SaaS", eyebrow: "Secteurs · Technologie" },
    saude: { title: "Objets publicitaires pour la santé", h1: "Merchandising pour établissements de santé et cliniques", subject: "les établissements de santé et cliniques", eyebrow: "Secteurs · Santé" },
    restauracao: { title: "Merchandising personnalisé pour la restauration", h1: "Merchandising pour restaurants et restauration", subject: "les restaurants et la restauration", eyebrow: "Secteurs · Restauration" },
    turismo: { title: "Merchandising personnalisé pour le tourisme", h1: "Merchandising pour le tourisme et les expériences", subject: "le tourisme et les expériences visiteurs", eyebrow: "Secteurs · Tourisme" },
  },
};

export function localizeLandingConfig(config: SeoLandingConfig, locale: SiteLocale): SeoLandingConfig {
  if (locale === "pt") return config;
  const item = descriptors[locale][config.slug];
  if (!item) return config;
  const isEnglish = locale === "en";
  const intro = isEnglish
    ? `Discover merchandise ideas for ${item.subject}. Compare useful products, available stock, order quantities and customisation options in one place.`
    : `Découvrez des idées de merchandising pour ${item.subject}. Comparez les produits, le stock disponible, les quantités et les options de personnalisation en un seul endroit.`;
  const sections = isEnglish ? [
    { title: "Start with the objective", text: `Define the audience, intended use and experience you want to create for ${item.subject}. This makes it easier to select relevant products.` },
    { title: "Compare products and quantities", text: "Review materials, colours, minimum quantities, stock and quantity-based pricing before making your shortlist." },
    { title: "Confirm customisation and timing", text: "Check the exact print area, technique, artwork requirements and estimated lead time for the selected product." },
  ] : [
    { title: "Commencez par l’objectif", text: `Définissez le public, l’utilisation et l’expérience souhaitée pour ${item.subject}. Vous pourrez ainsi sélectionner des produits réellement pertinents.` },
    { title: "Comparez produits et quantités", text: "Vérifiez les matériaux, couleurs, quantités minimales, stocks et tarifs dégressifs avant de finaliser votre sélection." },
    { title: "Confirmez la personnalisation et le délai", text: "Contrôlez la zone d’impression, la technique, les fichiers nécessaires et le délai estimé du produit sélectionné." },
  ];
  return {
    ...config,
    title: item.title,
    h1: item.h1,
    description: intro,
    eyebrow: item.eyebrow,
    intro,
    sections,
    highlights: isEnglish
      ? ["Products selected for the intended use", "Stock and quantity visibility", "Product-specific customisation", "Online ordering or tailored support"]
      : ["Produits adaptés à l’utilisation", "Visibilité du stock et des quantités", "Personnalisation propre au produit", "Commande en ligne ou accompagnement sur mesure"],
  };
}
