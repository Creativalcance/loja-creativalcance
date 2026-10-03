import type { SiteLocale } from "@/lib/i18n/config";

const invoiceCopy = {
  pt: { subject: "Fatura da encomenda", heading: "A sua fatura", intro: "Segue em anexo a fatura", order: "relativa à encomenda", detail: "Também pode consultar o documento na sua área de cliente.", button: "Consultar encomenda" },
  en: { subject: "Invoice for order", heading: "Your invoice", intro: "Please find attached invoice", order: "for order", detail: "You can also access the document in your customer area.", button: "View order" },
  fr: { subject: "Facture de la commande", heading: "Votre facture", intro: "Vous trouverez en pièce jointe la facture", order: "de la commande", detail: "Le document est également disponible dans votre espace client.", button: "Voir la commande" },
  es: { subject: "Factura del pedido", heading: "Tu factura", intro: "Adjuntamos la factura", order: "del pedido", detail: "También puedes consultar el documento en tu área de cliente.", button: "Ver pedido" },
  de: { subject: "Rechnung zur Bestellung", heading: "Ihre Rechnung", intro: "Im Anhang finden Sie die Rechnung", order: "zur Bestellung", detail: "Das Dokument steht Ihnen auch in Ihrem Kundenbereich zur Verfügung.", button: "Bestellung ansehen" },
  it: { subject: "Fattura dell’ordine", heading: "La tua fattura", intro: "In allegato trovi la fattura", order: "relativa all’ordine", detail: "Il documento è disponibile anche nella tua area cliente.", button: "Vedi ordine" },
} satisfies Record<SiteLocale, { subject: string; heading: string; intro: string; order: string; detail: string; button: string }>;

function text(value: unknown): string { return typeof value === "string" ? value : ""; }
function escape(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function invoiceCustomerCopy(locale: SiteLocale, payload: Record<string, unknown>) {
  const t = invoiceCopy[locale];
  return { subject: `${t.subject} ${text(payload.orderNumber)}`, heading: t.heading, button: t.button,
    body: `${t.intro} ${text(payload.invoiceNumber)}, ${t.order} ${text(payload.orderNumber)}. ${t.detail}` };
}

export function renderInvoiceRequired(payload: Record<string, unknown>, siteUrl: string) {
  const p = payload;
  const currency = text(p.currency) || "EUR";
  const money = (value: unknown) => value == null ? "Não indicado" : new Intl.NumberFormat("pt-PT", { style: "currency", currency }).format(Number(value));
  const date = (value: unknown) => {
    const parsed = new Date(text(value));
    return Number.isFinite(parsed.getTime()) ? new Intl.DateTimeFormat("pt-PT", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Lisbon" }).format(parsed) : "Não indicada";
  };
  const address = (value: unknown) => {
    const a = record(value);
    return [a.name, a.company, a.taxId ? `NIF: ${a.taxId}` : null, a.line1, a.line2,
      [a.postalCode, a.city].filter(Boolean).join(" "), a.district, a.country, a.email, a.phone].filter(Boolean).join("\n") || "Não indicada";
  };
  const lines = [
    p.testMode ? "ENCOMENDA DE TESTE — não emitir uma fatura fiscal para este teste." : "A encomenda foi expedida. Emitir a fatura e carregar o PDF no admin para envio ao cliente.",
    "", `Encomenda: ${text(p.orderNumber)}`, `Data: ${date(p.createdAt)}`, `Pagamento: ${date(p.paidAt)}`, `Expedição: ${date(p.shippedAt)}`,
    "", "CLIENTE", `Nome: ${text(p.customerName)}`, `Email: ${text(p.customerEmail)}`, `Telefone: ${text(p.customerPhone)}`,
    `Empresa: ${text(p.companyName)}`, `NIF: ${text(p.taxId)}`, `Referência do cliente: ${text(p.customerReference)}`,
    "", "MORADA DE FATURAÇÃO", address(p.billingAddress), "", "MORADA DE ENTREGA", address(p.shippingAddress), "", "ARTIGOS",
  ];
  for (const value of Array.isArray(p.items) ? p.items : []) {
    const i = record(value);
    lines.push(`${text(i.sku)} — ${text(i.name)}`, `Quantidade: ${Number(i.quantity) || 0} · Preço unitário: ${money(i.unitPrice)}`,
      `Produto: ${money(i.subtotal)} · Personalização: ${money(i.personalizationTotal)} · Preparação: ${money(i.setupCost)} · Extras: ${money(i.extrasTotal)} · Total: ${money(i.total)}`);
    const personalization = [i.technique, i.location, i.notes].filter(Boolean).join(" · ");
    if (personalization) lines.push(`Personalização: ${personalization}`);
    lines.push("");
  }
  lines.push("TOTAIS DA ENCOMENDA", `Produtos: ${money(p.subtotal)}`, `Personalização: ${money(p.personalizationTotal)}`,
    `Preparação e extras: ${money(p.setupTotal)}`, `Portes: ${money(p.shippingTotal)}`, `Desconto: ${money(p.discountTotal)}`,
    `IVA${p.taxRate != null ? ` (${new Intl.NumberFormat("pt-PT", { style: "percent", maximumFractionDigits: 2 }).format(Number(p.taxRate))})` : ""}: ${money(p.taxTotal)}`, `Total: ${money(p.grandTotal)}`, `Valor pago pelo cliente: ${money(p.amountPaid)}`,
    `Valor reembolsado: ${money(p.amountRefunded ?? 0)}`, "", "EXPEDIÇÃO",
    [p.shippingMethod, p.shippingCarrier, p.trackingNumber, p.trackingUrl].filter(Boolean).join(" · ") || "Sem informação adicional",
    "", "OBSERVAÇÕES DO CLIENTE", text(p.customerNotes) || "Sem observações");
  const orderId = text(p.orderId);
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) throw new Error("Encomenda inválida no alerta de faturação.");
  const url = `${siteUrl}/admin/encomendas/${orderId}`;
  const subject = `${p.testMode ? "[TESTE] " : ""}Emitir fatura — encomenda ${text(p.orderNumber)}`;
  return { subject, text: `${lines.join("\n")}\n\nCarregar fatura: ${url}`,
    html: `<!doctype html><html lang="pt"><body style="font-family:Arial,sans-serif;color:#162334;max-width:720px;margin:auto;padding:24px"><h1 style="font-size:24px">${escape(subject)}</h1><p style="white-space:pre-wrap;line-height:1.6">${escape(lines.join("\n"))}</p><p><a href="${escape(url)}">Abrir encomenda e carregar fatura</a></p><p>360 Merchandising</p></body></html>` };
}
