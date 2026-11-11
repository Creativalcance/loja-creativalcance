import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Gift } from "lucide-react";
import { localizePath, SITE_LOCALES, type SiteLocale } from "@/lib/i18n/config";
import { campaignText, type HomepageConfig } from "@/lib/homepage/config";
import type { HomepageProduct } from "@/lib/homepage/data";

const copy = {
  pt: { minimum: "Mínimo", units: "un.", from: "Desde", note: "Preços sem IVA. Consulta as condições de entrega na página de cada produto." },
  en: { minimum: "Minimum", units: "units", from: "From", note: "Prices exclude VAT. Check each product page for delivery conditions." },
  fr: { minimum: "Minimum", units: "unités", from: "Dès", note: "Prix hors TVA. Consultez les conditions de livraison sur chaque fiche produit." },
  es: { minimum: "Mínimo", units: "ud.", from: "Desde", note: "Precios sin IVA. Consulta las condiciones de entrega en cada producto." },
  de: { minimum: "Mindestens", units: "Stück", from: "Ab", note: "Preise ohne MwSt. Die Lieferbedingungen finden Sie auf der jeweiligen Produktseite." },
  it: { minimum: "Minimo", units: "unità", from: "Da", note: "Prezzi IVA esclusa. Consulta le condizioni di consegna nella pagina di ogni prodotto." },
};
export default function HomepageCampaign({ config, products, locale }: { config: HomepageConfig; products: HomepageProduct[]; locale: SiteLocale }) {
  if (!products.length) return null;
  const text = campaignText(config, locale), labels = copy[locale];
  return <section id="destaques" aria-labelledby="home-campaign-title" className="border-b border-[#e6d9c9] bg-[#faf5ed] text-[#162334]">
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#a84710]"><Gift className="h-4 w-4" aria-hidden="true" />{text.eyebrow}</p>
          <h2 id="home-campaign-title" className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">{text.title}</h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#526072] sm:text-base">{text.description}</p>
        </div>
        <Link href={localizePath(config.campaign.collectionPath, locale)} className="inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-full border border-[#162334]/20 px-5 py-3 text-sm font-semibold transition hover:bg-white md:self-auto">{text.collectionCta}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
      </div>
      <ul className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
        {products.map((product, index) => <li key={product.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#e8e0d5] bg-white shadow-sm">
          <Link href={localizePath(`/produto/${product.slug}`, locale)} aria-label={product.name} className="block aspect-square overflow-hidden bg-white">
            {product.image ? <Image src={product.image} alt={product.name} width={420} height={420} sizes="(min-width: 1280px) 300px, (min-width: 1024px) 24vw, 48vw" priority={index === 0} className="h-full w-full object-contain p-2 transition duration-300 hover:scale-105" /> : <Gift aria-hidden="true" className="mx-auto h-full w-14 text-neutral-300" />}
          </Link>
          <div className="flex flex-1 flex-col p-3 sm:p-5">
            <h3 className="text-base font-semibold sm:text-xl">{product.name}</h3>
            <p className="mt-2 text-xs text-neutral-500">{labels.minimum} {product.minimum} {labels.units}</p>
            <p className="mt-4 text-xs text-neutral-500">{labels.from}</p>
            <p className="mb-5 text-xl font-semibold tracking-tight sm:text-2xl">{new Intl.NumberFormat(SITE_LOCALES[locale].intlLocale, { style: "currency", currency: "EUR" }).format(product.price)}</p>
            <Link href={localizePath(`/produto/${product.slug}`, locale) + "#comprar"} aria-label={`${text.productCta} ${product.name}`} className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#162334] px-3 py-3 text-sm font-semibold text-white transition hover:bg-[#b95010]">{text.productCta}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
        </li>)}
      </ul>
      <p className="mt-5 text-xs leading-5 text-neutral-600">{labels.note}</p>
    </div>
  </section>;
}
