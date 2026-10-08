import type { SiteLocale } from "@/lib/i18n/config";

export type OrderMockup = {
  id: string;
  order_id: string;
  version: number;
  approval_url: string;
  state: "pending" | "awaiting_confirmation" | "superseded" | "closed";
  first_seen_at: string;
  last_seen_at: string;
};

// These links carry permission to decide on a proof. Never accept arbitrary hosts.
export function safeMockupUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "online-mockup.com"
      && !url.port && !url.username && !url.password
      && /^\/[a-z]{2}\/[0-9a-f-]{36}\/?$/i.test(url.pathname)
      && !url.search && !url.hash ? url.href : null;
  } catch { return null; }
}

export function canRequestMockupApproval(order: { status: string; payment_status: string; deleted_at?: string | null }) {
  return !order.deleted_at && order.payment_status === "paid"
    && !["cancelled", "refunded", "failed", "shipped", "delivered"].includes(order.status);
}

export const mockupCopy: Record<SiteLocale, {
  heading: string; intro: string; action: string; version: string; recipient: string;
  pending: string; awaiting_confirmation: string; superseded: string; closed: string;
  subject: string; instruction: string;
}> = {
  pt: { heading: "Maquete para aprovação", intro: "A maquete da sua encomenda está disponível.", action: "Ver e aprovar maquete", version: "Versão", recipient: "Email de aprovação",
    pending: "A aguardar a sua aprovação", awaiting_confirmation: "A maquete deixou de estar pendente no portal. Estamos a confirmar o estado da encomenda.", superseded: "Substituída por uma nova versão", closed: "Esta maquete já não requer aprovação.",
    subject: "Maquete para aprovação — encomenda", instruction: "Verifique os textos, cores e posicionamento. No portal pode aprovar a maquete ou pedir alterações. Esta ligação é privada e permite tomar essa decisão." },
  en: { heading: "Proof for approval", intro: "Your order's proof is ready.", action: "View and approve proof", version: "Version", recipient: "Approval email",
    pending: "Awaiting your approval", awaiting_confirmation: "The proof is no longer pending in the portal. We are confirming the order status.", superseded: "Replaced by a new version", closed: "This proof no longer requires approval.",
    subject: "Proof for approval — order", instruction: "Check the text, colours and positioning. In the portal you can approve the proof or request changes. This private link allows you to make that decision." },
  fr: { heading: "Maquette à approuver", intro: "La maquette de votre commande est disponible.", action: "Voir et approuver la maquette", version: "Version", recipient: "Email d’approbation",
    pending: "En attente de votre approbation", awaiting_confirmation: "La maquette n’est plus en attente dans le portail. Nous confirmons le statut de la commande.", superseded: "Remplacée par une nouvelle version", closed: "Cette maquette ne nécessite plus d’approbation.",
    subject: "Maquette à approuver — commande", instruction: "Vérifiez les textes, les couleurs et le positionnement. Vous pouvez approuver la maquette ou demander des modifications dans le portail. Ce lien privé permet de prendre cette décision." },
  es: { heading: "Prueba para aprobación", intro: "La prueba de su pedido está disponible.", action: "Ver y aprobar prueba", version: "Versión", recipient: "Email de aprobación",
    pending: "Pendiente de su aprobación", awaiting_confirmation: "La prueba ya no está pendiente en el portal. Estamos confirmando el estado del pedido.", superseded: "Sustituida por una nueva versión", closed: "Esta prueba ya no requiere aprobación.",
    subject: "Prueba para aprobación — pedido", instruction: "Revise los textos, colores y posición. En el portal puede aprobar la prueba o solicitar cambios. Este enlace privado permite tomar esa decisión." },
  de: { heading: "Korrekturabzug zur Freigabe", intro: "Der Korrekturabzug Ihrer Bestellung ist verfügbar.", action: "Korrekturabzug prüfen und freigeben", version: "Version", recipient: "E-Mail für die Freigabe",
    pending: "Wartet auf Ihre Freigabe", awaiting_confirmation: "Der Korrekturabzug ist im Portal nicht mehr ausstehend. Wir bestätigen den Bestellstatus.", superseded: "Durch eine neue Version ersetzt", closed: "Dieser Korrekturabzug erfordert keine Freigabe mehr.",
    subject: "Korrekturabzug zur Freigabe — Bestellung", instruction: "Prüfen Sie Texte, Farben und Positionierung. Im Portal können Sie den Korrekturabzug freigeben oder Änderungen anfordern. Dieser private Link ermöglicht diese Entscheidung." },
  it: { heading: "Bozza da approvare", intro: "La bozza del suo ordine è disponibile.", action: "Visualizza e approva la bozza", version: "Versione", recipient: "Email di approvazione",
    pending: "In attesa della sua approvazione", awaiting_confirmation: "La bozza non è più in attesa nel portale. Stiamo confermando lo stato dell’ordine.", superseded: "Sostituita da una nuova versione", closed: "Questa bozza non richiede più approvazione.",
    subject: "Bozza da approvare — ordine", instruction: "Controlli testi, colori e posizionamento. Nel portale può approvare la bozza o richiedere modifiche. Questo link privato consente di prendere tale decisione." },
};
