import { SITE_LOCALES } from "@/lib/i18n/config";
import { saveAgentAction } from "@/lib/sales/actions";
import { countryCodes, countryName } from "@/lib/sales/i18n";
import type { SalesAgent } from "@/lib/sales/types";
import SalesActionForm from "./ActionForm";
import { Field, inputClass } from "./Fields";
export default function AgentForm({ agent }: { agent?: SalesAgent }) {
  return (
    <SalesActionForm
      action={saveAgentAction}
      submit={agent ? "Guardar ficha" : "Criar comercial"}
      createdLink={!agent}
      tracksAgentEdits
    >
      <input type="hidden" name="agent_id" value={agent?.id || ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Nome completo"
          name="full_name"
          value={agent?.full_name}
          required
        />
        <Field
          label="Endereço de E-mail"
          name="email"
          type="email"
          value={agent?.email}
          required
          readOnly={Boolean(agent?.user_id)}
        />
        <Field label="Telefone" name="phone" value={agent?.phone} />
        <Field
          label="Empresa"
          name="company_name"
          value={agent?.company_name}
        />
        <label className="text-sm font-medium">
          Idioma da área comercial e respetivos emails
          <select
            name="locale"
            className={inputClass}
            defaultValue={agent?.locale || "pt"}
          >
            {Object.entries(SITE_LOCALES).map(([code, v]) => (
              <option key={code} value={code}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Estado
          <select
            name="status"
            className={inputClass}
            defaultValue={agent?.status || "draft"}
          >
            {agent?.user_id ? (
              <>
                {agent.account_kind === "new_account" && (
                  <option value="invited">Convidado</option>
                )}
                <option value="active">Ativo</option>
                <option value="suspended">Suspenso</option>
              </>
            ) : (
              <option value="draft">Rascunho — conta por convidar</option>
            )}
          </select>
        </label>
        <Field
          label="Início da colaboração"
          name="starts_on"
          type="date"
          value={agent?.starts_on || new Date().toISOString().slice(0, 10)}
          required
        />
        <Field
          label="Fim da colaboração (opcional)"
          name="ends_on"
          type="date"
          value={agent?.ends_on || ""}
        />
      </div>
      <fieldset className="rounded-2xl bg-slate-50 p-4">
        <legend className="px-2 font-semibold">Países de atuação</legend>
        <div className="grid max-h-52 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
          {countryCodes.map((code) => (
            <label key={code} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="countries"
                value={code}
                defaultChecked={agent?.countries.includes(code) || false}
                className="accent-orange-600"
              />
              {countryName(code)}
            </label>
          ))}
        </div>
      </fieldset>
      <details className="rounded-2xl border border-slate-200 p-4">
        <summary className="cursor-pointer font-semibold">
          Dados profissionais e de pagamento
        </summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            label="Identificação fiscal"
            name="tax_id"
            value={agent?.tax_id}
          />
          <Field label="IBAN" name="iban" value={agent?.iban} />
          <Field
            label="Morada de faturação"
            name="billing_address"
            value={agent?.billing_address}
          />
        </div>
      </details>
      <fieldset className="rounded-2xl border border-orange-200 bg-orange-50/40 p-4">
        <legend className="px-2 font-semibold">Condições comerciais</legend>
        <p className="mb-4 text-sm leading-6 text-slate-600">
          Base dos produtos e personalização, após descontos, sem IVA e portes.
          As regras ficam guardadas em cada nova encomenda. Alterações
          posteriores não recalculam as condições das encomendas anteriores.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            label="Comissão — catálogo (%)"
            name="supplier_rate"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={
              agent?.supplier_rate_bps == null
                ? ""
                : agent.supplier_rate_bps / 100
            }
          />
          <Field
            label="Comissão — manuais 360 (%)"
            name="manual_rate"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={
              agent?.manual_rate_bps == null ? "" : agent.manual_rate_bps / 100
            }
          />
          <Field
            label="Prazo após entrega (dias)"
            name="hold_days"
            type="number"
            min="0"
            max="365"
            value={agent?.hold_days ?? ""}
          />
          <Field
            label="Duração da carteira (meses; 0 = sem limite)"
            name="attribution_months"
            type="number"
            min="0"
            max="120"
            value={agent?.attribution_months ?? ""}
          />
          <label className="text-sm font-medium">
            Compras repetidas
            <select
              name="recurring"
              className={inputClass}
              defaultValue={
                agent?.recurring == null ? "" : String(agent.recurring)
              }
            >
              <option value="">Por definir</option>
              <option value="true">
                Todas as compras durante a atribuição
              </option>
              <option value="false">Apenas a primeira encomenda paga</option>
            </select>
          </label>
          <Field
            label="Objetivo mensal de vendas (EUR)"
            name="monthly_target"
            type="number"
            min="0"
            step="0.01"
            value={(agent?.monthly_target_cents ?? 0) / 100}
          />
        </div>
        <label className="mt-5 flex items-start gap-3 text-sm font-semibold">
          <input
            className="mt-1 accent-orange-600"
            type="checkbox"
            name="commission_enabled"
            defaultChecked={agent?.commission_enabled}
          />
          <span>Ativar estas condições nas novas encomendas atribuídas</span>
        </label>
      </fieldset>
    </SalesActionForm>
  );
}
