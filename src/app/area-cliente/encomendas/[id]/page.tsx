import Link from "next/link";
import SiteHeader from "@/components/layout/SiteHeader";
import { ownedCustomerOrder, safeDocumentUrl } from "@/lib/customer/order-details";
import { customerStatus, STATUS_LABELS } from "@/lib/customer/order-status";
import { orderCopy } from "@/lib/customer/order-copy";
import { getCurrentLocale } from "@/lib/i18n/server";
import { localizePath, SITE_LOCALES } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

export default async function CustomerOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getCurrentLocale();
  const t = orderCopy[locale];
  const path = localizePath(`/area-cliente/encomendas/${id}`, locale);
  const { order, user, admin } = await ownedCustomerOrder(id, path);
  // Privileged reads occur only after verifying ownership of this exact order.
  const [items, payments, history, notifications, addresses] = await Promise.all([
    admin.from("order_items").select("id,product_name,quantity,unit_price,total,personalization_required,personalization_notes,customization_component_name,customization_location_name,customization_technique_name,logo_file_name,logo_storage_path,logo_url,mockup_storage_path,mockup_url,technical_preview_url,artwork_approved").eq("order_id", id).order("created_at"),
    admin.from("payments").select("id,status,amount,amount_received,amount_refunded,currency,created_at,paid_at,refunded_at").eq("order_id", id).order("created_at", { ascending: false }),
    admin.from("order_status_history").select("id,new_status,created_at").eq("order_id", id).order("created_at", { ascending: false }),
    admin.from("customer_email_notifications").select("id,event_type,payload,created_at").eq("order_id", id).eq("user_id", user.id).in("event_type", ["order_confirmation", "order_status_changed", "order_tracking_available"]).order("created_at", { ascending: false }),
    admin.from("customer_addresses").select("id,contact_name,company_name,address_line_1,address_line_2,postal_code,city,country_code").eq("user_id", user.id).in("id", [order.shipping_address_id, order.billing_address_id].filter(Boolean)),
  ]);
  if ([items, payments, history, notifications, addresses].some(result => result.error)) throw new Error("Não foi possível carregar todos os detalhes da encomenda. Tenta novamente.");
  const money = (value: number | string | null, currency = order.currency) => new Intl.NumberFormat(SITE_LOCALES[locale].intlLocale, { style: "currency", currency }).format(Number(value ?? 0));
  const date = (value: string) => new Intl.DateTimeFormat(SITE_LOCALES[locale].intlLocale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  const events: { id: string; time: string; label: string }[] = [{ id: "created", time: order.created_at, label: t.received }];
  if (order.paid_at) events.push({ id: "paid", time: order.paid_at, label: t.confirmed });
  for (const [status, time] of [["shipped",order.shipped_at],["delivered",order.delivered_at],["cancelled",order.cancelled_at]]) {
    if (time) events.push({ id: status, time, label: customerStatus(status, locale) });
  }
  for (const row of history.data ?? []) {
    if (STATUS_LABELS[locale][row.new_status]) events.push({ id: row.id, time: row.created_at, label: customerStatus(row.new_status, locale) });
  }
  for (const row of notifications.data ?? []) {
    const payload = row.payload as Record<string, unknown> | null;
    const status = typeof payload?.newStatus === "string" ? payload.newStatus : "";
    const label = row.event_type === "order_tracking_available" ? t.trackingAvailable : row.event_type === "order_confirmation" ? t.confirmed : STATUS_LABELS[locale][status];
    if (label) events.push({ id: row.id, time: row.created_at, label });
  }
  // Email delivery failures do not erase the underlying order event.
  const timeline = events.sort((a, b) => Date.parse(b.time) - Date.parse(a.time)).filter((event, index, all) => !all.slice(0, index).some(previous => previous.label === event.label && Math.abs(Date.parse(previous.time) - Date.parse(event.time)) < 60000));
  const panel = "rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm";
  const link = "inline-flex rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold underline-offset-4 hover:underline";
  const document = (kind: string, item?: string) => `${path}/documento?tipo=${kind}${item ? `&artigo=${item}` : ""}`;
  const trackingUrl = safeDocumentUrl(order.tracking_url);
  return <><SiteHeader context="customer" /><main className="min-h-screen bg-neutral-50 px-4 py-10 sm:px-6"><div className="mx-auto max-w-6xl space-y-6">
    <Link href={localizePath("/area-cliente/encomendas", locale)} className={link}>← {t.back}</Link>
    <header><h1 className="break-words text-3xl font-semibold">{order.order_number}</h1><p className="mt-2 text-neutral-600">{date(order.created_at)}</p><p className="mt-3 font-semibold">{customerStatus(order.status, locale)}</p></header>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"><div className="min-w-0 space-y-6">
      <section className={panel}><h2 className="text-xl font-semibold">{t.history}</h2><ol className="mt-5 space-y-4">{timeline.map(event => <li key={event.id} className="border-l-2 border-orange-500 pl-4"><p className="font-medium">{event.label}</p><time className="text-sm text-neutral-500" dateTime={event.time}>{date(event.time)}</time></li>)}</ol></section>
      <section className={panel}><h2 className="text-xl font-semibold">{t.items}</h2><div className="mt-5 divide-y">{(items.data ?? []).map(item => <article key={item.id} className="space-y-3 py-5 first:pt-0"><h3 className="font-semibold">{item.product_name}</h3><p>{t.quantity}: {item.quantity} · {money(item.unit_price)} / un. · {money(item.total)}</p>{item.personalization_required && <>
        <p>{[item.customization_component_name, item.customization_location_name, item.customization_technique_name].filter(Boolean).join(" · ")}</p>
        <p>{item.artwork_approved ? t.approved : t.unapproved}</p>
        {item.personalization_notes && <p className="whitespace-pre-wrap break-words text-sm">{item.personalization_notes}</p>}
        <div className="flex flex-wrap gap-2">{(item.logo_storage_path || safeDocumentUrl(item.logo_url)) && <a className={link} href={document("logo", item.id)} target="_blank" rel="noopener noreferrer">{t.logo}</a>}{(item.mockup_storage_path || safeDocumentUrl(item.mockup_url ?? item.technical_preview_url)) && <a className={link} href={document("mockup", item.id)} target="_blank" rel="noopener noreferrer">{t.mockup}</a>}</div>
        <p className="text-sm text-neutral-500">{item.mockup_storage_path || item.mockup_url || item.technical_preview_url ? t.simulation : t.awaiting}</p>
      </>}</article>)}</div></section>
      <section className={panel}><h2 className="text-xl font-semibold">{t.payment}</h2><p className="mt-3 font-medium">{customerStatus(order.payment_status, locale)}</p>{!(payments.data?.length) && <p className="mt-3 text-neutral-600">{t.noPayments}</p>}{(payments.data ?? []).map(payment => <div key={payment.id} className="mt-4 border-t pt-4"><p>{customerStatus(payment.status, locale)} · {money(payment.amount, payment.currency)}</p><p className="text-sm text-neutral-500">{date(payment.paid_at ?? payment.created_at)}</p>{Number(payment.amount_refunded) > 0 && <p>{t.refunded}: {money(payment.amount_refunded, payment.currency)}</p>}</div>)}</section>
    </div><aside className="min-w-0 space-y-6">
      <section className={panel}><h2 className="text-xl font-semibold">{t.total}</h2><dl className="mt-4 space-y-2">{[[t.products,order.subtotal],[t.personalization,order.personalization_total],[t.setup,order.setup_total],[t.shipping,order.shipping_total],[t.discount,-Number(order.discount_total)],[t.tax,order.tax_total],[t.total,order.grand_total]].map(([label,value]) => <div key={String(label)} className="flex justify-between gap-3"><dt>{label}</dt><dd className="font-medium">{money(value)}</dd></div>)}</dl></section>
      <section className={panel}><h2 className="text-xl font-semibold">{t.documents}</h2>{order.invoice_number && <p className="my-3">{order.invoice_number}</p>}{safeDocumentUrl(order.invoice_url) ? <a className={`${link} mt-3`} href={document("fatura")} target="_blank" rel="noopener noreferrer">{t.invoice}</a> : <p className="mt-3 text-sm text-neutral-600">{t.invoicePending}</p>}</section>
      <section className={panel}><h2 className="text-xl font-semibold">{t.delivery}</h2><p className="mt-3">{customerStatus(order.fulfillment_status, locale)}</p>{order.shipping_carrier && <p>{order.shipping_carrier}</p>}{order.tracking_number && <p className="break-all">{order.tracking_number}</p>}{trackingUrl && <a className={`${link} mt-3`} href={trackingUrl} target="_blank" rel="noopener noreferrer">{t.tracking}</a>}{order.requested_shipping_date && <p className="mt-3 text-sm">{t.estimated}: {new Intl.DateTimeFormat(SITE_LOCALES[locale].intlLocale).format(new Date(order.requested_shipping_date))}</p>}
      </section>
      <section className={`${panel} break-words`}><h2 className="text-xl font-semibold">{t.contact}</h2><p className="mt-3">{order.customer_name}</p><p>{order.customer_email}</p><p>{order.customer_phone}</p><p>{order.company_name} {order.company_tax_id}</p>{[[t.delivery,order.shipping_address_id],[t.billing,order.billing_address_id]].map(([label,addressId]) => { const address = addresses.data?.find(row => row.id === addressId); return address ? <div key={label} className="mt-4"><h3 className="font-medium">{label}</h3><address className="text-sm not-italic">{address.contact_name}<br/>{address.address_line_1}<br/>{address.address_line_2 && <>{address.address_line_2}<br/></>}{address.postal_code} {address.city}<br/>{address.country_code}</address></div> : null; })}{order.customer_notes && <div className="mt-4"><h3 className="font-medium">{t.notes}</h3><p className="whitespace-pre-wrap text-sm">{order.customer_notes}</p></div>}</section>
    </aside></div><p className="text-sm text-neutral-600">{t.help}</p>
  </div></main></>;
}
