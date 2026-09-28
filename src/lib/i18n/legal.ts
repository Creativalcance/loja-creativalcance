import type { SiteLocale } from "./config";

const legalCopy = {
  pt: {
    label: "Informação legal", back: "Voltar à página inicial", version: "Versão 1.0, atualizada em 9 de setembro de 2026.",
    titles: ["Termos e Condições", "Política de Privacidade", "Política de Cookies", "Reembolsos e Devoluções"],
    descriptions: ["Condições aplicáveis à utilização, venda, personalização, expedição e devoluções na 360 Merchandising.", "Informação sobre o tratamento, proteção e conservação dos seus dados pessoais.", "Informação sobre cookies essenciais, funcionais, analíticos e publicitários e sobre a gestão do seu consentimento.", "Regras de devolução, reembolso, cancelamento e falta de conformidade."],
  },
  en: {
    label: "Legal information", back: "Back to homepage", version: "Version 1.0, updated on 9 September 2026.",
    titles: ["Terms and Conditions", "Privacy Policy", "Cookie Policy", "Refunds and Returns"],
    descriptions: ["Conditions governing use, sales, customisation, shipping and returns at 360 Merchandising.", "Information on the processing, protection and retention of your personal data.", "Information on essential, functional, analytics and advertising cookies and how to manage your consent.", "Rules on returns, refunds, cancellations and lack of conformity."],
  },
  fr: {
    label: "Informations légales", back: "Retour à l’accueil", version: "Version 1.0, mise à jour le 9 septembre 2026.",
    titles: ["Conditions générales", "Politique de confidentialité", "Politique relative aux cookies", "Remboursements et retours"],
    descriptions: ["Conditions applicables à l’utilisation, aux ventes, à la personnalisation, à l’expédition et aux retours chez 360 Merchandising.", "Informations sur le traitement, la protection et la conservation de vos données personnelles.", "Informations sur les cookies essentiels, fonctionnels, analytiques et publicitaires et sur la gestion de votre consentement.", "Règles relatives aux retours, aux remboursements, aux annulations et aux défauts de conformité."],
  },
  es: {
    label: "Información legal", back: "Volver al inicio", version: "Versión 1.0, actualizada el 9 de septiembre de 2026.",
    titles: ["Términos y condiciones", "Política de privacidad", "Política de cookies", "Reembolsos y devoluciones"],
    descriptions: ["Condiciones aplicables al uso, la venta, la personalización, el envío y las devoluciones en 360 Merchandising.", "Información sobre el tratamiento, la protección y la conservación de tus datos personales.", "Información sobre cookies esenciales, funcionales, analíticas y publicitarias y sobre la gestión de tu consentimiento.", "Normas sobre devoluciones, reembolsos, cancelaciones y faltas de conformidad."],
  },
  de: {
    label: "Rechtliche Informationen", back: "Zur Startseite", version: "Version 1.0, aktualisiert am 9. September 2026.",
    titles: ["Allgemeine Geschäftsbedingungen", "Datenschutzerklärung", "Cookie-Richtlinie", "Erstattungen und Rücksendungen"],
    descriptions: ["Bedingungen für die Nutzung, den Verkauf, die Personalisierung, den Versand und Rücksendungen bei 360 Merchandising.", "Informationen zur Verarbeitung, zum Schutz und zur Speicherung Ihrer personenbezogenen Daten.", "Informationen zu notwendigen, funktionalen, Analyse- und Werbe-Cookies sowie zur Verwaltung Ihrer Einwilligung.", "Regelungen zu Rücksendungen, Erstattungen, Stornierungen und Vertragswidrigkeiten."],
  },
  it: {
    label: "Informazioni legali", back: "Torna alla pagina iniziale", version: "Versione 1.0, aggiornata il 9 settembre 2026.",
    titles: ["Termini e condizioni", "Informativa sulla privacy", "Informativa sui cookie", "Rimborsi e resi"],
    descriptions: ["Condizioni applicabili all’utilizzo, alla vendita, alla personalizzazione, alla spedizione e ai resi presso 360 Merchandising.", "Informazioni sul trattamento, sulla protezione e sulla conservazione dei tuoi dati personali.", "Informazioni sui cookie essenziali, funzionali, analitici e pubblicitari e sulla gestione del tuo consenso.", "Regole su resi, rimborsi, annullamenti e difetti di conformità."],
  },
};
const documents = ["termos-e-condicoes", "politica-de-privacidade", "politica-de-cookies", "reembolsos-e-devolucoes"];
export function getLegalCopy(locale: SiteLocale, document: string) {
  const copy = legalCopy[locale];
  const index = Math.max(0, documents.indexOf(document.replace(/\.txt$/, "")));
  return { ...copy, title: copy.titles[index], description: `${copy.descriptions[index]} ${copy.version}` };
}
