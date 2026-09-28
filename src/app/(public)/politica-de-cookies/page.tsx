import { getLegalCopy } from "@/lib/i18n/legal";
import { getCurrentLocale } from "@/lib/i18n/server";
import type { Metadata } from "next";
import LegalDocumentPage from "@/components/legal/LegalDocumentPage";

export async function generateMetadata(): Promise<Metadata> {
  const copy = getLegalCopy(await getCurrentLocale(), "politica-de-cookies");
  return { title: copy.title, description: `${copy.title} — 360 Merchandising.` };
}

export default function CookiesPage() {
  return <LegalDocumentPage title="Política de Cookies" description="Informação sobre cookies essenciais, funcionais, analíticos e publicitários e sobre a gestão do seu consentimento. Versão 1.0, atualizada em 9 de setembro de 2026." fileName="politica-de-cookies.txt" />;
}
