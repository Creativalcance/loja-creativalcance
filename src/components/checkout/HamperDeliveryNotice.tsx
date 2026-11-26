import { SITE_LOCALES, type SiteLocale } from "@/lib/i18n/config";
import { hamperText } from "@/lib/checkout/hamper-copy";
import type { ShippingQuote } from "@/lib/checkout/shipping-pricing";

export default function HamperDeliveryNotice({ locale, unitPrice, quote, variant = "notice" }: {
  locale: SiteLocale; unitPrice?: number | null; quote?: ShippingQuote; variant?: "notice" | "subtle";
}) {
  const money = (n: number) => new Intl.NumberFormat(SITE_LOCALES[locale].intlLocale, { style: "currency", currency: "EUR" }).format(n);
  const sectionClassName = variant === "subtle"
    ? "mt-10 border-t border-neutral-200 pt-6 text-sm leading-6 text-neutral-600 sm:mt-12"
    : "my-5 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-orange-950";
  return <section className={sectionClassName}>
    <h2 className="font-semibold">{hamperText("title", locale)}</h2>
    <p className="mt-2">{unitPrice != null ? hamperText("unit", locale).replace("{price}", money(unitPrice)) : hamperText("belowTen", locale)}</p>
    <p className="mt-2">{hamperText("rules", locale)}</p>
    {quote?.hasStandardItems && <p className="mt-2">{hamperText("mixed", locale)}</p>}
    {quote && <p className="mt-2 font-semibold">{hamperText("estimated", locale)}: {money(quote.total)}</p>}
    <p className="mt-2">{hamperText("special", locale)}</p>
    <a href="mailto:info@360-merchandising.com" className="mt-2 inline-block font-semibold underline">info@360-merchandising.com</a>
  </section>;
}
