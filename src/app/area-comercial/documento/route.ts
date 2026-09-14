import { NextRequest, NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { assertSalesAccess, assertSalesOrder } from "@/lib/sales/access";
import { payoutDocument } from "@/lib/sales/documents";
import { safeDocumentUrl } from "@/lib/customer/order-details";
export async function GET(request: NextRequest) {
  const { agent } = await assertSalesAccess();
  const payout = request.nextUrl.searchParams.get("pagamento");
  if (payout) return payoutDocument(payout, agent.id);
  const orderId = request.nextUrl.searchParams.get("encomenda");
  if (!orderId) notFound();
  const { admin } = await assertSalesOrder(orderId);
  let url: string | null = null;
  const type = request.nextUrl.searchParams.get("tipo");
  const order = await admin
    .from("orders")
    .select("invoice_url")
    .eq("id", orderId)
    .is("deleted_at", null)
    .maybeSingle();
  if (order.error || !order.data) notFound();
  if (type === "fatura") url = safeDocumentUrl(order.data.invoice_url);
  else if (type === "logo" || type === "mockup") {
    const itemId = request.nextUrl.searchParams.get("artigo");
    if (!itemId || !/^[\da-f-]{36}$/i.test(itemId)) notFound();
    const item = await admin
      .from("order_items")
      .select("logo_storage_path,mockup_storage_path,logo_url,mockup_url")
      .eq("id", itemId)
      .eq("order_id", orderId)
      .maybeSingle();
    if (item.error || !item.data) notFound();
    const storagePath =
      type === "logo"
        ? item.data.logo_storage_path
        : item.data.mockup_storage_path;
    if (storagePath) {
      const signed = await admin.storage
        .from("customization-artwork")
        .createSignedUrl(storagePath, 60);
      if (signed.error) notFound();
      url = signed.data.signedUrl;
    } else
      url = safeDocumentUrl(
        type === "logo" ? item.data.logo_url : item.data.mockup_url,
      );
  }
  if (!url) notFound();
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
