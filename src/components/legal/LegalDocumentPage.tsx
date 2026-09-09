import { readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { localizePath } from "@/lib/i18n/config";
import { getCurrentLocale } from "@/lib/i18n/server";

type LegalDocumentPageProps = {
  title: string;
  description: string;
  fileName: string;
};

const headingPattern = /^(?:\d+(?:\.\d+)*\.|Anexo\s+[IVX]+\s+—|Resumo rápido)/;

export default async function LegalDocumentPage({
  title,
  description,
  fileName,
}: LegalDocumentPageProps) {
  const locale = await getCurrentLocale();
  const filePath = path.join(process.cwd(), "public", "legal", fileName);
  const content = await readFile(filePath, "utf8");
  const blocks = content
    .replace(/\r/g, "")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <main className="bg-neutral-50 px-6 py-10 sm:py-14">
      <article className="mx-auto max-w-4xl rounded-3xl border border-neutral-200 bg-white px-6 py-8 shadow-sm sm:px-10 sm:py-12">
        <Link href={localizePath("/", locale)} className="text-sm font-semibold text-neutral-500 hover:text-neutral-950">
          ← {locale === "en" ? "Back to homepage" : locale === "fr" ? "Retour à l’accueil" : "Voltar à página inicial"}
        </Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.22em] text-[#ff6a00]">
          Informação legal
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#162334] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 max-w-3xl leading-7 text-neutral-600">{description}</p>
        <div className="mt-10 border-t border-neutral-200 pt-8 text-[15px] leading-7 text-neutral-700">
          {blocks.map((block, index) => {
            if (headingPattern.test(block) && !block.includes("\n")) {
              const isSubheading = /^\d+\.\d+\./.test(block);
              return isSubheading ? (
                <h3 key={index} className="mb-3 mt-7 text-lg font-semibold text-[#162334]">
                  {block}
                </h3>
              ) : (
                <h2 key={index} className="mb-4 mt-9 text-xl font-semibold text-[#162334] sm:text-2xl">
                  {block}
                </h2>
              );
            }

            const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
            if (lines.length > 0 && lines.every((line) => line.startsWith("•"))) {
              return (
                <ul key={index} className="my-5 list-disc space-y-2 pl-6">
                  {lines.map((line, lineIndex) => <li key={lineIndex}>{line.slice(1).trim()}</li>)}
                </ul>
              );
            }

            return <p key={index} className="my-4 whitespace-pre-line">{block}</p>;
          })}
        </div>
      </article>
    </main>
  );
}
