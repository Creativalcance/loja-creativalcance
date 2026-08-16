import Link from "next/link";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  CalendarDays,
  CircleDollarSign,
  Database,
  Euro,
  Gauge,
  Mail,
  MousePointerClick,
  PackageCheck,
  Percent,
  Search,
  ShoppingCart,
  Target,
  TrendingUp,
  UserPlus,
  Users,
  WalletCards,
} from "lucide-react";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import {
  addDaysToDateOnly,
  getCurrentLisbonWeekStart,
  getWeeklyDashboardData,
  normalizeWeekStart,
  type WeeklyDashboardSnapshot,
  type WeeklyMarketingMetricsRecord,
} from "@/lib/admin/dashboard/weekly-dashboard";
import { saveWeeklyMarketingMetrics } from "./actions";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams?: Promise<{
    week?: string;
    guardado?: string;
    erro?: string;
  }>;
};

type MetricFormat = "currency" | "number" | "decimal" | "percent" | "ratio";

type MetricCardProps = {
  label: string;
  value: number | null;
  previous: number | null;
  format: MetricFormat;
  source: string;
  note?: string;
  meaning?: string;
  invertDelta?: boolean;
};

const currencyFormatter = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

const integerFormatter = new Intl.NumberFormat("pt-PT", {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat("pt-PT", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

function formatMetric(value: number | null, format: MetricFormat): string {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  if (format === "currency") {
    return currencyFormatter.format(value);
  }

  if (format === "decimal") {
    return decimalFormatter.format(value);
  }

  if (format === "percent") {
    return `${decimalFormatter.format(value * 100)}%`;
  }

  if (format === "ratio") {
    return `${decimalFormatter.format(value)}x`;
  }

  return integerFormatter.format(value);
}

function relativeDelta(current: number | null, previous: number | null): number | null {
  if (
    current === null ||
    previous === null ||
    !Number.isFinite(current) ||
    !Number.isFinite(previous) ||
    previous === 0
  ) {
    return null;
  }

  return (current - previous) / Math.abs(previous);
}

function MetricCard({
  label,
  value,
  previous,
  format,
  source,
  note,
  meaning,
  invertDelta = false,
}: MetricCardProps) {
  const delta = relativeDelta(value, previous);
  const improved = delta === null ? null : invertDelta ? delta < 0 : delta > 0;
  const DeltaIcon = delta !== null && delta < 0 ? ArrowDownRight : ArrowUpRight;

  return (
    <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white/65">{label}</p>
          {meaning ? (
            <p className="mt-1 text-[11px] leading-4 text-white/35">{meaning}</p>
          ) : null}
        </div>
        <span className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
          {source}
        </span>
      </div>

      <p className="mt-5 text-3xl font-semibold tracking-tight text-white">
        {formatMetric(value, format)}
      </p>

      <div className="mt-3 min-h-5 text-xs">
        {delta === null ? (
          <span className="text-white/35">Sem comparação disponível</span>
        ) : (
          <span
            className={`inline-flex items-center gap-1 font-medium ${
              improved ? "text-emerald-300" : "text-amber-300"
            }`}
          >
            <DeltaIcon className="h-3.5 w-3.5" />
            {decimalFormatter.format(Math.abs(delta) * 100)}% vs. semana anterior
          </span>
        )}
      </div>

      {note ? <p className="mt-3 text-xs leading-5 text-white/40">{note}</p> : null}
    </article>
  );
}

function SectionHeading({
  icon: Icon,
  eyebrow,
  title,
  description,
}: {
  icon: typeof BarChart3;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-neutral-950">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">{description}</p>
      </div>
    </div>
  );
}

function numberInputValue(value: number | null | undefined): string | number {
  return value ?? "";
}

function ExternalMetricsForm({
  weekStart,
  record,
}: {
  weekStart: string;
  record: WeeklyMarketingMetricsRecord | null;
}) {
  const inputClass =
    "mt-2 w-full rounded-2xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/30";
  const labelClass = "text-xs font-medium uppercase tracking-[0.12em] text-white/45";

  return (
    <form action={saveWeeklyMarketingMetrics} className="mt-6 space-y-7">
      <input type="hidden" name="weekStart" value={weekStart} />

      <div>
        <h3 className="text-sm font-semibold text-white">GA4</h3>
        <p className="mt-1 text-xs text-white/35">Google Analytics 4</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <label className={labelClass}>
            Sessions
            <input name="sessions" type="number" min="0" step="1" defaultValue={numberInputValue(record?.sessions)} className={inputClass} />
          </label>
          <label className={labelClass}>
            Users
            <input name="users" type="number" min="0" step="1" defaultValue={numberInputValue(record?.users)} className={inputClass} />
          </label>
          <label className={labelClass}>
            New Users
            <input name="newUsers" type="number" min="0" step="1" defaultValue={numberInputValue(record?.new_users)} className={inputClass} />
          </label>
          <label className={labelClass}>
            Organic Sessions
            <input name="organicSessions" type="number" min="0" step="1" defaultValue={numberInputValue(record?.organic_sessions)} className={inputClass} />
          </label>
          <label className={labelClass}>
            Sessions com Add to Cart
            <input name="addToCartSessions" type="number" min="0" step="1" defaultValue={numberInputValue(record?.add_to_cart_sessions)} className={inputClass} />
          </label>
          <label className={labelClass}>
            Sessions com Begin Checkout
            <input name="beginCheckoutSessions" type="number" min="0" step="1" defaultValue={numberInputValue(record?.begin_checkout_sessions)} className={inputClass} />
          </label>
          <label className={labelClass}>
            Sessions com Purchase
            <input name="purchaseSessions" type="number" min="0" step="1" defaultValue={numberInputValue(record?.purchase_sessions)} className={inputClass} />
          </label>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-white">Google Search Console</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <label className={labelClass}>
            SEO Clicks
            <span className="mt-1 block normal-case tracking-normal text-white/30">Search Engine Optimization</span>
            <input name="seoClicks" type="number" min="0" step="1" defaultValue={numberInputValue(record?.seo_clicks)} className={inputClass} />
          </label>
          <label className={labelClass}>
            SEO Impressions
            <span className="mt-1 block normal-case tracking-normal text-white/30">Search Engine Optimization</span>
            <input name="seoImpressions" type="number" min="0" step="1" defaultValue={numberInputValue(record?.seo_impressions)} className={inputClass} />
          </label>
        </div>
      </div>

      <div className="grid gap-7 xl:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-white">Google Ads</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Spend (€)
              <input name="googleAdsSpend" type="number" min="0" step="0.01" defaultValue={numberInputValue(record?.google_ads_spend)} className={inputClass} />
            </label>
            <label className={labelClass}>
              Revenue atribuído (€)
              <input name="googleAdsRevenue" type="number" min="0" step="0.01" defaultValue={numberInputValue(record?.google_ads_revenue)} className={inputClass} />
            </label>
            <label className={labelClass}>
              Clicks
              <input name="googleAdsClicks" type="number" min="0" step="1" defaultValue={numberInputValue(record?.google_ads_clicks)} className={inputClass} />
            </label>
            <label className={labelClass}>
              Impressions
              <input name="googleAdsImpressions" type="number" min="0" step="1" defaultValue={numberInputValue(record?.google_ads_impressions)} className={inputClass} />
            </label>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Meta Ads</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Spend (€)
              <input name="metaAdsSpend" type="number" min="0" step="0.01" defaultValue={numberInputValue(record?.meta_ads_spend)} className={inputClass} />
            </label>
            <label className={labelClass}>
              Revenue atribuído (€)
              <input name="metaAdsRevenue" type="number" min="0" step="0.01" defaultValue={numberInputValue(record?.meta_ads_revenue)} className={inputClass} />
            </label>
            <label className={labelClass}>
              Clicks
              <input name="metaAdsClicks" type="number" min="0" step="1" defaultValue={numberInputValue(record?.meta_ads_clicks)} className={inputClass} />
            </label>
            <label className={labelClass}>
              Impressions
              <input name="metaAdsImpressions" type="number" min="0" step="1" defaultValue={numberInputValue(record?.meta_ads_impressions)} className={inputClass} />
            </label>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <label className={labelClass}>
          Novos clientes atribuídos a Paid Media
          <input name="paidNewCustomers" type="number" min="0" step="1" defaultValue={numberInputValue(record?.paid_new_customers)} className={inputClass} />
        </label>
        <label className={labelClass}>
          Email Revenue (€)
          <input name="emailRevenue" type="number" min="0" step="0.01" defaultValue={numberInputValue(record?.email_revenue)} className={inputClass} />
        </label>
      </div>

      <label className={labelClass}>
        Notas da semana
        <textarea name="notes" rows={3} defaultValue={record?.notes ?? ""} className={inputClass} />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
        <p className="max-w-2xl text-xs leading-5 text-white/40">
          Estes campos são uma ponte segura para Google Analytics 4 (GA4), Search Console, Google Ads, Meta Ads e Brevo. O dashboard usa os dados internos da loja como fonte de verdade para vendas e encomendas.
        </p>
        <button
          type="submit"
          className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-white/90"
        >
          Guardar métricas da semana
        </button>
      </div>
    </form>
  );
}

function TrendTable({ trend }: { trend: WeeklyDashboardSnapshot[] }) {
  return (
    <div className="mt-6 overflow-x-auto rounded-3xl border border-white/10">
      <table className="min-w-[980px] w-full border-collapse text-left text-sm">
        <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.12em] text-white/40">
          <tr>
            <th className="px-5 py-4 font-medium">Semana</th>
            <th className="px-5 py-4 font-medium">Revenue</th>
            <th className="px-5 py-4 font-medium">Orders</th>
            <th className="px-5 py-4 font-medium">AOV<span className="mt-1 block text-[10px] normal-case tracking-normal text-white/30">Average Order Value · Valor médio por encomenda</span></th>
            <th className="px-5 py-4 font-medium">Sessions</th>
            <th className="px-5 py-4 font-medium">Conversion<span className="mt-1 block text-[10px] normal-case tracking-normal text-white/30">Taxa de conversão</span></th>
            <th className="px-5 py-4 font-medium">Ad Spend</th>
            <th className="px-5 py-4 font-medium">MER<span className="mt-1 block text-[10px] normal-case tracking-normal text-white/30">Marketing Efficiency Ratio</span></th>
            <th className="px-5 py-4 font-medium">B2B Leads<span className="mt-1 block text-[10px] normal-case tracking-normal text-white/30">Business-to-Business · Leads empresariais</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {[...trend].reverse().map((snapshot, index) => (
            <tr key={snapshot.range.weekStart} className={index === 0 ? "bg-white/[0.035]" : ""}>
              <td className="px-5 py-4 font-medium text-white">{snapshot.range.shortLabel}</td>
              <td className="px-5 py-4 text-white/70">{formatMetric(snapshot.business.revenue, "currency")}</td>
              <td className="px-5 py-4 text-white/70">{formatMetric(snapshot.business.orders, "number")}</td>
              <td className="px-5 py-4 text-white/70">{formatMetric(snapshot.business.aov, "currency")}</td>
              <td className="px-5 py-4 text-white/70">{formatMetric(snapshot.acquisition.sessions, "number")}</td>
              <td className="px-5 py-4 text-white/70">{formatMetric(snapshot.acquisition.conversionRate, "percent")}</td>
              <td className="px-5 py-4 text-white/70">{formatMetric(snapshot.acquisition.adSpend, "currency")}</td>
              <td className="px-5 py-4 text-white/70">{formatMetric(snapshot.acquisition.mer, "ratio")}</td>
              <td className="px-5 py-4 text-white/70">{formatMetric(snapshot.business.b2bLeads, "number")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdminDashboardPage({ searchParams }: DashboardPageProps) {
  await assertAdminAccess("/admin/dashboard");
  const params = (await searchParams) ?? {};
  const weekStart = normalizeWeekStart(params.week);
  const currentWeekStart = getCurrentLisbonWeekStart();
  const data = await getWeeklyDashboardData(weekStart);
  const { current, previous } = data;
  const previousWeek = addDaysToDateOnly(weekStart, -7);
  const nextWeek = addDaysToDateOnly(weekStart, 7);
  const canGoNext = nextWeek <= currentWeekStart;

  return (
    <main className="min-h-screen bg-neutral-950 px-5 py-10 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-[1600px]">
        <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-start">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-sm font-medium text-white/45 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Backoffice
            </Link>
            <p className="mt-7 text-xs font-semibold uppercase tracking-[0.22em] text-white/40">
              Dashboard de gestão
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              Performance semanal
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/55">
              Visão única de vendas, aquisição, media, funil, SEO (Search Engine Optimization), CRM (Customer Relationship Management) e B2B (Business-to-Business). Os indicadores comerciais são calculados diretamente a partir da loja; os canais externos ficam separados para não misturar fontes nem inventar atribuição.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-white/65" />
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-white/40">Semana analisada</p>
                <p className="mt-1 font-semibold text-white">{current.range.label}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href={`/admin/dashboard?week=${previousWeek}`}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Semana anterior
              </Link>
              {weekStart !== currentWeekStart ? (
                <Link
                  href={`/admin/dashboard?week=${currentWeekStart}`}
                  className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  Semana atual
                </Link>
              ) : null}
              {canGoNext ? (
                <Link
                  href={`/admin/dashboard?week=${nextWeek}`}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  Seguinte
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        {params.guardado === "1" ? (
          <div className="mt-8 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-4 text-sm text-emerald-200">
            Métricas externas da semana guardadas com sucesso.
          </div>
        ) : null}

        {params.erro === "metricas-externas-nao-configuradas" || !data.externalMetricsReady ? (
          <div className="mt-8 rounded-3xl border border-amber-300/15 bg-amber-300/[0.07] p-5">
            <div className="flex items-start gap-3">
              <Database className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" />
              <div>
                <p className="font-semibold text-amber-100">Métricas externas ainda não ativadas</p>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-amber-100/65">
                  O dashboard interno já funciona. Para Sessions, Users, SEO (Search Engine Optimization), Ads e Email Revenue, aplica a migration <code className="rounded bg-black/20 px-1.5 py-0.5">20260816_marketing_weekly_dashboard.sql</code>. A tabela criada é isolada e não altera encomendas, carrinho, checkout, Stricker ou pricing.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {data.externalMetricsError ? (
          <div className="mt-8 rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-sm text-red-200">
            Não foi possível ler as métricas externas: {data.externalMetricsError}
          </div>
        ) : null}

        <section className="mt-12">
          <SectionHeading
            icon={Gauge}
            eyebrow="Executive snapshot"
            title="Indicadores principais"
            description="Os seis números que devem abrir a reunião semanal: negócio, eficiência de aquisição e geração de procura empresarial (B2B — Business-to-Business)."
          />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <MetricCard label="Revenue" value={current.business.revenue} previous={previous.business.revenue} format="currency" source="Loja" />
            <MetricCard label="Orders" value={current.business.orders} previous={previous.business.orders} format="number" source="Loja" />
            <MetricCard label="AOV" meaning="Average Order Value · Valor médio por encomenda" value={current.business.aov} previous={previous.business.aov} format="currency" source="Loja" />
            <MetricCard label="Conversion Rate" value={current.acquisition.conversionRate} previous={previous.acquisition.conversionRate} format="percent" source="Analytics + Loja" note="Orders pagos ÷ Sessions." />
            <MetricCard label="MER" meaning="Marketing Efficiency Ratio · Eficiência global do investimento em marketing" value={current.acquisition.mer} previous={previous.acquisition.mer} format="ratio" source="Ads + Loja" note="Revenue total ÷ investimento em media paga." />
            <MetricCard label="B2B Leads" meaning="Business-to-Business · Leads empresariais" value={current.business.b2bLeads} previous={previous.business.b2bLeads} format="number" source="Loja" />
          </div>
        </section>

        <section className="mt-14">
          <SectionHeading
            icon={Users}
            eyebrow="Audience"
            title="Tráfego e utilizadores"
            description="Dimensão da audiência e peso do tráfego orgânico. Estes indicadores devem vir do Google Analytics 4 (GA4) para manter uma única definição de sessão e utilizador."
          />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Sessions" value={current.acquisition.sessions} previous={previous.acquisition.sessions} format="number" source="Google Analytics" />
            <MetricCard label="Users" value={current.acquisition.users} previous={previous.acquisition.users} format="number" source="Google Analytics" />
            <MetricCard label="New Users" value={current.acquisition.newUsers} previous={previous.acquisition.newUsers} format="number" source="Google Analytics" />
            <MetricCard label="Organic Traffic" value={current.acquisition.organicTraffic} previous={previous.acquisition.organicTraffic} format="number" source="Google Analytics" />
            <MetricCard label="Organic Share" value={current.acquisition.organicTrafficShare} previous={previous.acquisition.organicTrafficShare} format="percent" source="Google Analytics" note="Organic Sessions ÷ Sessions." />
            <MetricCard label="New Customers" value={current.business.newCustomers} previous={previous.business.newCustomers} format="number" source="Loja" note="Cliente cuja primeira encomenda paga ocorreu nesta semana." />
            <MetricCard label="Returning Customers" value={current.business.returningCustomers} previous={previous.business.returningCustomers} format="number" source="Loja" />
            <MetricCard label="Returning Customer Rate" value={current.business.returningCustomerRate} previous={previous.business.returningCustomerRate} format="percent" source="Loja" />
          </div>
        </section>

        <section className="mt-14">
          <SectionHeading
            icon={Target}
            eyebrow="Paid Media"
            title="Eficiência de aquisição"
            description="Os rácios de media são calculados a partir da soma de Google Ads e Meta Ads, mantendo Revenue da loja separado de Revenue atribuído pelas plataformas."
          />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
            <MetricCard label="Ad Spend" value={current.acquisition.adSpend} previous={previous.acquisition.adSpend} format="currency" source="Ads" invertDelta />
            <MetricCard label="CAC" meaning="Customer Acquisition Cost · Custo de aquisição de cliente" value={current.acquisition.cac} previous={previous.acquisition.cac} format="currency" source="Ads" invertDelta note="Ad Spend ÷ novos clientes atribuídos a paid media." />
            <MetricCard label="ROAS" meaning="Return on Ad Spend · Retorno sobre investimento publicitário" value={current.acquisition.roas} previous={previous.acquisition.roas} format="ratio" source="Ads" note="Revenue atribuído pelas plataformas ÷ Ad Spend." />
            <MetricCard label="MER" meaning="Marketing Efficiency Ratio · Eficiência global do investimento em marketing" value={current.acquisition.mer} previous={previous.acquisition.mer} format="ratio" source="Ads + Loja" />
            <MetricCard label="CTR" meaning="Click-Through Rate · Taxa de cliques" value={current.acquisition.ctr} previous={previous.acquisition.ctr} format="percent" source="Ads" />
            <MetricCard label="CPC" meaning="Cost per Click · Custo por clique" value={current.acquisition.cpc} previous={previous.acquisition.cpc} format="currency" source="Ads" invertDelta />
            <MetricCard label="CPM" meaning="Cost per Mille · Custo por mil impressões" value={current.acquisition.cpm} previous={previous.acquisition.cpm} format="currency" source="Ads" invertDelta />
            <MetricCard label="Paid Revenue" value={current.acquisition.paidRevenue} previous={previous.acquisition.paidRevenue} format="currency" source="Ads" note="Valor atribuído por Google Ads + Meta Ads; não substitui Revenue contabilístico." />
          </div>
        </section>

        <section className="mt-14">
          <SectionHeading
            icon={ShoppingCart}
            eyebrow="Funnel"
            title="Carrinho e checkout"
            description="A leitura do funil combina Google Analytics 4 (GA4) com sinais internos. Quando os eventos do Google Analytics 4 ainda não estão preenchidos, o abandono usa apenas uma estimativa conservadora baseada em carrinhos reais da loja."
          />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Add-to-cart Rate" value={current.acquisition.addToCartRate} previous={previous.acquisition.addToCartRate} format="percent" source="Google Analytics" note="Sessions com add_to_cart ÷ Sessions." />
            <MetricCard label="Checkout Rate" value={current.acquisition.checkoutRate} previous={previous.acquisition.checkoutRate} format="percent" source="Google Analytics" note="Sessions com begin_checkout ÷ Sessions com add_to_cart." />
            <MetricCard label="Cart Abandonment" value={current.acquisition.cartAbandonmentRate} previous={previous.acquisition.cartAbandonmentRate} format="percent" source={current.external?.add_to_cart_sessions !== null && current.external?.add_to_cart_sessions !== undefined ? "Analytics + Loja" : "Loja (est.)"} invertDelta />
            <MetricCard label="Checkout Completion" value={current.business.checkoutCompletionRate} previous={previous.business.checkoutCompletionRate} format="percent" source="Loja" note="Checkout Stripe concluído ÷ sessões de checkout criadas." />
          </div>
        </section>

        <section className="mt-14">
          <SectionHeading
            icon={Search}
            eyebrow="Organic & Retention"
            title="SEO e retenção"
            description="SEO significa Search Engine Optimization (otimização para motores de pesquisa). Search Console mede visibilidade orgânica; Google Analytics 4 mede tráfego; Email Revenue deve refletir apenas receita atribuída ao canal de email."
          />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="SEO Clicks" meaning="Search Engine Optimization · Cliques orgânicos" value={current.acquisition.seoClicks} previous={previous.acquisition.seoClicks} format="number" source="Search Console" />
            <MetricCard label="SEO Impressions" meaning="Search Engine Optimization · Impressões orgânicas" value={current.acquisition.seoImpressions} previous={previous.acquisition.seoImpressions} format="number" source="Search Console" />
            <MetricCard label="SEO CTR" meaning="Search Engine Optimization · Click-Through Rate · Taxa de cliques orgânicos" value={current.acquisition.seoCtr} previous={previous.acquisition.seoCtr} format="percent" source="Search Console" />
            <MetricCard label="Email Revenue" value={current.acquisition.emailRevenue} previous={previous.acquisition.emailRevenue} format="currency" source="Brevo" />
            <MetricCard label="Email Revenue Share" value={current.acquisition.emailRevenueShare} previous={previous.acquisition.emailRevenueShare} format="percent" source="Brevo + Loja" />
            <MetricCard label="New Customer Revenue Share" value={current.business.newCustomerRevenueShare} previous={previous.business.newCustomerRevenueShare} format="percent" source="Loja" />
            <MetricCard label="Personalization Revenue Share" value={current.business.personalizationRevenueShare} previous={previous.business.personalizationRevenueShare} format="percent" source="Loja" />
            <MetricCard label="Units / Order" value={current.business.unitsPerOrder} previous={previous.business.unitsPerOrder} format="decimal" source="Loja" />
          </div>
        </section>

        <section className="mt-14">
          <SectionHeading
            icon={CircleDollarSign}
            eyebrow="Economics"
            title="Margem e qualidade da receita"
            description="A margem só é apresentada sobre encomendas em que o custo do fornecedor está efetivamente registado. A cobertura evita interpretar custos em falta como margem."
          />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Gross Profit" value={current.business.grossProfitKnownCost} previous={previous.business.grossProfitKnownCost} format="currency" source="Loja" note="Apenas encomendas com supplier_cost_total preenchido." />
            <MetricCard label="Gross Margin" value={current.business.grossMarginKnownCost} previous={previous.business.grossMarginKnownCost} format="percent" source="Loja" />
            <MetricCard label="Supplier Cost Coverage" value={current.business.supplierCostCoverage} previous={previous.business.supplierCostCoverage} format="percent" source="Loja" note="Percentagem do Revenue com custo de fornecedor conhecido." />
            <MetricCard label="Cancellation Rate" value={current.business.cancellationRate} previous={previous.business.cancellationRate} format="percent" source="Loja" invertDelta note="Encomendas canceladas ÷ encomendas criadas na semana." />
          </div>
        </section>

        <section className="mt-14">
          <SectionHeading
            icon={Building2}
            eyebrow="Business-to-Business (B2B)"
            title="Pipeline comercial"
            description="Os leads são pedidos de orçamento registados na plataforma. O pipeline usa apenas orçamento declarado e não é tratado como receita fechada."
          />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="B2B Leads" meaning="Business-to-Business · Leads empresariais" value={current.business.b2bLeads} previous={previous.business.b2bLeads} format="number" source="Loja" />
            <MetricCard label="B2B Won" meaning="Business-to-Business · Leads empresariais ganhos" value={current.business.b2bWon} previous={previous.business.b2bWon} format="number" source="Loja" />
            <MetricCard label="B2B Win Rate" meaning="Business-to-Business · Taxa de conversão dos leads empresariais" value={current.business.b2bWinRate} previous={previous.business.b2bWinRate} format="percent" source="Loja" />
            <MetricCard label="B2B Pipeline" meaning="Business-to-Business · Valor potencial dos leads empresariais em aberto" value={current.business.b2bPipeline} previous={previous.business.b2bPipeline} format="currency" source="Loja" note="Soma do orçamento máximo declarado em leads abertos da semana." />
          </div>
        </section>

        <section className="mt-14 rounded-[2rem] border border-white/10 bg-white/[0.025] p-6 sm:p-8">
          <SectionHeading
            icon={TrendingUp}
            eyebrow="Trend"
            title="Últimas 8 semanas"
            description="A tabela permite perceber direção e consistência sem depender de gráficos externos. A semana mais recente aparece no topo."
          />
          <TrendTable trend={data.trend} />
        </section>

        <section className="mt-14 rounded-[2rem] border border-white/10 bg-white/[0.025] p-6 sm:p-8">
          <SectionHeading
            icon={Database}
            eyebrow="Data sources"
            title="Métricas externas da semana"
            description="Área discreta de carregamento dos dados de Google Analytics 4 (GA4), Search Console, Ads e Brevo. Pode ser substituída por sincronização automática mais tarde sem alterar os cálculos do dashboard."
          />

          {data.externalMetricsReady ? (
            <details className="mt-6 rounded-3xl border border-white/10 bg-black/15 p-5">
              <summary className="cursor-pointer list-none font-semibold text-white">
                Atualizar dados externos de {current.range.shortLabel}
                <span className="ml-3 text-xs font-normal text-white/35">Abrir formulário</span>
              </summary>
              <ExternalMetricsForm weekStart={weekStart} record={current.external} />
            </details>
          ) : (
            <div className="mt-6 rounded-3xl border border-white/10 bg-black/15 p-5 text-sm leading-6 text-white/50">
              Aplica primeiro a migration do dashboard. Até lá, todas as métricas internas continuam disponíveis e nenhum fluxo da loja é afetado.
            </div>
          )}
        </section>

        <section className="mt-14 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { icon: Euro, title: "Revenue", text: "Encomendas pagas com paid_at na semana." },
            { icon: UserPlus, title: "New Customer", text: "Primeira encomenda paga do cliente na plataforma." },
            { icon: MousePointerClick, title: "Conversion", text: "Orders pagos ÷ Sessions do Google Analytics 4." },
            { icon: WalletCards, title: "MER", text: "Marketing Efficiency Ratio — Revenue total da loja ÷ investimento total em paid media." },
            { icon: Percent, title: "ROAS", text: "Return on Ad Spend — Revenue atribuído pelas plataformas de Ads ÷ Ad Spend." },
            { icon: PackageCheck, title: "Gross Margin", text: "Calculada apenas onde existe custo do fornecedor." },
            { icon: Mail, title: "Email Revenue", text: "Receita atribuída ao canal de email, reportada separadamente." },
            { icon: BarChart3, title: "B2B Pipeline", text: "Business-to-Business — Orçamento potencial declarado em leads empresariais abertos; não é receita." },
          ].map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-3xl border border-white/10 bg-white/[0.025] p-5">
              <Icon className="h-5 w-5 text-white/65" />
              <h3 className="mt-4 text-sm font-semibold text-white">{title}</h3>
              <p className="mt-2 text-xs leading-5 text-white/40">{text}</p>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
