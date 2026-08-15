"use client";

import { useState } from "react";
import { Check, Euro, Search, Sparkles, UsersRound } from "lucide-react";

type SmartMerchSearchFormProps = {
  defaultRequest?: string;
  defaultQuantity?: number | null;
  defaultBudget?: number | null;
  compact?: boolean;
};

const SUGGESTIONS_REQUEST = "Não sei! Aceito as vossas sugestões.";

export default function SmartMerchSearchForm({
  defaultRequest = "",
  defaultQuantity = null,
  defaultBudget = null,
  compact = false,
}: SmartMerchSearchFormProps) {
  const initiallySuggestions = defaultRequest === SUGGESTIONS_REQUEST;
  const [suggestions, setSuggestions] = useState(initiallySuggestions);

  return (
    <form
      action="/smart-merch"
      method="get"
      className={
        compact
          ? "rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm"
          : "rounded-[2rem] border border-white/15 bg-white/[0.07] p-4 shadow-2xl backdrop-blur md:p-5"
      }
    >
      <label className="block">
        <span className={compact ? "text-sm font-semibold text-neutral-950" : "text-sm font-semibold text-white"}>
          O que procura?
        </span>
        <div className="relative mt-2">
          <Search className={`pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${compact ? "text-neutral-400" : "text-white/45"}`} />
          <input
            type="search"
            name={suggestions ? undefined : "pedido"}
            required={!suggestions}
            minLength={2}
            maxLength={500}
            defaultValue={initiallySuggestions ? "" : defaultRequest}
            disabled={suggestions}
            placeholder="500 garrafas sustentáveis até 3 € para uma feira"
            className={`w-full rounded-2xl border py-4 pl-12 pr-4 text-base outline-none transition focus:ring-2 ${compact ? "border-neutral-300 bg-white text-neutral-950 focus:border-neutral-950 focus:ring-neutral-950/10" : "border-white/15 bg-white text-neutral-950 placeholder:text-neutral-400 focus:border-white focus:ring-white/20"}`}
          />
        </div>
      </label>

      <p className={`mt-2 text-xs ${compact ? "text-neutral-500" : "text-white/55"}`}>
        Pode pesquisar por produto ou simplesmente dizer-nos o que precisa.
      </p>

      {suggestions ? <input type="hidden" name="pedido" value={SUGGESTIONS_REQUEST} /> : null}

      <label
        className={`mt-4 flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${
          suggestions
            ? compact
              ? "border-neutral-950 bg-neutral-950 text-white shadow-lg"
              : "border-white bg-white text-neutral-950 shadow-xl"
            : compact
              ? "border-neutral-200 bg-neutral-50 text-neutral-800 hover:border-neutral-400"
              : "border-white/20 bg-white/10 text-white hover:bg-white/15"
        }`}
      >
        <input
          type="checkbox"
          checked={suggestions}
          onChange={(event) => setSuggestions(event.target.checked)}
          className="sr-only"
        />
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${suggestions ? "border-emerald-400 bg-emerald-400 text-neutral-950" : "border-current/30"}`}>
          {suggestions ? <Check className="h-4 w-4" /> : null}
        </span>
        <span>
          <span className="block text-sm font-semibold">Não sei! Aceito as vossas sugestões.</span>
          <span className={`mt-0.5 block text-xs ${suggestions ? "opacity-75" : "opacity-60"}`}>
            Indique apenas a quantidade e o orçamento disponível.
          </span>
        </span>
      </label>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="relative block">
          <span className="sr-only">Quantidade</span>
          <UsersRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="number"
            name="quantidade"
            min={1}
            max={1_000_000}
            required={suggestions}
            defaultValue={defaultQuantity ?? ""}
            placeholder="Quantidade"
            className="w-full rounded-2xl border border-neutral-300 bg-white py-3 pl-11 pr-4 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
          />
        </label>

        <label className="relative block">
          <span className="sr-only">Orçamento total</span>
          <Euro className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="number"
            name="orcamento"
            min="0.01"
            max={100_000_000}
            step="0.01"
            required={suggestions}
            defaultValue={defaultBudget ?? ""}
            placeholder="Orçamento total"
            className="w-full rounded-2xl border border-neutral-300 bg-white py-3 pl-11 pr-4 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
          />
        </label>

      </div>

      <button
        type="submit"
        className={`mt-4 inline-flex w-full items-center justify-center rounded-2xl px-6 py-4 text-base font-semibold shadow-xl ring-1 transition hover:-translate-y-0.5 active:translate-y-0 ${
          compact
            ? "bg-neutral-950 text-white ring-neutral-950 hover:bg-neutral-800 hover:shadow-2xl"
            : "bg-white text-neutral-950 ring-white hover:bg-emerald-50 hover:shadow-2xl"
        }`}
      >
        <Sparkles className="mr-2 h-5 w-5 text-emerald-500" />
        Mostrar sugestões
      </button>
    </form>
  );
}
