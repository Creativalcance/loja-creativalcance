import type { SiteLocale } from "@/lib/i18n/config";
import type { SeoLandingConfig } from "@/lib/seo/landing-pages";

type Descriptor = { title: string; h1: string; subject: string; eyebrow: string };

const descriptors: Record<"en" | "fr" | "es" | "de" | "it", Record<string, Descriptor>> = {
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

es: {
    "welcome-kits": { title: "Kits de bienvenida personalizados para empresas", h1: "Kits de bienvenida personalizados para empresas y equipos", subject: "kits de bienvenida", eyebrow: "Aplicaciones \u00B7 Kits de bienvenida" },
    eventos: { title: "Productos promocionales personalizados para eventos", h1: "Merchandising y productos promocionales personalizados para eventos", subject: "eventos", eyebrow: "Aplicaciones \u00B7 Eventos" },
    congressos: { title: "Productos y kits personalizados para congresos", h1: "Productos promocionales personalizados para conferencias y congresos", subject: "congresos", eyebrow: "Aplicaciones \u00B7 Congresos" },
    natal: { title: "Regalos corporativos de Navidad personalizados", h1: "Regalos y productos navide\u00F1os personalizados para empresas", subject: "campa\u00F1as navide\u00F1as corporativas", eyebrow: "Aplicaciones \u00B7 Navidad" },
    colaboradores: { title: "Regalos personalizados para empleados", h1: "Merchandising y regalos personalizados para empleados", subject: "empleados y equipos internos", eyebrow: "Aplicaciones \u00B7 Empleados" },
    hotelaria: { title: "Merchandising personalizado para hosteler\u00EDa", h1: "Merchandising y regalos personalizados para hoteles", subject: "hoteles y hosteler\u00EDa", eyebrow: "Sectores \u00B7 Hosteler\u00EDa" },
    universidades: { title: "Merchandising personalizado para universidades", h1: "Merchandising y productos promocionales personalizados para universidades", subject: "universidades y educaci\u00F3n", eyebrow: "Sectores \u00B7 Universidades" },
    startups: { title: "Merchandising personalizado para startups", h1: "Merchandising y kits de bienvenida para startups", subject: "startups y equipos en crecimiento", eyebrow: "Sectores \u00B7 Startups" },
    tecnologia: { title: "Merchandising personalizado para empresas tecnol\u00F3gicas", h1: "Merchandising para empresas tecnol\u00F3gicas y SaaS", subject: "empresas tecnol\u00F3gicas y SaaS", eyebrow: "Sectores \u00B7 Tecnolog\u00EDa" },
    saude: { title: "Productos promocionales personalizados para el sector sanitario", h1: "Merchandising personalizado para centros sanitarios y cl\u00EDnicas", subject: "centros sanitarios y cl\u00EDnicas", eyebrow: "Sectores \u00B7 Salud" },
    restauracao: { title: "Merchandising personalizado para restaurantes", h1: "Merchandising personalizado para restaurantes y restauraci\u00F3n", subject: "restaurantes y restauraci\u00F3n", eyebrow: "Sectores \u00B7 Restauraci\u00F3n" },
    turismo: { title: "Merchandising personalizado para turismo", h1: "Merchandising personalizado para turismo y experiencias de visitantes", subject: "turismo y experiencias de visitantes", eyebrow: "Sectores \u00B7 Turismo" },
},
de: {
    "welcome-kits": { title: "Personalisierte Willkommenspakete f\u00FCr Unternehmen", h1: "Personalisierte Willkommenspakete f\u00FCr Unternehmen und Teams", subject: "Willkommenspakete", eyebrow: "Einsatzbereiche \u00B7 Willkommenspakete" },
    eventos: { title: "Personalisierte Werbeartikel f\u00FCr Veranstaltungen", h1: "Personalisiertes Merchandising und Werbeartikel f\u00FCr Veranstaltungen", subject: "Veranstaltungen", eyebrow: "Einsatzbereiche \u00B7 Veranstaltungen" },
    congressos: { title: "Personalisierte Produkte und Sets f\u00FCr Konferenzen", h1: "Personalisierte Werbeartikel f\u00FCr Konferenzen und Kongresse", subject: "Konferenzen", eyebrow: "Einsatzbereiche \u00B7 Konferenzen" },
    natal: { title: "Personalisierte Weihnachtsgeschenke f\u00FCr Unternehmen", h1: "Personalisierte Weihnachtsgeschenke und Werbeartikel f\u00FCr Unternehmen", subject: "Weihnachtskampagnen f\u00FCr Unternehmen", eyebrow: "Einsatzbereiche \u00B7 Weihnachten" },
    colaboradores: { title: "Personalisierte Geschenke f\u00FCr Mitarbeitende", h1: "Personalisiertes Merchandising und Geschenke f\u00FCr Mitarbeitende", subject: "Mitarbeitende und interne Teams", eyebrow: "Einsatzbereiche \u00B7 Mitarbeitende" },
    hotelaria: { title: "Personalisiertes Merchandising f\u00FCr die Hotellerie", h1: "Personalisiertes Merchandising und Geschenke f\u00FCr Hotels", subject: "Hotels und Hotellerie", eyebrow: "Branchen \u00B7 Hotellerie" },
    universidades: { title: "Personalisiertes Merchandising f\u00FCr Hochschulen", h1: "Personalisiertes Merchandising und Werbeartikel f\u00FCr Hochschulen", subject: "Hochschulen und Bildung", eyebrow: "Branchen \u00B7 Hochschulen" },
    startups: { title: "Personalisiertes Merchandising f\u00FCr Start-ups", h1: "Merchandising und Willkommenspakete f\u00FCr Start-ups", subject: "Start-ups und wachsende Teams", eyebrow: "Branchen \u00B7 Start-ups" },
    tecnologia: { title: "Personalisiertes Merchandising f\u00FCr Technologieunternehmen", h1: "Merchandising f\u00FCr Technologie- und SaaS-Unternehmen", subject: "Technologie- und SaaS-Unternehmen", eyebrow: "Branchen \u00B7 Technologie" },
    saude: { title: "Personalisierte Werbeartikel f\u00FCr das Gesundheitswesen", h1: "Personalisiertes Merchandising f\u00FCr Gesundheitseinrichtungen und Kliniken", subject: "Gesundheitseinrichtungen und Kliniken", eyebrow: "Branchen \u00B7 Gesundheit" },
    restauracao: { title: "Personalisiertes Merchandising f\u00FCr Restaurants", h1: "Personalisiertes Merchandising f\u00FCr Restaurants und Gastronomie", subject: "Restaurants und Gastronomie", eyebrow: "Branchen \u00B7 Gastronomie" },
    turismo: { title: "Personalisiertes Merchandising f\u00FCr den Tourismus", h1: "Personalisiertes Merchandising f\u00FCr Tourismus und Besuchererlebnisse", subject: "Tourismus und Besuchererlebnisse", eyebrow: "Branchen \u00B7 Tourismus" },
},
it: {
    "welcome-kits": { title: "Kit di benvenuto personalizzati per aziende", h1: "Kit di benvenuto personalizzati per aziende e team", subject: "kit di benvenuto", eyebrow: "Applicazioni \u00B7 Kit di benvenuto" },
    eventos: { title: "Prodotti promozionali personalizzati per eventi", h1: "Merchandising e prodotti promozionali personalizzati per eventi", subject: "eventi", eyebrow: "Applicazioni \u00B7 Eventi" },
    congressos: { title: "Prodotti e kit personalizzati per congressi", h1: "Prodotti promozionali personalizzati per conferenze e congressi", subject: "congressi", eyebrow: "Applicazioni \u00B7 Congressi" },
    natal: { title: "Regali natalizi aziendali personalizzati", h1: "Regali e prodotti natalizi personalizzati per aziende", subject: "campagne natalizie aziendali", eyebrow: "Applicazioni \u00B7 Natale" },
    colaboradores: { title: "Regali personalizzati per dipendenti", h1: "Merchandising e regali personalizzati per dipendenti", subject: "dipendenti e team interni", eyebrow: "Applicazioni \u00B7 Dipendenti" },
    hotelaria: { title: "Merchandising personalizzato per l'ospitalit\u00E0", h1: "Merchandising e regali personalizzati per hotel", subject: "hotel e ospitalit\u00E0", eyebrow: "Settori \u00B7 Ospitalit\u00E0" },
    universidades: { title: "Merchandising personalizzato per universit\u00E0", h1: "Merchandising e prodotti promozionali personalizzati per universit\u00E0", subject: "universit\u00E0 e istruzione", eyebrow: "Settori \u00B7 Universit\u00E0" },
    startups: { title: "Merchandising personalizzato per startup", h1: "Merchandising e kit di benvenuto per startup", subject: "startup e team in crescita", eyebrow: "Settori \u00B7 Startup" },
    tecnologia: { title: "Merchandising personalizzato per aziende tecnologiche", h1: "Merchandising per aziende tecnologiche e SaaS", subject: "aziende tecnologiche e SaaS", eyebrow: "Settori \u00B7 Tecnologia" },
    saude: { title: "Prodotti promozionali personalizzati per la sanit\u00E0", h1: "Merchandising personalizzato per strutture sanitarie e cliniche", subject: "strutture sanitarie e cliniche", eyebrow: "Settori \u00B7 Sanit\u00E0" },
    restauracao: { title: "Merchandising personalizzato per ristoranti", h1: "Merchandising personalizzato per ristoranti e ristorazione", subject: "ristoranti e ristorazione", eyebrow: "Settori \u00B7 Ristorazione" },
    turismo: { title: "Merchandising personalizzato per il turismo", h1: "Merchandising personalizzato per turismo ed esperienze dei visitatori", subject: "turismo ed esperienze dei visitatori", eyebrow: "Settori \u00B7 Turismo" },
},
};

export function localizeLandingConfig(config: SeoLandingConfig, locale: SiteLocale): SeoLandingConfig {
  if (locale === "pt") return config;
  const item = descriptors[locale][config.slug];
  if (!item) return config;
  const isEnglish = locale === "en";
  const intro = (locale === "es" ? (`Descubre ideas de merchandising para ${item.subject}. Compara productos \u00FAtiles, stock disponible, cantidades y opciones de personalizaci\u00F3n en un solo lugar.`) : locale === "de" ? (`Entdecken Sie Merchandising-Ideen f\u00FCr ${item.subject}. Vergleichen Sie n\u00FCtzliche Produkte, verf\u00FCgbare Best\u00E4nde, Bestellmengen und Personalisierungsoptionen an einem Ort.`) : locale === "it" ? (`Scopri idee di merchandising per ${item.subject}. Confronta prodotti utili, disponibilit\u00E0, quantit\u00E0 e opzioni di personalizzazione in un unico posto.`) : isEnglish
    ? `Discover merchandise ideas for ${item.subject}. Compare useful products, available stock, order quantities and customisation options in one place.`
    : `Découvrez des idées de merchandising pour ${item.subject}. Comparez les produits, le stock disponible, les quantités et les options de personnalisation en un seul endroit.`);
  const sections = (locale === "es" ? ([
    { title: "Empieza por el objetivo", text: `Define el p\u00FAblico, el uso previsto y la experiencia que quieres crear para ${item.subject}. As\u00ED ser\u00E1 m\u00E1s f\u00E1cil elegir productos relevantes.` },
    { title: "Compara productos y cantidades", text: "Revisa materiales, colores, cantidades m\u00EDnimas, stock y precios por cantidad antes de finalizar tu selecci\u00F3n." },
    { title: "Confirma personalizaci\u00F3n y plazos", text: "Comprueba el \u00E1rea exacta de impresi\u00F3n, t\u00E9cnica, requisitos del archivo y plazo estimado del producto elegido." },
]) : locale === "de" ? ([
    { title: "Mit dem Ziel beginnen", text: `Definieren Sie Zielgruppe, Verwendungszweck und gew\u00FCnschtes Erlebnis f\u00FCr ${item.subject}. So w\u00E4hlen Sie leichter passende Produkte.` },
    { title: "Produkte und Mengen vergleichen", text: "Pr\u00FCfen Sie Materialien, Farben, Mindestmengen, Bestand und Mengenpreise vor Ihrer Vorauswahl." },
    { title: "Personalisierung und Termine best\u00E4tigen", text: "Pr\u00FCfen Sie die genaue Druckfl\u00E4che, Technik, Dateianforderungen und voraussichtliche Lieferzeit des gew\u00E4hlten Produkts." },
]) : locale === "it" ? ([
    { title: "Inizia dall'obiettivo", text: `Definisci il pubblico, l'uso previsto e l'esperienza che vuoi creare per ${item.subject}. Sar\u00E0 pi\u00F9 facile scegliere prodotti pertinenti.` },
    { title: "Confronta prodotti e quantit\u00E0", text: "Verifica materiali, colori, quantit\u00E0 minime, disponibilit\u00E0 e prezzi per quantit\u00E0 prima di completare la selezione." },
    { title: "Conferma personalizzazione e tempi", text: "Controlla area esatta di stampa, tecnica, requisiti grafici e tempi stimati del prodotto selezionato." },
]) : isEnglish ? [
    { title: "Start with the objective", text: `Define the audience, intended use and experience you want to create for ${item.subject}. This makes it easier to select relevant products.` },
    { title: "Compare products and quantities", text: "Review materials, colours, minimum quantities, stock and quantity-based pricing before making your shortlist." },
    { title: "Confirm customisation and timing", text: "Check the exact print area, technique, artwork requirements and estimated lead time for the selected product." },
  ] : [
    { title: "Commencez par l’objectif", text: `Définissez le public, l’utilisation et l’expérience souhaitée pour ${item.subject}. Vous pourrez ainsi sélectionner des produits réellement pertinents.` },
    { title: "Comparez produits et quantités", text: "Vérifiez les matériaux, couleurs, quantités minimales, stocks et tarifs dégressifs avant de finaliser votre sélection." },
    { title: "Confirmez la personnalisation et le délai", text: "Contrôlez la zone d’impression, la technique, les fichiers nécessaires et le délai estimé du produit sélectionné." },
  ]);
  return {
    ...config,
    title: item.title,
    h1: item.h1,
    description: intro,
    eyebrow: item.eyebrow,
    intro,
    sections,
    highlights: (locale === "es" ? (["Productos seleccionados para el uso previsto", "Visibilidad de stock y cantidades", "Personalizaci\u00F3n espec\u00EDfica del producto", "Compra online o asistencia a medida"]) : locale === "de" ? (["Produkte passend zum Verwendungszweck", "Transparenz bei Bestand und Mengen", "Produktspezifische Personalisierung", "Onlinebestellung oder individuelle Unterst\u00FCtzung"]) : locale === "it" ? (["Prodotti selezionati per l'uso previsto", "Visibilit\u00E0 su disponibilit\u00E0 e quantit\u00E0", "Personalizzazione specifica del prodotto", "Ordini online o assistenza su misura"]) : isEnglish
      ? ["Products selected for the intended use", "Stock and quantity visibility", "Product-specific customisation", "Online ordering or tailored support"]
      : ["Produits adaptés à l’utilisation", "Visibilité du stock et des quantités", "Personnalisation propre au produit", "Commande en ligne ou accompagnement sur mesure"]),
  };
}
