import { z } from "zod";
import type { SiteLocale } from "@/lib/i18n/config";

export const HOMEPAGE_CACHE_TAG = "homepage-settings";
export const HOME_SECTION_LABELS = {
  campaign: "Campanha e produtos destacados",
  smart_merch: "Apresentação e pesquisa Smart Merch",
  categories: "Categorias de produtos",
  how_to_buy: "Como comprar",
  business: "Merchandising para empresas",
  newsletter: "Subscrição da newsletter",
} as const;
export type HomeSectionId = keyof typeof HOME_SECTION_LABELS;
export const HOME_LOCALES = ["pt", "en", "fr", "es", "de", "it"] as const;
const textSchema = z.object({
  eyebrow: z.string().trim().max(60),
  title: z.string().trim().max(140),
  description: z.string().trim().max(500),
  productCta: z.string().trim().max(40),
  collectionCta: z.string().trim().max(60),
});
export type CampaignText = z.infer<typeof textSchema>;
export const homepageSchema = z.object({
  sections: z.array(z.object({ id: z.enum(["campaign", "smart_merch", "categories", "how_to_buy", "business", "newsletter"]), enabled: z.boolean() })).length(6),
  campaign: z.object({
    productIds: z.array(z.string().uuid()).max(12),
    collectionPath: z.string().trim().max(300).refine(path => path.startsWith("/") && !path.startsWith("//") && !/[\\\s<>]/.test(path), "Usa um endereço interno da loja, por exemplo /categorias/Cabazes."),
    text: z.object({ pt: textSchema, en: textSchema, fr: textSchema, es: textSchema, de: textSchema, it: textSchema }),
  }),
}).superRefine((data, ctx) => {
  if (new Set(data.sections.map(section => section.id)).size !== 6)
    ctx.addIssue({ code: "custom", path: ["sections"], message: "Cada bloco deve aparecer uma única vez." });
  if (!data.sections.some(section => section.enabled && section.id !== "newsletter"))
    ctx.addIssue({ code: "custom", path: ["sections"], message: "Mantém pelo menos um bloco de conteúdo visível." });
  if (new Set(data.campaign.productIds).size !== data.campaign.productIds.length)
    ctx.addIssue({ code: "custom", path: ["campaign", "productIds"], message: "Seleciona produtos diferentes." });
  if (!data.campaign.text.pt.title || !data.campaign.text.pt.productCta || !data.campaign.text.pt.collectionCta)
    ctx.addIssue({ code: "custom", path: ["campaign", "text"], message: "Preenche o título e os textos dos botões em português." });
  if (data.sections.some(section => section.id === "campaign" && section.enabled) && !data.campaign.productIds.length)
    ctx.addIssue({ code: "custom", path: ["campaign", "productIds"], message: "Escolhe pelo menos um produto ou oculta o bloco da campanha." });
});
export type HomepageConfig = z.infer<typeof homepageSchema>;

export const defaultHomepageConfig: HomepageConfig = {
  sections: ["campaign", "smart_merch", "categories", "how_to_buy", "business", "newsletter"].map(id => ({ id: id as HomeSectionId, enabled: id !== "campaign" })),
  campaign: {
    productIds: [], collectionPath: "/categorias/Cabazes",
    text: {
      pt: { eyebrow: "Natal 2026", title: "Cabazes de Natal para oferecer", description: "Para a tua equipa, os teus clientes ou a família. Escolhe o cabaz e encomenda a quantidade de que precisas.", productCta: "Comprar", collectionCta: "Ver todos os cabazes" },
      en: { eyebrow: "Christmas 2026", title: "Christmas hampers to give", description: "For your team, your clients or your family. Choose a hamper and order the quantity you need.", productCta: "Buy", collectionCta: "View all hampers" },
      fr: { eyebrow: "Noël 2026", title: "Des paniers de Noël à offrir", description: "Pour votre équipe, vos clients ou votre famille. Choisissez votre panier et commandez la quantité souhaitée.", productCta: "Acheter", collectionCta: "Voir tous les paniers" },
      es: { eyebrow: "Navidad 2026", title: "Cestas de Navidad para regalar", description: "Para tu equipo, tus clientes o tu familia. Elige una cesta y pide la cantidad que necesitas.", productCta: "Comprar", collectionCta: "Ver todas las cestas" },
      de: { eyebrow: "Weihnachten 2026", title: "Weihnachtskörbe zum Verschenken", description: "Für Ihr Team, Ihre Kunden oder Ihre Familie. Wählen Sie einen Korb und bestellen Sie die gewünschte Menge.", productCta: "Kaufen", collectionCta: "Alle Geschenkkörbe ansehen" },
      it: { eyebrow: "Natale 2026", title: "Cesti di Natale da regalare", description: "Per il tuo team, i tuoi clienti o la famiglia. Scegli un cesto e ordina la quantità che ti serve.", productCta: "Acquista", collectionCta: "Vedi tutti i cesti" },
    },
  },
};
export function campaignText(config: HomepageConfig, locale: SiteLocale): CampaignText {
  const text = config.campaign.text[locale];
  return Object.fromEntries(Object.keys(text).map(key => [key, text[key as keyof CampaignText] || config.campaign.text.pt[key as keyof CampaignText]])) as CampaignText;
}
export function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const next = index + direction;
  if (index < 0 || next < 0 || index >= items.length || next >= items.length) return items;
  const copy = [...items];
  [copy[index], copy[next]] = [copy[next], copy[index]];
  return copy;
}
