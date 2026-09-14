import type { SiteLocale } from "@/lib/i18n/config";
import type { PersonalizationConfig } from "@/lib/seo/personalization-pages";

const names = {
  en: { serigrafia: "Screen printing", tampografia: "Pad printing", "gravacao-laser": "Laser engraving", transfer: "Transfer printing", "hot-stamping": "Hot stamping" },
  fr: { serigrafia: "Sérigraphie", tampografia: "Tampographie", "gravacao-laser": "Gravure laser", transfer: "Transfert", "hot-stamping": "Marquage à chaud" },

es: { serigrafia: "Serigraf\u00EDa", tampografia: "Tampograf\u00EDa", "gravacao-laser": "Grabado l\u00E1ser", transfer: "Impresi\u00F3n por transfer", "hot-stamping": "Estampaci\u00F3n en caliente" },
de: { serigrafia: "Siebdruck", tampografia: "Tampondruck", "gravacao-laser": "Lasergravur", transfer: "Transferdruck", "hot-stamping": "Hei\u00DFpr\u00E4gung" },
it: { serigrafia: "Serigrafia", tampografia: "Tampografia", "gravacao-laser": "Incisione laser", transfer: "Stampa transfer", "hot-stamping": "Stampa a caldo" },
} as const;

export function localizePersonalizationConfig(config: PersonalizationConfig, locale: SiteLocale): PersonalizationConfig {
  if (locale === "pt") return config;
  const name = names[locale][config.slug as keyof typeof names.en] ?? config.h1;
  const en = locale === "en";
  return {
    ...config,
    title: (locale === "es" ? (`${name} para productos promocionales personalizados`) : locale === "de" ? (`${name} f\u00FCr personalisierte Werbeartikel`) : locale === "it" ? (`${name} per prodotti promozionali personalizzati`) : en ? `${name} for custom promotional products` : `${name} pour objets publicitaires personnalisés`),
    h1: (locale === "es" ? (`${name} para merchandising personalizado`) : locale === "de" ? (`${name} f\u00FCr personalisiertes Merchandising`) : locale === "it" ? (`${name} per merchandising personalizzato`) : en ? `${name} for custom merchandise` : `${name} pour le merchandising personnalisé`),
    description: (locale === "es" ? (`Descubre c\u00F3mo evaluar ${name.toLowerCase()} seg\u00FAn el producto, variante, ubicaci\u00F3n, \u00E1rea de impresi\u00F3n y cantidad.`) : locale === "de" ? (`Erfahren Sie, wie Sie ${name.toLowerCase()} nach Produkt, Variante, Position, Druckfl\u00E4che und Menge beurteilen.`) : locale === "it" ? (`Scopri come valutare ${name.toLowerCase()} in base a prodotto, variante, posizione, area di stampa e quantit\u00E0.`) : en ? `Learn how to assess ${name.toLowerCase()} by product, variant, location, print area and quantity.` : `Découvrez comment évaluer la ${name.toLowerCase()} selon le produit, la variante, l’emplacement, la zone et la quantité.`),
    intro: (locale === "es" ? (`${name} solo est\u00E1 disponible para combinaciones compatibles de producto y ubicaci\u00F3n. Confirma la opci\u00F3n exacta de la variante seleccionada antes de preparar archivos o comprar.`) : locale === "de" ? (`${name} ist nur f\u00FCr kompatible Kombinationen aus Produkt und Position verf\u00FCgbar. Pr\u00FCfen Sie die genaue Option der ausgew\u00E4hlten Variante vor Dateivorbereitung oder Bestellung.`) : locale === "it" ? (`${name} \u00E8 disponibile solo per combinazioni compatibili di prodotto e posizione. Conferma l'opzione esatta della variante selezionata prima di preparare i file o ordinare.`) : en ? `${name} is available only for compatible product and location combinations. Confirm the exact option shown for the selected variant before preparing artwork or ordering.` : `${name} est uniquement disponible pour les combinaisons compatibles de produit et d’emplacement. Confirmez l’option exacte de la variante avant de préparer le fichier ou de commander.`),
    sections: (locale === "es" ? ([
    { title: "Confirma la combinaci\u00F3n disponible", text: "La personalizaci\u00F3n depende del producto, variante, componente y ubicaci\u00F3n. Selecciona \u00FAnicamente opciones disponibles para esa referencia exacta." },
    { title: "Utiliza el \u00E1rea real de impresi\u00F3n", text: "Prepara el dise\u00F1o con las dimensiones del configurador, en lugar de estimar el \u00E1rea a partir de la imagen general del producto." },
    { title: "Revisa la cantidad y el precio final", text: "La t\u00E9cnica, el n\u00FAmero de colores, la cantidad y la tabla de precios aplicable determinan el coste final de personalizaci\u00F3n." },
]) : locale === "de" ? ([
    { title: "Verf\u00FCgbare Kombination best\u00E4tigen", text: "Die Personalisierung richtet sich nach Produkt, Variante, Komponente und Position. W\u00E4hlen Sie nur Optionen, die f\u00FCr die genaue Referenz angeboten werden." },
    { title: "Tats\u00E4chliche Druckfl\u00E4che verwenden", text: "Bereiten Sie die Druckvorlage nach den Ma\u00DFen im Konfigurator vor, statt die Fl\u00E4che aus dem allgemeinen Produktbild abzusch\u00E4tzen." },
    { title: "Menge und Endpreis pr\u00FCfen", text: "Technik, Farbanzahl, Menge und g\u00FCltige Preistabelle bestimmen die endg\u00FCltigen Personalisierungskosten." },
]) : locale === "it" ? ([
    { title: "Conferma la combinazione disponibile", text: "La personalizzazione dipende da prodotto, variante, componente e posizione. Seleziona solo opzioni offerte per l'esatto riferimento." },
    { title: "Usa l'area reale di stampa", text: "Prepara la grafica per le dimensioni indicate nel configuratore, invece di stimare l'area dall'immagine generale del prodotto." },
    { title: "Verifica quantit\u00E0 e prezzo finale", text: "Tecnica, numero di colori, quantit\u00E0 e tabella prezzi applicabile determinano il costo finale della personalizzazione." },
]) : en ? [
      { title: "Confirm the available combination", text: "Customisation is defined by product, variant, component and location. Select only an option offered for the exact reference." },
      { title: "Use the actual print area", text: "Prepare artwork for the dimensions shown in the configurator rather than estimating the area from the general product image." },
      { title: "Review quantity and final price", text: "The technique, number of colours, quantity and applicable pricing table determine the final customisation cost." },
    ] : [
      { title: "Confirmez la combinaison disponible", text: "La personnalisation dépend du produit, de la variante, du composant et de l’emplacement. Choisissez uniquement une option proposée pour la référence exacte." },
      { title: "Respectez la zone réelle", text: "Préparez le fichier selon les dimensions du configurateur, sans estimer la zone à partir de la photo générale du produit." },
      { title: "Vérifiez la quantité et le prix final", text: "La technique, le nombre de couleurs, la quantité et le tarif applicable déterminent le coût final de personnalisation." },
    ]),
    checkpoints: (locale === "es" ? (["Producto y variante seleccionados", "Componente y ubicaci\u00F3n disponibles", "Dimensiones del \u00E1rea de impresi\u00F3n", "N\u00FAmero de colores", "Cantidad y precio final"]) : locale === "de" ? (["Ausgew\u00E4hltes Produkt und Variante", "Verf\u00FCgbare Komponente und Position", "Ma\u00DFe der Druckfl\u00E4che", "Farbanzahl", "Menge und Endpreis"]) : locale === "it" ? (["Prodotto e variante selezionati", "Componente e posizione disponibili", "Dimensioni dell'area di stampa", "Numero di colori", "Quantit\u00E0 e prezzo finale"]) : en ? ["Selected product and variant", "Available component and location", "Print area dimensions", "Number of colours", "Quantity and final price"] : ["Produit et variante sélectionnés", "Composant et emplacement disponibles", "Dimensions de la zone", "Nombre de couleurs", "Quantité et prix final"]),
  };
}
