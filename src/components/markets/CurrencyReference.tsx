"use client";
import { useState } from "react";
import type { SiteLocale } from "@/lib/i18n/config";
import { marketText } from "@/lib/markets/i18n";
import type { UsdReference } from "@/lib/markets/exchange";

export default function CurrencyReference({ euros, locale }: { euros: number; locale: SiteLocale }) {
  const [currency, setCurrency] = useState("EUR");
  const [reference, setReference] = useState<UsdReference | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  async function selectCurrency(value: string) {
    setCurrency(value);
    if (value !== "USD" || reference || loading) return;
    setLoading(true);
    setFailed(false);
    try {
      const response = await fetch("/api/markets/exchange-rate", { signal: AbortSignal.timeout(6000) });
      const data = await response.json();
      if (!response.ok || data.base !== "EUR" || data.quote !== "USD" || !Number.isFinite(data.rate) || data.rate <= 0) throw new Error("Invalid reference");
      setReference(data);
    } catch { setFailed(true); }
    finally { setLoading(false); }
  }
  return <div className="mt-4 border-t border-neutral-200 pt-4 text-sm text-neutral-600">
    <label htmlFor="referenceCurrency">{marketText("display", locale)}</label>
    <select id="referenceCurrency" value={currency} onChange={event => void selectCurrency(event.target.value)} className="ml-3 rounded-lg border border-neutral-300 bg-white px-3 py-2"><option value="EUR">EUR</option><option value="USD">USD</option></select>
    {currency === "USD" && <div role="status" aria-live="polite" className="mt-3 space-y-2">
      {loading ? <p>…</p> : reference ? <><p className="font-semibold">≈ {new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }).format(euros * reference.rate)}</p><p>ECB · {reference.date}</p></> : failed ? <p>{marketText("unavailable", locale)}</p> : null}
      <p>{marketText("estimate", locale)}</p>
    </div>}
  </div>;
}
