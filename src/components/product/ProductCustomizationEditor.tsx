"use client";
import { ShoppingResume, snapshotImage, useShoppingLoginSnapshot } from "@/lib/cart/login-snapshot";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { localizePath, SITE_LOCALES, type SiteLocale } from "@/lib/i18n/config";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type PointerEvent,
} from "react";
import {
  ArrowRight,
  Maximize2,
  Minus,
  Move,
  Plus,
  RotateCcw,
  Ruler,
  Type,
  Upload,
  X,
} from "lucide-react";
import CustomizationLocationImage from "@/components/product/CustomizationLocationImage";
import { saveCustomizationDraftAction } from "@/lib/customization/actions";

export type ProductEditorVariant = {
  id: string;
  sku: string;
  color_name: string | null;
  color_hex: string | null;
  size: string | null;
  image_url: string | null;
};

export type ProductEditorPrice = {
  variant_id: string | null;
  final_price: number;
  quantity_min: number;
  quantity_max: number | null;
  currency: string;
};

export type ProductEditorLocation = {
  id: string;
  source_location_id: string;
  variant_id: string | null;
  technique: string;
  component_name: string | null;
  location_name: string | null;
  preview_image_url: string | null;
  preview_image_urls: string[];
  location_image_url: string | null;
  area_image_url: string | null;
  printing_lines_image_url: string | null;
  print_area_geometry: ProductEditorPrintAreaGeometry | null;
  max_printing_area_mm: string | null;
  max_area_cm2: number | null;
  table_codes: string[];
  is_recommended: boolean;
  price_tiers: ProductEditorCustomizationPrice[];
};

export type ProductEditorPrintAreaGeometry = {
  left: number;
  top: number;
  width: number;
  height: number;
  origin_x: string | null;
  origin_y: string | null;
};

export type ProductEditorCustomizationPrice = {
  id: string;
  table_code: string;
  table_code_option: string | null;
  service_code: string | null;
  quantity_min: number;
  quantity_max: number | null;
  supplier_price: number;
  final_price: number;
  handling_cost: number;
  supplier_handling_cost: number;
  handling_cost_code: string | null;
  currency: string;
  price_by_color: boolean;
  price_by_area: boolean;
  allow_full_color: boolean;
  max_colors: number | null;
  area_cm2: number | null;
};

type PrintColorMode = "full" | `colors:${number}`;

type PrintColorOption = {
  mode: PrintColorMode;
  label: string;
};

type PantoneColor = {
  code: string;
  hex: string;
};

const PANTONE_COLORS: PantoneColor[] = [
  { code: "Black C", hex: "#2D2926" },
  { code: "White", hex: "#FFFFFF" },
  { code: "Cool Gray 5 C", hex: "#B1B3B3" },
  { code: "186 C", hex: "#C8102E" },
  { code: "1585 C", hex: "#FF6A13" },
  { code: "123 C", hex: "#FFC72C" },
  { code: "354 C", hex: "#00B140" },
  { code: "348 C", hex: "#00843D" },
  { code: "3125 C", hex: "#00AEC7" },
  { code: "300 C", hex: "#005EB8" },
  { code: "280 C", hex: "#012169" },
  { code: "2685 C", hex: "#330072" },
  { code: "219 C", hex: "#DA1884" },
  { code: "476 C", hex: "#4E3629" },
  { code: "871 C", hex: "#84754E" },
  { code: "877 C", hex: "#8A8D8F" },
];

type LogoPosition = {
  x: number;
  y: number;
  width: number;
  rotation: number;
};

type TextLayer = {
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: "400" | "700";
  fontStyle: "normal" | "italic";
  color: string;
  x: number;
  y: number;
  rotation: number;
};

const TEXT_FONT_OPTIONS = [
  "Arial",
  "Comic Sans MS",
  "Courier New",
  "Georgia",
  "Trebuchet MS",
  "Verdana",
  "Times New Roman",
] as const;

const initialTextLayer: TextLayer = {
  content: "",
  fontFamily: "Arial",
  fontSize: 24,
  fontWeight: "400",
  fontStyle: "normal",
  color: "#111827",
  x: 50,
  y: 50,
  rotation: 0,
};

const TEXT_EDITOR_COPY: Record<SiteLocale, {
  title: string;
  help: string;
  placeholder: string;
  font: string;
  size: string;
  bold: string;
  italic: string;
  color: string;
  fit: string;
  horizontal: string;
  vertical: string;
  rotation: string;
}> = {
  pt: { title: "Adicionar texto", help: "O texto ficará dentro da área máxima de impressão.", placeholder: "Escreve o texto", font: "Fonte", size: "Tamanho", bold: "Negrito", italic: "Itálico", color: "Cor", fit: "Ajustar texto à área", horizontal: "Posição horizontal", vertical: "Posição vertical", rotation: "Rotação do texto" },
  en: { title: "Add text", help: "The text will remain inside the maximum print area.", placeholder: "Enter text", font: "Font", size: "Size", bold: "Bold", italic: "Italic", color: "Colour", fit: "Fit text to area", horizontal: "Horizontal position", vertical: "Vertical position", rotation: "Text rotation" },
  fr: { title: "Ajouter du texte", help: "Le texte restera dans la zone maximale d’impression.", placeholder: "Saisir le texte", font: "Police", size: "Taille", bold: "Gras", italic: "Italique", color: "Couleur", fit: "Ajuster le texte à la zone", horizontal: "Position horizontale", vertical: "Position verticale", rotation: "Rotation du texte" },

es: { title: "A\u00F1adir texto", help: "El texto permanecer\u00E1 dentro del \u00E1rea m\u00E1xima de impresi\u00F3n.", placeholder: "Escribir texto", font: "Fuente", size: "Tama\u00F1o", bold: "Negrita", italic: "Cursiva", color: "Color", fit: "Ajustar texto al \u00E1rea", horizontal: "Posici\u00F3n horizontal", vertical: "Posici\u00F3n vertical", rotation: "Rotaci\u00F3n del texto" },
de: { title: "Text hinzuf\u00FCgen", help: "Der Text bleibt innerhalb der maximalen Druckfl\u00E4che.", placeholder: "Text eingeben", font: "Schriftart", size: "Gr\u00F6\u00DFe", bold: "Fett", italic: "Kursiv", color: "Farbe", fit: "Text an die Fl\u00E4che anpassen", horizontal: "Horizontale Position", vertical: "Vertikale Position", rotation: "Textdrehung" },
it: { title: "Aggiungi testo", help: "Il testo rimarr\u00E0 all'interno dell'area massima di stampa.", placeholder: "Inserisci testo", font: "Carattere", size: "Dimensione", bold: "Grassetto", italic: "Corsivo", color: "Colore", fit: "Adatta il testo all'area", horizontal: "Posizione orizzontale", vertical: "Posizione verticale", rotation: "Rotazione del testo" },
};

type PrintAreaDimensions = {
  widthMm: number;
  heightMm: number;
};

type LocationGroup = {
  id: string;
  locationName: string;
  componentName: string | null;
  maxPrintingAreaMm: string | null;
  isRecommended: boolean;
  options: ProductEditorLocation[];
};

type ProductCustomizationEditorProps = {
  locale?: SiteLocale;
  productId: string;
  supplierId: string | null;
  productName: string;
  productSlug: string;
  productImageUrl: string | null;
  variants: ProductEditorVariant[];
  locations: ProductEditorLocation[];
  productPrices: ProductEditorPrice[];
  initialDraftId?: string | null;
  initialVariantId?: string | null;
  initialLocationId?: string | null;
  initialQuantity?: number;
  minimumQuantity: number;
};

const initialPosition: LogoPosition = {
  x: 20,
  y: 35,
  width: 60,
  rotation: 0,
};

const DEFAULT_PRINT_AREA: PrintAreaDimensions = {
  widthMm: 50,
  heightMm: 20,
};

function getColorLabel(variant: ProductEditorVariant | null, fallback = "Cor selecionada"): string {
  if (!variant) {
    return fallback;
  }

  if (variant.color_name && variant.size) {
    return `${variant.color_name} · ${variant.size}`;
  }

  return variant.color_name ?? variant.size ?? fallback;
}

function getLocationLabel(location: ProductEditorLocation): string {
  return (
    location.location_name ??
    location.component_name ??
    location.max_printing_area_mm ??
    "Área de personalização"
  );
}

function getLocationGroupKey(location: ProductEditorLocation): string {
  return [
    location.source_location_id,
    location.location_name ?? "local",
    location.component_name ?? "componente",
  ]
    .join(":")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function dedupeByTechnique(
  options: ProductEditorLocation[],
): ProductEditorLocation[] {
  const map = new Map<string, ProductEditorLocation>();

  for (const option of options) {
    const key = option.technique
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    const existing = map.get(key);

    if (!existing) {
      map.set(key, option);
      continue;
    }

    const shouldReplace =
      (!existing.is_recommended && option.is_recommended) ||
      (!existing.preview_image_url && Boolean(option.preview_image_url)) ||
      (!existing.printing_lines_image_url &&
        Boolean(option.printing_lines_image_url));

    if (shouldReplace) {
      map.set(key, option);
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.technique.localeCompare(b.technique, "pt-PT"),
  );
}

function buildLocationGroups(params: {
  locations: ProductEditorLocation[];
  selectedVariantId: string | null;
}): LocationGroup[] {
  const variantLocations = params.selectedVariantId
    ? params.locations.filter(
        (location) => location.variant_id === params.selectedVariantId,
      )
    : [];

  const activeLocations =
    variantLocations.length > 0
      ? variantLocations
      : params.locations.filter((location) => !location.variant_id);

  const fallbackLocations =
    activeLocations.length > 0 ? activeLocations : params.locations;

  const groups = new Map<string, LocationGroup>();

  for (const location of fallbackLocations) {
    const key = getLocationGroupKey(location);
    const existingGroup = groups.get(key);

    if (!existingGroup) {
      groups.set(key, {
        id: key,
        locationName: getLocationLabel(location),
        componentName: location.component_name,
        maxPrintingAreaMm: location.max_printing_area_mm,
        isRecommended: location.is_recommended,
        options: [location],
      });

      continue;
    }

    existingGroup.options.push(location);

    if (location.is_recommended) {
      existingGroup.isRecommended = true;
    }
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      options: dedupeByTechnique(group.options),
    }))
    .sort((a, b) => {
      if (a.isRecommended && !b.isRecommended) {
        return -1;
      }

      if (!a.isRecommended && b.isRecommended) {
        return 1;
      }

      return a.locationName.localeCompare(b.locationName, "pt-PT");
    });
}

function parsePrintAreaDimensions(value: string | null): PrintAreaDimensions {
  if (!value) {
    return DEFAULT_PRINT_AREA;
  }

  const numbers = value
    .replace(",", ".")
    .match(/\d+(\.\d+)?/g)
    ?.map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0);

  if (!numbers || numbers.length < 2) {
    return DEFAULT_PRINT_AREA;
  }

  return {
    widthMm: numbers[0],
    heightMm: numbers[1],
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

function formatPriceValue(value: number, currency: string, intlLocale: string): string {
  return new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency,
  }).format(value);
}

function getEditorCopy(locale: SiteLocale) {
  if (locale === 'es') return {
    personalization: "Personalizaci\u00F3n", unavailable: "Maqueta no disponible para este producto", unavailableHelp: "Nuestro equipo puede revisar este producto y confirmar la mejor soluci\u00F3n de personalizaci\u00F3n.", location: "Ubicaci\u00F3n", recommended: "Recomendado", type: "Tipo de personalizaci\u00F3n", technique: "T\u00E9cnica", maximumArea: "\u00C1rea m\u00E1xima", quantity: "Cantidad", technicalImageHelp: "La imagen muestra el \u00E1rea t\u00E9cnica facilitada por el proveedor. La posici\u00F3n final se validar\u00E1 antes de la producci\u00F3n.", selectedProduct: "Producto seleccionado", colourSize: "Color / talla", changeProduct: "Cambiar producto", selectedOption: "Opci\u00F3n seleccionada", toConfirm: "Por confirmar", locationToConfirm: "Ubicaci\u00F3n por confirmar", estimatedProduction: "Producci\u00F3n estimada:", uploadLogo: "Cargar logotipo", uploadFile: "Cargar archivo", file: "Archivo:", adjustArea: "Ajustar dentro del \u00E1rea", reset: "Restablecer", reduce: "Reducir", centre: "Centrar", enlarge: "Ampliar", fitMaximum: "Ajustar al \u00E1rea m\u00E1xima", horizontal: "Horizontal", vertical: "Vertical", width: "Anchura", rotation: "Rotaci\u00F3n", colours: "Colores de personalizaci\u00F3n", coloursHelp: "Elige el n\u00FAmero de colores permitido por la t\u00E9cnica y define las referencias aplicadas a la simulaci\u00F3n.", detectedColours: "Colores detectados en el logotipo", printColours: "Colores de impresi\u00F3n", colour: "Color", notSelected: "Sin seleccionar", selectReference: "Selecciona una referencia para el color", coloursApplied: "Los colores seleccionados ya se han aplicado a la simulaci\u00F3n.", selectToContinue: "Selecciona los colores de impresi\u00F3n necesarios para continuar.", pantoneHelp: "Las referencias Pantone y la simulaci\u00F3n en pantalla son orientativas. El color final se confirmar\u00E1 antes de la producci\u00F3n.", extrasNotes: "Extras y observaciones", designHelp: "Necesito ayuda para preparar el logotipo", artworkEstimate: "Preparaci\u00F3n de archivos estimada:", extraProof: "Quiero una prueba adicional de la maqueta", proofEstimate: "Prueba adicional estimada:", nominative: "Personalizaci\u00F3n con nombres individuales", estimatedPerUnit: "Estimaci\u00F3n por unidad:", internalReference: "Referencia interna", referencePlaceholder: "Ej.: Evento, campa\u00F1a o cliente", notes: "Observaciones", notesPlaceholder: "Ej.: Centrado, preferiblemente en blanco.", summary: "Resumen de personalizaci\u00F3n", personalizationFor: "Personalizaci\u00F3n para", unit: "unidad", units: "unidades", allPrices: "Ver todos los precios", unitPriceHelp: "El precio unitario de personalizaci\u00F3n disminuye con la cantidad seleccionada.", from: "Desde", savePerUnit: "ahorro por unidad", compareQuantities: "Comparar cantidades", otherQuantity: "Introducir otra cantidad", intendedQuantity: "Cantidad necesaria", productUnit: "Producto / unidad", productSubtotal: "Subtotal de productos", personalizationUnit: "Personalizaci\u00F3n / unidad", personalizationSubtotal: "Subtotal de personalizaci\u00F3n", setup: "Preparaci\u00F3n (pago \u00FAnico)", extras: "Extras", estimatedTotal: "Total estimado", totalHelp: "Producto + personalizaci\u00F3n + preparaci\u00F3n + extras", prices: "Ver precios", productionTimes: "Plazos de producci\u00F3n", disclaimer: "Precios sin IVA. La maqueta mostrada es una simulaci\u00F3n visual. Nuestro equipo confirma la t\u00E9cnica, el \u00E1rea y el precio final antes de la producci\u00F3n.", confirming: "Confirmando maqueta...", confirm: "Confirmar maqueta y continuar a la compra", priceTable: "Tabla de precios", closePriceTable: "Cerrar tabla de precios", priceUnit: "Precio / unidad", tableHelp: "Tabla orientativa para apoyar la simulaci\u00F3n. Los precios finales se confirmar\u00E1n seg\u00FAn la t\u00E9cnica, el \u00E1rea y el archivo recibido.", productionEstimate: "Estimaci\u00F3n por t\u00E9cnica y cantidad.", closeProduction: "Cerrar plazos de producci\u00F3n", days: "d\u00EDas", onRequest: "Bajo consulta", productionHelp: "Los plazos pueden variar seg\u00FAn la t\u00E9cnica, disponibilidad, tama\u00F1o de la personalizaci\u00F3n y aprobaci\u00F3n de la maqueta.", logoAlt: "Logotipo cargado", printArea: "\u00C1rea de impresi\u00F3n", noLogo: "Todav\u00EDa sin cargar", selectedColour: "Color seleccionado", customizationArea: "\u00C1rea de personalizaci\u00F3n", allImageColours: "Todos los colores de la imagen", colourSingular: "color", colourPlural: "colores", variantError: "No se ha podido identificar la variante seleccionada.", locationError: "Selecciona una ubicaci\u00F3n y una t\u00E9cnica.", priceError: "No se ha podido determinar el precio del producto para esta cantidad.",
};
if (locale === 'de') return {
    personalization: "Personalisierung", unavailable: "Vorschau f\u00FCr dieses Produkt nicht verf\u00FCgbar", unavailableHelp: "Unser Team kann dieses Produkt pr\u00FCfen und die passende Personalisierungsl\u00F6sung best\u00E4tigen.", location: "Position", recommended: "Empfohlen", type: "Personalisierungsart", technique: "Technik", maximumArea: "Maximale Fl\u00E4che", quantity: "Menge", technicalImageHelp: "Das Bild zeigt die vom Lieferanten angegebene technische Fl\u00E4che. Die endg\u00FCltige Position wird vor der Produktion gepr\u00FCft.", selectedProduct: "Ausgew\u00E4hltes Produkt", colourSize: "Farbe / Gr\u00F6\u00DFe", changeProduct: "Produkt \u00E4ndern", selectedOption: "Ausgew\u00E4hlte Option", toConfirm: "Noch zu best\u00E4tigen", locationToConfirm: "Position noch zu best\u00E4tigen", estimatedProduction: "Voraussichtliche Produktion:", uploadLogo: "Logo hochladen", uploadFile: "Datei hochladen", file: "Datei:", adjustArea: "Innerhalb der Fl\u00E4che anpassen", reset: "Zur\u00FCcksetzen", reduce: "Verkleinern", centre: "Zentrieren", enlarge: "Vergr\u00F6\u00DFern", fitMaximum: "An maximale Fl\u00E4che anpassen", horizontal: "Horizontal", vertical: "Vertikal", width: "Breite", rotation: "Drehung", colours: "Personalisierungsfarben", coloursHelp: "W\u00E4hlen Sie die f\u00FCr die Technik zul\u00E4ssige Farbanzahl und legen Sie die in der Simulation verwendeten Farbreferenzen fest.", detectedColours: "Im Logo erkannte Farben", printColours: "Druckfarben", colour: "Farbe", notSelected: "Nicht ausgew\u00E4hlt", selectReference: "W\u00E4hlen Sie eine Farbreferenz", coloursApplied: "Die gew\u00E4hlten Farben sind bereits in der Simulation angewendet.", selectToContinue: "W\u00E4hlen Sie die erforderlichen Druckfarben, um fortzufahren.", pantoneHelp: "Pantone-Referenzen und die Bildschirmvorschau dienen der Orientierung. Die endg\u00FCltige Farbe wird vor der Produktion best\u00E4tigt.", extrasNotes: "Extras und Hinweise", designHelp: "Ich ben\u00F6tige Hilfe bei der Logovorbereitung", artworkEstimate: "Gesch\u00E4tzte Dateivorbereitung:", extraProof: "Ich m\u00F6chte einen zus\u00E4tzlichen Korrekturabzug", proofEstimate: "Gesch\u00E4tzter zus\u00E4tzlicher Korrekturabzug:", nominative: "Personalisierung mit individuellen Namen", estimatedPerUnit: "Gesch\u00E4tzt pro St\u00FCck:", internalReference: "Interne Referenz", referencePlaceholder: "Z. B. Veranstaltung, Kampagne oder Kunde", notes: "Hinweise", notesPlaceholder: "Z. B. Zentriert, vorzugsweise in Wei\u00DF.", summary: "Personalisierungs\u00FCbersicht", personalizationFor: "Personalisierung f\u00FCr", unit: "St\u00FCck", units: "St\u00FCck", allPrices: "Alle Preise ansehen", unitPriceHelp: "Der St\u00FCckpreis der Personalisierung sinkt mit der gew\u00E4hlten Menge.", from: "Ab", savePerUnit: "Ersparnis pro St\u00FCck", compareQuantities: "Mengen vergleichen", otherQuantity: "Andere Menge eingeben", intendedQuantity: "Ben\u00F6tigte Menge", productUnit: "Produkt / St\u00FCck", productSubtotal: "Produktzwischensumme", personalizationUnit: "Personalisierung / St\u00FCck", personalizationSubtotal: "Personalisierungszwischensumme", setup: "Einrichtung (einmalig)", extras: "Extras", estimatedTotal: "Gesch\u00E4tzter Gesamtbetrag", totalHelp: "Produkt + Personalisierung + Einrichtung + Extras", prices: "Preise ansehen", productionTimes: "Produktionszeiten", disclaimer: "Preise ohne MwSt. Die gezeigte Vorschau ist eine visuelle Simulation. Unser Team best\u00E4tigt Technik, Fl\u00E4che und endg\u00FCltigen Preis vor der Produktion.", confirming: "Vorschau wird best\u00E4tigt...", confirm: "Vorschau best\u00E4tigen und zur Kasse", priceTable: "Preistabelle", closePriceTable: "Preistabelle schlie\u00DFen", priceUnit: "Preis / St\u00FCck", tableHelp: "Unverbindliche Tabelle zur Unterst\u00FCtzung der Simulation. Die endg\u00FCltigen Preise werden anhand von Technik, Fl\u00E4che und erhaltener Datei best\u00E4tigt.", productionEstimate: "Sch\u00E4tzung nach Technik und Menge.", closeProduction: "Produktionszeiten schlie\u00DFen", days: "Tage", onRequest: "Auf Anfrage", productionHelp: "Die Zeiten k\u00F6nnen je nach Technik, Verf\u00FCgbarkeit, Gr\u00F6\u00DFe der Personalisierung und Druckfreigabe variieren.", logoAlt: "Hochgeladenes Logo", printArea: "Druckfl\u00E4che", noLogo: "Noch nicht hochgeladen", selectedColour: "Ausgew\u00E4hlte Farbe", customizationArea: "Personalisierungsfl\u00E4che", allImageColours: "Alle Bildfarben", colourSingular: "Farbe", colourPlural: "Farben", variantError: "Die ausgew\u00E4hlte Variante konnte nicht identifiziert werden.", locationError: "W\u00E4hlen Sie eine Position und eine Technik.", priceError: "Der Produktpreis konnte f\u00FCr diese Menge nicht ermittelt werden.",
};
if (locale === 'it') return {
    personalization: "Personalizzazione", unavailable: "Bozza non disponibile per questo prodotto", unavailableHelp: "Il nostro team pu\u00F2 esaminare questo prodotto e confermare la migliore soluzione di personalizzazione.", location: "Posizione", recommended: "Consigliato", type: "Tipo di personalizzazione", technique: "Tecnica", maximumArea: "Area massima", quantity: "Quantit\u00E0", technicalImageHelp: "L'immagine mostra l'area tecnica fornita dal fornitore. La posizione finale verr\u00E0 verificata prima della produzione.", selectedProduct: "Prodotto selezionato", colourSize: "Colore / taglia", changeProduct: "Cambia prodotto", selectedOption: "Opzione selezionata", toConfirm: "Da confermare", locationToConfirm: "Posizione da confermare", estimatedProduction: "Produzione stimata:", uploadLogo: "Carica logo", uploadFile: "Carica file", file: "File:", adjustArea: "Regola all'interno dell'area", reset: "Ripristina", reduce: "Riduci", centre: "Centra", enlarge: "Ingrandisci", fitMaximum: "Adatta all'area massima", horizontal: "Orizzontale", vertical: "Verticale", width: "Larghezza", rotation: "Rotazione", colours: "Colori della personalizzazione", coloursHelp: "Scegli il numero di colori consentito dalla tecnica e imposta i riferimenti applicati alla simulazione.", detectedColours: "Colori rilevati nel logo", printColours: "Colori di stampa", colour: "Colore", notSelected: "Non selezionato", selectReference: "Seleziona un riferimento per il colore", coloursApplied: "I colori selezionati sono gi\u00E0 applicati alla simulazione.", selectToContinue: "Seleziona i colori di stampa richiesti per continuare.", pantoneHelp: "I riferimenti Pantone e la simulazione sullo schermo sono indicativi. Il colore finale verr\u00E0 confermato prima della produzione.", extrasNotes: "Extra e note", designHelp: "Ho bisogno di aiuto per preparare il logo", artworkEstimate: "Preparazione grafica stimata:", extraProof: "Desidero una prova grafica aggiuntiva", proofEstimate: "Prova aggiuntiva stimata:", nominative: "Personalizzazione con nomi individuali", estimatedPerUnit: "Stima per unit\u00E0:", internalReference: "Riferimento interno", referencePlaceholder: "Es. Evento, campagna o cliente", notes: "Note", notesPlaceholder: "Es. Centrato, preferibilmente in bianco.", summary: "Riepilogo della personalizzazione", personalizationFor: "Personalizzazione per", unit: "unit\u00E0", units: "unit\u00E0", allPrices: "Vedi tutti i prezzi", unitPriceHelp: "Il prezzo unitario della personalizzazione diminuisce all'aumentare della quantit\u00E0 selezionata.", from: "Da", savePerUnit: "risparmio per unit\u00E0", compareQuantities: "Confronta quantit\u00E0", otherQuantity: "Inserisci un'altra quantit\u00E0", intendedQuantity: "Quantit\u00E0 richiesta", productUnit: "Prodotto / unit\u00E0", productSubtotal: "Subtotale prodotti", personalizationUnit: "Personalizzazione / unit\u00E0", personalizationSubtotal: "Subtotale personalizzazione", setup: "Preparazione (una tantum)", extras: "Extra", estimatedTotal: "Totale stimato", totalHelp: "Prodotto + personalizzazione + preparazione + extra", prices: "Vedi prezzi", productionTimes: "Tempi di produzione", disclaimer: "Prezzi IVA esclusa. La bozza mostrata \u00E8 una simulazione visiva. Il nostro team conferma tecnica, area e prezzo finale prima della produzione.", confirming: "Conferma della bozza...", confirm: "Conferma la bozza e continua all'acquisto", priceTable: "Tabella prezzi", closePriceTable: "Chiudi tabella prezzi", priceUnit: "Prezzo / unit\u00E0", tableHelp: "Tabella indicativa a supporto della simulazione. I prezzi finali verranno confermati in base alla tecnica, all'area e al file ricevuto.", productionEstimate: "Stima per tecnica e quantit\u00E0.", closeProduction: "Chiudi tempi di produzione", days: "giorni", onRequest: "Su richiesta", productionHelp: "I tempi possono variare in base alla tecnica, alla disponibilit\u00E0, alle dimensioni della personalizzazione e all'approvazione della bozza.", logoAlt: "Logo caricato", printArea: "Area di stampa", noLogo: "Non ancora caricato", selectedColour: "Colore selezionato", customizationArea: "Area di personalizzazione", allImageColours: "Tutti i colori dell'immagine", colourSingular: "colore", colourPlural: "colori", variantError: "Impossibile identificare la variante selezionata.", locationError: "Seleziona una posizione e una tecnica.", priceError: "Impossibile determinare il prezzo del prodotto per questa quantit\u00E0.",
};
if (locale === "en") return {
    personalization: "Personalization", unavailable: "Mockup unavailable for this product", unavailableHelp: "Our team can review this product and confirm the best personalization solution.", location: "Location", recommended: "Recommended", type: "Personalization type", technique: "Technique", maximumArea: "Maximum area", quantity: "Quantity", technicalImageHelp: "The image shows the technical area provided by the supplier. The final position will be validated before production.", selectedProduct: "Selected product", colourSize: "Colour / size", changeProduct: "Change product", selectedOption: "Selected option", toConfirm: "To be confirmed", locationToConfirm: "Location to be confirmed", estimatedProduction: "Estimated production:", uploadLogo: "Upload logo", uploadFile: "Upload file", file: "File:", adjustArea: "Adjust within the area", reset: "Reset", reduce: "Reduce", centre: "Centre", enlarge: "Enlarge", fitMaximum: "Fit to maximum area", horizontal: "Horizontal", vertical: "Vertical", width: "Width", rotation: "Rotation", colours: "Personalization colours", coloursHelp: "Choose the number of colours allowed by the technique and set the references applied to the simulation.", detectedColours: "Colours detected in the logo", printColours: "Print colours", colour: "Colour", notSelected: "Not selected", selectReference: "Select a reference for colour", coloursApplied: "The selected colours are already applied to the simulation.", selectToContinue: "Select the required print colours to continue.", pantoneHelp: "Pantone references and the on-screen simulation are indicative. The final colour will be confirmed before production.", extrasNotes: "Extras and notes", designHelp: "I need help preparing the logo", artworkEstimate: "Estimated artwork preparation:", extraProof: "I want an additional artwork proof", proofEstimate: "Estimated extra proof:", nominative: "Individual name personalization", estimatedPerUnit: "Estimated per unit:", internalReference: "Internal reference", referencePlaceholder: "E.g. Event, campaign or client", notes: "Notes", notesPlaceholder: "E.g. Centre it, preferably in white.", summary: "Personalization summary", personalizationFor: "Personalization for", unit: "unit", units: "units", allPrices: "View all prices", unitPriceHelp: "The personalization unit price decreases with the selected quantity.", from: "From", savePerUnit: "save per unit", compareQuantities: "Compare quantities", otherQuantity: "Enter another quantity", intendedQuantity: "Required quantity", productUnit: "Product / unit", productSubtotal: "Product subtotal", personalizationUnit: "Personalization / unit", personalizationSubtotal: "Personalization subtotal", setup: "Setup (one-off)", extras: "Extras", estimatedTotal: "Estimated total", totalHelp: "Product + personalization + setup + extras", prices: "View prices", productionTimes: "Production times", disclaimer: "Prices exclude VAT. The mockup shown is a visual simulation. Our team confirms the technique, area and final price before production.", confirming: "Confirming mockup...", confirm: "Confirm mockup and continue to checkout", priceTable: "Price table", closePriceTable: "Close price table", priceUnit: "Price / unit", tableHelp: "Indicative table to support the simulation. Final prices will be confirmed according to the technique, area and file received.", productionEstimate: "Estimate by technique and quantity.", closeProduction: "Close production times", days: "days", onRequest: "On request", productionHelp: "Times may vary depending on the technique, availability, personalization size and mockup approval.", logoAlt: "Uploaded logo", printArea: "Print area", noLogo: "Not uploaded yet", selectedColour: "Selected colour", customizationArea: "Personalization area", allImageColours: "All image colours", colourSingular: "colour", colourPlural: "colours", variantError: "The selected variant could not be identified.", locationError: "Select a location and a technique.", priceError: "The product price could not be determined for this quantity.",
  };
  if (locale === "fr") return {
    personalization: "Personnalisation", unavailable: "Maquette indisponible pour ce produit", unavailableHelp: "Notre équipe peut analyser ce produit et confirmer la meilleure solution de personnalisation.", location: "Emplacement", recommended: "Recommandé", type: "Type de personnalisation", technique: "Technique", maximumArea: "Zone maximale", quantity: "Quantité", technicalImageHelp: "L’image montre la zone technique fournie par le fournisseur. La position finale sera validée avant la production.", selectedProduct: "Produit sélectionné", colourSize: "Couleur / taille", changeProduct: "Modifier le produit", selectedOption: "Option sélectionnée", toConfirm: "À confirmer", locationToConfirm: "Emplacement à confirmer", estimatedProduction: "Production estimée :", uploadLogo: "Télécharger le logo", uploadFile: "Télécharger un fichier", file: "Fichier :", adjustArea: "Ajuster dans la zone", reset: "Réinitialiser", reduce: "Réduire", centre: "Centrer", enlarge: "Agrandir", fitMaximum: "Ajuster à la zone maximale", horizontal: "Horizontal", vertical: "Vertical", width: "Largeur", rotation: "Rotation", colours: "Couleurs de personnalisation", coloursHelp: "Choisissez le nombre de couleurs autorisé par la technique et définissez les références appliquées à la simulation.", detectedColours: "Couleurs détectées dans le logo", printColours: "Couleurs d’impression", colour: "Couleur", notSelected: "Non sélectionnée", selectReference: "Sélectionner une référence pour la couleur", coloursApplied: "Les couleurs choisies sont déjà appliquées à la simulation.", selectToContinue: "Sélectionnez les couleurs d’impression requises pour continuer.", pantoneHelp: "Les références Pantone et la simulation à l’écran sont indicatives. La couleur finale sera confirmée avant la production.", extrasNotes: "Options et observations", designHelp: "J’ai besoin d’aide pour préparer le logo", artworkEstimate: "Préparation graphique estimée :", extraProof: "Je souhaite une validation graphique supplémentaire", proofEstimate: "Maquette supplémentaire estimée :", nominative: "Personnalisation nominative", estimatedPerUnit: "Estimation par unité :", internalReference: "Référence interne", referencePlaceholder: "Ex. : événement, campagne ou client", notes: "Observations", notesPlaceholder: "Ex. : centrer, de préférence en blanc.", summary: "Récapitulatif de la personnalisation", personalizationFor: "Personnalisation pour", unit: "unité", units: "unités", allPrices: "Voir tous les prix", unitPriceHelp: "Le prix unitaire de la personnalisation diminue avec la quantité sélectionnée.", from: "À partir de", savePerUnit: "économisez par unité", compareQuantities: "Comparer les quantités", otherQuantity: "Saisir une autre quantité", intendedQuantity: "Quantité souhaitée", productUnit: "Produit / unité", productSubtotal: "Sous-total produit", personalizationUnit: "Personnalisation / unité", personalizationSubtotal: "Sous-total personnalisation", setup: "Mise en route (unique)", extras: "Options", estimatedTotal: "Total estimé", totalHelp: "Produit + personnalisation + mise en route + options", prices: "Voir les prix", productionTimes: "Délais de production", disclaimer: "Prix hors TVA. La maquette affichée est une simulation visuelle. Notre équipe confirme la technique, la zone et le prix final avant la production.", confirming: "Confirmation de la maquette...", confirm: "Confirmer la maquette et continuer vers le paiement", priceTable: "Tableau des prix", closePriceTable: "Fermer le tableau des prix", priceUnit: "Prix / unité", tableHelp: "Tableau indicatif pour la simulation. Les prix finaux seront confirmés selon la technique, la zone et le fichier reçu.", productionEstimate: "Estimation par technique et quantité.", closeProduction: "Fermer les délais de production", days: "jours", onRequest: "Sur demande", productionHelp: "Les délais peuvent varier selon la technique, la disponibilité, la taille de la personnalisation et la validation de la maquette.", logoAlt: "Logo téléchargé", printArea: "Zone d’impression", noLogo: "Pas encore téléchargé", selectedColour: "Couleur sélectionnée", customizationArea: "Zone de personnalisation", allImageColours: "Toutes les couleurs de l’image", colourSingular: "couleur", colourPlural: "couleurs", variantError: "Impossible d’identifier la variante sélectionnée.", locationError: "Sélectionnez un emplacement et une technique.", priceError: "Impossible de déterminer le prix du produit pour cette quantité.",
  };
  return {
    personalization: "Personalização", unavailable: "Maquete indisponível para este produto", unavailableHelp: "A nossa equipa pode analisar este produto e confirmar a melhor solução de personalização.", location: "Localização", recommended: "Recomendada", type: "Tipo de personalização", technique: "Técnica", maximumArea: "Área máxima", quantity: "Quantidade", technicalImageHelp: "A imagem mostra a zona técnica enviada pelo fornecedor. A posição final será validada antes da produção.", selectedProduct: "Produto selecionado", colourSize: "Cor / tamanho", changeProduct: "Alterar produto", selectedOption: "Opção selecionada", toConfirm: "A confirmar", locationToConfirm: "Localização a confirmar", estimatedProduction: "Produção estimada:", uploadLogo: "Carregar logótipo", uploadFile: "Carregar ficheiro", file: "Ficheiro:", adjustArea: "Ajustar dentro da área", reset: "Repor", reduce: "Reduzir", centre: "Centrar", enlarge: "Aumentar", fitMaximum: "Ajustar à área máxima", horizontal: "Horizontal", vertical: "Vertical", width: "Largura", rotation: "Rotação", colours: "Cores da personalização", coloursHelp: "Escolhe o número de cores permitido pela técnica e define as referências que serão aplicadas à simulação.", detectedColours: "Cores detetadas no logótipo", printColours: "Cores de impressão", colour: "Cor", notSelected: "Por selecionar", selectReference: "Selecionar referência para a cor", coloursApplied: "As cores escolhidas já estão aplicadas à simulação.", selectToContinue: "Seleciona as cores de impressão necessárias para continuar.", pantoneHelp: "As referências Pantone e a simulação apresentada no ecrã são indicativas. A cor final será confirmada antes da produção.", extrasNotes: "Extras e observações", designHelp: "Preciso de ajuda a preparar o logótipo", artworkEstimate: "Tratamento gráfico estimado:", extraProof: "Quero validação gráfica adicional", proofEstimate: "Maquete extra estimada:", nominative: "Personalização nominativa", estimatedPerUnit: "Estimado por unidade:", internalReference: "Referência interna", referencePlaceholder: "Ex.: Evento, campanha ou cliente", notes: "Observações", notesPlaceholder: "Ex.: Colocar centrado, preferencialmente em branco.", summary: "Resumo da personalização", personalizationFor: "Personalização para", unit: "unidade", units: "unidades", allPrices: "Ver todos os preços", unitPriceHelp: "O preço unitário da personalização diminui com a quantidade selecionada.", from: "A partir de", savePerUnit: "poupa por unidade", compareQuantities: "Comparar quantidades", otherQuantity: "Introduzir outra quantidade", intendedQuantity: "Quantidade pretendida", productUnit: "Produto / un.", productSubtotal: "Subtotal produto", personalizationUnit: "Personalização / un.", personalizationSubtotal: "Subtotal personalização", setup: "Setup (único)", extras: "Extras", estimatedTotal: "Total estimado", totalHelp: "Produto + personalização + setup + extras", prices: "Ver preços", productionTimes: "Tempos de produção", disclaimer: "Valores sem IVA. A maquete apresentada é uma simulação visual. A nossa equipa confirma técnica, área e preço final antes da produção.", confirming: "A confirmar maquete...", confirm: "Confirmar maquete e avançar para checkout", priceTable: "Tabela de preços", closePriceTable: "Fechar tabela de preços", priceUnit: "Preço / un.", tableHelp: "Tabela indicativa para apoio à simulação. Os valores finais serão confirmados com base na técnica, área e ficheiro recebido.", productionEstimate: "Estimativa por técnica e quantidade.", closeProduction: "Fechar tempos de produção", days: "dias", onRequest: "Sob consulta", productionHelp: "Os tempos podem variar consoante técnica, disponibilidade, dimensão da personalização e validação da maquete.", logoAlt: "Logótipo carregado", printArea: "Área de impressão", noLogo: "Ainda não carregado", selectedColour: "Cor selecionada", customizationArea: "Área de personalização", allImageColours: "Todas as cores da imagem", colourSingular: "cor", colourPlural: "cores", variantError: "Não foi possível identificar a variante selecionada.", locationError: "Seleciona uma localização e uma técnica.", priceError: "Não foi possível determinar o preço do produto para esta quantidade.",
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

function rgbToHex(red: number, green: number, blue: number): string {
  return `#${[red, green, blue]
    .map((value) => Math.round(value).toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
}

function colorDistance(
  left: [number, number, number],
  right: [number, number, number],
): number {
  return (
    (left[0] - right[0]) ** 2 +
    (left[1] - right[1]) ** 2 +
    (left[2] - right[2]) ** 2
  );
}

function detectLogoColors(image: HTMLImageElement): string[] {
  const maximumDimension = 240;
  const scale = Math.min(
    1,
    maximumDimension / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) return [];

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  const pixels = context.getImageData(0, 0, width, height).data;
  const histogram = new Map<string, number>();

  for (let index = 0; index < pixels.length; index += 16) {
    if (pixels[index + 3] < 80) continue;

    const red = Math.round(pixels[index] / 32) * 32;
    const green = Math.round(pixels[index + 1] / 32) * 32;
    const blue = Math.round(pixels[index + 2] / 32) * 32;
    const key = `${Math.min(red, 255)},${Math.min(green, 255)},${Math.min(blue, 255)}`;
    histogram.set(key, (histogram.get(key) ?? 0) + 1);
  }

  return [...histogram.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 10)
    .map(([key]) => {
      const [red, green, blue] = key.split(",").map(Number);
      return rgbToHex(red, green, blue);
    });
}

function recolorLogo(params: {
  image: HTMLImageElement;
  detectedColors: string[];
  selectedColors: PantoneColor[];
}): string | null {
  if (params.detectedColors.length === 0 || params.selectedColors.length === 0) {
    return null;
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  canvas.width = params.image.naturalWidth;
  canvas.height = params.image.naturalHeight;
  context.drawImage(params.image, 0, 0);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const sourceColors = params.detectedColors.map(hexToRgb);
  const targetColors = params.selectedColors.map((color) => hexToRgb(color.hex));

  for (let index = 0; index < imageData.data.length; index += 4) {
    if (imageData.data[index + 3] < 20) continue;

    const pixel: [number, number, number] = [
      imageData.data[index],
      imageData.data[index + 1],
      imageData.data[index + 2],
    ];
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    sourceColors.forEach((sourceColor, sourceIndex) => {
      const distance = colorDistance(pixel, sourceColor);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = sourceIndex;
      }
    });

    const targetColor = targetColors[nearestIndex % targetColors.length];
    imageData.data[index] = targetColor[0];
    imageData.data[index + 1] = targetColor[1];
    imageData.data[index + 2] = targetColor[2];
  }

  context.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

function createTightLogoPreview(image: HTMLImageElement): {
  url: string | null;
  aspectRatio: number;
} {
  const maximumPreviewSize = 1800;
  const scale = Math.min(
    1,
    maximumPreviewSize / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return {
      url: null,
      aspectRatio: image.naturalWidth / Math.max(image.naturalHeight, 1),
    };
  }

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  const pixels = context.getImageData(0, 0, width, height).data;
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = pixels[(y * width + x) * 4 + 3];

      // Ignora também halos praticamente invisíveis que, em muitos PNG,
      // ocupam o canvas inteiro e impediam o ajuste ao conteúdo real.
      if (alpha <= 28) continue;

      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }

  if (right < left || bottom < top) {
    return {
      url: null,
      aspectRatio: image.naturalWidth / Math.max(image.naturalHeight, 1),
    };
  }

  const contentWidth = right - left + 1;
  const contentHeight = bottom - top + 1;
  const hasUsefulTransparentMargin =
    contentWidth < width * 0.98 || contentHeight < height * 0.98;

  if (!hasUsefulTransparentMargin) {
    return {
      url: null,
      aspectRatio: width / Math.max(height, 1),
    };
  }

  const padding = Math.max(2, Math.round(Math.min(width, height) * 0.01));
  const cropLeft = Math.max(0, left - padding);
  const cropTop = Math.max(0, top - padding);
  const cropRight = Math.min(width - 1, right + padding);
  const cropBottom = Math.min(height - 1, bottom + padding);
  const cropWidth = cropRight - cropLeft + 1;
  const cropHeight = cropBottom - cropTop + 1;
  const croppedCanvas = document.createElement("canvas");
  const croppedContext = croppedCanvas.getContext("2d");

  if (!croppedContext) {
    return {
      url: null,
      aspectRatio: contentWidth / Math.max(contentHeight, 1),
    };
  }

  croppedCanvas.width = cropWidth;
  croppedCanvas.height = cropHeight;
  croppedContext.drawImage(
    canvas,
    cropLeft,
    cropTop,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight,
  );

  return {
    url: croppedCanvas.toDataURL("image/png"),
    aspectRatio: cropWidth / Math.max(cropHeight, 1),
  };
}

function getTextLayerMetrics(params: {
  layer: TextLayer;
  printAreaAspectRatio: number;
}): { width: number; height: number } {
  if (!params.layer.content.trim()) return { width: 0, height: 0 };

  if (typeof document === "undefined") {
    return {
      width:
        (params.layer.content.length * params.layer.fontSize * 0.58) /
        Math.max(params.printAreaAspectRatio, 0.01),
      height: params.layer.fontSize * 1.2,
    };
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const referenceFontSize = 100;

  if (!context) return { width: 0, height: params.layer.fontSize * 1.2 };

  context.font = `${params.layer.fontStyle} ${params.layer.fontWeight} ${referenceFontSize}px "${params.layer.fontFamily}"`;
  const measuredWidth = context.measureText(params.layer.content).width;
  const height = params.layer.fontSize * 1.2;
  const width =
    ((measuredWidth / referenceFontSize) * params.layer.fontSize) /
    Math.max(params.printAreaAspectRatio, 0.01);

  return { width, height };
}

function getSafeTextLayer(params: {
  layer: TextLayer;
  printAreaAspectRatio: number;
}): TextLayer {
  const rotation = normalizeRotation(params.layer.rotation);
  let fontSize = clamp(params.layer.fontSize, 4, 90);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const metrics = getTextLayerMetrics({
      layer: { ...params.layer, fontSize },
      printAreaAspectRatio: params.printAreaAspectRatio,
    });
    const radians = (rotation * Math.PI) / 180;
    const cosine = Math.abs(Math.cos(radians));
    const sine = Math.abs(Math.sin(radians));
    const rotatedWidth = metrics.width * cosine + metrics.height * sine;
    const rotatedHeight = metrics.width * sine + metrics.height * cosine;

    if (rotatedWidth <= 100 && rotatedHeight <= 100) {
      return {
        ...params.layer,
        fontSize,
        rotation,
        x: clamp(params.layer.x, rotatedWidth / 2, 100 - rotatedWidth / 2),
        y: clamp(params.layer.y, rotatedHeight / 2, 100 - rotatedHeight / 2),
      };
    }

    fontSize *= Math.min(100 / Math.max(rotatedWidth, 0.01), 100 / Math.max(rotatedHeight, 0.01));
  }

  return { ...params.layer, fontSize: Math.max(4, fontSize), rotation, x: 50, y: 50 };
}

async function loadCanvasImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Não foi possível preparar a imagem para a arte final."));
    image.src = url;
  });
}

async function createComposedArtworkFile(params: {
  artworkUrl: string | null;
  logoPosition: LogoPosition;
  logoAspectRatio: number;
  textLayer: TextLayer;
  printAreaDimensions: PrintAreaDimensions;
}): Promise<File | null> {
  const hasArtwork = Boolean(params.artworkUrl);
  const hasText = Boolean(params.textLayer.content.trim());
  if (!hasArtwork && !hasText) return null;

  const dpi = 300;
  const canvas = document.createElement("canvas");
  const requestedWidth = Math.max(1, Math.round((params.printAreaDimensions.widthMm / 25.4) * dpi));
  const requestedHeight = Math.max(1, Math.round((params.printAreaDimensions.heightMm / 25.4) * dpi));
  const exportScale = Math.min(1, 2400 / Math.max(requestedWidth, requestedHeight));
  canvas.width = Math.max(1, Math.round(requestedWidth * exportScale));
  canvas.height = Math.max(1, Math.round(requestedHeight * exportScale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível gerar a arte final.");

  if (params.artworkUrl) {
    const image = await loadCanvasImage(params.artworkUrl);
    const width = (params.logoPosition.width / 100) * canvas.width;
    const height = width / Math.max(params.logoAspectRatio, 0.01);
    const left = ((params.logoPosition.x + params.logoPosition.width / 2) / 100) * canvas.width;
    const topPercent =
      params.logoPosition.y +
      getLogoHeightPercent({
        logoWidthPercent: params.logoPosition.width,
        printAreaAspectRatio:
          params.printAreaDimensions.widthMm / params.printAreaDimensions.heightMm,
        logoAspectRatio: params.logoAspectRatio,
      }) /
        2;
    const top = (topPercent / 100) * canvas.height;

    context.save();
    context.translate(left, top);
    context.rotate((params.logoPosition.rotation * Math.PI) / 180);
    context.drawImage(image, -width / 2, -height / 2, width, height);
    context.restore();
  }

  if (hasText) {
    const layer = getSafeTextLayer({
      layer: params.textLayer,
      printAreaAspectRatio:
        params.printAreaDimensions.widthMm / params.printAreaDimensions.heightMm,
    });
    const fontPixels = (layer.fontSize / 100) * canvas.height;
    context.save();
    context.translate((layer.x / 100) * canvas.width, (layer.y / 100) * canvas.height);
    context.rotate((layer.rotation * Math.PI) / 180);
    context.font = `${layer.fontStyle} ${layer.fontWeight} ${fontPixels}px "${layer.fontFamily}"`;
    context.fillStyle = layer.color;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(layer.content, 0, 0);
    context.restore();
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Não foi possível exportar a arte final.");

  return new File([blob], "arte-final-personalizacao.png", { type: "image/png" });
}

function getLogoHeightPercent(params: {
  logoWidthPercent: number;
  printAreaAspectRatio: number;
  logoAspectRatio: number;
}): number {
  return (
    (params.logoWidthPercent * params.printAreaAspectRatio) /
    params.logoAspectRatio
  );
}

function getRotatedLogoSizePercent(params: {
  logoWidthPercent: number;
  printAreaAspectRatio: number;
  logoAspectRatio: number;
  rotation: number;
}): { width: number; height: number } {
  const radians = (normalizeRotation(params.rotation) * Math.PI) / 180;
  const cosine = Math.abs(Math.cos(radians));
  const sine = Math.abs(Math.sin(radians));
  const logoHeightPercent = getLogoHeightPercent(params);

  // Width and height use different percentage scales in a non-square area.
  // Convert through the physical aspect ratio before calculating the rotated
  // bounding box, otherwise a 90º logo in a 40 × 5 area is capped far too soon.
  return {
    width:
      params.logoWidthPercent * cosine +
      (logoHeightPercent / params.printAreaAspectRatio) * sine,
    height:
      params.logoWidthPercent * params.printAreaAspectRatio * sine +
      logoHeightPercent * cosine,
  };
}

function getSafeLogoPosition(params: {
  position: LogoPosition;
  printAreaAspectRatio: number;
  logoAspectRatio: number;
}): LogoPosition {
  const rotation = normalizeRotation(params.position.rotation);
  const rotationRadians = (rotation * Math.PI) / 180;
  const cosine = Math.abs(Math.cos(rotationRadians));
  const sine = Math.abs(Math.sin(rotationRadians));
  const heightRatio = params.printAreaAspectRatio / params.logoAspectRatio;
  const widthLimit =
    100 / Math.max(cosine + sine / params.logoAspectRatio, 0.0001);
  const heightLimit =
    100 /
    Math.max(
      params.printAreaAspectRatio * sine + heightRatio * cosine,
      0.0001,
    );
  // O editor pode ampliar a arte até preencher qualquer um dos dois eixos.
  // A dimensão que ultrapassar a área é recortada apenas pela máscara final.
  const maximumWidth = Math.max(
    widthLimit,
    heightLimit,
  );
  const safeWidth = clamp(params.position.width, Math.min(10, maximumWidth), maximumWidth);

  const logoHeight = getLogoHeightPercent({
    logoWidthPercent: safeWidth,
    printAreaAspectRatio: params.printAreaAspectRatio,
    logoAspectRatio: params.logoAspectRatio,
  });

  const centerX = clamp(params.position.x + safeWidth / 2, 0, 100);
  const centerY = clamp(params.position.y + logoHeight / 2, 0, 100);

  return {
    // Mantemos apenas o centro da arte dentro da área. As extremidades podem
    // ultrapassá-la no editor; a máscara do produto e o canvas de exportação
    // mostram exatamente a parte que será impressa.
    x: centerX - safeWidth / 2,
    y: centerY - logoHeight / 2,
    width: safeWidth,
    rotation,
  };
}

function normalizeRotation(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const normalized = ((value % 360) + 360) % 360;
  return Math.round(normalized * 10) / 10;
}

function getSuggestedRotation(params: {
  printAreaAspectRatio: number;
  logoAspectRatio: number;
}): number {
  const printAreaIsVertical = params.printAreaAspectRatio < 0.8;
  const logoIsHorizontal = params.logoAspectRatio > 1.25;

  return printAreaIsVertical && logoIsHorizontal ? 90 : 0;
}

function getMaximumLogoWidthPercent(params: {
  printAreaAspectRatio: number;
  logoAspectRatio: number;
  rotation: number;
}): number {
  return getSafeLogoPosition({
    // A largura lógica pode ultrapassar 100% antes da rotação. Por exemplo,
    // numa área vertical 120 × 25, um logótipo horizontal rodado 90º precisa
    // de vários múltiplos da largura curta para ocupar o comprimento útil.
    position: { x: 0, y: 0, width: 10_000, rotation: params.rotation },
    printAreaAspectRatio: params.printAreaAspectRatio,
    logoAspectRatio: params.logoAspectRatio,
  }).width;
}

function getContainedLogoWidthPercent(params: {
  printAreaAspectRatio: number;
  logoAspectRatio: number;
  rotation: number;
}): number {
  const rotation = normalizeRotation(params.rotation);
  const radians = (rotation * Math.PI) / 180;
  const cosine = Math.abs(Math.cos(radians));
  const sine = Math.abs(Math.sin(radians));
  const widthLimit =
    100 / Math.max(cosine + sine / params.logoAspectRatio, 0.0001);
  const heightLimit =
    100 /
    Math.max(
      params.printAreaAspectRatio * sine +
        (params.printAreaAspectRatio / params.logoAspectRatio) * cosine,
      0.0001,
    );

  return Math.min(widthLimit, heightLimit);
}

function getCenteredFittedLogoPosition(params: {
  printAreaAspectRatio: number;
  logoAspectRatio: number;
  rotation: number;
}): LogoPosition {
  // O carregamento inicial mostra a imagem completa. Depois, o utilizador
  // pode ampliá-la livremente até preencher o outro eixo da área.
  const maximumWidth = getContainedLogoWidthPercent(params);
  const logoHeight = getLogoHeightPercent({
    logoWidthPercent: maximumWidth,
    printAreaAspectRatio: params.printAreaAspectRatio,
    logoAspectRatio: params.logoAspectRatio,
  });

  return getSafeLogoPosition({
    position: {
      x: (100 - maximumWidth) / 2,
      y: (100 - logoHeight) / 2,
      width: maximumWidth,
      rotation: params.rotation,
    },
    printAreaAspectRatio: params.printAreaAspectRatio,
    logoAspectRatio: params.logoAspectRatio,
  });
}

function getTableCodeOptionColorCount(
  tableCodeOption: string | null,
): number | null {
  if (!tableCodeOption) return null;

  const match = tableCodeOption.trim().match(/-(\d+)$/);
  if (!match) return null;

  const count = Number(match[1]);
  return Number.isInteger(count) && count > 0 ? count : null;
}

function getPrintColorMode(tier: ProductEditorCustomizationPrice): PrintColorMode | null {
  if (tier.allow_full_color || /-F$/i.test(tier.table_code_option ?? "")) {
    return "full";
  }

  if (tier.price_by_color) {
    // O fornecedor codifica a quantidade desta opção no último segmento do
    // TableCodeOption (por exemplo, PDP1-01-02 = opção de duas cores).
    // MaxColors é apenas o limite da técnica e não identifica a opção.
    const optionColorCount = getTableCodeOptionColorCount(
      tier.table_code_option,
    );

    if (optionColorCount) {
      return `colors:${optionColorCount}`;
    }

    if (tier.max_colors && tier.max_colors > 0) {
      return `colors:${tier.max_colors}`;
    }
  }

  return null;
}

function getPrintColorOptions(tiers: ProductEditorCustomizationPrice[]): PrintColorOption[] {
  const modes = new Set<PrintColorMode>();

  for (const tier of tiers) {
    const mode = getPrintColorMode(tier);
    if (mode) modes.add(mode);
  }

  return [...modes]
    .sort((left, right) => {
      if (left === "full") return 1;
      if (right === "full") return -1;
      return Number(left.split(":")[1]) - Number(right.split(":")[1]);
    })
    .map((mode) => {
      if (mode === "full") {
        return { mode, label: "Todas as cores da imagem" };
      }

      const count = Number(mode.split(":")[1]);
      return {
        mode,
        label: `${count} ${count === 1 ? "cor" : "cores"}`,
      };
    });
}

function getPreferredPreviewImage(params: {
  selectedLocation: ProductEditorLocation | null;
  selectedColor: ProductEditorVariant | null;
  productImageUrl: string | null;
}): string | null {
  return (
    params.selectedLocation?.printing_lines_image_url ??
    params.selectedLocation?.area_image_url ??
    params.selectedLocation?.location_image_url ??
    params.selectedLocation?.preview_image_url ??
    params.selectedColor?.image_url ??
    params.productImageUrl
  );
}

function findCustomizationPriceTier(
  tiers: ProductEditorCustomizationPrice[],
  quantity: number,
  areaCm2?: number | null,
  printColorMode?: PrintColorMode | null,
): ProductEditorCustomizationPrice | null {
  const requestedArea = areaCm2 && areaCm2 > 0 ? areaCm2 : null;
  const series = new Map<string, ProductEditorCustomizationPrice[]>();

  for (const tier of tiers) {
    const key = tier.table_code_option ?? tier.table_code;
    const current = series.get(key) ?? [];

    current.push(tier);
    series.set(key, current);
  }

  const candidates = [...series.entries()].map(([key, prices]) => {
    const areas = prices
      .filter((price) => price.price_by_area && price.area_cm2 !== null)
      .map((price) => price.area_cm2 as number);
    const seriesArea = areas.length > 0 ? Math.max(...areas) : null;
    const colors = getTableCodeOptionColorCount(key);

    return {
      key,
      prices,
      seriesArea,
      colors: colors && Number.isFinite(colors) ? colors : null,
      printColorMode: getPrintColorMode(prices[0]),
    };
  });

  const colorCandidates = printColorMode
    ? candidates.filter((candidate) => candidate.printColorMode === printColorMode)
    : candidates;
  const selectableCandidates = colorCandidates.length > 0 ? colorCandidates : candidates;

  const areaCandidates = requestedArea
    ? selectableCandidates.filter(
        (candidate) =>
          candidate.seriesArea === null ||
          candidate.seriesArea >= requestedArea,
      )
    : selectableCandidates;
  const applicableCandidates =
    areaCandidates.length > 0 ? areaCandidates : selectableCandidates;
  const selectedSeries = [...applicableCandidates].sort((a, b) => {
    const aArea = a.seriesArea ?? Number.POSITIVE_INFINITY;
    const bArea = b.seriesArea ?? Number.POSITIVE_INFINITY;

    if (aArea !== bArea) {
      return aArea - bArea;
    }

    const aColors = a.colors ?? Number.POSITIVE_INFINITY;
    const bColors = b.colors ?? Number.POSITIVE_INFINITY;

    if (aColors !== bColors) {
      return aColors - bColors;
    }

    return a.key.localeCompare(b.key);
  })[0];

  const sorted = [...(selectedSeries?.prices ?? [])].sort((a, b) => {
    if (a.quantity_min !== b.quantity_min) {
      return a.quantity_min - b.quantity_min;
    }

    const aMax = a.quantity_max ?? Number.POSITIVE_INFINITY;
    const bMax = b.quantity_max ?? Number.POSITIVE_INFINITY;

    return aMax - bMax;
  });

  return (
    sorted
      .filter(
        (tier) =>
          quantity >= tier.quantity_min &&
          (tier.quantity_max === null || quantity <= tier.quantity_max),
      )
      .at(-1) ??
    sorted.filter((tier) => quantity >= tier.quantity_min).at(-1) ??
    sorted[0] ??
    null
  );
}

function getCustomizationQuantityBreaks(params: {
  tiers: ProductEditorCustomizationPrice[];
  areaCm2?: number | null;
  printColorMode?: PrintColorMode | null;
}): number[] {
  const quantities = new Set<number>();

  for (const tier of params.tiers) {
    if (tier.quantity_min > 0) {
      quantities.add(tier.quantity_min);
    }
  }

  return [...quantities]
    .sort((a, b) => a - b)
    .filter((quantity, index, allQuantities) => {
      const tier = findCustomizationPriceTier(
        params.tiers,
        quantity,
        params.areaCm2,
        params.printColorMode,
      );

      if (!tier) {
        return false;
      }

      if (index === 0) {
        return true;
      }

      const previousTier = findCustomizationPriceTier(
        params.tiers,
        allQuantities[index - 1],
        params.areaCm2,
        params.printColorMode,
      );

      return (
        !previousTier ||
        tier.final_price !== previousTier.final_price ||
        tier.handling_cost !== previousTier.handling_cost
      );
    });
}

function getEstimatedProductionDays(technique: string | null): string {
  const normalized = technique?.normalize("NFD").toLowerCase() ?? "";

  if (normalized.includes("bordado")) {
    return "5 a 8 dias úteis";
  }

  if (normalized.includes("tampografia")) {
    return "3 a 6 dias úteis";
  }

  if (normalized.includes("uv")) {
    return "1 a 4 dias úteis";
  }

  if (normalized.includes("laser")) {
    return "1 a 4 dias úteis";
  }

  return "3 a 6 dias úteis";
}

function findProductPriceTier(params: {
  prices: ProductEditorPrice[];
  selectedVariantId: string | null;
  quantity: number;
}): ProductEditorPrice | null {
  const variantPrices = params.selectedVariantId
    ? params.prices.filter(
        (price) => price.variant_id === params.selectedVariantId,
      )
    : [];

  const productPrices = params.prices.filter((price) => !price.variant_id);

  const activePrices =
    variantPrices.length > 0
      ? variantPrices
      : productPrices.length > 0
        ? productPrices
        : params.prices;

  const sortedPrices = [...activePrices].sort(
    (a, b) => a.quantity_min - b.quantity_min,
  );

  const matchingPrice = sortedPrices.find((price) => {
    const minMatches = params.quantity >= price.quantity_min;
    const maxMatches =
      price.quantity_max === null || params.quantity <= price.quantity_max;

    return minMatches && maxMatches;
  });

  if (matchingPrice) {
    return matchingPrice;
  }

  const fallbackPrice = sortedPrices
    .filter((price) => params.quantity >= price.quantity_min)
    .at(-1);

  return fallbackPrice ?? sortedPrices[0] ?? null;
}

type EditorResume = {
  quantity: number; quantityInput: string; selectedGroupId: string | null;
  selectedLocationId: string | null; logoFile: File | null; logoPreviewUrl: string | null;
  logoFileName: string | null; detectedLogoColors: string[];
  selectedPantoneColors: Array<PantoneColor | null>; logoAspectRatio: number;
  detectedPrintAreaAspectRatio: number | null;
  position: LogoPosition; textLayer: TextLayer; needsDesignHelp: boolean;
  extraProof: boolean; nominative: boolean; internalReference: string; notes: string;
  selectedPrintColorMode: PrintColorMode | null;
};

export default function ProductCustomizationEditor(props: ProductCustomizationEditorProps) {
  return <ShoppingResume<EditorResume>>{(resume) => <CustomizationEditor {...props} resume={resume} />}</ShoppingResume>;
}

function CustomizationEditor({
  resume,
  locale = "pt",
  productId,
  supplierId,
  productName,
  productSlug,
  productImageUrl,
  variants,
  locations,
  productPrices,
  initialDraftId,
  initialVariantId,
  initialLocationId,
  initialQuantity = 1,
  minimumQuantity,
}: ProductCustomizationEditorProps & { resume?: EditorResume }) {
  const router = useRouter();
  const copy = getEditorCopy(locale);
  const textCopy = TEXT_EDITOR_COPY[locale];
  const intlLocale = SITE_LOCALES[locale].intlLocale;
  const formatPrice = (value: number, currency = "EUR") =>
    formatPriceValue(value, currency, intlLocale);

  const printAreaRef = useRef<HTMLDivElement | null>(null);

  const dragStateRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const [isSavingDraft, startSavingDraft] = useTransition();

  const selectedColor = useMemo(
    () =>
      variants.find((variant) => variant.id === initialVariantId) ??
      variants[0] ??
      null,
    [initialVariantId, variants],
  );

  const initialSafeQuantity = Math.max(
    minimumQuantity,
    Math.floor(initialQuantity),
  );
  const [quantity, setQuantity] = useState(resume?.quantity ?? initialSafeQuantity);
  const [quantityInput, setQuantityInput] = useState(resume?.quantityInput ?? String(initialSafeQuantity));

  const locationGroups = useMemo(
    () =>
      buildLocationGroups({
        locations,
        selectedVariantId: selectedColor?.id ?? initialVariantId ?? null,
      }),
    [initialVariantId, locations, selectedColor?.id],
  );

  const initialGroupId = useMemo(() => {
    if (!initialLocationId) {
      return locationGroups[0]?.id ?? null;
    }

    const group = locationGroups.find((item) =>
      item.options.some(
        (option) =>
          option.source_location_id === initialLocationId ||
          option.id === initialLocationId,
      ),
    );

    return group?.id ?? locationGroups[0]?.id ?? null;
  }, [initialLocationId, locationGroups]);

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    resume?.selectedGroupId ?? initialGroupId,
  );

  const selectedGroup = useMemo(
    () =>
      locationGroups.find((group) => group.id === selectedGroupId) ??
      locationGroups[0] ??
      null,
    [locationGroups, selectedGroupId],
  );

  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    resume?.selectedLocationId ?? selectedGroup?.options[0]?.id ?? null,
  );

  const selectedLocation = useMemo(
    () =>
      selectedGroup?.options.find(
        (option) => option.id === selectedLocationId,
      ) ??
      selectedGroup?.options[0] ??
      null,
    [selectedGroup, selectedLocationId],
  );

  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(resume?.logoPreviewUrl ?? null);
  const [logoFile, setLogoFile] = useState<File | null>(resume?.logoFile ?? null);
  const [logoFileName, setLogoFileName] = useState<string | null>(resume?.logoFileName ?? null);
  const [detectedLogoColors, setDetectedLogoColors] = useState<string[]>(resume?.detectedLogoColors ?? []);
  const [selectedPantoneColors, setSelectedPantoneColors] = useState<
    Array<PantoneColor | null>
  >(resume?.selectedPantoneColors ?? []);
  const [activePrintColorIndex, setActivePrintColorIndex] = useState(0);
  const [recoloredLogoPreviewUrl, setRecoloredLogoPreviewUrl] = useState<
    string | null
  >(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [logoAspectRatio, setLogoAspectRatio] = useState(resume?.logoAspectRatio ?? 3);
  const [detectedPrintAreaAspectRatio, setDetectedPrintAreaAspectRatio] =
    useState<number | null>(resume?.detectedPrintAreaAspectRatio ?? null);
  const [position, setPosition] = useState<LogoPosition>(resume?.position ?? initialPosition);
  const [textLayer, setTextLayer] = useState<TextLayer>(resume?.textLayer ?? initialTextLayer);
  const [showPriceTable, setShowPriceTable] = useState(false);
  const [showProductionTimes, setShowProductionTimes] = useState(false);
  const [needsDesignHelp, setNeedsDesignHelp] = useState(resume?.needsDesignHelp ?? false);
  const [extraProof, setExtraProof] = useState(resume?.extraProof ?? false);
  const [nominative, setNominative] = useState(resume?.nominative ?? false);
  const [internalReference, setInternalReference] = useState(resume?.internalReference ?? "");
  const [notes, setNotes] = useState(resume?.notes ?? "");

  const printColorOptions = useMemo(
    () => getPrintColorOptions(selectedLocation?.price_tiers ?? []).map((option) => ({
      ...option,
      label: option.mode === "full"
        ? copy.allImageColours
        : `${option.mode.split(":")[1]} ${Number(option.mode.split(":")[1]) === 1 ? copy.colourSingular : copy.colourPlural}`,
    })),
    [copy.allImageColours, copy.colourPlural, copy.colourSingular, selectedLocation?.price_tiers],
  );
  const [selectedPrintColorMode, setSelectedPrintColorMode] =
    useState<PrintColorMode | null>(resume?.selectedPrintColorMode ?? null);
  useShoppingLoginSnapshot(async (): Promise<EditorResume> => ({
    quantity, quantityInput, selectedGroupId, selectedLocationId, logoFile, logoFileName,
    logoPreviewUrl: await snapshotImage(logoPreviewUrl),
    detectedLogoColors, selectedPantoneColors, logoAspectRatio, detectedPrintAreaAspectRatio, position, textLayer,
    needsDesignHelp, extraProof, nominative, internalReference, notes, selectedPrintColorMode,
  }));
  const effectivePrintColorMode =
    selectedPrintColorMode &&
    printColorOptions.some((option) => option.mode === selectedPrintColorMode)
      ? selectedPrintColorMode
      : (printColorOptions[0]?.mode ?? null);
  const requiredPrintColorCount =
    effectivePrintColorMode?.startsWith("colors:")
      ? Number(effectivePrintColorMode.split(":")[1])
      : 0;
  const selectedPantoneValues = useMemo(
    () =>
      selectedPantoneColors.filter(
        (color): color is PantoneColor => color !== null,
      ),
    [selectedPantoneColors],
  );
  const printColorsAreValid =
    effectivePrintColorMode === "full" ||
    requiredPrintColorCount === 0 ||
    selectedPantoneValues.length === requiredPrintColorCount;
  const displayedLogoPreviewUrl =
    recoloredLogoPreviewUrl ?? logoPreviewUrl;

  const declaredPrintAreaDimensions = parsePrintAreaDimensions(
    selectedLocation?.max_printing_area_mm ?? null,
  );

  const supplierGeometryAspectRatio = selectedLocation?.print_area_geometry
    ? selectedLocation.print_area_geometry.width /
      selectedLocation.print_area_geometry.height
    : null;
  const declaredPrintAreaIsHorizontal =
    declaredPrintAreaDimensions.widthMm >= declaredPrintAreaDimensions.heightMm;
  const supplierAreaIsHorizontal = detectedPrintAreaAspectRatio !== null
    ? detectedPrintAreaAspectRatio >= 1
    : supplierGeometryAspectRatio !== null
      ? supplierGeometryAspectRatio >= 1
      : declaredPrintAreaIsHorizontal;
  const shouldSwapPrintAreaDimensions =
    (detectedPrintAreaAspectRatio !== null ||
      supplierGeometryAspectRatio !== null) &&
    declaredPrintAreaIsHorizontal !== supplierAreaIsHorizontal;
  const printAreaDimensions = shouldSwapPrintAreaDimensions
    ? {
        widthMm: declaredPrintAreaDimensions.heightMm,
        heightMm: declaredPrintAreaDimensions.widthMm,
      }
    : declaredPrintAreaDimensions;

  const printAreaAspectRatio =
    printAreaDimensions.widthMm / printAreaDimensions.heightMm;
  // A área do editor tem de preservar a proporção física recebida do
  // fornecedor. O limite visual anterior (1.55) fazia uma área 160 × 50
  // comportar-se como uma área quase quadrada e bloqueava o zoom cedo demais.
  const editorAreaAspectRatio = printAreaAspectRatio;
  const editorPrintAreaStyle =
    printAreaAspectRatio < 0.8
      ? { height: "88%", aspectRatio: String(printAreaAspectRatio) }
      : { width: "92%", aspectRatio: String(printAreaAspectRatio) };

  const geometrySafePosition = getSafeLogoPosition({
    position,
    printAreaAspectRatio: editorAreaAspectRatio,
    logoAspectRatio,
  });

  const geometricMaximumLogoWidthPercent = getMaximumLogoWidthPercent({
    printAreaAspectRatio: editorAreaAspectRatio,
    logoAspectRatio,
    rotation: geometrySafePosition.rotation,
  });
  const maximumAllowedLogoWidthPercent = geometricMaximumLogoWidthPercent;
  const safePosition = getSafeLogoPosition({
    position: {
      ...position,
      width: Math.min(position.width, maximumAllowedLogoWidthPercent),
    },
    printAreaAspectRatio: editorAreaAspectRatio,
    logoAspectRatio,
  });

  const logoHeightPercent = getLogoHeightPercent({
    logoWidthPercent: safePosition.width,
    printAreaAspectRatio: editorAreaAspectRatio,
    logoAspectRatio,
  });
  const rotatedLogoSize = getRotatedLogoSizePercent({
    logoWidthPercent: safePosition.width,
    printAreaAspectRatio: editorAreaAspectRatio,
    logoAspectRatio,
    rotation: safePosition.rotation,
  });
  const logoCenterX = safePosition.x + safePosition.width / 2;
  const logoCenterY = safePosition.y + logoHeightPercent / 2;

  const logoBounds = (() => {
    if (!logoPreviewUrl) return null;
    const centerX = safePosition.x + safePosition.width / 2;
    const centerY = safePosition.y + logoHeightPercent / 2;
    return {
      left: Math.max(0, centerX - rotatedLogoSize.width / 2),
      right: Math.min(100, centerX + rotatedLogoSize.width / 2),
      top: Math.max(0, centerY - rotatedLogoSize.height / 2),
      bottom: Math.min(100, centerY + rotatedLogoSize.height / 2),
    };
  })();
  const textBounds = (() => {
    if (!textLayer.content.trim()) return null;
    const metrics = getTextLayerMetrics({ layer: textLayer, printAreaAspectRatio });
    const radians = (textLayer.rotation * Math.PI) / 180;
    const rotatedWidth = metrics.width * Math.abs(Math.cos(radians)) + metrics.height * Math.abs(Math.sin(radians));
    const rotatedHeight = metrics.width * Math.abs(Math.sin(radians)) + metrics.height * Math.abs(Math.cos(radians));
    return { left: textLayer.x - rotatedWidth / 2, right: textLayer.x + rotatedWidth / 2, top: textLayer.y - rotatedHeight / 2, bottom: textLayer.y + rotatedHeight / 2 };
  })();
  const artworkBounds = [logoBounds, textBounds].filter((value): value is NonNullable<typeof value> => Boolean(value));
  const occupiedWidthPercent = artworkBounds.length
    ? Math.max(...artworkBounds.map((item) => item.right)) - Math.min(...artworkBounds.map((item) => item.left))
    : 0;
  const occupiedHeightPercent = artworkBounds.length
    ? Math.max(...artworkBounds.map((item) => item.bottom)) - Math.min(...artworkBounds.map((item) => item.top))
    : 0;
  const logoWidthMm = roundMoney((occupiedWidthPercent / 100) * printAreaDimensions.widthMm);
  const logoHeightMm = roundMoney((occupiedHeightPercent / 100) * printAreaDimensions.heightMm);

  const previewBaseImage = getPreferredPreviewImage({
    selectedLocation,
    selectedColor,
    productImageUrl,
  });

  const productPriceTier = findProductPriceTier({
    prices: productPrices,
    selectedVariantId: selectedColor?.id ?? null,
    quantity,
  });

  const productUnitPrice = productPriceTier?.final_price ?? 0;
  const productCurrency = productPriceTier?.currency ?? "EUR";
  const productSubtotal = roundMoney(productUnitPrice * quantity);

  const personalizationPriceTier = findCustomizationPriceTier(
    selectedLocation?.price_tiers ?? [],
    quantity,
    logoWidthMm && logoHeightMm ? (logoWidthMm * logoHeightMm) / 100 : null,
    effectivePrintColorMode,
  );
  const personalizationUnitPrice =
    personalizationPriceTier?.final_price ?? 0;
  const setupCost = personalizationPriceTier?.handling_cost ?? 0;

  const customizationQuantityBreaks = useMemo(
    () =>
      getCustomizationQuantityBreaks({
        tiers: selectedLocation?.price_tiers ?? [],
        areaCm2:
          logoWidthMm && logoHeightMm
            ? (logoWidthMm * logoHeightMm) / 100
            : null,
        printColorMode: effectivePrintColorMode,
      }),
    [logoHeightMm, logoWidthMm, selectedLocation?.price_tiers, effectivePrintColorMode],
  );

  const nextSavingTier = (() => {
    if (!personalizationPriceTier || personalizationUnitPrice <= 0) {
      return null;
    }

    for (const tierQuantity of customizationQuantityBreaks) {
      if (tierQuantity <= quantity) {
        continue;
      }

      const tier = findCustomizationPriceTier(
        selectedLocation?.price_tiers ?? [],
        tierQuantity,
        logoWidthMm && logoHeightMm
          ? (logoWidthMm * logoHeightMm) / 100
          : null,
        effectivePrintColorMode,
      );

      if (tier && tier.final_price < personalizationUnitPrice) {
        return {
          quantity: tierQuantity,
          unitPrice: tier.final_price,
          savingPercentage: Math.round(
            ((personalizationUnitPrice - tier.final_price) /
              personalizationUnitPrice) *
              100,
          ),
        };
      }
    }

    return null;
  })();

  const personalizationSubtotal = roundMoney(
    personalizationUnitPrice * quantity,
  );

  const extrasTotal = roundMoney(
    (needsDesignHelp ? 21 : 0) +
      (extraProof ? 15 : 0) +
      (nominative ? 0.7 * quantity : 0),
  );

  const estimatedTotal = roundMoney(
    productSubtotal + personalizationSubtotal + setupCost + extrasTotal,
  );

  const productionDays = getEstimatedProductionDays(
    selectedLocation?.technique ?? null,
  );

  // Compare dependencies instead of resetting recovered input on mount (also in Strict Mode).
  const locationResetKey = selectedGroup?.id;
  const colorsResetKey = `${effectivePrintColorMode}:${requiredPrintColorCount}`;
  const positionResetKey = selectedLocation?.id;
  const centerResetKey = `${editorAreaAspectRatio}:${logoAspectRatio}:${maximumAllowedLogoWidthPercent}`;
  const previousLocation = useRef(resume ? locationResetKey : Symbol());
  const previousColors = useRef(resume ? colorsResetKey : Symbol());
  const previousPosition = useRef(resume ? positionResetKey : Symbol());
  const previousCenter = useRef(resume ? centerResetKey : Symbol());

  useEffect(() => {
    if (
      selectedGroupId &&
      locationGroups.some((group) => group.id === selectedGroupId)
    ) {
      return;
    }

    setSelectedGroupId(locationGroups[0]?.id ?? null);
  }, [locationGroups, selectedGroupId]);

  useEffect(() => {
    if (previousLocation.current === locationResetKey) return;
    previousLocation.current = locationResetKey;
    setSelectedLocationId(selectedGroup?.options[0]?.id ?? null);
  }, [locationResetKey, selectedGroup?.id, selectedGroup?.options]);

  useEffect(() => {
    if (previousColors.current === colorsResetKey) return;
    previousColors.current = colorsResetKey;
    setSelectedPantoneColors(
      requiredPrintColorCount > 0
        ? Array.from({ length: requiredPrintColorCount }, () => null)
        : [],
    );
    setActivePrintColorIndex(0);
    setRecoloredLogoPreviewUrl(null);
  }, [colorsResetKey, effectivePrintColorMode, requiredPrintColorCount]);

  useEffect(() => {
    if (
      !logoPreviewUrl ||
      effectivePrintColorMode === "full" ||
      !printColorsAreValid
    ) {
      setRecoloredLogoPreviewUrl(null);
      return;
    }

    const image = new Image();
    image.onload = () => {
      setRecoloredLogoPreviewUrl(
        recolorLogo({
          image,
          detectedColors: detectedLogoColors,
          selectedColors: selectedPantoneValues,
        }),
      );
    };
    image.src = logoPreviewUrl;
  }, [
    detectedLogoColors,
    effectivePrintColorMode,
    logoPreviewUrl,
    printColorsAreValid,
    selectedPantoneValues,
  ]);

  useEffect(() => {
    if (previousPosition.current === positionResetKey) return;
    previousPosition.current = positionResetKey;
    const rotation = getSuggestedRotation({
      printAreaAspectRatio,
      logoAspectRatio,
    });

    setPosition(
      getCenteredFittedLogoPosition({
        printAreaAspectRatio: editorAreaAspectRatio,
        logoAspectRatio,
        rotation,
      }),
    );
  }, [positionResetKey, selectedLocation?.id, printAreaAspectRatio, editorAreaAspectRatio, logoAspectRatio]);

  useEffect(() => {
    if (previousCenter.current === centerResetKey) return;
    previousCenter.current = centerResetKey;
    setPosition((current) => {
      const width = Math.min(current.width, maximumAllowedLogoWidthPercent);
      const height = getLogoHeightPercent({
        logoWidthPercent: width,
        printAreaAspectRatio: editorAreaAspectRatio,
        logoAspectRatio,
      });

      return getSafeLogoPosition({
        position: {
          ...current,
          x: (100 - width) / 2,
          y: (100 - height) / 2,
          width,
        },
        printAreaAspectRatio: editorAreaAspectRatio,
        logoAspectRatio,
      });
    });
  }, [centerResetKey, editorAreaAspectRatio, logoAspectRatio, maximumAllowedLogoWidthPercent]);

  useEffect(() => {
    return () => {
      if (logoPreviewUrl) {
        URL.revokeObjectURL(logoPreviewUrl);
      }
    };
  }, [logoPreviewUrl]);

  function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      return;
    }

    setLogoFile(file);
    setSaveMessage(null);

    if (logoPreviewUrl) {
      URL.revokeObjectURL(logoPreviewUrl);
    }

    setLogoFileName(file.name);

    if (!file.type.startsWith("image/")) {
      setLogoPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      if (image.naturalWidth > 0 && image.naturalHeight > 0) {
        let tightPreview = {
          url: null as string | null,
          aspectRatio: image.naturalWidth / image.naturalHeight,
        };

        try {
          tightPreview = createTightLogoPreview(image);
        } catch {
          // SVGs com recursos externos podem bloquear a leitura do canvas.
          // Nesses casos mantemos a pré-visualização original sem impedir o upload.
        }

        const nextLogoAspectRatio = tightPreview.aspectRatio;
        const rotation = getSuggestedRotation({
          printAreaAspectRatio,
          logoAspectRatio: nextLogoAspectRatio,
        });
        setLogoAspectRatio(nextLogoAspectRatio);
        setDetectedLogoColors(detectLogoColors(image));
        setSelectedPantoneColors(
          requiredPrintColorCount > 0
            ? Array.from({ length: requiredPrintColorCount }, () => null)
            : [],
        );
        setRecoloredLogoPreviewUrl(null);
        setPosition(
          getCenteredFittedLogoPosition({
            printAreaAspectRatio: editorAreaAspectRatio,
            logoAspectRatio: nextLogoAspectRatio,
            rotation,
          }),
        );

        if (tightPreview.url) {
          setLogoPreviewUrl(tightPreview.url);
          URL.revokeObjectURL(objectUrl);
        }
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setLogoPreviewUrl(null);
    };

    image.src = objectUrl;
    setLogoPreviewUrl(objectUrl);
  }

  function updatePosition(key: keyof LogoPosition, value: number) {
    setPosition((current) =>
      getSafeLogoPosition({
        position: {
          ...current,
          [key]:
            key === "width"
              ? Math.min(value, maximumAllowedLogoWidthPercent)
              : value,
        },
        printAreaAspectRatio: editorAreaAspectRatio,
        logoAspectRatio,
      }),
    );
  }

  function updateArtworkPositionFromProduct(position: {
    x: number;
    y: number;
  }) {
    setPosition((current) =>
      getSafeLogoPosition({
        position: { ...current, ...position },
        printAreaAspectRatio: editorAreaAspectRatio,
        logoAspectRatio,
      }),
    );
  }

  function updateQuantity(value: number) {
    const safeQuantity = Math.max(minimumQuantity, Math.floor(value));
    setQuantity(safeQuantity);
    setQuantityInput(String(safeQuantity));
  }

  function handleQuantityInput(value: string) {
    setQuantityInput(value);
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= minimumQuantity) {
      setQuantity(Math.floor(parsed));
    }
  }

  function normalizeQuantityInput() {
    updateQuantity(quantity);
  }

  function resetPosition() {
    const rotation = getSuggestedRotation({
      printAreaAspectRatio,
      logoAspectRatio,
    });

    const fittedPosition = getCenteredFittedLogoPosition({
      printAreaAspectRatio: editorAreaAspectRatio,
      logoAspectRatio,
      rotation,
    });
    const width = Math.min(
      fittedPosition.width,
      maximumAllowedLogoWidthPercent,
    );
    const height = getLogoHeightPercent({
      logoWidthPercent: width,
      printAreaAspectRatio: editorAreaAspectRatio,
      logoAspectRatio,
    });

    setPosition({
      ...fittedPosition,
      x: (100 - width) / 2,
      y: (100 - height) / 2,
      width,
    });
  }

  function fitLogoToArea() {
    const fittedHeight = getLogoHeightPercent({
      logoWidthPercent: maximumAllowedLogoWidthPercent,
      printAreaAspectRatio,
      logoAspectRatio,
    });
    setPosition(
      getSafeLogoPosition({
        position: {
          x: (100 - maximumAllowedLogoWidthPercent) / 2,
          y: (100 - fittedHeight) / 2,
          width: maximumAllowedLogoWidthPercent,
          rotation: safePosition.rotation,
        },
        printAreaAspectRatio,
        logoAspectRatio,
      }),
    );
  }

  function centerLogo() {
    const centeredWidth = safePosition.width;

    const centeredHeight = getLogoHeightPercent({
      logoWidthPercent: centeredWidth,
      printAreaAspectRatio: editorAreaAspectRatio,
      logoAspectRatio,
    });

    setPosition(
      getSafeLogoPosition({
        position: {
          ...safePosition,
          x: (100 - centeredWidth) / 2,
          y: (100 - centeredHeight) / 2,
        },
        printAreaAspectRatio: editorAreaAspectRatio,
        logoAspectRatio,
      }),
    );
  }

  function reduceLogo() {
    updatePosition("width", safePosition.width - 8);
  }

  function enlargeLogo() {
    updatePosition("width", safePosition.width + 8);
  }

  function updateTextLayer(patch: Partial<TextLayer>) {
    setTextLayer((current) =>
      getSafeTextLayer({
        layer: { ...current, ...patch },
        printAreaAspectRatio,
      }),
    );
  }

  function fitTextToArea() {
    if (!textLayer.content.trim()) return;

    setTextLayer(
      getSafeTextLayer({
        layer: { ...textLayer, x: 50, y: 50, fontSize: 90 },
        printAreaAspectRatio,
      }),
    );
  }

  function handleLogoPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!printAreaRef.current) {
      return;
    }

    const rect = printAreaRef.current.getBoundingClientRect();
    const logoLeft = rect.left + (safePosition.x / 100) * rect.width;
    const logoTop = rect.top + (safePosition.y / 100) * rect.height;

    dragStateRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - logoLeft,
      offsetY: event.clientY - logoTop,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleLogoPointerMove(event: PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    if (!printAreaRef.current) {
      return;
    }

    const rect = printAreaRef.current.getBoundingClientRect();

    const nextX =
      ((event.clientX - rect.left - dragState.offsetX) / rect.width) * 100;

    const nextY =
      ((event.clientY - rect.top - dragState.offsetY) / rect.height) * 100;

    setPosition((current) =>
      getSafeLogoPosition({
        position: {
          ...current,
          x: nextX,
          y: nextY,
        },
        printAreaAspectRatio: editorAreaAspectRatio,
        logoAspectRatio,
      }),
    );
  }

  function handleLogoPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (dragStateRef.current?.pointerId === event.pointerId) {
      dragStateRef.current = null;
    }
  }

  function handleConfirmCustomization() {
    if (!selectedColor) {
      setSaveMessage(copy.variantError);
      return;
    }

    if (!selectedLocation) {
      setSaveMessage(copy.locationError);
      return;
    }

    if (productUnitPrice <= 0) {
      setSaveMessage(
        copy.priceError,
      );
      return;
    }

    if (!printColorsAreValid) {
      setSaveMessage(
        `${copy.selectToContinue} (${requiredPrintColorCount})`,
      );
      return;
    }

    setSaveMessage(null);

    startSavingDraft(async () => {
      if (logoFile && !displayedLogoPreviewUrl && textLayer.content.trim()) {
        setSaveMessage("Para combinar texto com este ficheiro, usa PNG, JPG, WEBP ou SVG pré-visualizável.");
        return;
      }

      const formData = new FormData();

      if (initialDraftId) {
        formData.set("draftId", initialDraftId);
      }

      formData.set("productId", productId);
      formData.set("productSlug", productSlug);
      formData.set("variantId", selectedColor.id);

      formData.set(
        "sourceLocationId",
        selectedLocation.source_location_id,
      );

      formData.set("techniqueName", selectedLocation.technique);

      formData.set(
        "componentName",
        selectedLocation.component_name ?? "",
      );

      formData.set(
        "locationName",
        selectedLocation.location_name ?? "",
      );

      formData.set("tableCode", personalizationPriceTier?.table_code ?? "");
      formData.set(
        "tableCodeOption",
        personalizationPriceTier?.table_code_option ?? "",
      );
      formData.set(
        "serviceCode",
        personalizationPriceTier?.service_code ?? "",
      );

      formData.set("quantity", String(quantity));
      formData.set("printColorMode", effectivePrintColorMode ?? "");
      formData.set(
        "printColors",
        JSON.stringify(
          selectedPantoneValues.map((color) => ({
            code: color.code,
            hex: color.hex,
          })),
        ),
      );

      formData.set(
        "personalizationUnitPrice",
        String(personalizationUnitPrice),
      );

      formData.set("setupCost", String(setupCost));
      formData.set("extrasTotal", String(extrasTotal));

      formData.set(
        "printingWidthMm",
        String(printAreaDimensions.widthMm),
      );

      formData.set(
        "printingHeightMm",
        String(printAreaDimensions.heightMm),
      );

      formData.set("logoPositionX", String(safePosition.x));
      formData.set("logoPositionY", String(safePosition.y));
      formData.set("logoScale", String(safePosition.width));
      formData.set("logoRotation", String(safePosition.rotation));
      formData.set("logoWidthMm", String(logoWidthMm));
      formData.set("logoHeightMm", String(logoHeightMm));

      formData.set("needsDesignHelp", String(needsDesignHelp));
      formData.set("extraProof", String(extraProof));
      formData.set("nominative", String(nominative));
      formData.set("internalReference", internalReference);
      formData.set("notes", notes);

      formData.set(
        "technicalPreviewUrl",
        previewBaseImage ?? "",
      );

      formData.set("supplierId", supplierId ?? "");
      formData.set("textLayer", JSON.stringify(textLayer));

      try {
        const composedArtwork = await createComposedArtworkFile({
          artworkUrl: displayedLogoPreviewUrl,
          logoPosition: safePosition,
          logoAspectRatio,
          textLayer,
          printAreaDimensions,
        });

        if (composedArtwork) {
          formData.set("logoFile", composedArtwork);
          formData.set("hasComposedArtwork", "true");
          if (logoFile) formData.set("originalLogoFile", logoFile);
        } else if (logoFile) {
          formData.set("logoFile", logoFile);
          formData.set("hasComposedArtwork", "false");
        }
      } catch (error) {
        setSaveMessage(error instanceof Error ? error.message : "Não foi possível preparar a arte final.");
        return;
      }

      const result = await saveCustomizationDraftAction(formData);

      if (!result.success || !result.redirectUrl) {
        setSaveMessage(result.message);
        return;
      }

      router.push(localizePath(result.redirectUrl, locale));
      router.refresh();
    });
  }

  if (locations.length === 0 || locationGroups.length === 0) {
    return (
      <section className="mt-8 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
          {copy.personalization}
        </p>

        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">
          {copy.unavailable}
        </h2>

        <div className="mt-6 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-sm leading-6 text-neutral-600">
          {copy.unavailableHelp}
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="mt-6 rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)]">
          <aside className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3 xl:order-1 xl:col-span-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-950">
                  {copy.location}
                </p>

                <div className="mt-3 max-h-72 space-y-1.5 overflow-y-auto pr-1">
                  {locationGroups.map((group) => {
                    const isSelected = group.id === selectedGroup?.id;

                    return (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => setSelectedGroupId(group.id)}
                        className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                          isSelected
                            ? "border-neutral-950 bg-white shadow-sm"
                            : "border-transparent bg-white/70 hover:border-neutral-300 hover:bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="break-words text-sm font-semibold text-neutral-950">
                              {group.locationName}
                            </p>

                            {group.componentName ? (
                              <p className="mt-1 break-words text-xs text-neutral-600">
                                {group.componentName}
                              </p>
                            ) : null}

                            {group.maxPrintingAreaMm ? (
                              <p className="mt-1 inline-flex items-center text-xs text-neutral-600">
                                <Ruler className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                                {group.maxPrintingAreaMm}
                              </p>
                            ) : null}
                          </div>

                          {group.isRecommended ? (
                            <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                              {copy.recommended}
                            </span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="min-w-0 border-t border-neutral-200 pt-4 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                <p className="text-sm font-semibold text-neutral-950">
                  {copy.type}
                </p>

                <div className="mt-3 max-h-72 space-y-1.5 overflow-y-auto pr-1">
                  {(selectedGroup?.options ?? []).map((option) => {
                    const isSelected = option.id === selectedLocation?.id;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelectedLocationId(option.id)}
                        className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                          isSelected
                            ? "border-neutral-950 bg-white shadow-sm"
                            : "border-transparent bg-white/70 hover:border-neutral-300 hover:bg-white"
                        }`}
                      >
                        <p className="break-words text-sm font-semibold text-neutral-950">
                          {option.technique}
                        </p>

                        {option.max_printing_area_mm ? (
                          <p className="mt-1 inline-flex items-center text-xs text-neutral-600">
                            <Ruler className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                            {option.max_printing_area_mm}
                          </p>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>

          <div className="space-y-5 xl:order-2">
            <div className="sticky top-28 overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-50">
              <div className="flex min-h-[360px] items-center justify-center bg-white sm:min-h-[440px]">
                <CustomizationLocationImage
                  urls={
                    selectedLocation
                      ? [
                          ...(selectedLocation.preview_image_urls ?? []),
                          selectedLocation.preview_image_url,
                          selectedLocation.printing_lines_image_url,
                          selectedLocation.area_image_url,
                        ]
                      : [
                          previewBaseImage,
                          selectedColor?.image_url,
                          productImageUrl,
                        ]
                  }
                  alt={`${productName} — ${selectedLocation?.technique ?? copy.personalization}`}
                  className="max-h-[600px] w-full object-contain p-5 sm:p-7"
                  artworkUrl={displayedLogoPreviewUrl}
                  artworkPosition={safePosition}
                  printAreaGeometry={selectedLocation?.print_area_geometry}
                  printAreaAspectRatio={printAreaAspectRatio}
                  artworkAspectRatio={logoAspectRatio}
                  textArtwork={textLayer}
                  onArtworkPositionChange={updateArtworkPositionFromProduct}
                  onPrintAreaAspectRatioDetected={
                    setDetectedPrintAreaAspectRatio
                  }
                />
              </div>

              <div className="border-t border-neutral-200 bg-white p-4">
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 xl:grid-cols-2">
                  <div className="rounded-xl bg-neutral-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                      {copy.technique}
                    </p>

                    <p className="mt-1 font-semibold text-neutral-950">
                      {selectedLocation?.technique ?? copy.toConfirm}
                    </p>
                  </div>

                  <div className="rounded-xl bg-neutral-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                      {copy.location}
                    </p>

                    <p className="mt-1 font-semibold text-neutral-950">
                      {selectedLocation
                        ? getLocationLabel(selectedLocation)
                        : "—"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-neutral-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                      {copy.maximumArea}
                    </p>

                    <p className="mt-1 font-semibold text-neutral-950">
                      {selectedLocation?.max_printing_area_mm ?? "—"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-neutral-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                      {copy.quantity}
                    </p>

                    <p className="mt-1 font-semibold text-neutral-950">
                      {quantity.toLocaleString(intlLocale)} {copy.units}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-xs leading-5 text-neutral-500">
                  {copy.technicalImageHelp}
                </p>
              </div>
            </div>
          </div>

          <aside className="space-y-4 xl:order-3">
            <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-neutral-950">
                {copy.selectedProduct}
              </p>

              <div className="mt-4 space-y-2 text-sm text-neutral-600">
                <div className="flex justify-between gap-4">
                  <span>{copy.colourSize}</span>

                  <span className="text-right font-semibold text-neutral-950">
                    {getColorLabel(selectedColor, copy.selectedColour)}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span>{copy.quantity}</span>

                  <span className="text-right font-semibold text-neutral-950">
                    {quantity.toLocaleString(intlLocale)} {copy.units}
                  </span>
                </div>
              </div>

              <Link
                href={localizePath(`/produto/${productSlug}`, locale)}
                className="mt-4 inline-flex text-sm font-semibold text-neutral-950 underline-offset-4 hover:underline"
              >
                {copy.changeProduct}
              </Link>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-neutral-950">
                {copy.selectedOption}
              </p>

              <div className="mt-4 rounded-2xl bg-neutral-950 px-4 py-3 text-sm text-white">
                <p className="font-semibold">
                  {selectedLocation?.technique ?? copy.toConfirm}
                </p>
                <p className="mt-1 text-xs text-neutral-300">
                  {selectedLocation
                    ? getLocationLabel(selectedLocation)
                    : copy.locationToConfirm}
                  {selectedLocation?.max_printing_area_mm
                    ? ` · ${selectedLocation.max_printing_area_mm}`
                    : ""}
                </p>
              </div>

              <div className="mt-4 rounded-2xl bg-neutral-50 p-4 text-xs leading-5 text-neutral-600">
                {copy.estimatedProduction}{" "}
                <span className="font-semibold text-neutral-950">
                  {productionDays}
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-neutral-950">
                {copy.uploadLogo}
              </p>

              <label
                htmlFor="simulator-logo"
                className="mt-3 flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-4 text-center transition hover:border-neutral-400 hover:bg-white"
              >
                <Upload className="h-5 w-5 text-neutral-500" />

                <span className="text-sm font-semibold text-neutral-950">
                  {copy.uploadFile}
                </span>

                <span className="text-xs text-neutral-500">
                  SVG, PDF, PNG ou JPG
                </span>
              </label>

              <input
                id="simulator-logo"
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp,application/pdf"
                onChange={handleLogoChange}
                className="sr-only"
              />

              {logoFileName ? (
                <div className="mt-3 rounded-2xl bg-neutral-50 p-3 text-xs leading-5 text-neutral-600">
                  {copy.file}{" "}
                  <span className="font-semibold text-neutral-950">
                    {logoFileName}
                  </span>
                </div>
              ) : null}
            </div>

          </aside>

            {selectedLocation ? (
              <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5 xl:order-4 xl:col-span-2">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-semibold text-neutral-950">
                    {copy.adjustArea}
                  </p>

                  <button
                    type="button"
                    onClick={resetPosition}
                    className="inline-flex items-center rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-200"
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    {copy.reset}
                  </button>
                </div>

                <div className="mt-4 grid items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
                  <div>
                <div
                  className="relative flex h-[360px] w-full items-center justify-center overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 p-4 sm:h-[420px] sm:p-6"
                >
                  <div
                    ref={printAreaRef}
                    aria-label={`${copy.printArea} ${printAreaDimensions.widthMm} × ${printAreaDimensions.heightMm} mm`}
                    className="relative shrink-0 overflow-visible rounded-xl border-2 border-dashed border-emerald-500 bg-[linear-gradient(45deg,#f4f4f5_25%,transparent_25%),linear-gradient(-45deg,#f4f4f5_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f4f4f5_75%),linear-gradient(-45deg,transparent_75%,#f4f4f5_75%)] bg-[length:18px_18px] bg-[position:0_0,0_9px,9px_-9px,-9px_0px]"
                    style={{ ...editorPrintAreaStyle, containerType: "size" }}
                  >
                    {logoPreviewUrl ? <div
                      role="button"
                      tabIndex={0}
                      onPointerDown={handleLogoPointerDown}
                      onPointerMove={handleLogoPointerMove}
                      onPointerUp={handleLogoPointerUp}
                      onPointerCancel={handleLogoPointerUp}
                      className="absolute cursor-grab touch-none active:cursor-grabbing"
                      style={{
                        left: `${safePosition.x + safePosition.width / 2}%`,
                        top: `${safePosition.y + logoHeightPercent / 2}%`,
                        width: `${safePosition.width}%`,
                        height: `${logoHeightPercent}%`,
                        transform: `translate(-50%, -50%) rotate(${safePosition.rotation}deg)`,
                        transformOrigin: "center center",
                      }}
                    >
                      <img
                        src={displayedLogoPreviewUrl ?? logoPreviewUrl}
                        alt={copy.logoAlt}
                        draggable={false}
                        className="h-full w-full select-none object-contain"
                      />
                    </div> : null}
                    {textLayer.content.trim() ? (
                      <span
                        className="pointer-events-none absolute block whitespace-nowrap leading-none"
                        style={{
                          left: `${textLayer.x}%`,
                          top: `${textLayer.y}%`,
                          color: textLayer.color,
                          fontFamily: `"${textLayer.fontFamily}", sans-serif`,
                          fontSize: `${textLayer.fontSize}cqh`,
                          fontWeight: textLayer.fontWeight,
                          fontStyle: textLayer.fontStyle,
                          transform: `translate(-50%, -50%) rotate(${textLayer.rotation}deg)`,
                          transformOrigin: "center center",
                        }}
                      >
                        {textLayer.content}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={reduceLogo}
                    disabled={safePosition.width <= Math.min(10, maximumAllowedLogoWidthPercent)}
                    className="inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Minus className="mr-1.5 h-4 w-4" />
                    {copy.reduce}
                  </button>

                  <button
                    type="button"
                    onClick={centerLogo}
                    className="inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:border-neutral-400"
                  >
                    <Move className="mr-1.5 h-4 w-4" />
                    {copy.centre}
                  </button>

                  <button
                    type="button"
                    onClick={enlargeLogo}
                    disabled={safePosition.width >= maximumAllowedLogoWidthPercent}
                    className="inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    {copy.enlarge}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={fitLogoToArea}
                  className="mt-2 inline-flex w-full items-center justify-center rounded-xl border border-neutral-950 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-950 transition hover:bg-neutral-50"
                >
                  <Maximize2 className="mr-1.5 h-4 w-4" />
                  {copy.fitMaximum}
                </button>
                  </div>

                <div className="space-y-4">
                    <label className="block">
                      <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                        {copy.horizontal}
                        <span>{Math.round(logoCenterX)}%</span>
                      </span>

                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={logoCenterX}
                        onChange={(event) =>
                          updatePosition(
                            "x",
                            Number(event.target.value) - safePosition.width / 2,
                          )
                        }
                        className="mt-3 w-full"
                      />
                    </label>

                    <label className="block">
                      <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                        {copy.vertical}
                        <span>{Math.round(logoCenterY)}%</span>
                      </span>

                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={logoCenterY}
                        onChange={(event) =>
                          updatePosition(
                            "y",
                            Number(event.target.value) - logoHeightPercent / 2,
                          )
                        }
                        className="mt-3 w-full"
                      />
                    </label>

                    <label className="block">
                      <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                        {copy.width}
                        <span>{Math.round(safePosition.width)}%</span>
                      </span>

                      <input
                        type="range"
                        min={Math.min(10, maximumAllowedLogoWidthPercent)}
                        max={maximumAllowedLogoWidthPercent}
                        value={safePosition.width}
                        onChange={(event) =>
                          updatePosition("width", Number(event.target.value))
                        }
                        className="mt-3 w-full"
                      />
                    </label>

                    <div>
                      <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                        {copy.rotation}
                        <span>{Math.round(safePosition.rotation)}º</span>
                      </span>

                      <input
                        type="range"
                        min="0"
                        max="359"
                        step="1"
                        value={safePosition.rotation}
                        onChange={(event) =>
                          updatePosition("rotation", Number(event.target.value))
                        }
                        className="mt-3 w-full"
                      />

                      <div className="mt-3 grid grid-cols-4 gap-2">
                        {[0, 90, 180, 270].map((rotation) => (
                          <button
                            key={rotation}
                            type="button"
                            onClick={() => updatePosition("rotation", rotation)}
                            className="rounded-xl border border-neutral-200 bg-white px-2 py-2 text-xs font-semibold text-neutral-700 transition hover:border-neutral-400"
                          >
                            {`${rotation}º`}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-neutral-200 pt-4">
                      <div className="flex items-center gap-2">
                        <Type className="h-4 w-4 text-neutral-500" />
                        <p className="text-sm font-semibold text-neutral-950">{textCopy.title}</p>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-neutral-500">{textCopy.help}</p>

                      <input
                        type="text"
                        value={textLayer.content}
                        maxLength={120}
                        onChange={(event) => updateTextLayer({ content: event.target.value })}
                        placeholder={textCopy.placeholder}
                        className="mt-3 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-950 outline-none transition focus:border-neutral-950"
                      />

                      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                        <label>
                          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{textCopy.font}</span>
                          <select
                            value={textLayer.fontFamily}
                            onChange={(event) => updateTextLayer({ fontFamily: event.target.value })}
                            className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
                          >
                            {TEXT_FONT_OPTIONS.map((font) => <option key={font} value={font}>{font}</option>)}
                          </select>
                        </label>
                        <label>
                          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{textCopy.color}</span>
                          <input
                            type="color"
                            value={textLayer.color}
                            onChange={(event) => updateTextLayer({ color: event.target.value })}
                            className="mt-1 h-10 w-12 cursor-pointer rounded-xl border border-neutral-200 bg-white p-1"
                          />
                        </label>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          aria-pressed={textLayer.fontWeight === "700"}
                          onClick={() => updateTextLayer({ fontWeight: textLayer.fontWeight === "700" ? "400" : "700" })}
                          className={`rounded-xl border px-3 py-2 text-xs font-bold ${textLayer.fontWeight === "700" ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-200 bg-white text-neutral-700"}`}
                        >{textCopy.bold}</button>
                        <button
                          type="button"
                          aria-pressed={textLayer.fontStyle === "italic"}
                          onClick={() => updateTextLayer({ fontStyle: textLayer.fontStyle === "italic" ? "normal" : "italic" })}
                          className={`rounded-xl border px-3 py-2 text-xs italic ${textLayer.fontStyle === "italic" ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-200 bg-white text-neutral-700"}`}
                        >{textCopy.italic}</button>
                      </div>

                      <label className="mt-4 block">
                        <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500"><span>{textCopy.size}</span><span>{Math.round(textLayer.fontSize)}%</span></span>
                        <input type="range" min="4" max="90" step="1" value={textLayer.fontSize} onChange={(event) => updateTextLayer({ fontSize: Number(event.target.value) })} className="mt-2 w-full" />
                      </label>
                      <label className="mt-3 block">
                        <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500"><span>{textCopy.horizontal}</span><span>{Math.round(textLayer.x)}%</span></span>
                        <input type="range" min="0" max="100" value={textLayer.x} onChange={(event) => updateTextLayer({ x: Number(event.target.value) })} className="mt-2 w-full" />
                      </label>
                      <label className="mt-3 block">
                        <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500"><span>{textCopy.vertical}</span><span>{Math.round(textLayer.y)}%</span></span>
                        <input type="range" min="0" max="100" value={textLayer.y} onChange={(event) => updateTextLayer({ y: Number(event.target.value) })} className="mt-2 w-full" />
                      </label>
                      <label className="mt-3 block">
                        <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500"><span>{textCopy.rotation}</span><span>{Math.round(textLayer.rotation)}º</span></span>
                        <input type="range" min="0" max="359" value={textLayer.rotation} onChange={(event) => updateTextLayer({ rotation: Number(event.target.value) })} className="mt-2 w-full" />
                      </label>
                      <button type="button" onClick={fitTextToArea} disabled={!textLayer.content.trim()} className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 disabled:opacity-40">
                        <Maximize2 className="mr-1.5 h-4 w-4" />{textCopy.fit}
                      </button>
                    </div>

                {printColorOptions.length > 0 ? (
                  <div className="border-t border-neutral-200 pt-4">
                    <p className="text-sm font-semibold text-neutral-950">
                      {copy.colours}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-neutral-500">
                      {copy.coloursHelp}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {printColorOptions.map((option) => (
                        <button
                          key={option.mode}
                          type="button"
                          onClick={() => setSelectedPrintColorMode(option.mode)}
                          aria-pressed={effectivePrintColorMode === option.mode}
                          className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                            effectivePrintColorMode === option.mode
                              ? "border-neutral-950 bg-neutral-950 text-white"
                              : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>

                    {requiredPrintColorCount > 0 ? (
                      <div className="mt-5 space-y-5 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                        {logoPreviewUrl && detectedLogoColors.length > 0 ? (
                          <div>
                            <p className="text-xs font-semibold text-neutral-700">
                              {copy.detectedColours}
                            </p>

                            <div className="mt-2 flex flex-wrap gap-2">
                              {detectedLogoColors.map((color, index) => (
                                <span
                                  key={`${color}-${index}`}
                                  className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-700"
                                >
                                  <span
                                    className="h-3 w-3 rounded-full border border-neutral-300"
                                    style={{ backgroundColor: color }}
                                  />
                                  {color.toUpperCase()}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        <div>
                          <p className="text-xs font-semibold text-neutral-700">
                            {copy.printColours}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-2">
                            {selectedPantoneColors.map((selectedColor, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => setActivePrintColorIndex(index)}
                                aria-pressed={activePrintColorIndex === index}
                                className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition ${
                                  activePrintColorIndex === index
                                    ? "border-neutral-950 bg-white ring-2 ring-neutral-950/10"
                                    : "border-neutral-200 bg-white hover:border-neutral-400"
                                }`}
                              >
                                <span
                                  className="h-4 w-4 shrink-0 rounded-full border border-neutral-300"
                                  style={{
                                    backgroundColor:
                                      selectedColor?.hex ?? "transparent",
                                  }}
                                />
                                <span>
                                  {copy.colour} {index + 1}
                                  {selectedColor
                                    ? ` · Pantone ${selectedColor.code}`
                                    : ` · ${copy.notSelected}`}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-neutral-700">
                            {copy.selectReference} {activePrintColorIndex + 1}
                          </p>

                          <div className="mt-2 grid max-h-64 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                            {PANTONE_COLORS.map((color) => {
                              const isSelected =
                                selectedPantoneColors[activePrintColorIndex]?.code ===
                                color.code;

                              return (
                                <button
                                  key={color.code}
                                  type="button"
                                  onClick={() => {
                                    setSelectedPantoneColors((current) =>
                                      current.map((currentColor, colorIndex) =>
                                        colorIndex === activePrintColorIndex
                                          ? color
                                          : currentColor,
                                      ),
                                    );
                                    setActivePrintColorIndex((current) =>
                                      Math.min(
                                        current + 1,
                                        requiredPrintColorCount - 1,
                                      ),
                                    );
                                  }}
                                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                                    isSelected
                                      ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/20"
                                      : "border-neutral-200 bg-white hover:border-neutral-400"
                                  }`}
                                >
                                  <span
                                    className="h-5 w-5 shrink-0 rounded-full border border-neutral-300 shadow-sm"
                                    style={{ backgroundColor: color.hex }}
                                  />
                                  <span className="min-w-0">
                                    <span className="block truncate text-xs font-semibold text-neutral-950">
                                      Pantone {color.code}
                                    </span>
                                    <span className="block text-[11px] uppercase text-neutral-500">
                                      {color.hex}
                                    </span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <p
                          className={`text-xs leading-5 ${
                            printColorsAreValid
                              ? "text-emerald-700"
                              : "text-amber-700"
                          }`}
                        >
                          {printColorsAreValid
                            ? copy.coloursApplied
                            : `${copy.selectToContinue} (${requiredPrintColorCount})`}
                        </p>
                      </div>
                    ) : null}

                    <p className="mt-3 text-xs leading-5 text-neutral-500">
                      {copy.pantoneHelp}
                    </p>
                  </div>
                ) : null}
                </div>
                </div>
              </div>
            ) : null}

            <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm xl:order-5 xl:col-span-2">
              <p className="text-sm font-semibold text-neutral-950">
                {copy.extrasNotes}
              </p>

              <div className="mt-4 grid gap-3 text-sm text-neutral-700 lg:grid-cols-3">
                <label className="flex gap-3 rounded-2xl bg-neutral-50 p-3">
                  <input
                    type="checkbox"
                    checked={needsDesignHelp}
                    onChange={(event) =>
                      setNeedsDesignHelp(event.target.checked)
                    }
                    className="mt-1"
                  />

                  <span>
                    <span className="block font-semibold text-neutral-950">
                      {copy.designHelp}
                    </span>

                    <span className="text-xs text-neutral-500">
                      {copy.artworkEstimate} {formatPrice(21)}
                    </span>
                  </span>
                </label>

                <label className="flex gap-3 rounded-2xl bg-neutral-50 p-3">
                  <input
                    type="checkbox"
                    checked={extraProof}
                    onChange={(event) => setExtraProof(event.target.checked)}
                    className="mt-1"
                  />

                  <span>
                    <span className="block font-semibold text-neutral-950">
                      {copy.extraProof}
                    </span>

                    <span className="text-xs text-neutral-500">
                      {copy.proofEstimate} {formatPrice(15)}
                    </span>
                  </span>
                </label>

                <label className="flex gap-3 rounded-2xl bg-neutral-50 p-3">
                  <input
                    type="checkbox"
                    checked={nominative}
                    onChange={(event) => setNominative(event.target.checked)}
                    className="mt-1"
                  />

                  <span>
                    <span className="block font-semibold text-neutral-950">
                      {copy.nominative}
                    </span>

                    <span className="text-xs text-neutral-500">
                      {copy.estimatedPerUnit} {formatPrice(0.7)}
                    </span>
                  </span>
                </label>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                  {copy.internalReference}
                </span>

                <input
                  type="text"
                  value={internalReference}
                  onChange={(event) => setInternalReference(event.target.value)}
                  placeholder={copy.referencePlaceholder}
                  className="mt-2 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                  {copy.notes}
                </span>

                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder={copy.notesPlaceholder}
                  rows={3}
                  className="mt-2 w-full resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
                />
              </label>
              </div>
            </div>

          <div className="rounded-3xl border border-neutral-200 bg-neutral-950 p-4 text-white shadow-sm sm:p-5 xl:order-6 xl:col-span-2">
              <div className="flex items-center gap-2">
                <Move className="h-5 w-5 text-neutral-300" />

                <p className="text-sm font-semibold">
                  {copy.summary}
                </p>
              </div>

              <div className="mt-4 grid items-start gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-8">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">
                  {copy.personalizationFor} {quantity.toLocaleString(intlLocale)} {" "}
                  {quantity === 1 ? copy.unit : copy.units}
                </p>

                <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-2xl font-semibold text-white">
                    {formatPrice(personalizationUnitPrice, productCurrency)}
                    <span className="ml-1 text-sm font-medium text-neutral-300">
                      /un.
                    </span>
                  </p>

                  <button
                    type="button"
                    onClick={() => setShowPriceTable(true)}
                    className="text-xs font-semibold text-white underline decoration-white/40 underline-offset-4 transition hover:decoration-white"
                  >
                    {copy.allPrices}
                  </button>
                </div>

                <p className="mt-2 text-xs leading-5 text-neutral-300">
                  {copy.unitPriceHelp}
                </p>

                {nextSavingTier ? (
                  <button
                    type="button"
                    onClick={() => updateQuantity(nextSavingTier.quantity)}
                    className="mt-3 w-full rounded-xl bg-emerald-400/15 px-3 py-3 text-left ring-1 ring-inset ring-emerald-300/20 transition hover:bg-emerald-400/20"
                  >
                    <span className="block text-xs text-emerald-100">
                      {copy.from} {nextSavingTier.quantity.toLocaleString(intlLocale)} {copy.units}
                    </span>
                    <span className="mt-1 block text-sm font-semibold text-white">
                      {formatPrice(nextSavingTier.unitPrice, productCurrency)}
                      /{copy.unit} · {nextSavingTier.savingPercentage}% {copy.savePerUnit}
                    </span>
                  </button>
                ) : null}

                {customizationQuantityBreaks.length > 1 ? (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-neutral-300">
                      {copy.compareQuantities}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {customizationQuantityBreaks.map((tierQuantity) => (
                        <button
                          key={tierQuantity}
                          type="button"
                          onClick={() => updateQuantity(tierQuantity)}
                          aria-pressed={quantity === tierQuantity}
                          className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                            quantity === tierQuantity
                              ? "bg-white text-neutral-950"
                              : "bg-white/10 text-white hover:bg-white/15"
                          }`}
                        >
                          {tierQuantity.toLocaleString(intlLocale)}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <label className="mt-4 block">
                  <span className="text-xs font-medium text-neutral-300">
                    {copy.otherQuantity}
                  </span>
                  <input
                    type="number"
                    min={minimumQuantity}
                    step="1"
                    inputMode="numeric"
                    value={quantityInput}
                    onChange={(event) => handleQuantityInput(event.target.value)}
                    onBlur={normalizeQuantityInput}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        normalizeQuantityInput();
                      }
                    }}
                    className="mt-2 w-full rounded-xl border border-white/15 bg-white px-4 py-3 text-base font-semibold text-neutral-950 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/30"
                    aria-label={copy.intendedQuantity}
                  />
                </label>
                </div>

                <dl className="space-y-3 text-sm text-neutral-300">
                <div className="flex justify-between gap-4">
                  <dt>{copy.location}</dt>

                  <dd className="text-right text-white">
                    {selectedLocation
                      ? getLocationLabel(selectedLocation)
                      : "—"}
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt>{copy.technique}</dt>

                  <dd className="text-right text-white">
                    {selectedLocation?.technique ?? copy.toConfirm}
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt>{copy.uploadLogo}</dt>

                  <dd className="max-w-48 truncate text-right text-white">
                    {logoFileName ?? copy.noLogo}
                  </dd>
                </div>

                <div className="border-t border-white/10 pt-3">
                  <div className="flex justify-between gap-4">
                    <dt>{copy.quantity}</dt>

                    <dd className="text-right text-white">
                      {quantity.toLocaleString(intlLocale)} {copy.units}
                    </dd>
                  </div>

                  <div className="mt-2 flex justify-between gap-4">
                    <dt>{copy.productUnit}</dt>

                    <dd className="text-right text-white">
                      {formatPrice(productUnitPrice, productCurrency)}
                    </dd>
                  </div>

                  <div className="mt-2 flex justify-between gap-4">
                    <dt>{copy.productSubtotal}</dt>

                    <dd className="text-right text-white">
                      {formatPrice(productSubtotal, productCurrency)}
                    </dd>
                  </div>

                  <div className="mt-2 flex justify-between gap-4">
                    <dt>{copy.personalizationUnit}</dt>

                    <dd className="text-right text-white">
                      {formatPrice(personalizationUnitPrice, productCurrency)}
                    </dd>
                  </div>

                  <div className="mt-2 flex justify-between gap-4">
                    <dt>{copy.personalizationSubtotal}</dt>

                    <dd className="text-right text-white">
                      {formatPrice(personalizationSubtotal, productCurrency)}
                    </dd>
                  </div>

                  <div className="mt-2 flex justify-between gap-4">
                    <dt>{copy.setup}</dt>

                    <dd className="text-right text-white">
                      {formatPrice(setupCost, productCurrency)}
                    </dd>
                  </div>

                  <div className="mt-2 flex justify-between gap-4">
                    <dt>{copy.extras}</dt>

                    <dd className="text-right text-white">
                      {formatPrice(extrasTotal, productCurrency)}
                    </dd>
                  </div>

                  <div className="mt-4 border-t border-white/10 pt-4">
                    <div className="flex justify-between gap-4 text-base">
                      <dt className="font-semibold text-white">
                        {copy.estimatedTotal}
                      </dt>

                      <dd className="font-semibold text-white">
                        {formatPrice(estimatedTotal, productCurrency)}
                      </dd>
                    </div>

                    <p className="mt-1 text-xs text-neutral-400">
                      {copy.totalHelp}
                    </p>
                  </div>
                </div>
                </dl>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setShowPriceTable(true)}
                  className="rounded-xl bg-white/10 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-white/15"
                >
                  {copy.prices}
                </button>

                <button
                  type="button"
                  onClick={() => setShowProductionTimes(true)}
                  className="rounded-xl bg-white/10 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-white/15"
                >
                  {copy.productionTimes}
                </button>
              </div>

              <div className="mt-5 rounded-2xl bg-white/10 p-4 text-xs leading-5 text-neutral-300">
                {copy.disclaimer}
              </div>

              {saveMessage ? (
                <div className="mt-5 rounded-2xl bg-red-500/15 px-4 py-3 text-sm leading-6 text-red-100 ring-1 ring-inset ring-red-400/20">
                  {saveMessage}
                </div>
              ) : null}

              <button
                type="button"
                onClick={handleConfirmCustomization}
                disabled={isSavingDraft || !printColorsAreValid}
                className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-emerald-400 px-5 py-3 text-sm font-bold text-neutral-950 shadow-lg shadow-emerald-950/20 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                <span className="text-neutral-950">
                  {isSavingDraft
                    ? copy.confirming
                    : copy.confirm}
                </span>

                <ArrowRight className="ml-2 h-4 w-4 text-neutral-950" />
              </button>
          </div>
        </div>
      </section>

      {showPriceTable ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 px-4">
          <div className="max-h-[86vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-5">
              <div>
                <h3 className="text-xl font-semibold text-neutral-950">
                  {copy.priceTable}
                </h3>

                <p className="mt-1 text-sm text-neutral-500">
                  {copy.technique}: {selectedLocation?.technique ?? copy.toConfirm}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowPriceTable(false)}
                aria-label={copy.closePriceTable}
                className="rounded-full bg-neutral-100 p-2 text-neutral-600 transition hover:bg-neutral-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-auto p-6">
              <table className="min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th className="border-b border-neutral-200 px-4 py-3 text-left font-semibold text-neutral-500">
                      {copy.quantity}
                    </th>

                    {customizationQuantityBreaks.map((item) => (
                      <th
                        key={item}
                        className="border-b border-neutral-200 px-4 py-3 text-right font-semibold text-neutral-950"
                      >
                        {item.toLocaleString(intlLocale)}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td className="border-b border-neutral-100 px-4 py-3 font-medium text-neutral-500">
                      {copy.priceUnit}
                    </td>

                    {customizationQuantityBreaks.map((item) => (
                      <td
                        key={item}
                        className="border-b border-neutral-100 px-4 py-3 text-right font-semibold text-neutral-950"
                      >
                        {formatPrice(
                          findCustomizationPriceTier(
                            selectedLocation?.price_tiers ?? [],
                            item,
                            logoWidthMm && logoHeightMm
                              ? (logoWidthMm * logoHeightMm) / 100
                              : null,
                            effectivePrintColorMode,
                          )?.final_price ?? 0,
                          productCurrency,
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>

              <p className="mt-4 text-xs leading-5 text-neutral-500">
                {copy.tableHelp}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {showProductionTimes ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 px-4">
          <div className="max-h-[86vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-5">
              <div>
                <h3 className="text-xl font-semibold text-neutral-950">
                  {copy.productionTimes}
                </h3>

                <p className="mt-1 text-sm text-neutral-500">
                  {copy.productionEstimate}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowProductionTimes(false)}
                aria-label={copy.closeProduction}
                className="rounded-full bg-neutral-100 p-2 text-neutral-600 transition hover:bg-neutral-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-auto p-6">
              <table className="min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th className="border-b border-neutral-200 px-4 py-3 text-left font-semibold text-neutral-500">
                      {copy.technique}
                    </th>

                    <th className="border-b border-neutral-200 px-4 py-3 text-right font-semibold text-neutral-950">
                      1-50
                    </th>

                    <th className="border-b border-neutral-200 px-4 py-3 text-right font-semibold text-neutral-950">
                      51-250
                    </th>

                    <th className="border-b border-neutral-200 px-4 py-3 text-right font-semibold text-neutral-950">
                      251-1000
                    </th>

                    <th className="border-b border-neutral-200 px-4 py-3 text-right font-semibold text-neutral-950">
                      1000+
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {[
                    "UV Digital",
                    "Laser",
                    "Laser circular",
                    "Tampografia",
                    "Bordado",
                  ].map((technique) => (
                    <tr key={technique}>
                      <td className="border-b border-neutral-100 px-4 py-3 font-medium text-neutral-950">
                        {technique}
                      </td>

                      <td className="border-b border-neutral-100 px-4 py-3 text-right text-neutral-700">
                        1-3 {copy.days}
                      </td>

                      <td className="border-b border-neutral-100 px-4 py-3 text-right text-neutral-700">
                        2-5 {copy.days}
                      </td>

                      <td className="border-b border-neutral-100 px-4 py-3 text-right text-neutral-700">
                        4-8 {copy.days}
                      </td>

                      <td className="border-b border-neutral-100 px-4 py-3 text-right text-neutral-700">
                        {copy.onRequest}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p className="mt-4 text-xs leading-5 text-neutral-500">
                {copy.productionHelp}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
