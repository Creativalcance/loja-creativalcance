import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Droplets,
  Leaf,
  Recycle,
  ShieldCheck,
  Trees,
} from "lucide-react";
import {
  buildEditorialStructuredData,
  serializeJsonLd,
} from "@/lib/seo/structured-data";
import { localizePath, SITE_LOCALES } from "@/lib/i18n/config";
import { getCurrentLocale } from "@/lib/i18n/server";

const copy = {
  pt: { title: "Merchandising sustentável e brindes ecológicos", description: "Critérios para comparar produtos através de materiais, certificações, reutilização e dados ambientais disponíveis.", back: "Voltar à página inicial", eyebrow: "Centro 360 · Sustentabilidade", heading: "Comparar sustentabilidade com informação concreta", intro: "A escolha de merchandising sustentável deve apoiar-se nos dados efetivamente disponíveis para cada referência: composição, materiais, certificações, reutilização e indicadores ambientais. Nem todos os produtos apresentam o mesmo nível de informação.", indicators: [["Materiais reciclados", "A composição e a percentagem descritas no produto ajudam a contextualizar a utilização de materiais reciclados."], ["FSC™", "A informação FSC identifica referências em que o fornecedor indica materiais certificados FSC™."], ["Our Nature", "O catálogo pode identificar referências integradas na linha Our Nature do fornecedor."], ["CO₂", "Quando disponível, o campo CO₂ é apresentado em kg de CO₂ equivalente como dado adicional de comparação."], ["H₂O", "Quando disponível, o campo H₂O acrescenta informação sobre a utilização de água associada ao produto."]], sections: [["Comece pela composição", "Compare o material declarado, a composição e as propriedades do produto. Use termos como reciclado ou FSC apenas quando estão associados à referência concreta."], ["Considere a utilização real", "Durabilidade, reutilização e adequação ao destinatário também são critérios importantes. O produto deve fazer sentido para o uso previsto."], ["Comunique apenas o que está documentado", "Evite extrapolar características ambientais. A comunicação deve refletir os materiais, certificações e indicadores disponibilizados."]], ctaTitle: "Quer explorar alternativas com materiais específicos?", ctaText: "Pesquise termos como reciclado, rPET, bambu, cortiça ou FSC e confirme sempre os detalhes na página da referência.", search: "Pesquisar produtos", guide: "Ler o guia: brindes ecológicos e sustentáveis", breadcrumb: "Sustentabilidade" },
  en: { title: "Sustainable merchandise and eco-friendly promotional products", description: "Compare products using available materials, certifications, reusability and environmental data.", back: "Back to homepage", eyebrow: "360 Centre · Sustainability", heading: "Compare sustainability using concrete information", intro: "Choosing sustainable merchandise should be based on the data available for each product: composition, materials, certifications, reusability and environmental indicators. Not every product provides the same level of information.", indicators: [["Recycled materials", "The composition and percentage shown on the product help put the use of recycled materials into context."], ["FSC™", "FSC information identifies products for which the supplier states the use of FSC™-certified materials."], ["Our Nature", "The catalogue may identify products that belong to the supplier’s Our Nature range."], ["CO₂", "When available, CO₂ is shown in kg of CO₂ equivalent as an additional comparison point."], ["H₂O", "When available, H₂O adds information about water use associated with the product."]], sections: [["Start with composition", "Compare the declared material, composition and product properties. Use terms such as recycled or FSC only when they apply to that specific reference."], ["Consider actual use", "Durability, reusability and suitability for the recipient matter too. The product should make sense for its intended use."], ["Communicate only documented claims", "Avoid extending environmental claims. Communication should reflect the materials, certifications and indicators actually provided."]], ctaTitle: "Want to explore specific materials?", ctaText: "Search for recycled, rPET, bamboo, cork or FSC and always confirm the details on the product page.", search: "Search products", guide: "Read the guide: eco-friendly and sustainable gifts", breadcrumb: "Sustainability" },
  fr: { title: "Merchandising durable et objets publicitaires écologiques", description: "Comparez les produits selon les matériaux, certifications, possibilités de réutilisation et données environnementales disponibles.", back: "Retour à l’accueil", eyebrow: "Centre 360 · Durabilité", heading: "Comparer la durabilité à partir d’informations concrètes", intro: "Le choix d’un merchandising durable doit reposer sur les données disponibles pour chaque référence : composition, matériaux, certifications, réutilisation et indicateurs environnementaux. Tous les produits ne fournissent pas le même niveau d’information.", indicators: [["Matériaux recyclés", "La composition et le pourcentage indiqués sur le produit permettent de contextualiser l’utilisation de matériaux recyclés."], ["FSC™", "L’information FSC identifie les références pour lesquelles le fournisseur indique des matériaux certifiés FSC™."], ["Our Nature", "Le catalogue peut identifier les références appartenant à la gamme Our Nature du fournisseur."], ["CO₂", "Lorsqu’il est disponible, le CO₂ est présenté en kg équivalent CO₂ comme donnée de comparaison supplémentaire."], ["H₂O", "Lorsqu’il est disponible, le champ H₂O apporte des informations sur l’utilisation d’eau associée au produit."]], sections: [["Commencez par la composition", "Comparez le matériau déclaré, la composition et les propriétés. Utilisez les termes recyclé ou FSC uniquement lorsqu’ils concernent la référence."], ["Tenez compte de l’usage réel", "La durabilité, la réutilisation et l’adéquation au destinataire sont également importantes. Le produit doit correspondre à l’usage prévu."], ["Communiquez uniquement ce qui est documenté", "N’extrapolez pas les caractéristiques environnementales. La communication doit refléter les matériaux, certifications et indicateurs fournis."]], ctaTitle: "Vous recherchez des matériaux spécifiques ?", ctaText: "Recherchez recyclé, rPET, bambou, liège ou FSC et vérifiez toujours les détails sur la page du produit.", search: "Rechercher des produits", guide: "Lire le guide : objets écologiques et durables", breadcrumb: "Durabilité" },

es: { title: "Merchandising sostenible y productos promocionales ecol\u00F3gicos", description: "Compara productos seg\u00FAn los materiales, las certificaciones, la reutilizaci\u00F3n y los datos medioambientales disponibles.", back: "Volver al inicio", eyebrow: "Centro 360 \u00B7 Sostenibilidad", heading: "Compara la sostenibilidad con informaci\u00F3n concreta", intro: "La elecci\u00F3n de merchandising sostenible debe basarse en los datos disponibles de cada producto: composici\u00F3n, materiales, certificaciones, reutilizaci\u00F3n e indicadores medioambientales. No todos los productos ofrecen el mismo nivel de informaci\u00F3n.", indicators: [["Materiales reciclados", "La composici\u00F3n y el porcentaje indicados en el producto ayudan a contextualizar el uso de materiales reciclados."], ["FSC\u2122", "La informaci\u00F3n FSC identifica los productos para los que el proveedor declara el uso de materiales con certificaci\u00F3n FSC\u2122."], ["Our Nature", "El cat\u00E1logo puede identificar productos de la gama Our Nature del proveedor."], ["CO\u2082", "Cuando est\u00E1 disponible, el CO\u2082 se muestra en kg de CO\u2082 equivalente como dato adicional de comparaci\u00F3n."], ["H\u2082O", "Cuando est\u00E1 disponible, el H\u2082O aporta informaci\u00F3n sobre el consumo de agua asociado al producto."]], sections: [["Empieza por la composici\u00F3n", "Compara el material declarado, la composici\u00F3n y las propiedades del producto. Utiliza t\u00E9rminos como reciclado o FSC solo cuando correspondan a esa referencia concreta."], ["Considera el uso real", "La durabilidad, la reutilizaci\u00F3n y la adecuaci\u00F3n al destinatario tambi\u00E9n importan. El producto debe ser adecuado para su uso previsto."], ["Comunica solo afirmaciones documentadas", "Evita ampliar las afirmaciones medioambientales. La comunicaci\u00F3n debe reflejar los materiales, las certificaciones y los indicadores realmente proporcionados."]], ctaTitle: "\u00BFQuieres explorar materiales espec\u00EDficos?", ctaText: "Busca reciclado, rPET, bamb\u00FA, corcho o FSC y confirma siempre los detalles en la p\u00E1gina del producto.", search: "Buscar productos", guide: "Leer la gu\u00EDa: regalos ecol\u00F3gicos y sostenibles", breadcrumb: "Sostenibilidad" },
de: { title: "Nachhaltiges Merchandising und umweltfreundliche Werbeartikel", description: "Vergleichen Sie Produkte anhand verf\u00FCgbarer Angaben zu Materialien, Zertifizierungen, Wiederverwendbarkeit und Umwelt.", back: "Zur Startseite", eyebrow: "360-Bereich \u00B7 Nachhaltigkeit", heading: "Nachhaltigkeit anhand konkreter Informationen vergleichen", intro: "Die Auswahl nachhaltigen Merchandisings sollte auf den verf\u00FCgbaren Produktdaten beruhen: Zusammensetzung, Materialien, Zertifizierungen, Wiederverwendbarkeit und Umweltkennzahlen. Nicht zu jedem Produkt liegen gleich viele Informationen vor.", indicators: [["Recycelte Materialien", "Die am Produkt angegebene Zusammensetzung und der Anteil helfen, den Einsatz recycelter Materialien einzuordnen."], ["FSC\u2122", "FSC-Angaben kennzeichnen Produkte, f\u00FCr die der Lieferant die Verwendung FSC\u2122-zertifizierter Materialien angibt."], ["Our Nature", "Der Katalog kann Produkte aus der Our-Nature-Reihe des Lieferanten ausweisen."], ["CO\u2082", "Falls verf\u00FCgbar, wird CO\u2082 als zus\u00E4tzlicher Vergleichswert in kg CO\u2082-\u00C4quivalent angegeben."], ["H\u2082O", "Falls verf\u00FCgbar, erg\u00E4nzt H\u2082O die Angaben zum Wasserverbrauch des Produkts."]], sections: [["Mit der Zusammensetzung beginnen", "Vergleichen Sie das deklarierte Material, die Zusammensetzung und die Produkteigenschaften. Verwenden Sie Begriffe wie recycelt oder FSC nur, wenn sie auf die konkrete Referenz zutreffen."], ["Die tats\u00E4chliche Nutzung ber\u00FCcksichtigen", "Langlebigkeit, Wiederverwendbarkeit und Eignung f\u00FCr den Empf\u00E4nger sind ebenfalls wichtig. Das Produkt sollte zum vorgesehenen Einsatz passen."], ["Nur belegte Aussagen kommunizieren", "Weiten Sie Umweltaussagen nicht aus. Die Kommunikation sollte den tats\u00E4chlich angegebenen Materialien, Zertifizierungen und Kennzahlen entsprechen."]], ctaTitle: "M\u00F6chten Sie bestimmte Materialien entdecken?", ctaText: "Suchen Sie nach recycelt, rPET, Bambus, Kork oder FSC und pr\u00FCfen Sie stets die Details auf der Produktseite.", search: "Produkte suchen", guide: "Ratgeber lesen: umweltfreundliche und nachhaltige Geschenke", breadcrumb: "Nachhaltigkeit" },
it: { title: "Merchandising sostenibile e prodotti promozionali ecologici", description: "Confronta i prodotti in base ai materiali, alle certificazioni, alla riutilizzabilit\u00E0 e ai dati ambientali disponibili.", back: "Torna alla pagina iniziale", eyebrow: "Centro 360 \u00B7 Sostenibilit\u00E0", heading: "Confronta la sostenibilit\u00E0 con informazioni concrete", intro: "La scelta di merchandising sostenibile deve basarsi sui dati disponibili per ogni prodotto: composizione, materiali, certificazioni, riutilizzabilit\u00E0 e indicatori ambientali. Non tutti i prodotti offrono lo stesso livello di informazioni.", indicators: [["Materiali riciclati", "La composizione e la percentuale indicate sul prodotto aiutano a contestualizzare l'uso di materiali riciclati."], ["FSC\u2122", "Le informazioni FSC identificano i prodotti per i quali il fornitore dichiara l'uso di materiali certificati FSC\u2122."], ["Our Nature", "Il catalogo pu\u00F2 identificare prodotti appartenenti alla gamma Our Nature del fornitore."], ["CO\u2082", "Quando disponibile, il CO\u2082 viene mostrato in kg di CO\u2082 equivalente come ulteriore dato di confronto."], ["H\u2082O", "Quando disponibile, H\u2082O aggiunge informazioni sull'uso di acqua associato al prodotto."]], sections: [["Inizia dalla composizione", "Confronta materiale dichiarato, composizione e propriet\u00E0 del prodotto. Usa termini come riciclato o FSC solo quando si applicano a quello specifico riferimento."], ["Considera l'uso reale", "Contano anche durata, riutilizzabilit\u00E0 e adeguatezza al destinatario. Il prodotto deve essere adatto all'uso previsto."], ["Comunica solo affermazioni documentate", "Evita di ampliare le affermazioni ambientali. La comunicazione deve rispecchiare materiali, certificazioni e indicatori effettivamente forniti."]], ctaTitle: "Vuoi esplorare materiali specifici?", ctaText: "Cerca riciclato, rPET, bamb\u00F9, sughero o FSC e verifica sempre i dettagli nella pagina del prodotto.", search: "Cerca prodotti", guide: "Leggi la guida: regali ecologici e sostenibili", breadcrumb: "Sostenibilit\u00E0" },
} as const;

const indicatorIcons = [Recycle, Trees, Leaf, ShieldCheck, Droplets];

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const t = copy[locale];
  const path = localizePath("/sustentabilidade", locale);
  return { title: t.title, description: t.description, alternates: { canonical: path }, openGraph: { type: "website", locale: SITE_LOCALES[locale].htmlLang.replace("-", "_"), title: t.title, description: t.description, url: path } };
}

export default async function SustainabilityPage() {
  const locale = await getCurrentLocale();
  const t = copy[locale];
  const path = localizePath("/sustentabilidade", locale);
  const structuredData = buildEditorialStructuredData({
    name: t.title, description: t.description, path, breadcrumbLabel: t.breadcrumb,
  });

  return (
    <main className="min-h-screen bg-neutral-50">
      <section className="border-b border-neutral-200 bg-[#10281f] text-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <Link
            href={localizePath("/", locale)}
            className="text-sm font-medium text-white/55 transition hover:text-white"
          >
            ← {t.back}
          </Link>
          <div className="mt-10 max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
              {t.eyebrow}
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">
              {t.heading}
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-white/70">
              {t.intro}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          {t.indicators.map(([title, text], index) => {
            const Icon = indicatorIcons[index];
            return (
            <article
              key={title}
              className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
            >
              <Icon className="h-6 w-6 text-emerald-700" />
              <h2 className="mt-5 text-lg font-semibold text-neutral-950">
                {title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-neutral-600">{text}</p>
            </article>
            );
          })}
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-3">
          {t.sections.map(([title, text]) => <article key={title}><h2 className="text-2xl font-semibold tracking-tight text-neutral-950">{title}</h2><p className="mt-4 leading-8 text-neutral-600">{text}</p></article>)}
        </div>

        <div className="mt-14 rounded-3xl border border-emerald-200 bg-emerald-50 p-8 md:flex md:items-center md:justify-between md:gap-8">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">
              {t.ctaTitle}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
              {t.ctaText}
            </p>
          </div>
          <Link
            href={localizePath("/pesquisa?q=reciclado", locale)}
            className="mt-5 inline-flex shrink-0 items-center rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 md:mt-0"
          >
            {t.search}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>

        <div className="mt-10 text-sm text-neutral-500">
          <Link
            href={localizePath("/guias/brindes-ecologicos-sustentaveis", locale)}
            className="font-semibold text-neutral-950 hover:underline"
          >
            {t.guide} →
          </Link>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
    </main>
  );
}
