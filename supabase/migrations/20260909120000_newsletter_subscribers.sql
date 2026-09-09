create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null unique check (char_length(email) between 3 and 254),
  locale text not null default 'pt' check (locale in ('pt', 'en', 'fr')),
  status text not null default 'active' check (status in ('active', 'unsubscribed')),
  source text not null default 'website_footer',
  consented_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists newsletter_subscribers_status_created_idx
  on public.newsletter_subscribers (status, created_at desc);

alter table public.newsletter_subscribers enable row level security;
revoke all on table public.newsletter_subscribers from anon, authenticated;

comment on table public.newsletter_subscribers is
  'Newsletter consent records collected through the website and managed by administrators.';
