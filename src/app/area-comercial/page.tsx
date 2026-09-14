import Link from "next/link";
import { SITE_LOCALES, localizePath } from "@/lib/i18n/config";
import { assertSalesAccess } from "@/lib/sales/access";
import { getSalesData } from "@/lib/sales/data";
import { salesCopy, salesMoney, countryName } from "@/lib/sales/i18n";
import SummaryCards from "@/components/sales/SummaryCards";
import CommissionTable from "@/components/sales/CommissionTable";
import ContactForm from "@/components/sales/ContactForm";
import { Panel, inputClass } from "@/components/sales/Fields";
export default async function SalesHome({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  const { agent } = await assertSalesAccess();
  const locale = agent.locale;
  const t = salesCopy(locale);
  const page = Math.max(
    1,
    Math.min(10000, Number((await searchParams).pagina) || 1),
  );
  const data = await getSalesData(agent, page);
  const path = (p: string) => localizePath(p, locale);
  const monthSales =
    data.summary.find((s) => s.currency === "EUR")?.month_sales_cents || 0;
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-[#162334] px-5 py-8 text-white sm:px-9">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-xs uppercase tracking-[.2em] text-orange-300">
                360 Merchandising
              </p>
              <h1 className="mt-3 text-3xl font-semibold">{t.title}</h1>
              <p className="mt-2 text-slate-300">{agent.full_name}</p>
            </div>
            <div className="flex gap-4 text-sm">
              <Link
                href={path("/")}
                className="rounded-full border border-white/20 px-4 py-2"
              >
                {t.store}
              </Link>
              <Link href={path("/logout")} className="px-3 py-2">
                {t.logout}
              </Link>
            </div>
          </div>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-300">
            {t.intro}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {agent.countries.map((c) => (
              <span
                key={c}
                className="rounded-full bg-white/10 px-3 py-1 text-xs"
              >
                {countryName(c, locale)}
              </span>
            ))}
          </div>
          <nav className="mt-7 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/10 pt-5 text-sm">
            {[
              [t.dashboard, "resumo"],
              [t.contacts, "contactos"],
              [t.customers, "clientes"],
              [t.commissions, "comissoes"],
              [t.payouts, "pagamentos"],
              [t.profile, "perfil"],
            ].map(([label, id]) => (
              <a
                key={id}
                href={`#${id}`}
                className="text-slate-200 hover:text-orange-300"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-7xl space-y-7 px-4 py-7 sm:px-8">
        {agent.status === "invited" && (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
            {t.activate}{" "}
            <Link
              className="font-semibold underline"
              href={path("/nova-password")}
            >
              {t.setPassword}
            </Link>
          </p>
        )}
        <section id="resumo">
          <SummaryCards rows={data.summary} locale={locale} />
          {agent.monthly_target_cents > 0 && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <span>{t.target}</span>
                <strong>
                  {salesMoney(monthSales, "EUR", locale)} /{" "}
                  {salesMoney(agent.monthly_target_cents, "EUR", locale)}
                </strong>
              </div>
              <progress
                aria-label={t.target}
                className="mt-3 h-2 w-full accent-orange-600"
                max={agent.monthly_target_cents}
                value={Math.min(monthSales, agent.monthly_target_cents)}
              />
            </div>
          )}
        </section>
        <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,1fr)]">
          <div className="space-y-7">
            <Panel
              id="comissoes"
              title={`${t.commissions} · ${data.commissionCount}`}
            >
              <p className="mb-4 text-xs leading-5 text-slate-500">
                {t.netHelp}
              </p>
              <CommissionTable rows={data.commissions} locale={locale} />
            </Panel>
            <Panel
              id="clientes"
              title={`${t.customers} · ${data.assignmentCount}`}
            >
              <div className="space-y-3">
                {data.assignments.map((a) => (
                  <article
                    key={a.id}
                    className="rounded-xl border border-slate-200 p-4 text-sm"
                  >
                    <strong>{a.customer_name}</strong>
                    <p className="mt-1 text-slate-500">{a.customer_email}</p>
                    <p className="mt-3 text-xs text-slate-500">
                      {t.expiry}:{" "}
                      {a.expires_at
                        ? new Date(a.expires_at).toLocaleDateString(locale)
                        : t.unlimited}
                    </p>
                  </article>
                ))}
              </div>
              {!data.assignments.length && (
                <p className="text-sm text-slate-500">{t.empty}</p>
              )}
            </Panel>
            <Panel
              id="contactos"
              title={`${t.contacts} · ${data.contactCount}`}
            >
              <details className="mb-5 rounded-2xl border border-orange-200 bg-orange-50/40 p-4">
                <summary className="cursor-pointer font-semibold">
                  + {t.newContact}
                </summary>
                <div className="mt-5">
                  <ContactForm agent={agent} />
                </div>
              </details>
              <div className="space-y-3">
                {data.contacts.map((c) => (
                  <details
                    key={c.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <summary className="cursor-pointer text-sm">
                      <strong>{c.name}</strong>
                      <span className="ml-2 text-slate-500">
                        {c.company_name} · {t[c.stage as "new"]}
                      </span>
                      {c.next_contact_on && (
                        <span className="mt-1 block text-xs text-slate-500">
                          {t.nextContact}:{" "}
                          {new Date(
                            c.next_contact_on + "T12:00:00",
                          ).toLocaleDateString(locale)}
                        </span>
                      )}
                    </summary>
                    <div className="mt-5">
                      <ContactForm agent={agent} contact={c} />
                    </div>
                  </details>
                ))}
              </div>
            </Panel>
          </div>
          <div className="space-y-7">
            <Panel id="pagamentos" title={t.payouts}>
              <form
                action={path("/area-comercial/extrato")}
                className="mb-6 space-y-3"
              >
                <label className="text-sm font-medium">
                  {t.month}
                  <input
                    type="month"
                    name="mes"
                    required
                    defaultValue={new Date().toISOString().slice(0, 7)}
                    className={inputClass}
                  />
                </label>
                <button className="rounded-xl bg-[#162334] px-4 py-3 text-sm font-semibold text-white">
                  {t.statement}
                </button>
              </form>
              {data.payouts.map((p) => (
                <article
                  key={p.id}
                  className="mb-3 rounded-xl border border-slate-200 p-4 text-sm"
                >
                  <strong>
                    {salesMoney(p.amount_cents, p.currency, locale)}
                  </strong>
                  <p className="mt-1 text-slate-500">
                    {new Date(p.paid_at).toLocaleDateString(locale)}
                  </p>
                  <p className="mt-2">{p.reference}</p>
                  {p.proof_path && (
                    <Link
                      className="mt-2 inline-block underline"
                      href={path(`/area-comercial/documento?pagamento=${p.id}`)}
                    >
                      {t.proof}
                    </Link>
                  )}
                </article>
              ))}
              {!data.payouts.length && (
                <p className="text-sm text-slate-500">{t.empty}</p>
              )}
            </Panel>
            <Panel id="perfil" title={t.profile}>
              <dl className="space-y-4 text-sm">
                {[
                  [t.email, agent.email],
                  [t.phone, agent.phone],
                  [t.company, agent.company_name],
                  [t.taxId, agent.tax_id],
                  [t.billing, agent.billing_address],
                  ["IBAN", agent.iban],
                  [t.language, SITE_LOCALES[locale].label],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-slate-500">{label}</dt>
                    <dd className="mt-1 break-words">{value || "—"}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
            <Panel title={t.terms}>
              {!agent.commission_enabled && (
                <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                  {t.disabled}
                </p>
              )}
              <dl className="space-y-4 text-sm">
                {[
                  [
                    t.standardRate,
                    agent.supplier_rate_bps == null
                      ? t.unset
                      : `${agent.supplier_rate_bps / 100}%`,
                  ],
                  [
                    t.manualRate,
                    agent.manual_rate_bps == null
                      ? t.unset
                      : `${agent.manual_rate_bps / 100}%`,
                  ],
                  [
                    t.hold,
                    agent.hold_days == null
                      ? t.unset
                      : `${agent.hold_days} ${t.days}`,
                  ],
                  [
                    t.recurring,
                    agent.recurring == null
                      ? t.unset
                      : agent.recurring
                        ? t.yes
                        : t.no,
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-5 text-xs leading-5 text-slate-500">{t.scope}</p>
            </Panel>
          </div>
        </div>
        <nav className="flex gap-5 text-sm">
          {page > 1 && <Link href={`?pagina=${page - 1}`}>← {page - 1}</Link>}
          <span>{page}</span>
          {page * 50 <
            Math.max(
              data.commissionCount,
              data.payoutCount,
              data.contactCount,
              data.assignmentCount,
            ) && <Link href={`?pagina=${page + 1}`}>{page + 1} →</Link>}
        </nav>
      </div>
    </main>
  );
}
