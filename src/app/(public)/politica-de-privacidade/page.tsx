import { getLegalCopy } from "@/lib/i18n/legal";
import { getCurrentLocale } from "@/lib/i18n/server";
import type { Metadata } from "next";
import LegalDocumentPage from "@/components/legal/LegalDocumentPage";

export async function generateMetadata(): Promise<Metadata> {
  const copy = getLegalCopy(await getCurrentLocale(), "politica-de-privacidade");
  return { title: copy.title, description: `${copy.title} — 360 Merchandising.` };
}

export default function PrivacyPage() {
  return <LegalDocumentPage title="Política de Privacidade" description="Informação sobre o tratamento, proteção e conservação dos seus dados pessoais. Versão 1.0, atualizada em 9 de setembro de 2026." fileName="politica-de-privacidade.txt" />;
}
