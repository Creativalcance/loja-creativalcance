import type { Metadata } from "next";
import LegalDocumentPage from "@/components/legal/LegalDocumentPage";

export const metadata: Metadata = { title: "Política de Cookies", description: "Política de Cookies da 360 Merchandising." };

export default function CookiesPage() {
  return <LegalDocumentPage title="Política de Cookies" description="Informação sobre cookies essenciais, funcionais, analíticos e publicitários e sobre a gestão do seu consentimento. Versão 1.0, atualizada em 9 de setembro de 2026." fileName="politica-de-cookies.txt" />;
}
