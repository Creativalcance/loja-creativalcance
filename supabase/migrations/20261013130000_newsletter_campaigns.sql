-- Campanhas de newsletter: sem alterar subscribers nem fluxos transacionais.
create table if not exists public.newsletter_campaigns (
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(title) between 3 and 160),
 subject text not null check(length(subject) between 3 and 200),
 preview_text text not null default '',
 body_text text not null default '',
 locale text not null default 'pt' check(locale in ('pt','en','fr','es','de','it')),
 audience text not null default 'all' check(audience in ('all','b2b','b2c')),
 status text not null default 'draft' check(status in ('draft','ready','scheduled','sending','sent','cancelled','failed')),
 resend_broadcast_id text unique,
 scheduled_at timestamptz,
 sent_at timestamptz,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists newsletter_campaigns_created_idx on public.newsletter_campaigns(created_at desc);
alter table public.newsletter_campaigns enable row level security;
-- Sem políticas para anon/authenticated: apenas service role usado após validação explícita de admin.
create table if not exists public.newsletter_campaign_events (
 id bigint generated always as identity primary key,
 campaign_id uuid not null references public.newsletter_campaigns(id) on delete cascade,
 event_type text not null,
 provider_event_id text unique,
 occurred_at timestamptz not null default now(),
 details jsonb not null default '{}'::jsonb
);
create index if not exists newsletter_campaign_events_campaign_idx on public.newsletter_campaign_events(campaign_id,occurred_at desc);
alter table public.newsletter_campaign_events enable row level security;