import Link from "next/link";
import { ArrowRight, CalendarCheck2, CheckCircle2, Leaf, PackageCheck, Sparkles } from "lucide-react";
import type { SmartMerchResult } from "@/lib/smart-merch/types";
import { localizePath, SITE_LOCALES, type SiteLocale } from "@/lib/i18n/config";

function formatMoney(value: number, currency: string, locale: SiteLocale): string {
  return new Intl.NumberFormat(SITE_LOCALES[locale].intlLocale, { style: "currency", currency }).format(value);
}

export default function SmartMerchResultCard({ result, locale }: { result: SmartMerchResult; locale: SiteLocale }) {
  const text = locale === "en" ? { noImage: "No image available", match: "match", colour: "Selected colour", sustainable: "Sustainable", customizable: "Customisable", unit: "Product / unit", total: "Product total", quote: "On request", calculate: "To be calculated", stock: "units available", delivery: "Estimated delivery", withCustomization: "Includes the fastest available customisation", withoutCustomization: "Product without customisation", estimate: "Estimate only, subject to mock-up approval, selected customisation and shipping time.", why: "Why we recommend it", view: "View product" } : locale === "fr" ? { noImage: "Image indisponible", match: "compatible", colour: "Couleur sélectionnée", sustainable: "Durable", customizable: "Personnalisable", unit: "Produit / unité", total: "Total produit", quote: "Sur demande", calculate: "À calculer", stock: "unités disponibles", delivery: "Livraison estimée", withCustomization: "Inclut la personnalisation disponible la plus rapide", withoutCustomization: "Produit sans personnalisation", estimate: "Estimation uniquement, selon l’approbation de la maquette, la personnalisation et le transport.", why: "Pourquoi nous le recommandons", view: "Voir le produit" } : { noImage: "Sem imagem disponível", match: "compatível", colour: "Cor selecionada", sustainable: "Sustentável", customizable: "Personalizável", unit: "Produto/unidade", total: "Produto total", quote: "Sob consulta", calculate: "Por calcular", stock: "un. disponíveis", delivery: "Entrega estimada", withCustomization: "Considera a personalização mais rápida disponível", withoutCustomization: "Produto sem personalização incluída", estimate: "Data meramente estimativa, dependente da aprovação da maquete, da personalização e do transporte.", why: "Porque recomendamos", view: "Ver produto" };
  return (
    <article className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <Link href={localizePath(`/produto/${result.slug}`, locale)} className="group block">
        <div className="relative aspect-square bg-neutral-100">
          {result.imageUrl ? (
            <img src={result.imageUrl} alt={result.imageAlt} className="h-full w-full object-contain p-5 transition duration-500 group-hover:scale-105" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-neutral-400">{text.noImage}</div>
          )}
          <span className="absolute left-4 top-4 rounded-full bg-neutral-950 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
            {result.matchScore}% {text.match}
          </span>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-400">{result.sku}</p>
          <h2 className="mt-2 line-clamp-2 text-lg font-semibold tracking-tight text-neutral-950">{result.name}</h2>
          {result.variantColor ? <p className="mt-2 text-sm text-neutral-600">{text.colour}: {result.variantColor}</p> : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {result.isSustainable ? <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"><Leaf className="mr-1 h-3 w-3" />{text.sustainable}</span> : null}
            {result.isCustomizable ? <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700"><Sparkles className="mr-1 h-3 w-3" />{text.customizable}</span> : null}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-neutral-100 pt-5">
            <div><p className="text-xs text-neutral-500">{text.unit}</p><p className="mt-1 font-semibold text-neutral-950">{result.unitPrice === null ? text.quote : formatMoney(result.unitPrice, result.currency, locale)}</p></div>
            <div><p className="text-xs text-neutral-500">{text.total}</p><p className="mt-1 font-semibold text-neutral-950">{result.productTotal === null ? text.calculate : formatMoney(result.productTotal, result.currency, locale)}</p></div>
          </div>

          <div className="mt-4 flex items-center text-xs font-medium text-neutral-600"><PackageCheck className="mr-2 h-4 w-4 text-emerald-600" />{result.availableStock.toLocaleString(SITE_LOCALES[locale].intlLocale)} {text.stock}</div>
          <div className="mt-2 flex items-start text-xs font-medium text-neutral-600">
            <CalendarCheck2 className="mr-2 mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              {text.delivery}: {new Intl.DateTimeFormat(SITE_LOCALES[locale].intlLocale).format(new Date(`${result.estimatedDeliveryDate}T12:00:00Z`))}
              <span className="mt-0.5 block font-normal text-neutral-400">
                {result.deliveryIncludesPersonalization ? text.withCustomization : text.withoutCustomization}
              </span>
              <span className="mt-1.5 block font-normal leading-4 text-neutral-500">
                {text.estimate}
              </span>
            </span>
          </div>

          <div className="mt-5 rounded-2xl bg-neutral-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">{text.why}</p>
            <ul className="mt-3 space-y-2">
              {result.reasons.map((reason) => <li key={reason.code} className="flex text-xs text-neutral-700"><CheckCircle2 className="mr-2 mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />{reason.label}</li>)}
            </ul>
          </div>

          <span className="mt-5 inline-flex items-center text-sm font-semibold text-neutral-950">{text.view}<ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" /></span>
        </div>
      </Link>
    </article>
  );
}
