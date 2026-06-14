"use client";

import { useState } from "react";
import { RefreshCw, ServerCog } from "lucide-react";

type StrickerLanguage = "PT" | "EN" | "ES" | "FR" | "DE" | "IT" | "NL";

type SyncAction =
  | "colors"
  | "productTypes"
  | "products"
  | "optionals"
  | "customizationTables"
  | "customizationOptions"
  | "stocksByCountry";

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
  tablesImported?: number;
  optionsImported?: number;
  translationsImported?: number;
  variantsMatched?: number;
  componentsMatched?: number;
  locationsMatched?: number;
  priceTablesMatched?: number;
  stocksImported?: number;
  futureStocksImported?: number;
  datasetImportId?: string;
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

const ACTIONS: {
  action: SyncAction;
  title: string;
  description: string;
}[] = [
  {
    action: "colors",
    title: "Sincronizar cores",
    description: "Importa cores da Stricker via REST para supplier_colors.",
  },
  {
    action: "productTypes",
    title: "Sincronizar tipos",
    description:
      "Importa tipos e subtipos da Stricker via REST para supplier_catalog_categories e category_translations.",
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
      "Importa SKUs, preços, imagens e personalização inicial para product_variants.",
  },
  {
    action: "customizationTables",
    title: "Sincronizar tabelas",
    description:
      "Importa tabelas e preços de personalização para printing_price_tables.",
  },
  {
    action: "customizationOptions",
    title: "Sincronizar opções",
    description:
      "Liga opções de personalização por SKU a componentes, localizações e tabelas.",
  },
  {
    action: "stocksByCountry",
    title: "Sincronizar stocks PT",
    description:
      "Importa stocks PT da Stricker via REST para product_stocks e product_future_stocks.",
  },
];

function getSyncEndpoint(action: SyncAction): string {
  if (action === "stocksByCountry") {
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
}): Record<string, string> {
  if (params.action === "stocksByCountry") {
    return {
      lang: params.language,
      country: "PT",
    };
  }

  if (
    params.action === "products" ||
    params.action === "optionals" ||
    params.action === "customizationTables" ||
    params.action === "customizationOptions"
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
      const endpoint = getSyncEndpoint(action);
      const body = buildSyncBody({
        action,
        language: selectedLanguage,
      });

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const payload = (await response.json()) as SyncResponse;

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.message || "Não foi possível sincronizar o dataset.",
        );
      }

      const imported =
        payload.optionsImported ??
        payload.tablesImported ??
        payload.variantsImported ??
        payload.productsImported ??
        payload.stocksImported ??
        payload.recordsImported ??
        0;

      const translations =
        payload.productTranslationsImported ??
        payload.variantTranslationsImported ??
        payload.translationsImported ??
        0;

      const extra =
        action === "stocksByCountry"
          ? ` Variantes encontradas: ${
              payload.variantsMatched ?? 0
            }. Stocks futuros: ${payload.futureStocksImported ?? 0}.`
          : action === "products"
            ? ` Traduções: ${translations}. Imagens importadas: ${
                payload.imagesImported ?? 0
              }.`
            : action === "productTypes"
              ? ` Traduções: ${translations}.`
              : action === "optionals"
                ? ` Preços: ${payload.pricesImported ?? 0}. Imagens: ${
                    payload.imagesImported ?? 0
                  }. Componentes: ${
                    payload.componentsImported ?? 0
                  }. Localizações: ${payload.locationsImported ?? 0}.`
                : action === "customizationOptions"
                  ? ` Variantes: ${
                      payload.variantsMatched ?? 0
                    }. Componentes: ${
                      payload.componentsMatched ?? 0
                    }. Localizações: ${
                      payload.locationsMatched ?? 0
                    }. Tabelas: ${payload.priceTablesMatched ?? 0}.`
                  : "";

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
            Sincronização directa
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
            Sincroniza datasets pequenos e operacionais directamente via REST
            usando a sessão autenticada da Stricker. O idioma seleccionado é
            guardado nas tabelas de tradução, sem substituir os restantes
            idiomas já importados.
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
                setSelectedLanguage(event.target.value as StrickerLanguage);
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

      <div className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-7">
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
                  className={`h-5 w-5 text-neutral-500 ${
                    isLoading ? "animate-spin" : ""
                  }`}
                />
              </div>
            </button>
          );
        })}
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