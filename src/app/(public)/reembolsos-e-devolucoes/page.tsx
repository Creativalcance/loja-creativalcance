import type { Metadata } from "next";
import LegalDocumentPage from "@/components/legal/LegalDocumentPage";

export const metadata: Metadata = { title: "Reembolsos e Devoluções", description: "Política de Reembolso e Devolução da 360 Merchandising." };

export default function RefundsPage() {
  return <LegalDocumentPage title="Reembolsos e Devoluções" description="Regras de devolução, reembolso, cancelamento e falta de conformidade. Versão 1.0, atualizada em 9 de setembro de 2026." fileName="reembolsos-e-devolucoes.txt" />;
}
