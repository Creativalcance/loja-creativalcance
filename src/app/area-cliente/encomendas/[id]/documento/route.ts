import { NextRequest, NextResponse } from "next/server";
import { getSiteLocale, localizePath } from "@/lib/i18n/config";
import { notFound } from "next/navigation";
import { ownedCustomerOrder, safeDocumentUrl } from "@/lib/customer/order-details";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { order, admin } = await ownedCustomerOrder(id, `/area-cliente/encomendas/${id}`);
  const kind = request.nextUrl.searchParams.get("tipo");
  let url: string | null = null;
  if (kind === "fatura") url = safeDocumentUrl(order.invoice_url);
  else if (kind === "logo" || kind === "mockup") {
    const itemId = request.nextUrl.searchParams.get("artigo");
    if (!itemId || !/^[0-9a-f-]{36}$/i.test(itemId)) notFound();
    const { data: item, error } = await admin.from("order_items")
      .select("logo_storage_path,mockup_storage_path,logo_url,mockup_url,technical_preview_url")
      .eq("order_id", order.id).eq("id", itemId).maybeSingle();
    if (error) throw new Error("Documento temporariamente indisponível.");
    if (!item) notFound();
    const path = kind === "logo" ? item.logo_storage_path : item.mockup_storage_path;
    if (path) {
      const result = await admin.storage.from("customization-artwork").createSignedUrl(path, 60);
      if (result.error) throw new Error("Documento temporariamente indisponível.");
      url = result.data.signedUrl;
    } else {
      url = safeDocumentUrl(kind === "logo" ? item.logo_url : item.mockup_url);
      if (kind === "mockup" && !url) {
        const locale = getSiteLocale(request.headers.get("x-site-locale"));
        const response = NextResponse.redirect(new URL(localizePath(`/area-cliente/encomendas/${id}/mockup/${itemId}`, locale), request.url));
        response.headers.set("Cache-Control", "private, no-store");
        return response;
      }
    }
  }
  if (!url) notFound();
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
