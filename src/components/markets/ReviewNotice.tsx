import Link from "next/link";
import { localizePath, type SiteLocale } from "@/lib/i18n/config";
import { marketText } from "@/lib/markets/i18n";
import type { ReviewReason } from "@/lib/markets/policy";
export default function ReviewNotice({ reason, locale, cartId }: { reason: ReviewReason; locale: SiteLocale; cartId: string }) {
  const subject = encodeURIComponent(`360 — ${cartId}`);
  return <main className="min-h-screen bg-neutral-50 px-6 py-12"><section className="mx-auto max-w-2xl rounded-3xl border border-neutral-200 bg-white p-8"><p className="text-lg">{marketText(reason, locale)}</p><div className="mt-6 flex flex-wrap gap-5"><a className="font-semibold underline" href={`mailto:info@360-merchandising.com?subject=${subject}`}>{marketText("contact", locale)}</a><Link className="underline" href={localizePath("/checkout", locale)}>{marketText("edit", locale)}</Link></div></section></main>;
}
