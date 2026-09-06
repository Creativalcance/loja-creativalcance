import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Info, Sparkles } from "lucide-react";
import SmartMerchResultCard from "@/components/smart-merch/SmartMerchResultCard";
import SmartMerchSearchForm from "@/components/smart-merch/SmartMerchSearchForm";
import { interpretSmartQuery } from "@/lib/smart-merch/interpret-smart-query";
import { searchSmartMerchProducts } from "@/lib/smart-merch/search-products";
import type { SmartMerchSearchResponse, SmartMerchSort } from "@/lib/smart-merch/types";
import { localizePath, SITE_LOCALES } from "@/lib/i18n/config";
import { getCurrentLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const description = locale === "en" ? "Find merchandise suited to your requirements, quantity and budget." : locale === "fr" ? "Trouvez du merchandising adapté à vos besoins, à votre quantité et à votre budget." : "Encontre produtos de merchandising compatíveis com a sua necessidade, quantidade e orçamento.";
  return { title: "360 Smart Merch", description, robots: { index: false, follow: true }, alternates: { canonical: localizePath("/smart-merch", locale) } };
}

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

function formatMoney(value: number, intlLocale: string): string {
  return new Intl.NumberFormat(intlLocale, { style: "currency", currency: "EUR" }).format(value);
}

export default async function SmartMerchPage({ searchParams }: SmartMerchPageProps) {
  const locale = await getCurrentLocale();
  const intlLocale = SITE_LOCALES[locale].intlLocale;
  const copy = locale === "en" ? { back: "Back to homepage", title: "Find the right merchandise in seconds.", intro: "Do not search through thousands of products. Tell us what you need.", selection: "360 selection for your campaign", compatible: "matching products", units: "units", budget: "Budget", max: "Max.", person: "/person", sustainable: "Sustainable", sort: "Sort results", recommended: "Recommended", cheapest: "Lowest price", value: "Best value", sustainableSort: "Sustainable", apply: "Apply", noResults: "We could not find a fully matching combination", noResultsText: "Try increasing the budget, reducing the quantity or making the request less specific.", notConfigured: "360 Smart Merch is not configured yet", failed: "We could not create your selection", missingKey: "Add the OpenAI key to the environment variables and publish the project again.", retry: "Please try again in a moment or revise your request." } : locale === "fr" ? { back: "Retour à l’accueil", title: "Trouvez le bon merchandising en quelques secondes.", intro: "Ne parcourez pas des milliers de produits. Indiquez-nous vos besoins.", selection: "Sélection 360 pour votre campagne", compatible: "produits compatibles", units: "unités", budget: "Budget", max: "Max.", person: "/personne", sustainable: "Durable", sort: "Trier les résultats", recommended: "Recommandés", cheapest: "Prix le plus bas", value: "Meilleur rapport qualité-prix", sustainableSort: "Durables", apply: "Appliquer", noResults: "Aucune combinaison ne correspond entièrement", noResultsText: "Essayez d’augmenter le budget, de réduire la quantité ou de simplifier la demande.", notConfigured: "360 Smart Merch n’est pas encore configuré", failed: "Impossible de créer votre sélection", missingKey: "Ajoutez la clé OpenAI aux variables d’environnement puis republiez le projet.", retry: "Veuillez réessayer dans quelques instants ou reformuler votre demande." } : { back: "Voltar à página inicial", title: "Encontre o merchandising certo em segundos.", intro: "Não procure entre milhares de brindes. Diga-nos o que precisa.", selection: "Seleção 360 para a sua campanha", compatible: "produtos compatíveis", units: "unidades", budget: "Orçamento", max: "Máx.", person: "/pessoa", sustainable: "Sustentável", sort: "Ordenar resultados", recommended: "Recomendados", cheapest: "Mais económicos", value: "Melhor relação qualidade/preço", sustainableSort: "Sustentáveis", apply: "Aplicar", noResults: "Não encontrámos uma combinação totalmente compatível", noResultsText: "Experimente aumentar o orçamento, reduzir a quantidade ou tornar o pedido menos específico.", notConfigured: "O 360 Smart Merch ainda não está configurado", failed: "Não foi possível criar a seleção", missingKey: "Adicione a chave da OpenAI às variáveis de ambiente e publique novamente o projeto.", retry: "Tente novamente dentro de alguns instantes ou reformule o pedido." };
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
          <Link href={localizePath("/", locale)} className="inline-flex items-center text-sm font-medium text-neutral-500 hover:text-neutral-950"><ArrowLeft className="mr-2 h-4 w-4" />{copy.back}</Link>
          <div className="mt-10 max-w-3xl">
            <p className="inline-flex items-center text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500"><Sparkles className="mr-2 h-4 w-4" />360 Smart Merch</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950 md:text-6xl">{copy.title}</h1>
            <p className="mt-5 text-lg leading-8 text-neutral-600">{copy.intro}</p>
          </div>
          <div className="mt-8"><SmartMerchSearchForm compact locale={locale} /></div>
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
          <Link href={localizePath("/", locale)} className="inline-flex items-center text-sm font-medium text-neutral-500 hover:text-neutral-950"><ArrowLeft className="mr-2 h-4 w-4" />{copy.back}</Link>
          <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500">{copy.selection}</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950 md:text-5xl">{response.results.length} {copy.compatible}</h1>
              <div className="mt-4 flex flex-wrap gap-2 text-sm text-neutral-600">
                {response.query.quantity ? <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-neutral-200">{response.query.quantity.toLocaleString(intlLocale)} {copy.units}</span> : null}
                {response.query.totalBudget !== null ? <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-neutral-200">{copy.budget} {formatMoney(response.query.totalBudget, intlLocale)}</span> : null}
                {response.calculatedUnitBudget !== null ? <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-neutral-200">{copy.max} {formatMoney(response.calculatedUnitBudget, intlLocale)}{copy.person}</span> : null}
                {response.query.sustainable ? <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700 ring-1 ring-emerald-200">{copy.sustainable}</span> : null}
              </div>
            </div>
            <SmartMerchSearchForm compact locale={locale} defaultRequest={request} defaultQuantity={quantity} defaultBudget={budget} />
          </div>

          <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800"><Info className="mr-2 inline h-4 w-4" />{response.pricingNotice}</div>

          <form action={localizePath("/smart-merch", locale)} className="mt-8 flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <input type="hidden" name="pedido" value={request} />
            {quantity ? <input type="hidden" name="quantidade" value={quantity} /> : null}
            {budget ? <input type="hidden" name="orcamento" value={budget} /> : null}
            {deadline ? <input type="hidden" name="data" value={deadline} /> : null}
            <p className="text-sm text-neutral-600">{copy.sort}</p>
            <select name="ordenar" defaultValue={sort} className="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm" onChange={undefined}>
              <option value="recommended">{copy.recommended}</option>
              <option value="lowest_price">{copy.cheapest}</option>
              <option value="best_value">{copy.value}</option>
              <option value="sustainable">{copy.sustainableSort}</option>
            </select>
            <button type="submit" className="rounded-xl bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white">{copy.apply}</button>
          </form>

          {response.results.length > 0 ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {response.results.map((result) => <SmartMerchResultCard key={`${result.id}:${result.variantId ?? "product"}`} result={result} locale={locale} />)}
            </div>
          ) : (
            <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
              <h2 className="text-xl font-semibold text-neutral-950">{copy.noResults}</h2>
              <p className="mt-3 text-neutral-600">{copy.noResultsText}</p>
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
          <Link href={localizePath("/", locale)} className="inline-flex items-center text-sm font-medium text-neutral-500 hover:text-neutral-950"><ArrowLeft className="mr-2 h-4 w-4" />{copy.back}</Link>
          <div className="mt-10 rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
            <Info className="h-8 w-8 text-red-600" />
            <h1 className="mt-4 text-2xl font-semibold text-neutral-950">{missingKey ? copy.notConfigured : copy.failed}</h1>
            <p className="mt-3 text-neutral-600">{missingKey ? copy.missingKey : copy.retry}</p>
          </div>
          <div className="mt-8"><SmartMerchSearchForm compact locale={locale} defaultRequest={request} defaultQuantity={quantity} defaultBudget={budget} /></div>
        </section>
      </main>
  );
}
