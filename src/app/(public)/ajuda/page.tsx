import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  CreditCard,
  HelpCircle,
  PackageCheck,
  Palette,
  Search,
  Truck,
} from "lucide-react";
import { localizePath } from "@/lib/i18n/config";
import { getCurrentLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const title = locale === "en" ? "Help and buying support" : locale === "fr" ? "Aide et accompagnement à l’achat" : "Ajuda e apoio à compra";
  const description = locale === "en" ? "Learn how to buy, customise and track promotional products with 360 Merchandising." : locale === "fr" ? "Découvrez comment acheter, personnaliser et suivre vos objets publicitaires avec 360 Merchandising." : "Saiba como comprar, personalizar e acompanhar merchandising e brindes promocionais na 360 Merchandising.";
  return { title, description, alternates: { canonical: localizePath("/ajuda", locale) } };
}

export default async function HelpPage() {
  const locale = await getCurrentLocale();
  const copy = locale === "en" ? {
    back: "Back to homepage", eyebrow: "Help", title: "How can we help?", intro: "Find information about direct ordering, customisation, tailored requests, stock, lead times, checkout and order tracking.", placeholder: "Search for products or help topics", supportTitle: "Do you need tailored support?", supportText: "For complex campaigns, large quantities or specific customisation, send us a tailored request.", supportCta: "Submit a tailored request",
    topics: [["How to buy", "Choose a product, set the quantity and customisation, add it to your cart and complete checkout."], ["Customisation", "Select a technique, provide print instructions and upload your logo during the customisation journey."], ["Stock and lead times", "Stock, prices and product details are synchronised directly with the supplier."], ["Shipping", "Available delivery options and costs are shown at checkout before you confirm your order."]],
  } : locale === "fr" ? {
    back: "Retour à l’accueil", eyebrow: "Aide", title: "Comment pouvons-nous vous aider ?", intro: "Retrouvez les informations sur la commande, la personnalisation, les demandes sur mesure, le stock, les délais, le paiement et le suivi.", placeholder: "Rechercher des produits ou des sujets d’aide", supportTitle: "Besoin d’un accompagnement personnalisé ?", supportText: "Pour une campagne complexe, de grandes quantités ou une personnalisation spécifique, envoyez-nous une demande sur mesure.", supportCta: "Faire une demande sur mesure",
    topics: [["Comment acheter", "Choisissez le produit, définissez la quantité et la personnalisation, ajoutez-le au panier et finalisez la commande."], ["Personnalisation", "Sélectionnez une technique, indiquez les consignes d’impression et téléchargez votre logo pendant le parcours."], ["Stock et délais", "Les stocks, prix et caractéristiques sont synchronisés directement avec le fournisseur."], ["Expédition", "Les options et frais de livraison disponibles sont affichés avant la confirmation de la commande."]],
  } : {
    back: "Voltar à página inicial", eyebrow: "Ajuda", title: "Como podemos ajudar?", intro: "Encontra informação sobre compra direta, personalização, pedidos especiais, stock, prazos, checkout e acompanhamento de encomendas.", placeholder: "Pesquisar produtos ou temas de ajuda", supportTitle: "Precisas de apoio personalizado?", supportText: "Para campanhas complexas, grandes quantidades ou personalizações específicas, envia-nos um pedido personalizado.", supportCta: "Fazer pedido personalizado",
    topics: [["Como comprar", "Escolhe o produto, define quantidade, personalização, adiciona ao carrinho e finaliza o checkout."], ["Personalização", "Podes indicar técnica, notas de impressão e carregar ficheiros de logótipo nas próximas etapas."], ["Stock e prazos", "Os stocks, preços e características são sincronizados diretamente com o fornecedor."], ["Envio", "As opções e os custos de expedição são apresentados no checkout antes da confirmação da encomenda."]],
  };
  const icons = [CreditCard, Palette, PackageCheck, Truck];
  const helpTopics = copy.topics.map(([title, description], index) => ({ title, description, icon: icons[index] }));
  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-12">
      <section className="mx-auto max-w-7xl">
        <Link
          href={localizePath("/", locale)}
          className="text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
        >
          ← {copy.back}
        </Link>

        <div className="mt-8">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
            {copy.eyebrow}
          </p>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950">
            {copy.title}
          </h1>

          <p className="mt-4 max-w-3xl text-neutral-600">
            {copy.intro}
          </p>
        </div>

        <form action={localizePath("/pesquisa", locale)} className="mt-8 max-w-2xl">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

            <input
              type="search"
              name="q"
              placeholder={copy.placeholder}
              className="w-full rounded-2xl border border-neutral-300 bg-white py-4 pl-11 pr-4 text-sm text-neutral-950 shadow-sm outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
            />
          </div>
        </form>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {helpTopics.map((topic) => {
            const Icon = topic.icon;

            return (
              <article
                key={topic.title}
                className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
              >
                <Icon className="h-7 w-7 text-neutral-500" />

                <h2 className="mt-8 text-xl font-semibold text-neutral-950">
                  {topic.title}
                </h2>

                <p className="mt-3 text-sm leading-6 text-neutral-600">
                  {topic.description}
                </p>
              </article>
            );
          })}
        </div>

        <section className="mt-12 rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
          <HelpCircle className="h-8 w-8 text-neutral-500" />

          <h2 className="mt-6 text-2xl font-semibold tracking-tight text-neutral-950">
            {copy.supportTitle}
          </h2>

          <p className="mt-3 max-w-2xl text-neutral-600">
            {copy.supportText}
          </p>

          <Link
            href={localizePath("/contacto", locale)}
            className="mt-6 inline-flex items-center rounded-2xl bg-neutral-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            {copy.supportCta}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </section>
      </section>
    </main>
  );
}
