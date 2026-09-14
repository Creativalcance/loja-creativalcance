import type { ProductCardProduct } from "@/components/catalog/ProductCard";
import type { SiteLocale } from "@/lib/i18n/config";
import { getLocalizedProductTexts } from "@/lib/i18n/catalog";
import type { SmartMerchSearchResponse } from "@/lib/smart-merch/types";

// Apply translations after selection/ranking. Product identity and commercial
// data stay canonical, while every listing uses the same field-level fallback.
export async function localizeProductCards(
  products: ProductCardProduct[],
  locale: SiteLocale,
): Promise<ProductCardProduct[]> {
  if (locale === "pt" || products.length === 0) return products;
  const translations = await getLocalizedProductTexts({
    productIds: products.map((product) => product.id), locale,
  });
  return products.map((product) => {
    const text = translations.get(product.id);
    if (!text) return product;
    return {
      ...product,
      name: text.name || product.name,
      short_description: text.shortDescription ?? text.description ?? product.short_description,
      material: text.material ?? product.material,
      type_name: text.typeName ?? product.type_name,
      subtype_name: text.subtypeName ?? product.subtype_name,
    };
  });
}

const smartMerchCopy = {
  en: {
    pricing: "Prices cover the product for the selected quantity. Personalisation, setup, shipping and VAT are calculated when sufficient data is available or at checkout.",
    deadline: "The selection only includes products whose estimated delivery meets your requested date.",
    reasons: { budget: "Within the product budget", stock: "Enough stock for the quantity", intent: "Matches the product requested", use: "Suitable for the intended use", sustainable: "Sustainability confirmed in the product data", deadline: "Meets the requested date" },
  },
  fr: {
    pricing: "Les prix concernent le produit pour la quantité sélectionnée. La personnalisation, les frais de préparation, la livraison et la TVA sont calculés lorsque les données sont suffisantes ou lors du paiement.",
    deadline: "La sélection comprend uniquement des produits dont la livraison estimée respecte la date souhaitée.",
    reasons: { budget: "Respecte le budget produit", stock: "Stock suffisant pour la quantité", intent: "Correspond au produit recherché", use: "Adapté à l’utilisation prévue", sustainable: "Durabilité confirmée dans les données du produit", deadline: "Compatible avec la date souhaitée" },
  },
  es: {
    pricing: "Los precios corresponden al producto para la cantidad seleccionada. La personalización, la preparación, el envío y el IVA se calculan cuando hay datos suficientes o al finalizar la compra.",
    deadline: "La selección solo incluye productos cuya entrega estimada es compatible con la fecha solicitada.",
    reasons: { budget: "Dentro del presupuesto del producto", stock: "Stock suficiente para la cantidad", intent: "Coincide con el producto solicitado", use: "Adecuado para el uso indicado", sustainable: "Sostenibilidad confirmada en los datos del producto", deadline: "Compatible con la fecha solicitada" },
  },
  de: {
    pricing: "Die Preise gelten für das Produkt in der gewählten Menge. Personalisierung, Einrichtung, Versand und Mehrwertsteuer werden bei ausreichender Datenlage oder an der Kasse berechnet.",
    deadline: "Die Auswahl enthält nur Produkte, deren voraussichtliche Lieferung zum gewünschten Termin passt.",
    reasons: { budget: "Innerhalb des Produktbudgets", stock: "Ausreichender Bestand für die Menge", intent: "Entspricht dem gesuchten Produkt", use: "Für den angegebenen Zweck geeignet", sustainable: "Nachhaltigkeit in den Produktdaten bestätigt", deadline: "Mit dem gewünschten Termin vereinbar" },
  },
  it: {
    pricing: "I prezzi si riferiscono al prodotto nella quantità selezionata. Personalizzazione, preparazione, spedizione e IVA vengono calcolate quando sono disponibili dati sufficienti o al checkout.",
    deadline: "La selezione include solo prodotti la cui consegna stimata è compatibile con la data richiesta.",
    reasons: { budget: "Nel budget previsto per il prodotto", stock: "Disponibilità sufficiente per la quantità", intent: "Corrisponde al prodotto richiesto", use: "Adatto all’uso indicato", sustainable: "Sostenibilità confermata nei dati del prodotto", deadline: "Compatibile con la data richiesta" },
  },
} as const;

export async function localizeSmartMerchResponse(
  response: SmartMerchSearchResponse,
  locale: SiteLocale,
): Promise<SmartMerchSearchResponse> {
  if (locale === "pt") return response;
  const translations = await getLocalizedProductTexts({
    productIds: response.results.map((result) => result.id), locale,
  });
  const copy = smartMerchCopy[locale];
  return {
    ...response,
    pricingNotice: copy.pricing,
    deadlineNotice: response.deadlineNotice ? copy.deadline : null,
    results: response.results.map((result) => {
      const text = translations.get(result.id);
      return {
        ...result,
        name: text?.name || result.name,
        imageAlt: text?.name || result.imageAlt,
        shortDescription: text?.shortDescription ?? text?.description ?? result.shortDescription,
        material: text?.material ?? result.material,
        typeName: text?.typeName ?? result.typeName,
        subtypeName: text?.subtypeName ?? result.subtypeName,
        reasons: result.reasons.map((reason) => ({ ...reason, label: copy.reasons[reason.code] })),
      };
    }),
  };
}
