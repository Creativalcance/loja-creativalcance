"use client";

import { useState } from "react";
import { RefreshCw, ServerCog } from "lucide-react";

type StrickerLanguage = "PT" | "EN" | "ES" | "FR" | "DE" | "IT" | "NL";

type StrickerCountry = "PT" | "CZ";

type SyncAction =
  | "colors"
  | "productTypes"
  | "productsTree"
  | "products"
  | "optionals"
  | "customizationOptions"
  | "customizationTables"
  | "stocksPT"
  | "stocksCZ"
  | "canceledProducts"
  | "restrictedProducts"
  | "reconcileAvailability";

type SyncState = {
  loadingAction: SyncAction | null;
  message: string | null;
  error: string | null;
};

type SyncResponse = {
  success: boolean;
  message: string;
  dataset?: string;
  lang?: string;
  country?: string;
  recordsReceived?: number;
  recordsImported?: number;
  productsImported?: number;
  productTranslationsImported?: number;
  variantsImported?: number;
  variantTranslationsImported?: number;
  pricesImported?: number;
  imagesImported?: number;
  componentsImported?: number;
  locationsImported?: number;
  optionsImported?: number;
  optionsFailed?: number;
  failedOptionRecords?: string[];
  tablesImported?: number;
  techniqueTranslationsImported?: number;
  translationsImported?: number;
  variantsMatched?: number;
  stocksImported?: number;
  futureStocksImported?: number;
  recordsTotal?: number;
  recordsProcessed?: number;
  offset?: number;
  limit?: number;
  nextOffset?: number | null;
  nextCursor?: string | null;
  hasMore?: boolean;
  datasetImportId?: string;
  productsTotal?: number;
  productsPurchasable?: number;
  productsComingSoon?: number;
  productsUnavailable?: number;
  productsRestricted?: number;
  productsCanceled?: number;
};

type SyncActionCard = {
  action: SyncAction;
  title: string;
  description: string;
};

const AVAILABLE_LANGUAGES: {
  value: StrickerLanguage;
  label: string;
}[] = [
  {
    value: "PT",
    label: "PT — Português",
  },
  {
    value: "EN",
    label: "EN — Inglês",
  },
  {
    value: "ES",
    label: "ES — Espanhol",
  },
  {
    value: "FR",
    label: "FR — Francês",
  },
  {
    value: "DE",
    label: "DE — Alemão",
  },
  {
    value: "IT",
    label: "IT — Italiano",
  },
  {
    value: "NL",
    label: "NL — Neerlandês",
  },
];

const ACTIONS: SyncActionCard[] = [
  {
    action: "colors",
    title: "Sincronizar cores",
    description:
      "Importa cores da Stricker via REST para supplier_colors.",
  },
  {
    action: "productTypes",
    title: "Sincronizar tipos",
    description:
      "Importa tipos e subtipos da Stricker via REST para supplier_catalog_categories e category_translations.",
  },
  {
    action: "productsTree",
    title: "Sincronizar árvore de produtos",
    description:
      "Importa a estrutura hierárquica da Stricker para as categorias e subcategorias do catálogo.",
  },
  {
    action: "products",
    title: "Sincronizar produtos",
    description:
      "Importa produtos base da Stricker via REST para products, product_translations e product_images.",
  },
  {
    action: "optionals",
    title: "Sincronizar variantes",
    description:
      "Importa SKUs, preços, imagens, componentes e localizações para product_variants.",
  },
  {
    action: "customizationTables",
    title: "Sincronizar tabelas",
    description:
      "Importa tabelas e preços de personalização para printing_price_tables.",
  },
  {
    action: "customizationOptions",
    title: "Gerar personalizações",
    description:
      "Gera todas as opções de personalização por lotes a partir das variantes, localizações e tabelas.",
  },
  {
    action: "stocksPT",
    title: "Sincronizar stocks PT",
    description:
      "Importa stocks do armazém de Portugal para product_stocks e product_future_stocks.",
  },
  {
    action: "stocksCZ",
    title: "Sincronizar stocks CZ",
    description:
      "Importa stocks do armazém da República Checa para product_stocks e product_future_stocks.",
  },
  {
    action: "canceledProducts",
    title: "Sincronizar cancelados",
    description:
      "Importa os artigos retirados do catálogo comercial pela Stricker.",
  },
  {
    action: "restrictedProducts",
    title: "Sincronizar restrições PT",
    description:
      "Importa os artigos que a Stricker não permite vender em Portugal.",
  },
  {
    action: "reconcileAvailability",
    title: "Atualizar disponibilidade",
    description:
      "Cruza catálogo, variantes, stocks PT/CZ, reposições, cancelados e restrições.",
  },
];

function isStockAction(action: SyncAction): boolean {
  return action === "stocksPT" || action === "stocksCZ";
}

function getStockCountry(action: SyncAction): StrickerCountry | null {
  if (action === "stocksPT") {
    return "PT";
  }

  if (action === "stocksCZ") {
    return "CZ";
  }

  return null;
}

function getSyncEndpoint(action: SyncAction): string {
  if (
    action === "canceledProducts" ||
    action === "restrictedProducts" ||
    action === "reconcileAvailability"
  ) {
    return "/api/admin/stricker/rest/sync-commercial-status";
  }

  if (isStockAction(action)) {
    return "/api/admin/stricker/rest/sync-stocks";
  }

  if (action === "products") {
    return "/api/admin/stricker/rest/sync-products";
  }

  if (action === "optionals") {
    return "/api/admin/stricker/rest/sync-optionals";
  }

  if (action === "customizationTables") {
    return "/api/admin/stricker/rest/sync-customization-tables";
  }

  if (action === "customizationOptions") {
    return "/api/admin/stricker/rest/sync-customization-options";
  }

  return "/api/admin/stricker/rest/sync-catalog";
}

function buildSyncBody(params: {
  action: SyncAction;
  language: StrickerLanguage;
}): Record<string, unknown> {
  const stockCountry = getStockCountry(params.action);

  if (stockCountry) {
    return {
      lang: params.language,
      country: stockCountry,
    };
  }

  if (
    params.action === "canceledProducts" ||
    params.action === "restrictedProducts" ||
    params.action === "reconcileAvailability"
  ) {
    return {
      action: params.action,
    };
  }

  if (
    params.action === "products" ||
    params.action === "optionals" ||
    params.action === "customizationOptions" ||
    params.action === "customizationTables"
  ) {
    return {
      lang: params.language,
    };
  }

  return {
    dataset: params.action,
    lang: params.language,
  };
}

async function parseSyncResponse(
  response: Response,
): Promise<SyncResponse> {
  const responseText = await response.text();

  try {
    return JSON.parse(responseText) as SyncResponse;
  } catch {
    throw new Error(
      responseText.length > 0
        ? `Resposta inválida do servidor (${response.status}): ${responseText.slice(
            0,
            300,
          )}`
        : `Resposta vazia do servidor (${response.status}).`,
    );
  }
}

async function requestSync(params: {
  action: SyncAction;
  body: Record<string, unknown>;
}): Promise<SyncResponse> {
  const endpoint = getSyncEndpoint(params.action);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params.body),
  });

  const payload = await parseSyncResponse(response);

  if (!response.ok || !payload.success) {
    throw new Error(
      payload.message || "Não foi possível sincronizar o dataset.",
    );
  }

  return payload;
}

async function requestAllCustomizationOptions(
  language: StrickerLanguage,
  onProgress: (processed: number, total: number) => void,
): Promise<SyncResponse> {
  const limit = 25;
  let offset = 0;
  let cursor: string | null = null;
  let recordsTotal: number | null = null;
  let recordsReceived = 0;
  let recordsProcessed = 0;
  let optionsImported = 0;
  let optionsFailed = 0;
  const failedOptionRecords: string[] = [];
  let lastPayload: SyncResponse | null = null;

  for (let batch = 0; batch < 10_000; batch += 1) {
    const payload = await requestSync({
      action: "customizationOptions",
      body: {
        lang: language,
        offset,
        limit,
        cursor,
        recordsTotal,
      },
    });

    lastPayload = payload;
    recordsReceived += payload.recordsReceived ?? 0;
    recordsProcessed += payload.recordsProcessed ?? 0;
    optionsImported += payload.optionsImported ?? 0;
    optionsFailed += payload.optionsFailed ?? 0;
    failedOptionRecords.push(...(payload.failedOptionRecords ?? []));
    recordsTotal = payload.recordsTotal ?? recordsTotal;
    onProgress(recordsProcessed, recordsTotal ?? recordsProcessed);

    if (!payload.hasMore || payload.nextCursor === null) {
      return {
        ...payload,
        recordsReceived,
        recordsProcessed,
        optionsImported,
        optionsFailed,
        failedOptionRecords,
        hasMore: false,
        nextOffset: null,
      };
    }

    if (!payload.nextCursor || payload.nextCursor === cursor) {
      throw new Error(
        "A paginação de customizationOptions devolveu um cursor inválido.",
      );
    }

    offset = payload.nextOffset ?? offset + (payload.recordsProcessed ?? 0);
    cursor = payload.nextCursor;
  }

  throw new Error(
    `A geração de customizationOptions excedeu o limite de segurança. Último lote: ${
      lastPayload?.offset ?? offset
    }.`,
  );
}

async function requestAllOptionals(
  language: StrickerLanguage,
  onProgress: (processed: number, total: number) => void,
): Promise<SyncResponse> {
  const limit = 500;
  let offset = 0;
  let recordsReceived = 0;
  let recordsProcessed = 0;
  let variantsImported = 0;
  let variantTranslationsImported = 0;
  let pricesImported = 0;
  let imagesImported = 0;
  let componentsImported = 0;
  let locationsImported = 0;
  let lastPayload: SyncResponse | null = null;

  for (let batch = 0; batch < 100; batch += 1) {
    const payload = await requestSync({
      action: "optionals",
      body: { lang: language, offset, limit },
    });

    lastPayload = payload;
    recordsReceived += payload.recordsReceived ?? 0;
    recordsProcessed += payload.recordsProcessed ?? 0;
    variantsImported += payload.variantsImported ?? 0;
    variantTranslationsImported += payload.variantTranslationsImported ?? 0;
    pricesImported += payload.pricesImported ?? 0;
    imagesImported += payload.imagesImported ?? 0;
    componentsImported += payload.componentsImported ?? 0;
    locationsImported += payload.locationsImported ?? 0;
    onProgress(recordsProcessed, payload.recordsTotal ?? recordsProcessed);

    if (!payload.hasMore || payload.nextOffset === null) {
      return {
        ...payload,
        recordsReceived,
        recordsProcessed,
        variantsImported,
        variantTranslationsImported,
        pricesImported,
        imagesImported,
        componentsImported,
        locationsImported,
        hasMore: false,
        nextOffset: null,
      };
    }

    const nextOffset = payload.nextOffset;

    if (nextOffset === undefined || nextOffset === null || nextOffset <= offset) {
      throw new Error("A paginação de Optionals devolveu um offset inválido.");
    }

    offset = nextOffset;
  }

  throw new Error(
    `A sincronização de Optionals excedeu o limite de segurança. Último lote: ${
      lastPayload?.offset ?? offset
    }.`,
  );
}

function getImportedCount(payload: SyncResponse): number {
  return (
    payload.productsPurchasable ??
    payload.optionsImported ??
    payload.tablesImported ??
    payload.variantsImported ??
    payload.productsImported ??
    payload.stocksImported ??
    payload.recordsImported ??
    0
  );
}

function getTranslationCount(payload: SyncResponse): number {
  return (
    payload.productTranslationsImported ??
    payload.variantTranslationsImported ??
    payload.techniqueTranslationsImported ??
    payload.translationsImported ??
    0
  );
}

function getExtraMessage(params: {
  action: SyncAction;
  payload: SyncResponse;
}): string {
  const { action, payload } = params;
  const translations = getTranslationCount(payload);

  if (isStockAction(action)) {
    return ` País/armazém: ${
      payload.country ?? getStockCountry(action) ?? "—"
    }. Variantes encontradas: ${
      payload.variantsMatched ?? 0
    }. Stocks futuros: ${payload.futureStocksImported ?? 0}.`;
  }

  if (action === "products") {
    return ` Traduções: ${translations}. Imagens importadas: ${
      payload.imagesImported ?? 0
    }.`;
  }

  if (action === "productTypes" || action === "productsTree") {
    return ` Traduções: ${translations}.`;
  }

  if (action === "optionals") {
    return ` Traduções de variantes: ${translations}. Preços: ${
      payload.pricesImported ?? 0
    }. Imagens: ${payload.imagesImported ?? 0}. Componentes: ${
      payload.componentsImported ?? 0
    }. Localizações: ${payload.locationsImported ?? 0}.`;
  }

  if (action === "customizationTables") {
    return ` Técnicas detetadas: ${
      payload.techniqueTranslationsImported ?? 0
    }.`;
  }

  if (action === "customizationOptions") {
    return ` Localizações processadas: ${
      payload.recordsProcessed ?? 0
    } de ${payload.recordsTotal ?? payload.recordsProcessed ?? 0}. Opções pendentes: ${
      payload.optionsFailed ?? 0
    }.`;
  }

  if (action === "reconcileAvailability") {
    return ` Total: ${payload.productsTotal ?? 0}. Disponíveis para compra: ${
      payload.productsPurchasable ?? 0
    }. Reposição futura: ${payload.productsComingSoon ?? 0}. Indisponíveis: ${
      payload.productsUnavailable ?? 0
    }. Restringidos: ${payload.productsRestricted ?? 0}. Cancelados: ${
      payload.productsCanceled ?? 0
    }.`;
  }

  return "";
}

export default function StrickerRestCatalogSyncActions() {
  const [selectedLanguage, setSelectedLanguage] =
    useState<StrickerLanguage>("PT");

  const [state, setState] = useState<SyncState>({
    loadingAction: null,
    message: null,
    error: null,
  });

  async function handleSync(action: SyncAction): Promise<void> {
    setState({
      loadingAction: action,
      message: null,
      error: null,
    });

    try {
      const body = buildSyncBody({
        action,
        language: selectedLanguage,
      });

      const payload =
        action === "optionals"
          ? await requestAllOptionals(
              selectedLanguage,
              (processed, total) => {
                setState({
                  loadingAction: action,
                  message: `A sincronizar variantes e preços: ${processed} de ${total} registos processados.`,
                  error: null,
                });
              },
            )
          : action === "customizationOptions"
          ? await requestAllCustomizationOptions(
              selectedLanguage,
              (processed, total) => {
                setState({
                  loadingAction: action,
                  message: `A gerar personalizações: ${processed} de ${total} localizações processadas.`,
                  error: null,
                });
              },
            )
          : await requestSync({
              action,
              body,
            });

      const imported = getImportedCount(payload);
      const extra = getExtraMessage({
        action,
        payload,
      });

      setState({
        loadingAction: null,
        message: `${payload.message} Idioma: ${
          payload.lang ?? selectedLanguage
        }. Recebidos: ${
          payload.recordsReceived ?? 0
        }. Importados: ${imported}.${extra}`,
        error: null,
      });

      window.location.reload();
    } catch (error) {
      setState({
        loadingAction: null,
        message: null,
        error:
          error instanceof Error
            ? error.message
            : "Erro inesperado na sincronização REST.",
      });
    }
  }

  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
            Stricker REST
          </p>

          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">
            Sincronização direta
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
            Sincroniza os datasets do catálogo diretamente via REST. Os
            stocks dos armazéns de Portugal e da República Checa são
            importados separadamente. Os artigos cancelados, restringidos ou
            sem disponibilidade comercial são retirados da venda sem serem
            eliminados da base de dados.
          </p>
        </div>

        <div className="flex items-start gap-4">
          <div className="min-w-56">
            <label
              htmlFor="stricker-sync-language"
              className="block text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500"
            >
              Idioma
            </label>

            <select
              id="stricker-sync-language"
              value={selectedLanguage}
              disabled={state.loadingAction !== null}
              onChange={(event) => {
                setSelectedLanguage(
                  event.target.value as StrickerLanguage,
                );
              }}
              className="mt-2 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {AVAILABLE_LANGUAGES.map((language) => (
                <option key={language.value} value={language.value}>
                  {language.label}
                </option>
              ))}
            </select>
          </div>

          <ServerCog className="mt-8 h-6 w-6 text-neutral-400" />
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-4">
        {ACTIONS.map((item) => {
          const isLoading = state.loadingAction === item.action;

          return (
            <button
              key={item.action}
              type="button"
              onClick={() => {
                void handleSync(item.action);
              }}
              disabled={state.loadingAction !== null}
              className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 text-left transition hover:border-neutral-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-neutral-950">
                    {item.title}
                  </p>

                  <p className="mt-2 text-sm leading-5 text-neutral-600">
                    {item.description}
                  </p>
                </div>

                <RefreshCw
                  className={`h-5 w-5 shrink-0 text-neutral-500 ${
                    isLoading ? "animate-spin" : ""
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800">
        Execute as sincronizações pela ordem apresentada e termine sempre em{" "}
        <strong>Atualizar disponibilidade</strong>. A geração de{" "}
        <strong>product_customization_options</strong> percorre
        automaticamente todos os lotes disponíveis. Os stocks PT e CZ
        devem ser sincronizados separadamente.
      </div>

      {state.message ? (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {state.message}
        </div>
      ) : null}

      {state.error ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}
    </section>
  );
}
