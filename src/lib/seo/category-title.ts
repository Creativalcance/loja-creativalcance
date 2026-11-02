import type { SiteLocale } from "@/lib/i18n/config";

const PORTUGUESE_TITLES: Record<string, string> = {
  agendas: "Agendas personalizadas para empresas",
  "copos, garrafas e canecas": "Copos, garrafas e canecas personalizados",
  canecas: "Canecas personalizadas para empresas",
  garrafas: "Garrafas personalizadas para empresas",
  copos: "Copos personalizados para empresas",
  canetas: "Canetas personalizadas para empresas",
  escrita: "Canetas e artigos de escrita personalizados",
  tecnologia: "Brindes tecnológicos para empresas",
  "mochilas, malas e pastas": "Mochilas, malas e pastas personalizadas",
  "porta-chaves e lanyards": "Porta-chaves e lanyards personalizados",
  "pins personalizados": "Pins personalizados para empresas",
  casa: "Brindes para casa",
  crianca: "Brindes para crianças",
  "desporto e ar livre": "Brindes para desporto e atividades ao ar livre",
  "pessoal e viagem": "Brindes pessoais e de viagem",
  "sol e chuva": "Brindes para sol e chuva",
  kits: "Kits de merchandising para empresas",
  natal: "Brindes de Natal para empresas",
  xmas: "Brindes de Natal para empresas",
  mostruarios: "Mostruários de produtos promocionais",
  doming: "Doming para personalização de brindes",
};

export function buildCategoryTitle(name: string, locale: SiteLocale = "pt"): string {
  const clean = name.trim();
  if (locale === "pt") {
    const key = clean.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return PORTUGUESE_TITLES[key] ?? `${clean} para empresas`;
  }
  const suffix = {
    en: "promotional products",
    fr: "objets publicitaires",
    es: "productos promocionales",
    de: "Werbeartikel",
    it: "articoli promozionali",
  }[locale];
  return `${clean} — ${suffix}`;
}
