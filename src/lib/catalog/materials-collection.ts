import type { SiteLocale } from "@/lib/i18n/config";

export const MATERIALS_PATH = "/materiais-reciclados-certificados";
export const materialMessages = {
  "pt": {
    "title": "Materiais reciclados e certificados",
    "nav": "Reciclados e FSC",
    "intro": "Produtos com materiais reciclados ou materiais certificados FSC, de acordo com a informação de cada artigo. Consulta a descrição para conhecer a composição e as percentagens disponíveis.",
    "all": "Todos",
    "recycled": "Contém materiais reciclados",
    "fsc": "Materiais FSC",
    "previous": "Anterior",
    "next": "Seguinte",
    "error": "Não foi possível carregar os produtos. Tenta novamente.",
    "empty": "Não existem produtos para este filtro."
  },
  "en": {
    "title": "Recycled and certified materials",
    "nav": "Recycled & FSC",
    "intro": "Products containing recycled materials or FSC-certified materials, according to each product’s information. Check the description for composition and available percentages.",
    "all": "All",
    "recycled": "Contains recycled materials",
    "fsc": "FSC materials",
    "previous": "Previous",
    "next": "Next",
    "error": "Products could not be loaded. Please try again.",
    "empty": "No products match this filter."
  },
  "fr": {
    "title": "Matières recyclées et certifiées",
    "nav": "Recyclé et FSC",
    "intro": "Produits contenant des matières recyclées ou certifiées FSC, selon les informations de chaque article. Consultez la description pour connaître la composition et les pourcentages disponibles.",
    "all": "Tous",
    "recycled": "Contient des matières recyclées",
    "fsc": "Matières FSC",
    "previous": "Précédent",
    "next": "Suivant",
    "error": "Impossible de charger les produits. Veuillez réessayer.",
    "empty": "Aucun produit ne correspond à ce filtre."
  },
  "es": {
    "title": "Materiales reciclados y certificados",
    "nav": "Reciclados y FSC",
    "intro": "Productos con materiales reciclados o certificados FSC, según la información de cada artículo. Consulta la descripción para conocer la composición y los porcentajes disponibles.",
    "all": "Todos",
    "recycled": "Contiene materiales reciclados",
    "fsc": "Materiales FSC",
    "previous": "Anterior",
    "next": "Siguiente",
    "error": "No se han podido cargar los productos. Inténtalo de nuevo.",
    "empty": "No hay productos para este filtro."
  },
  "de": {
    "title": "Recycelte und zertifizierte Materialien",
    "nav": "Recycelt & FSC",
    "intro": "Produkte mit recycelten oder FSC-zertifizierten Materialien gemäß den jeweiligen Produktangaben. Zusammensetzung und verfügbare Prozentangaben finden Sie in der Beschreibung.",
    "all": "Alle",
    "recycled": "Enthält recycelte Materialien",
    "fsc": "FSC-Materialien",
    "previous": "Zurück",
    "next": "Weiter",
    "error": "Die Produkte konnten nicht geladen werden. Bitte versuchen Sie es erneut.",
    "empty": "Keine Produkte für diesen Filter."
  },
  "it": {
    "title": "Materiali riciclati e certificati",
    "nav": "Riciclati e FSC",
    "intro": "Prodotti con materiali riciclati o certificati FSC, secondo le informazioni di ciascun articolo. Consulta la descrizione per la composizione e le percentuali disponibili.",
    "all": "Tutti",
    "recycled": "Contiene materiali riciclati",
    "fsc": "Materiali FSC",
    "previous": "Precedente",
    "next": "Successivo",
    "error": "Impossibile caricare i prodotti. Riprova.",
    "empty": "Nessun prodotto per questo filtro."
  }
} satisfies Record<SiteLocale, Record<string, string>>;

export type MaterialFilter = "all" | "recycled_materials" | "fsc";
export function parseMaterialFilter(value: unknown): MaterialFilter {
  return value === "recycled_materials" || value === "fsc" ? value : "all";
}

// Only explicit normalized boolean attributes qualify; names and materials do not.
export function getMaterialClaims(properties: unknown): ("recycled_materials" | "fsc")[] {
  if (!Array.isArray(properties)) return [];
  return (["recycled_materials", "fsc"] as const).filter(key =>
    properties.some(item => item && typeof item === "object" && item.key === key && item.value === true));
}
