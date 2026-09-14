import Link from "next/link";
import { notFound } from "next/navigation";
import OrderArtworkPreview from "@/components/orders/OrderArtworkPreview";
import { ownedCustomerOrder, safeDocumentUrl } from "@/lib/customer/order-details";
import { buildOrderArtworkPreview, hasOrderArtworkPreview } from "@/lib/orders/artwork-preview";
import { hydrateOrderArtworkGeometry } from "@/lib/orders/artwork-geometry";
import { getCurrentLocale } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";
import { orderCopy } from "@/lib/customer/order-copy";

export const dynamic = "force-dynamic";

export default async function OrderMockupPage({ params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await params;
  const locale = await getCurrentLocale();
  const path = localizePath(`/area-cliente/encomendas/${id}`, locale);
  const { order, admin } = await ownedCustomerOrder(id, `${path}/mockup/${itemId}`);
  if (!/^[0-9a-f-]{36}$/i.test(itemId)) notFound();
  const { data: item, error } = await admin.from("order_items")
    .select("id,product_name,logo_storage_path,logo_url,mockup_storage_path,mockup_url,technical_preview_url,customization_location_id,service_code,personalization_data,printing_width_mm,printing_height_mm,logo_position_x,logo_position_y,logo_scale,logo_rotation,logo_width_mm,logo_height_mm")
    .eq("order_id", order.id).eq("id", itemId).maybeSingle();
  if (error) throw new Error("Documento temporariamente indisponível.");
  if (!item) notFound();
  const [hydrated] = await hydrateOrderArtworkGeometry(admin, [item]);
  const document = (kind: string) => `${path}/documento?tipo=${kind}&artigo=${itemId}`;
  const preview = buildOrderArtworkPreview(hydrated, {
    logoUrl: item.logo_storage_path || safeDocumentUrl(item.logo_url) ? document("logo") : null,
    mockupUrl: item.mockup_storage_path || safeDocumentUrl(item.mockup_url) ? document("mockup") : null,
  });
  if (!hasOrderArtworkPreview(preview)) notFound();
  const t = orderCopy[locale];
  return <main className="min-h-screen bg-neutral-50 px-4 py-10"><div className="mx-auto max-w-4xl space-y-6 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
    <Link href={path} className="text-sm font-semibold underline">← {t.details}</Link>
    <h1 className="text-2xl font-semibold">{item.product_name}</h1><p>{order.order_number}</p>
    <OrderArtworkPreview preview={preview} alt={`${t.mockup}: ${item.product_name}`} />
    <p className="text-sm text-neutral-500">{t.simulation}</p>
  </div></main>;
}
