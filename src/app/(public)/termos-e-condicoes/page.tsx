import { getLegalCopy } from "@/lib/i18n/legal";
import { getCurrentLocale } from "@/lib/i18n/server";
import type { Metadata } from "next";
import LegalDocumentPage from "@/components/legal/LegalDocumentPage";

export async function generateMetadata(): Promise<Metadata> {
  const copy = getLegalCopy(await getCurrentLocale(), "termos-e-condicoes");
  return { title: copy.title, description: `${copy.title} — 360 Merchandising.` };
}

export default function TermsPage() {
  return <LegalDocumentPage title="Termos e Condições" description="Condições aplicáveis à utilização, venda, personalização, expedição e devoluções na 360 Merchandising. Versão 1.0, atualizada em 9 de setembro de 2026." fileName="termos-e-condicoes.txt" />;
}
