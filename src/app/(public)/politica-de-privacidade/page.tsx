import type { Metadata } from "next";
import LegalDocumentPage from "@/components/legal/LegalDocumentPage";

export const metadata: Metadata = { title: "Política de Privacidade", description: "Política de Privacidade da 360 Merchandising." };

export default function PrivacyPage() {
  return <LegalDocumentPage title="Política de Privacidade" description="Informação sobre o tratamento, proteção e conservação dos seus dados pessoais. Versão 1.0, atualizada em 9 de setembro de 2026." fileName="politica-de-privacidade.txt" />;
}
