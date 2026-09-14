import AgentEditProvider from "@/components/sales/AgentEditContext";
import AccountAccessPanel from "@/components/sales/AccountAccessPanel";
import { findSalesAccount } from "@/lib/sales/account";
import Link from "next/link";
import { notFound } from "next/navigation";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSalesData } from "@/lib/sales/data";
import { salesMoney, countryName } from "@/lib/sales/i18n";
import type { SalesAgent } from "@/lib/sales/types";
import {
  assignCustomerAction,
  endAssignmentAction,
  recordPayoutAction,
} from "@/lib/sales/actions";
import AgentForm from "@/components/sales/AgentForm";
import SalesActionForm from "@/components/sales/ActionForm";
import SummaryCards from "@/components/sales/SummaryCards";
import CommissionTable from "@/components/sales/CommissionTable";
import { Field, Panel } from "@/components/sales/Fields";
export const dynamic = "force-dynamic";
export default async function AgentDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pagina?: string }>;
}) {
  const { id } = await params;
  const { userId } = await assertAdminAccess("/admin/rede-comercial");
  if (!/^[\da-f-]{36}$/i.test(id)) notFound();
  const page = Math.max(
    1,
    Math.min(10000, Number((await searchParams).pagina) || 1),
  );
  const admin = createSupabaseAdminClient();
  const { data: agent, error } = await admin
    .from("sales_agents")
    .select("*")
    .eq("id", id)
    .maybeSingle<SalesAgent>();
  if (error || !agent) notFound();
  let account = null;
  let lookupError = "";
  try {
    account = await findSalesAccount(userId, agent.email);
  } catch {
    lookupError = "Não foi possível verificar a conta. Atualiza a página.";
  }
  const data = await getSalesData(agent, page);
  const audit = await admin
    .from("sales_audit_log")
    .select("id,action,created_at,record_id,details")
    .eq("agent_id", id)
    .order("created_at", { ascending: false })
    .limit(30);
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-9 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin/rede-comercial" className="text-sm text-slate-500">
          ← Rede Comercial
        </Link>
        <div className="my-7">
          <h1 className="text-3xl font-semibold">{agent.full_name}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {agent.email} ·{" "}
            {agent.countries.map((c) => countryName(c)).join(" · ")}
          </p>
        </div>
        <SummaryCards rows={data.summary} locale="pt" />
        <AgentEditProvider key={agent.updated_at}>
          <div className="mt-7 grid items-start gap-7 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,1fr)]">
            <div className="space-y-7">
              <Panel title="Ficha e condições">
                <AgentForm agent={agent} />
              </Panel>
              <Panel title={`Carteira de clientes · ${data.assignmentCount}`}>
                <SalesActionForm
                  action={assignCustomerAction}
                  submit="Atribuir cliente"
                >
                  <input type="hidden" name="agent_id" value={id} />
                  <Field
                    label="Email da conta de cliente"
                    name="customer_email"
                    type="email"
                    required
                  />
                  <Field
                    label="Motivo da atribuição / transferência"
                    name="reason"
                    required
                  />
                </SalesActionForm>
                <div className="mt-6 space-y-3">
                  {data.assignments.map((a) => (
                    <details
                      key={a.id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <summary className="cursor-pointer text-sm">
                        <strong>{a.customer_name}</strong> · {a.customer_email}
                      </summary>
                      <p className="my-3 text-xs text-slate-500">
                        Fim:{" "}
                        {a.expires_at
                          ? new Date(a.expires_at).toLocaleDateString("pt-PT")
                          : "Sem limite"}
                      </p>
                      <SalesActionForm
                        action={endAssignmentAction}
                        submit="Terminar atribuição"
                      >
                        <input type="hidden" name="agent_id" value={id} />
                        <input
                          type="hidden"
                          name="assignment_id"
                          value={a.id}
                        />
                        <Field label="Motivo" name="reason" required />
                      </SalesActionForm>
                    </details>
                  ))}
                </div>
              </Panel>
              <Panel title={`Contactos angariados · ${data.contactCount}`}>
                <div className="space-y-3">
                  {data.contacts.map((c) => (
                    <article
                      key={c.id}
                      className="rounded-xl border border-slate-200 p-4 text-sm"
                    >
                      <p className="font-semibold">
                        {c.name} · {c.company_name}
                      </p>
                      <p className="mt-1 text-slate-500">
                        {c.email} · {c.phone} · {countryName(c.country_code)}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap">{c.notes}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {
                          {
                            new: "Novo",
                            contacted: "Contactado",
                            qualified: "Qualificado",
                            proposal: "Proposta",
                            won: "Ganho",
                            lost: "Perdido",
                          }[c.stage as "new"]
                        }{" "}
                        · {c.next_contact_on || "Sem próximo contacto"}
                      </p>
                    </article>
                  ))}
                </div>
                {!data.contacts.length && (
                  <p className="text-sm text-slate-500">
                    O comercial pode registar e acompanhar contactos na sua
                    área.
                  </p>
                )}
              </Panel>
            </div>
            <div className="space-y-7">
              <Panel title="Acesso à área comercial">
                <AccountAccessPanel
                  agent={agent}
                  account={account}
                  lookupError={lookupError}
                />
              </Panel>
              <Panel title={`Encomendas e comissões · ${data.commissionCount}`}>
                <p className="mb-4 text-xs leading-5 text-slate-500">
                  A comissão só fica elegível com pagamento confirmado, entrega
                  concluída e prazo cumprido. Aprovar não efetua uma
                  transferência bancária.
                </p>
                <CommissionTable rows={data.commissions} locale="pt" admin />
              </Panel>
              <Panel title="Registar pagamento">
                {data.summary
                  .filter((s) => s.approved_cents > 0)
                  .map((s) => (
                    <div key={s.currency} className="mb-6">
                      <p className="mb-4 text-sm">
                        Total aprovado por pagar:{" "}
                        <strong>
                          {salesMoney(s.approved_cents, s.currency)}
                        </strong>
                      </p>
                      <SalesActionForm
                        action={recordPayoutAction}
                        submit="Confirmar pagamento efetuado"
                      >
                        <input type="hidden" name="agent_id" value={id} />
                        <input
                          type="hidden"
                          name="request_id"
                          value={crypto.randomUUID()}
                        />
                        <input
                          type="hidden"
                          name="expected_cents"
                          value={s.approved_cents}
                        />
                        <input
                          type="hidden"
                          name="currency"
                          value={s.currency}
                        />
                        <Field
                          label="Mês do extrato"
                          name="period"
                          type="month"
                          value={new Date().toISOString().slice(0, 7)}
                          required
                        />
                        <Field
                          label="Data do pagamento efetuado"
                          name="paid_at"
                          type="date"
                          value={new Date().toISOString().slice(0, 10)}
                          required
                        />
                        <Field
                          label="Referência bancária / documento"
                          name="reference"
                          required
                        />
                        <label className="block text-sm font-medium">
                          Comprovativo (PDF, PNG ou JPG, até 3 MB)
                          <input
                            className="mt-2 block w-full text-sm"
                            type="file"
                            name="proof"
                            accept="application/pdf,image/png,image/jpeg"
                          />
                        </label>
                      </SalesActionForm>
                    </div>
                  ))}
                {!data.summary.some((s) => s.approved_cents > 0) && (
                  <p className="text-sm text-slate-500">
                    Sem saldo aprovado para pagamento.
                  </p>
                )}
              </Panel>
              <Panel title={`Pagamentos registados · ${data.payoutCount}`}>
                <form
                  action="/admin/rede-comercial/extrato"
                  className="mb-5 space-y-3"
                >
                  <input type="hidden" name="comercial" value={id} />
                  <Field
                    label="Mês do extrato"
                    name="mes"
                    type="month"
                    value={new Date().toISOString().slice(0, 7)}
                    required
                  />
                  <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold">
                    Exportar extrato CSV
                  </button>
                </form>
                {data.payouts.map((p) => (
                  <article
                    key={p.id}
                    className="mb-3 rounded-xl border border-slate-200 p-4 text-sm"
                  >
                    <strong>{salesMoney(p.amount_cents, p.currency)}</strong>
                    <p className="mt-1 text-slate-500">
                      {new Date(p.paid_at).toLocaleDateString("pt-PT")} ·{" "}
                      {p.reference}
                    </p>
                    {p.proof_path && (
                      <Link
                        href={`/admin/rede-comercial/documento?pagamento=${p.id}`}
                        className="mt-2 inline-block underline"
                      >
                        Comprovativo
                      </Link>
                    )}
                  </article>
                ))}
              </Panel>
              <Panel title="Histórico de operações">
                <div className="space-y-3">
                  {(audit.data ?? []).map((a) => (
                    <p
                      key={a.id}
                      className="border-b border-slate-100 pb-3 text-xs"
                    >
                      <span className="font-semibold">
                        {{
                          save_agent: "Ficha atualizada",
                          link_account: "Conta criada",
                          link_existing_account:
                            "Acesso acrescentado à conta existente",
                          queue_access_notice: "Email de acesso preparado",
                          assign_customer: "Cliente atribuído",
                          end_assignment: "Atribuição terminada",
                          approve: "Comissão aprovada",
                          allocate_refund: "Reembolso repartido",
                          payout: "Pagamento registado",
                          commission_reconciled: "Comissão atualizada",
                        }[a.action as "save_agent"] || a.action}
                      </span>
                      <br />
                      <span className="text-slate-500">
                        {new Date(a.created_at).toLocaleString("pt-PT")}
                      </span>
                    </p>
                  ))}
                </div>
              </Panel>
            </div>
          </div>
        </AgentEditProvider>
        <nav className="mt-6 flex gap-4 text-sm">
          {page > 1 && <Link href={`?pagina=${page - 1}`}>← Anterior</Link>}
          {page * 50 <
            Math.max(
              data.commissionCount,
              data.payoutCount,
              data.contactCount,
              data.assignmentCount,
            ) && <Link href={`?pagina=${page + 1}`}>Mais registos →</Link>}
        </nav>
      </div>
    </main>
  );
}
