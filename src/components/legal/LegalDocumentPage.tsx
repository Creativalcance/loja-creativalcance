import { getLegalCopy } from "@/lib/i18n/legal";
import Link from "next/link";
import { localizePath, SITE_LOCALES } from "@/lib/i18n/config";
import { getCurrentLocale } from "@/lib/i18n/server";
import { LEGAL_DOCUMENTS, readLegalDocument, type LegalBlock } from "@/lib/legal/documents";

type LegalDocumentPageProps = {
  title: string;
  description: string;
  fileName: string;
};

function LegalContent({ blocks, title }: { blocks: LegalBlock[]; title: string }) {
  const elements = [];
  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index];
    if (block.type === "heading") {
      elements.push(block.level === 3 ? (
        <h3 key={index} className="mb-3 mt-7 text-lg font-semibold text-[#162334]">{block.text}</h3>
      ) : (
        <h2 key={index} className="mb-4 mt-9 text-xl font-semibold text-[#162334] sm:text-2xl">{block.text}</h2>
      ));
    } else if (block.type === "table") {
      const [headers, ...rows] = block.rows;
      elements.push(
        <div key={index} className="my-6 overflow-x-auto rounded-xl border border-neutral-200" tabIndex={0} role="region" aria-label={title}>
          <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
            <thead className="bg-neutral-100 text-[#162334]">
              <tr>{headers.map((cell, i) => <th key={i} scope="col" className="px-4 py-3 align-top font-semibold">{cell}</th>)}</tr>
            </thead>
            <tbody>{rows.map((row, i) => (
              <tr key={i} className="border-t border-neutral-200">
                {row.map((cell, j) => <td key={j} className="px-4 py-3 align-top">{cell}</td>)}
              </tr>
            ))}</tbody>
          </table>
        </div>,
      );
    } else if (block.type === "bullet") {
      const start = index;
      const items = [block.text];
      while (blocks[index + 1]?.type === "bullet") {
        const next = blocks[++index];
        if (next.type === "bullet") items.push(next.text);
      }
      elements.push(<ul key={start} className="my-5 list-disc space-y-2 pl-6">{items.map((text, i) => <li key={i}>{text}</li>)}</ul>);
    } else {
      elements.push(<p key={index} className="my-4 whitespace-pre-line [overflow-wrap:anywhere]">{block.text}</p>);
    }
  }
  return elements;
}

export default async function LegalDocumentPage({ title, description, fileName }: LegalDocumentPageProps) {
  const locale = await getCurrentLocale();
  const copy = getLegalCopy(locale, fileName);
  const document = await readLegalDocument(locale, fileName);
  return (
    <main className="bg-neutral-50 px-6 py-10 sm:py-14">
      <article lang={SITE_LOCALES[locale].htmlLang} className="mx-auto max-w-4xl rounded-3xl border border-neutral-200 bg-white px-6 py-8 shadow-sm sm:px-10 sm:py-12">
        <Link href={localizePath("/", locale)} className="text-sm font-semibold text-neutral-500 hover:text-neutral-950">← {copy.back}</Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.22em] text-[#ff6a00]">{copy.label}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#162334] sm:text-4xl">{locale === "pt" ? title : copy.title}</h1>
        <p className="mt-4 max-w-3xl leading-7 text-neutral-600">{locale === "pt" ? description : copy.description}</p>
        <div className="mt-10 border-t border-neutral-200 pt-8 text-[15px] leading-7 text-neutral-700">
          <LegalContent blocks={document.blocks} title={copy.title} />
        </div>
        <nav aria-label={copy.label} className="mt-10 flex flex-wrap gap-x-6 gap-y-3 border-t border-neutral-200 pt-6 text-sm">
          {LEGAL_DOCUMENTS.filter((name) => `${name}.txt` !== fileName).map((name) => (
            <Link key={name} href={localizePath(`/${name}`, locale)} className="font-semibold text-neutral-600 underline hover:text-neutral-950">{getLegalCopy(locale, name).title}</Link>
          ))}
        </nav>
      </article>
    </main>
  );
}
