import { CalendarDays, Euro, Search, UsersRound } from "lucide-react";

type SmartMerchSearchFormProps = {
  defaultRequest?: string;
  defaultQuantity?: number | null;
  defaultBudget?: number | null;
  defaultDeadline?: string | null;
  compact?: boolean;
};

export default function SmartMerchSearchForm({
  defaultRequest = "",
  defaultQuantity = null,
  defaultBudget = null,
  defaultDeadline = null,
  compact = false,
}: SmartMerchSearchFormProps) {
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
            name="pedido"
            required
            minLength={2}
            maxLength={500}
            defaultValue={defaultRequest}
            placeholder="500 garrafas sustentáveis até 3 € para uma feira"
            className={`w-full rounded-2xl border py-4 pl-12 pr-4 text-base outline-none transition focus:ring-2 ${compact ? "border-neutral-300 bg-white text-neutral-950 focus:border-neutral-950 focus:ring-neutral-950/10" : "border-white/15 bg-white text-neutral-950 placeholder:text-neutral-400 focus:border-white focus:ring-white/20"}`}
          />
        </div>
      </label>

      <p className={`mt-2 text-xs ${compact ? "text-neutral-500" : "text-white/55"}`}>
        Pode pesquisar por produto ou simplesmente dizer-nos o que precisa.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="relative block">
          <span className="sr-only">Quantidade</span>
          <UsersRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="number"
            name="quantidade"
            min={1}
            max={1_000_000}
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
            defaultValue={defaultBudget ?? ""}
            placeholder="Orçamento total"
            className="w-full rounded-2xl border border-neutral-300 bg-white py-3 pl-11 pr-4 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
          />
        </label>

        <label className="relative block">
          <span className="sr-only">Data limite</span>
          <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="date"
            name="data"
            defaultValue={defaultDeadline ?? ""}
            className="w-full rounded-2xl border border-neutral-300 bg-white py-3 pl-11 pr-4 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
          />
        </label>
      </div>

      <button
        type="submit"
        className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-neutral-950 px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-neutral-800 active:translate-y-0"
      >
        Criar seleção inteligente
      </button>
    </form>
  );
}
