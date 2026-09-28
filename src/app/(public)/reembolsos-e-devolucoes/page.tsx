import { getLegalCopy } from "@/lib/i18n/legal";
import { getCurrentLocale } from "@/lib/i18n/server";
import type { Metadata } from "next";
import LegalDocumentPage from "@/components/legal/LegalDocumentPage";

export async function generateMetadata(): Promise<Metadata> {
  const copy = getLegalCopy(await getCurrentLocale(), "reembolsos-e-devolucoes");
  return { title: copy.title, description: `${copy.title} — 360 Merchandising.` };
}

export default function RefundsPage() {
  return <LegalDocumentPage title="Reembolsos e Devoluções" description="Regras de devolução, reembolso, cancelamento e falta de conformidade. Versão 1.0, atualizada em 9 de setembro de 2026." fileName="reembolsos-e-devolucoes.txt" />;
}
