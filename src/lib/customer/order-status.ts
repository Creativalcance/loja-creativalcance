import type { SiteLocale } from "@/lib/i18n/config";

export const STATUS_LABELS: Record<SiteLocale, Record<string, string>> = {
  pt: {
    pending: "A aguardar pagamento", succeeded: "Pagamento confirmado", partially_refunded: "Reembolso parcial", approved: "Aprovada", rejected: "Requer revisão",
    pending_payment: "A aguardar pagamento", paid: "Pagamento confirmado",
    processing: "Em preparação", sent_to_supplier: "Em processamento",
    supplier_confirmed: "Confirmada", in_production: "Em produção",
    shipped: "Expedida", delivered: "Entregue", cancelled: "Cancelada",
    refunded: "Reembolsada", failed: "Necessita de atenção",
    unfulfilled: "Em preparação", partially_fulfilled: "Parcialmente preparada",
    fulfilled: "Preparada",
    WAITING_ART_WORK: "A aguardar elementos de personalização",
    PROCESSING: "Em processamento", PRODUCTION: "Em produção",
    WAITING_STOCK: "A aguardar disponibilidade", PROCESSED: "Preparada",
    PENDING_MOCKUP_APPROVAL: "Maquete pendente de aprovação",
    INVOICED: "Faturada", SENT: "Expedida", SHIPPED: "Expedida",
    CANCELED: "Cancelada", CANCELLED: "Cancelada",
  },
  en: {
    pending: "Awaiting payment", succeeded: "Payment confirmed", partially_refunded: "Partially refunded", approved: "Approved", rejected: "Needs revision",
    pending_payment: "Awaiting payment", paid: "Payment confirmed",
    processing: "Being prepared", sent_to_supplier: "Processing",
    supplier_confirmed: "Confirmed", in_production: "In production",
    shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled",
    refunded: "Refunded", failed: "Needs attention",
    unfulfilled: "Being prepared", partially_fulfilled: "Partially prepared",
    fulfilled: "Prepared",
    WAITING_ART_WORK: "Awaiting customisation files", PROCESSING: "Processing",
    PRODUCTION: "In production", WAITING_STOCK: "Awaiting availability",
    PROCESSED: "Prepared", PENDING_MOCKUP_APPROVAL: "Proof awaiting approval",
    INVOICED: "Invoiced", SENT: "Shipped", SHIPPED: "Shipped",
    CANCELED: "Cancelled", CANCELLED: "Cancelled",
  },
  fr: {
    pending: "En attente de paiement", succeeded: "Paiement confirmé", partially_refunded: "Remboursement partiel", approved: "Approuvée", rejected: "À réviser",
    pending_payment: "En attente de paiement", paid: "Paiement confirmé",
    processing: "En préparation", sent_to_supplier: "En cours de traitement",
    supplier_confirmed: "Confirmée", in_production: "En production",
    shipped: "Expédiée", delivered: "Livrée", cancelled: "Annulée",
    refunded: "Remboursée", failed: "Nécessite votre attention",
    unfulfilled: "En préparation", partially_fulfilled: "Partiellement préparée",
    fulfilled: "Préparée",
    WAITING_ART_WORK: "En attente des éléments de personnalisation",
    PROCESSING: "En cours de traitement", PRODUCTION: "En production",
    WAITING_STOCK: "En attente de disponibilité", PROCESSED: "Préparée",
    PENDING_MOCKUP_APPROVAL: "Maquette en attente d’approbation",
    INVOICED: "Facturée", SENT: "Expédiée", SHIPPED: "Expédiée",
    CANCELED: "Annulée", CANCELLED: "Annulée",
  },
};


export function customerStatus(status: string, locale: SiteLocale): string {
  return STATUS_LABELS[locale][status] ?? ({pt:"Em atualização",en:"Being updated",fr:"En cours de mise à jour"})[locale];
}
