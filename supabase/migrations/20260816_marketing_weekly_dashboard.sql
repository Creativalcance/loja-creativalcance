begin;

create table if not exists public.marketing_weekly_metrics (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,

  sessions bigint,
  users bigint,
  new_users bigint,
  add_to_cart_sessions bigint,
  begin_checkout_sessions bigint,
  purchase_sessions bigint,
  organic_sessions bigint,

  seo_clicks bigint,
  seo_impressions bigint,

  google_ads_spend numeric(14,2),
  google_ads_clicks bigint,
  google_ads_impressions bigint,
  google_ads_revenue numeric(14,2),

  meta_ads_spend numeric(14,2),
  meta_ads_clicks bigint,
  meta_ads_impressions bigint,
  meta_ads_revenue numeric(14,2),

  paid_new_customers bigint,
  email_revenue numeric(14,2),

  notes text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint marketing_weekly_metrics_non_negative check (
    coalesce(sessions, 0) >= 0
    and coalesce(users, 0) >= 0
    and coalesce(new_users, 0) >= 0
    and coalesce(add_to_cart_sessions, 0) >= 0
    and coalesce(begin_checkout_sessions, 0) >= 0
    and coalesce(purchase_sessions, 0) >= 0
    and coalesce(organic_sessions, 0) >= 0
    and coalesce(seo_clicks, 0) >= 0
    and coalesce(seo_impressions, 0) >= 0
    and coalesce(google_ads_spend, 0) >= 0
    and coalesce(google_ads_clicks, 0) >= 0
    and coalesce(google_ads_impressions, 0) >= 0
    and coalesce(google_ads_revenue, 0) >= 0
    and coalesce(meta_ads_spend, 0) >= 0
    and coalesce(meta_ads_clicks, 0) >= 0
    and coalesce(meta_ads_impressions, 0) >= 0
    and coalesce(meta_ads_revenue, 0) >= 0
    and coalesce(paid_new_customers, 0) >= 0
    and coalesce(email_revenue, 0) >= 0
  )
);

create index if not exists marketing_weekly_metrics_week_start_idx
  on public.marketing_weekly_metrics (week_start desc);

alter table public.marketing_weekly_metrics enable row level security;

revoke all on table public.marketing_weekly_metrics from public, anon, authenticated;
grant select, insert, update, delete on table public.marketing_weekly_metrics to service_role;

comment on table public.marketing_weekly_metrics is
'Dados semanais de aquisição e marketing externos usados exclusivamente pelo dashboard administrativo. Não altera qualquer fluxo comercial da loja.';

comment on column public.marketing_weekly_metrics.week_start is
'Segunda-feira que identifica a semana de reporte em Europe/Lisbon.';

commit;
