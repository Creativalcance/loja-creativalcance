import { canRequestMockupApproval, mockupCopy, safeMockupUrl, type OrderMockup } from "@/lib/orders/mockup";
import { SITE_LOCALES, type SiteLocale } from "@/lib/i18n/config";

export default function OrderMockups({ mockups, locale, recipient, order }: {
  mockups: OrderMockup[]; locale: SiteLocale; recipient: string | null;
  order: { status: string; payment_status: string };
}) {
  if (!mockups.length) return null;
  const copy = mockupCopy[locale];
  const activeOrder = canRequestMockupApproval(order);
  return <section className="rounded-3xl border border-orange-200 bg-white p-6 shadow-sm">
    <h2 className="text-xl font-semibold">{copy.heading}</h2>
    {recipient && <p className="mt-2 break-words text-sm text-neutral-600">{copy.recipient}: {recipient}</p>}
    <ul className="mt-5 space-y-5">{mockups.map(proof => {
      const url = activeOrder && proof.state === "pending" ? safeMockupUrl(proof.approval_url) : null;
      return <li key={proof.id} className="space-y-3 border-t border-neutral-100 pt-4">
        <p className="font-semibold">{copy.version} {proof.version} <span className="font-normal text-neutral-500">· <time dateTime={proof.first_seen_at}>{new Intl.DateTimeFormat(SITE_LOCALES[locale].intlLocale, { dateStyle: "medium" }).format(new Date(proof.first_seen_at))}</time></span></p>
        <p className="text-sm text-neutral-600">{activeOrder ? copy[proof.state] : copy.closed}</p>
        {url && <><p className="text-sm leading-relaxed text-neutral-600">{copy.instruction}</p><a href={url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"
          className="inline-flex rounded-xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-500">{copy.action}</a></>}
      </li>;
    })}</ul>
  </section>;
}
