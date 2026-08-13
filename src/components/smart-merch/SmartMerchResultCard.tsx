import Link from "next/link";
import { ArrowRight, CheckCircle2, Leaf, PackageCheck, Sparkles } from "lucide-react";
import type { SmartMerchResult } from "@/lib/smart-merch/types";

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency }).format(value);
}

export default function SmartMerchResultCard({ result }: { result: SmartMerchResult }) {
  return (
    <article className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <Link href={`/produto/${result.slug}`} className="group block">
        <div className="relative aspect-square bg-neutral-100">
          {result.imageUrl ? (
            <img src={result.imageUrl} alt={result.imageAlt} className="h-full w-full object-contain p-5 transition duration-500 group-hover:scale-105" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-neutral-400">Sem imagem disponível</div>
          )}
          <span className="absolute left-4 top-4 rounded-full bg-neutral-950 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
            {result.matchScore}% compatível
          </span>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-400">{result.sku}</p>
          <h2 className="mt-2 line-clamp-2 text-lg font-semibold tracking-tight text-neutral-950">{result.name}</h2>
          {result.variantColor ? <p className="mt-2 text-sm text-neutral-600">Cor selecionada: {result.variantColor}</p> : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {result.isSustainable ? <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"><Leaf className="mr-1 h-3 w-3" />Sustentável</span> : null}
            {result.isCustomizable ? <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700"><Sparkles className="mr-1 h-3 w-3" />Personalizável</span> : null}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-neutral-100 pt-5">
            <div><p className="text-xs text-neutral-500">Produto/unidade</p><p className="mt-1 font-semibold text-neutral-950">{result.unitPrice === null ? "Sob consulta" : formatMoney(result.unitPrice, result.currency)}</p></div>
            <div><p className="text-xs text-neutral-500">Produto total</p><p className="mt-1 font-semibold text-neutral-950">{result.productTotal === null ? "Por calcular" : formatMoney(result.productTotal, result.currency)}</p></div>
          </div>

          <div className="mt-4 flex items-center text-xs font-medium text-neutral-600"><PackageCheck className="mr-2 h-4 w-4 text-emerald-600" />{result.availableStock.toLocaleString("pt-PT")} un. disponíveis</div>

          <div className="mt-5 rounded-2xl bg-neutral-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">Porque recomendamos</p>
            <ul className="mt-3 space-y-2">
              {result.reasons.map((reason) => <li key={reason.code} className="flex text-xs text-neutral-700"><CheckCircle2 className="mr-2 mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />{reason.label}</li>)}
            </ul>
          </div>

          <span className="mt-5 inline-flex items-center text-sm font-semibold text-neutral-950">Ver produto<ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" /></span>
        </div>
      </Link>
    </article>
  );
}
