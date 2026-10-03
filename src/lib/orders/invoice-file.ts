import { createHash } from "node:crypto";

export const INVOICE_BUCKET = "order-invoices";
export const MAX_INVOICE_BYTES = 3 * 1024 * 1024;

export function isOrderInvoicePath(orderId: string, path: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)
    && path.startsWith(`${orderId}/`)
    && /^[a-f0-9]{64}\.pdf$/.test(path.slice(orderId.length + 1));
}

export function invoiceEventKey(orderId: string, path: string): string {
  if (!isOrderInvoicePath(orderId, path)) throw new Error("Documento de faturação inválido.");
  return `order-invoice:${orderId}:${path.slice(orderId.length + 1, -4)}`;
}

export async function prepareInvoiceFile(orderId: string, invoiceNumber: string, file: File) {
  if (!invoiceNumber.trim() || invoiceNumber.length > 100 || /[\r\n]/.test(invoiceNumber)) {
    throw new Error("Indica um número de fatura válido, até 100 caracteres.");
  }
  if (!file.name.toLowerCase().endsWith(".pdf") || (file.type && file.type !== "application/pdf")) {
    throw new Error("Carrega a fatura em formato PDF.");
  }
  if (file.size === 0 || file.size > MAX_INVOICE_BYTES) throw new Error("O PDF deve ter até 3 MB e não pode estar vazio.");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") throw new Error("O ficheiro não é um PDF válido.");
  // Immutable and deterministic: saving the same number + PDF cannot send twice.
  const hash = createHash("sha256").update(invoiceNumber.trim()).update("\0").update(bytes).digest("hex");
  const path = `${orderId}/${hash}.pdf`;
  if (!isOrderInvoicePath(orderId, path)) throw new Error("Encomenda inválida.");
  const fileName = `Fatura-${invoiceNumber.replace(/[^\p{L}\p{N}_.-]+/gu, "-")}.pdf`;
  return { bytes, path, fileName };
}
