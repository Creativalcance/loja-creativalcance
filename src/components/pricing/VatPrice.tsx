import type { SiteLocale } from "@/lib/i18n/config";
import { formatStorePrice, getMainlandPriceRate, getVatAmounts, vatLabels } from "@/lib/pricing/vat-display";

type Props = {
  amount: number;
  locale: SiteLocale;
  currency?: string;
  rate?: number | null;
  from?: string;
  unit?: boolean;
  className?: string;
};

export default function VatPrice({
  amount,
  locale,
  currency = "EUR",
  rate,
  from,
  unit,
  className,
}: Props) {
  const labels = vatLabels[locale];
  const unitLabel = unit ? ` ${labels.perUnit}` : "";
  const appliedRate = rate === undefined ? getMainlandPriceRate(currency) : rate;
  const mainlandLabel = rate === undefined ? ` (${labels.mainland})` : "";
  const net = `${formatStorePrice(amount, currency, locale)}${unitLabel}`;

  return (
    <span className={className}>
      <span className="block font-semibold tabular-nums">
        {from ? `${from} ` : ""}
        {appliedRate === null ? net : `${formatStorePrice(getVatAmounts(amount, appliedRate).gross, currency, locale)}${unitLabel}`}
        {" "}
        <span className="text-xs font-medium">
          {appliedRate === null ? labels.excluded : `${labels.included}${mainlandLabel}`}
        </span>
      </span>
      {appliedRate !== null && (
        <span className="block text-xs font-normal opacity-75">{net} {labels.excluded}</span>
      )}
    </span>
  );
}
