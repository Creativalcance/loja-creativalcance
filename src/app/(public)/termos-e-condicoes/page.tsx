import type { Metadata } from "next";
import LegalDocumentPage from "@/components/legal/LegalDocumentPage";

export const metadata: Metadata = { title: "Termos e Condições", description: "Termos e Condições Gerais da 360 Merchandising." };

export default function TermsPage() {
  return <LegalDocumentPage title="Termos e Condições" description="Condições aplicáveis à utilização, venda, personalização, expedição e devoluções na 360 Merchandising. Versão 1.0, atualizada em 9 de setembro de 2026." fileName="termos-e-condicoes.txt" />;
}
