import type { SiteLocale } from "@/lib/i18n/config";
import type { SalesSummary } from "@/lib/sales/data";
import { salesCopy, salesMoney } from "@/lib/sales/i18n";
export default function SummaryCards({
  rows,
  locale,
}: {
  rows: SalesSummary[];
  locale: SiteLocale;
}) {
  const t = salesCopy(locale);
  const summaries = rows.length
    ? rows
    : [
        {
          currency: "EUR",
          forecast_cents: 0,
          eligible_cents: 0,
          approved_cents: 0,
          paid_cents: 0,
        },
      ];
  return (
    <div className="space-y-4">
      {summaries.map((r) => (
        <div
          key={r.currency}
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          {[
            { label: t.forecast, value: r.forecast_cents },
            { label: t.eligible, value: r.eligible_cents },
            { label: t.approved, value: r.approved_cents },
            { label: t.paid, value: r.paid_cents },
          ].map((v, i) => (
            <article
              key={v.label}
              className={`rounded-2xl border p-5 ${i === 2 ? "border-orange-200 bg-orange-50" : "border-slate-200 bg-white"}`}
            >
              <p className="text-sm text-slate-500">{v.label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-[#162334]">
                {salesMoney(v.value, r.currency, locale)}
              </p>
            </article>
          ))}
        </div>
      ))}
    </div>
  );
}
