import "server-only";
import type { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { safeDocumentUrl } from "@/lib/customer/order-details";
import { INVOICE_BUCKET, isOrderInvoicePath } from "@/lib/orders/invoice-file";

// Call only after verifying admin access or ownership/access to this exact order.
export async function orderInvoiceUrl(admin: ReturnType<typeof createSupabaseAdminClient>, order: {
  id: string; invoice_storage_path?: string | null; invoice_url?: string | null;
}) {
  if (!order.invoice_storage_path) return safeDocumentUrl(order.invoice_url);
  if (!isOrderInvoicePath(order.id, order.invoice_storage_path)) throw new Error("Documento de faturação inválido.");
  const result = await admin.storage.from(INVOICE_BUCKET).createSignedUrl(order.invoice_storage_path, 60, { download: true });
  if (result.error) throw new Error("A fatura está temporariamente indisponível.");
  return result.data.signedUrl;
}
