import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Info, Sparkles } from "lucide-react";
import SmartMerchResultCard from "@/components/smart-merch/SmartMerchResultCard";
import SmartMerchSearchForm from "@/components/smart-merch/SmartMerchSearchForm";
import { interpretSmartQuery } from "@/lib/smart-merch/interpret-smart-query";
import { searchSmartMerchProducts } from "@/lib/smart-merch/search-products";
import type { SmartMerchSearchResponse, SmartMerchSort } from "@/lib/smart-merch/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "360 Smart Merch",
  description: "Encontre produtos de merchandising compatíveis com a sua necessidade, quantidade e orçamento.",
  robots: { index: false, follow: true },
};

type SmartMerchPageProps = {
  searchParams?: Promise<{
    pedido?: string;
    quantidade?: string;
    orcamento?: string;
    data?: string;
    ordenar?: string;
  }>;
};

function parsePositiveNumber(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseQuantity(value: string | undefined): number | null {
  const parsed = parsePositiveNumber(value);
  return parsed === null ? null : Math.floor(parsed);
}

function parseDate(value: string | undefined): string | null {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function parseSort(value: string | undefined): SmartMerchSort {
  const options: SmartMerchSort[] = [
    "recommended", "lowest_price", "best_value", "highest_impact", "fastest_delivery", "sustainable",
  ];
  return options.includes(value as SmartMerchSort) ? (value as SmartMerchSort) : "recommended";
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
}

export default async function SmartMerchPage({ searchParams }: SmartMerchPageProps) {
  const params = await searchParams;
  const request = (params?.pedido ?? "").trim().slice(0, 500);
  const quantity = parseQuantity(params?.quantidade);
  const budget = parsePositiveNumber(params?.orcamento);
  const deadline = parseDate(params?.data);
  const sort = parseSort(params?.ordenar);

  if (!request) {
    return (
      <main className="min-h-screen bg-neutral-50 px-6 py-12">
        <section className="mx-auto max-w-5xl">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-neutral-500 hover:text-neutral-950"><ArrowLeft className="mr-2 h-4 w-4" />Voltar à página inicial</Link>
          <div className="mt-10 max-w-3xl">
            <p className="inline-flex items-center text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500"><Sparkles className="mr-2 h-4 w-4" />360 Smart Merch</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950 md:text-6xl">Encontre o merchandising certo em segundos.</h1>
            <p className="mt-5 text-lg leading-8 text-neutral-600">Não procure entre milhares de brindes. Diga-nos o que precisa.</p>
          </div>
          <div className="mt-8"><SmartMerchSearchForm compact /></div>
        </section>
      </main>
    );
  }

  let response: SmartMerchSearchResponse | null = null;
  let searchError: unknown = null;

  try {
    const interpretedQuery = await interpretSmartQuery({ request, quantity, budget, deadline, sort });
    response = await searchSmartMerchProducts(interpretedQuery);
  } catch (error) {
    searchError = error;
  }

  if (response) {
    return (
      <main className="min-h-screen bg-neutral-50 px-4 py-10 sm:px-6">
        <section className="mx-auto max-w-7xl">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-neutral-500 hover:text-neutral-950"><ArrowLeft className="mr-2 h-4 w-4" />Voltar à página inicial</Link>
          <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500">Seleção 360 para a sua campanha</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950 md:text-5xl">{response.results.length} produtos compatíveis</h1>
              <div className="mt-4 flex flex-wrap gap-2 text-sm text-neutral-600">
                {response.query.quantity ? <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-neutral-200">{response.query.quantity.toLocaleString("pt-PT")} unidades</span> : null}
                {response.query.totalBudget !== null ? <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-neutral-200">Orçamento {formatMoney(response.query.totalBudget)}</span> : null}
                {response.calculatedUnitBudget !== null ? <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-neutral-200">Máx. {formatMoney(response.calculatedUnitBudget)}/pessoa</span> : null}
                {response.query.sustainable ? <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700 ring-1 ring-emerald-200">Sustentável</span> : null}
                {response.query.deadline ? <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-neutral-200">Data pretendida: {response.query.deadline}</span> : null}
              </div>
            </div>
            <SmartMerchSearchForm compact defaultRequest={request} defaultQuantity={quantity} defaultBudget={budget} defaultDeadline={deadline} />
          </div>

          <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800"><Info className="mr-2 inline h-4 w-4" />{response.pricingNotice}</div>
          {response.deadlineNotice ? <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><AlertCircle className="mr-2 inline h-4 w-4" />{response.deadlineNotice}</div> : null}

          <form action="/smart-merch" className="mt-8 flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <input type="hidden" name="pedido" value={request} />
            {quantity ? <input type="hidden" name="quantidade" value={quantity} /> : null}
            {budget ? <input type="hidden" name="orcamento" value={budget} /> : null}
            {deadline ? <input type="hidden" name="data" value={deadline} /> : null}
            <p className="text-sm text-neutral-600">Ordenar resultados</p>
            <select name="ordenar" defaultValue={sort} className="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm" onChange={undefined}>
              <option value="recommended">Recomendados</option>
              <option value="lowest_price">Mais económicos</option>
              <option value="best_value">Melhor relação qualidade/preço</option>
              <option value="sustainable">Sustentáveis</option>
            </select>
            <button type="submit" className="rounded-xl bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white">Aplicar</button>
          </form>

          {response.results.length > 0 ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {response.results.map((result) => <SmartMerchResultCard key={`${result.id}:${result.variantId ?? "product"}`} result={result} />)}
            </div>
          ) : (
            <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
              <h2 className="text-xl font-semibold text-neutral-950">Não encontrámos uma combinação totalmente compatível</h2>
              <p className="mt-3 text-neutral-600">Experimente aumentar o orçamento, reduzir a quantidade ou tornar o pedido menos específico.</p>
            </div>
          )}
        </section>
      </main>
    );
  }

  const missingKey = searchError instanceof Error && searchError.message === "OPENAI_API_KEY_MISSING";
  console.error("Smart Merch page failed:", searchError);

  return (
      <main className="min-h-screen bg-neutral-50 px-6 py-12">
        <section className="mx-auto max-w-4xl">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-neutral-500 hover:text-neutral-950"><ArrowLeft className="mr-2 h-4 w-4" />Voltar à página inicial</Link>
          <div className="mt-10 rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
            <AlertCircle className="h-8 w-8 text-red-600" />
            <h1 className="mt-4 text-2xl font-semibold text-neutral-950">{missingKey ? "O 360 Smart Merch ainda não está configurado" : "Não foi possível criar a seleção"}</h1>
            <p className="mt-3 text-neutral-600">{missingKey ? "Adicione a chave da OpenAI às variáveis de ambiente e publique novamente o projeto." : "Tente novamente dentro de alguns instantes ou reformule o pedido."}</p>
          </div>
          <div className="mt-8"><SmartMerchSearchForm compact defaultRequest={request} defaultQuantity={quantity} defaultBudget={budget} defaultDeadline={deadline} /></div>
        </section>
      </main>
  );
}
