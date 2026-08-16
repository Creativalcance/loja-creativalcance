begin;

alter table if exists public.marketing_weekly_metrics
  add column if not exists ga4_synced_at timestamptz,
  add column if not exists search_console_synced_at timestamptz,
  add column if not exists google_ads_synced_at timestamptz,
  add column if not exists last_integration_sync_at timestamptz,
  add column if not exists sync_errors jsonb not null default '{}'::jsonb;

comment on column public.marketing_weekly_metrics.ga4_synced_at is
'Última sincronização automática bem-sucedida do Google Analytics 4 para esta semana.';

comment on column public.marketing_weekly_metrics.search_console_synced_at is
'Última sincronização automática bem-sucedida do Google Search Console para esta semana.';

comment on column public.marketing_weekly_metrics.google_ads_synced_at is
'Última sincronização automática bem-sucedida do Google Ads para esta semana.';

comment on column public.marketing_weekly_metrics.last_integration_sync_at is
'Última tentativa de sincronização automática das integrações Google para esta semana.';

comment on column public.marketing_weekly_metrics.sync_errors is
'Erros da execução automática mais recente, separados por fonte. Não contém credenciais.';

commit;
