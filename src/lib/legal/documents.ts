import { readFile } from "node:fs/promises";
import path from "node:path";
import { isSiteLocale, type SiteLocale } from "@/lib/i18n/config";

export const LEGAL_DOCUMENTS = [
  "termos-e-condicoes",
  "politica-de-privacidade",
  "politica-de-cookies",
  "reembolsos-e-devolucoes",
] as const;

export type LegalBlock =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph" | "bullet"; text: string }
  | { type: "table"; rows: string[][] };

export type LegalDocument = { sourceSha256: string; blocks: LegalBlock[] };

export async function readLegalDocument(locale: SiteLocale, fileName: string): Promise<LegalDocument> {
  const document = fileName.replace(/\.txt$/, "");
  if (!isSiteLocale(locale) || !LEGAL_DOCUMENTS.some((name) => name === document)) {
    throw new Error("Unknown legal document");
  }
  const filePath = path.join(process.cwd(), "public", "legal", locale, `${document}.json`);
  return JSON.parse(await readFile(filePath, "utf8")) as LegalDocument;
}
