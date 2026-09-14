import Link from "next/link";
import { notFound } from "next/navigation";
import { assertSalesOrder } from "@/lib/sales/access";
import { salesCopy, salesMoney } from "@/lib/sales/i18n";
import { localizePath } from "@/lib/i18n/config";
import { customerStatus } from "@/lib/customer/order-status";
import { safeDocumentUrl } from "@/lib/customer/order-details";
import { getLocalizedProductTexts } from "@/lib/i18n/catalog";
import { hydrateOrderArtworkGeometry } from "@/lib/orders/artwork-geometry";
import { buildOrderArtworkPreview } from "@/lib/orders/artwork-preview";
import OrderArtworkPreview from "@/components/orders/OrderArtworkPreview";
import { Panel } from "@/components/sales/Fields";
export default async function SalesOrder({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { agent, admin } = await assertSalesOrder(id);
  const locale = agent.locale,
    t = salesCopy(locale);
  const path = (p: string) => localizePath(p, locale);
  const [orderResult, itemResult] = await Promise.all([
    admin
      .from("orders")
      .select(
        "id,order_number,customer_name,company_name,status,payment_status,currency,grand_total,invoice_url,tracking_url,tracking_number,shipping_carrier,created_at",
      )
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle(),
    admin
      .from("order_items")
      .select(
        "id,product_id,product_name,quantity,total,personalization_data,technical_preview_url,printing_width_mm,printing_height_mm,logo_position_x,logo_position_y,logo_scale,logo_rotation,logo_width_mm,logo_height_mm,logo_storage_path,mockup_storage_path,logo_url,mockup_url,customization_location_id,service_code",
      )
      .eq("order_id", id),
  ]);
  if (orderResult.error || itemResult.error) throw new Error(t.error);
  const order = orderResult.data;
  if (!order) notFound();
  const items = await hydrateOrderArtworkGeometry(admin, itemResult.data ?? []);
  const translations = await getLocalizedProductTexts({
    productIds: items.map((i) => i.product_id).filter(Boolean),
    locale,
  });
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-9 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href={path("/area-comercial")} className="text-sm text-slate-500">
          ← {t.back}
        </Link>
        <div className="my-7">
          <p className="text-sm text-slate-500">{t.order}</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#162334]">
            {order.order_number}
          </h1>
          <p className="mt-2 text-slate-500">
            {order.customer_name} · {order.company_name}
          </p>
        </div>
        <div className="mb-7 flex flex-wrap gap-3">
          <span className="rounded-full bg-white px-4 py-2 text-sm">
            {customerStatus(order.status, locale)}
          </span>
          <span className="rounded-full bg-white px-4 py-2 text-sm">
            {customerStatus(order.payment_status, locale)}
          </span>
          <span className="rounded-full bg-white px-4 py-2 font-semibold">
            {salesMoney(
              Math.round(order.grand_total * 100),
              order.currency,
              locale,
            )}
          </span>
          {safeDocumentUrl(order.invoice_url) && (
            <Link
              className="rounded-full bg-[#162334] px-4 py-2 text-sm text-white"
              href={path(
                `/area-comercial/documento?encomenda=${id}&tipo=fatura`,
              )}
            >
              {t.invoice}
            </Link>
          )}
          {safeDocumentUrl(order.tracking_url) && (
            <a
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm"
              href={safeDocumentUrl(order.tracking_url)!}
            >
              {t.tracking}
            </a>
          )}
        </div>
        <div className="space-y-6">
          {items.map((item) => {
            const name =
              translations.get(item.product_id)?.name || item.product_name;
            const base = path(
              `/area-comercial/documento?encomenda=${id}&artigo=${item.id}`,
            );
            const preview = buildOrderArtworkPreview(item, {
              logoUrl:
                item.logo_storage_path || item.logo_url
                  ? base + "&tipo=logo"
                  : null,
              mockupUrl:
                item.mockup_storage_path || item.mockup_url
                  ? base + "&tipo=mockup"
                  : null,
            });
            return (
              <Panel key={item.id} title={name}>
                <p className="mb-4 text-sm text-slate-500">
                  {t.quantity}: {item.quantity} ·{" "}
                  {salesMoney(
                    Math.round(item.total * 100),
                    order.currency,
                    locale,
                  )}
                </p>
                <OrderArtworkPreview
                  preview={preview}
                  alt={`${t.simulation}: ${name}`}
                />
              </Panel>
            );
          })}
        </div>
      </div>
    </main>
  );
}
