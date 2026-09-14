import Link from "next/link";
import { localizePath, type SiteLocale } from "@/lib/i18n/config";
import { salesCopy, salesMoney } from "@/lib/sales/i18n";
import type { SalesCommission } from "@/lib/sales/types";
import {
  approveCommissionAction,
  allocateRefundAction,
} from "@/lib/sales/actions";
import SalesActionForm from "./ActionForm";
import { Field } from "./Fields";
export default function CommissionTable({
  rows,
  locale,
  admin = false,
}: {
  rows: SalesCommission[];
  locale: SiteLocale;
  admin?: boolean;
}) {
  const t = salesCopy(locale);
  if (!rows.length) return <p className="text-sm text-slate-500">{t.empty}</p>;
  return (
    <div className="space-y-3">
      {rows.map((c) => {
        const balance = c.earned_cents - c.paid_cents;
        const label = c.review_required
          ? t.review
          : balance < 0
            ? t.adjustment
            : c.paid_cents > 0 && balance === 0
              ? t.paidState
              : c.approved_at
                ? t.approvedState
                : c.state === "eligible"
                  ? t.eligibleState
                  : c.state === "forecast"
                    ? t.forecastState
                    : c.state === "cancelled"
                      ? t.cancelled
                      : t.unconfigured;
        return (
          <article
            key={c.order_id}
            className="rounded-2xl border border-slate-200 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link
                  className="font-semibold text-[#162334] underline decoration-slate-300 underline-offset-4"
                  href={
                    admin
                      ? `/admin/encomendas/${c.order_id}`
                      : localizePath(
                          `/area-comercial/encomendas/${c.order_id}`,
                          locale,
                        )
                  }
                >
                  {c.order_number}
                </Link>
                <p className="mt-1 text-sm text-slate-500">
                  {c.customer_name} ·{" "}
                  {new Date(c.created_at).toLocaleDateString(locale)}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${c.review_required || balance < 0 ? "bg-amber-100 text-amber-900" : c.state === "eligible" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}
              >
                {label}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <p className="text-xs text-slate-500">{t.basis}</p>
                <p className="mt-1 font-semibold">
                  {salesMoney(
                    c.supplier_base_cents + c.manual_base_cents,
                    c.currency,
                    locale,
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">{t.amount}</p>
                <p className="mt-1 font-semibold">
                  {salesMoney(c.earned_cents, c.currency, locale)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">{t.paid}</p>
                <p className="mt-1 font-semibold">
                  {salesMoney(c.paid_cents, c.currency, locale)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">{t.terms}</p>
                <p className="mt-1 text-sm">
                  {t.standardRate}:{" "}
                  {Number(c.rule_snapshot.supplier_rate_bps ?? 0) / 100}%<br />
                  {t.manualRate}:{" "}
                  {Number(c.rule_snapshot.manual_rate_bps ?? 0) / 100}%
                </p>
              </div>
            </div>
            {admin && c.review_required && (
              <details className="mt-4 rounded-xl bg-amber-50 p-4">
                <summary className="cursor-pointer font-semibold text-amber-900">
                  Rever reembolso de {salesMoney(c.refund_cents, c.currency)}
                </summary>
                <p className="my-3 text-sm leading-6 text-slate-600">
                  Indica os valores acumulados reembolsados dos
                  produtos/personalização, sem IVA e portes, por origem.
                  Reembolso apenas de portes: ambas as parcelas ficam a zero. A
                  aprovação da comissão é feita depois.
                </p>
                <SalesActionForm
                  action={allocateRefundAction}
                  submit="Guardar repartição"
                >
                  <input type="hidden" name="agent_id" value={c.agent_id} />
                  <input type="hidden" name="order_id" value={c.order_id} />
                  <input
                    type="hidden"
                    name="refund_cents"
                    value={c.refund_cents}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field
                      name="supplier_net"
                      label={`Catálogo — até ${salesMoney(c.supplier_base_cents, c.currency)}`}
                      type="number"
                      step="0.01"
                      min="0"
                      max={String(c.supplier_base_cents / 100)}
                      required
                    />
                    <Field
                      name="manual_net"
                      label={`Manuais 360 — até ${salesMoney(c.manual_base_cents, c.currency)}`}
                      type="number"
                      step="0.01"
                      min="0"
                      max={String(c.manual_base_cents / 100)}
                      required
                    />
                  </div>
                  <Field
                    name="reason"
                    label="Motivo / documento de suporte"
                    required
                  />
                </SalesActionForm>
              </details>
            )}
            {admin &&
              !c.review_required &&
              balance !== 0 &&
              (c.state === "eligible" ||
                (c.state === "cancelled" && balance < 0)) &&
              c.approved_cents !== c.earned_cents && (
                <SalesActionForm
                  action={approveCommissionAction}
                  submit={balance < 0 ? "Aprovar ajuste" : "Aprovar comissão"}
                  className="mt-4"
                >
                  <input type="hidden" name="agent_id" value={c.agent_id} />
                  <input type="hidden" name="order_id" value={c.order_id} />
                  <input
                    type="hidden"
                    name="expected_cents"
                    value={c.earned_cents}
                  />
                </SalesActionForm>
              )}
          </article>
        );
      })}
    </div>
  );
}
