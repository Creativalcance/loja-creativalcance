import "server-only";
import { notFound } from "next/navigation";
import { assertCustomerAccess } from "@/lib/auth/assert-customer";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function ownedCustomerOrder(id: string, returnPath: string) {
  const { user, supabase } = await assertCustomerAccess(returnPath);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const { data: order, error } = await supabase.from("orders")
    .select("id,order_number,status,payment_status,fulfillment_status,currency,subtotal,personalization_total,setup_total,shipping_total,discount_total,tax_total,grand_total,invoice_number,invoice_status,invoice_url,customer_name,customer_email,customer_phone,company_name,company_tax_id,customer_notes,shipping_carrier,tracking_number,tracking_url,requested_shipping_date,created_at,paid_at,shipped_at,delivered_at,cancelled_at,shipping_address_id,billing_address_id")
    .eq("id", id).eq("user_id", user.id).is("deleted_at", null).maybeSingle();
  if (error) throw new Error("Não foi possível consultar a encomenda.");
  if (!order) notFound();
  return { order, user, admin: createSupabaseAdminClient() };
}

export function safeDocumentUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}
