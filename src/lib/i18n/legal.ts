import type { SiteLocale } from "./config";

const legalCopy = {
  pt: { label: "Informação legal", notice: "", titles: ["Termos e Condições", "Política de Privacidade", "Política de Cookies", "Reembolsos e Devoluções"] },
  en: { label: "Legal information", notice: "This document is currently available in Portuguese. Contact us if you need help understanding its terms.", titles: ["Terms and Conditions", "Privacy Policy", "Cookie Policy", "Refunds and Returns"] },
  fr: { label: "Informations légales", notice: "Ce document est actuellement disponible en portugais. Contactez-nous si vous avez besoin d’aide pour comprendre ses conditions.", titles: ["Conditions générales", "Politique de confidentialité", "Politique relative aux cookies", "Remboursements et retours"] },
  es: { label: "Información legal", notice: "Este documento está disponible actualmente en portugués. Contacta con nosotros si necesitas ayuda para entender sus condiciones.", titles: ["Términos y condiciones", "Política de privacidad", "Política de cookies", "Reembolsos y devoluciones"] },
  de: { label: "Rechtliche Informationen", notice: "Dieses Dokument ist derzeit auf Portugiesisch verfügbar. Kontaktieren Sie uns, wenn Sie Hilfe zum Verständnis der Bedingungen benötigen.", titles: ["Allgemeine Geschäftsbedingungen", "Datenschutzerklärung", "Cookie-Richtlinie", "Erstattungen und Rücksendungen"] },
  it: { label: "Informazioni legali", notice: "Questo documento è attualmente disponibile in portoghese. Contattaci se hai bisogno di aiuto per comprenderne le condizioni.", titles: ["Termini e condizioni", "Informativa sulla privacy", "Informativa sui cookie", "Rimborsi e resi"] },
};
const documents = ["termos-e-condicoes", "politica-de-privacidade", "politica-de-cookies", "reembolsos-e-devolucoes"];
export function getLegalCopy(locale: SiteLocale, document: string) {
  const copy = legalCopy[locale];
  return { ...copy, title: copy.titles[Math.max(0, documents.indexOf(document.replace(/\.txt$/, "")))] };
}
