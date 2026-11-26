import { SITE_LOCALES, type SiteLocale } from "@/lib/i18n/config";
import { MAINLAND_VAT_RATE } from "@/lib/markets/policy";

export const vatLabels = {
  pt: { included: "com IVA", excluded: "sem IVA", mainland: "Portugal Continental", perUnit: "/ un.", fromQuantity: "A partir de {quantity} un.", subtotal: "Subtotal", estimated: "Total estimado", shippingPending: "Portes calculados na finalização da compra", estimatedShipping: "Portes estimados", pendingTax: "IVA a confirmar", discount: "Desconto" },
  en: { included: "incl. VAT", excluded: "excl. VAT", mainland: "Mainland Portugal", perUnit: "/ unit", fromQuantity: "From {quantity} units", subtotal: "Subtotal", estimated: "Estimated total", shippingPending: "Shipping calculated at checkout", estimatedShipping: "Estimated shipping", pendingTax: "VAT to be confirmed", discount: "Discount" },
  fr: { included: "TTC", excluded: "hors TVA", mainland: "Portugal continental", perUnit: "/ unité", fromQuantity: "À partir de {quantity} unités", subtotal: "Sous-total", estimated: "Total estimé", shippingPending: "Frais de livraison calculés lors de la commande", estimatedShipping: "Livraison estimée", pendingTax: "TVA à confirmer", discount: "Remise" },
  es: { included: "con IVA", excluded: "sin IVA", mainland: "Portugal continental", perUnit: "/ ud.", fromQuantity: "A partir de {quantity} ud.", subtotal: "Subtotal", estimated: "Total estimado", shippingPending: "Envío calculado al finalizar la compra", estimatedShipping: "Envío estimado", pendingTax: "IVA por confirmar", discount: "Descuento" },
  de: { included: "inkl. MwSt.", excluded: "zzgl. MwSt.", mainland: "Portugiesisches Festland", perUnit: "/ Stk.", fromQuantity: "Ab {quantity} Stk.", subtotal: "Zwischensumme", estimated: "Geschätzter Gesamtbetrag", shippingPending: "Versandkosten werden beim Bestellabschluss berechnet", estimatedShipping: "Geschätzte Versandkosten", pendingTax: "MwSt. noch zu bestätigen", discount: "Rabatt" },
  it: { included: "IVA inclusa", excluded: "IVA esclusa", mainland: "Portogallo continentale", perUnit: "/ unità", fromQuantity: "Da {quantity} unità", subtotal: "Subtotale", estimated: "Totale stimato", shippingPending: "Spedizione calcolata al checkout", estimatedShipping: "Spedizione stimata", pendingTax: "IVA da confermare", discount: "Sconto" },
} satisfies Record<SiteLocale, Record<string, string>>;

export function formatStorePrice(value: number, currency: string, locale: SiteLocale): string {
  return new Intl.NumberFormat(SITE_LOCALES[locale].intlLocale, {
    style: "currency",
    currency,
  }).format(value);
}

export function getVatAmounts(net: number, rate: number) {
  // Match checkout: round the taxable subtotal, then VAT, then the gross total.
  const taxable = Number(net.toFixed(2));
  const vat = Number((taxable * rate).toFixed(2));
  return { vat, gross: Number((taxable + vat).toFixed(2)) };
}

export function getMainlandPriceRate(currency: string): number | null {
  return currency.toUpperCase() === "EUR" ? MAINLAND_VAT_RATE : null;
}
