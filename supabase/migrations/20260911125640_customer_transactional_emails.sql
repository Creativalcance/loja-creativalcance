create table if not exists public.customer_email_notifications (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  event_type text not null check (event_type in (
    'account_welcome',
    'order_confirmation',
    'order_status_changed',
    'order_tracking_available'
  )),
  user_id uuid references auth.users(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  email_to text not null,
  locale text not null default 'pt' check (locale in ('pt', 'en', 'fr')),
  payload jsonb not null default '{}'::jsonb,
  email_status text not null default 'pending'
    check (email_status in ('pending', 'sending', 'sent', 'failed')),
  email_provider_id text,
  email_attempts integer not null default 0 check (email_attempts >= 0),
  email_attempted_at timestamptz,
  email_sent_at timestamptz,
  email_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_email_notifications_delivery_idx
  on public.customer_email_notifications (email_status, created_at)
  where email_status in ('pending', 'failed');

create index if not exists customer_email_notifications_order_idx
  on public.customer_email_notifications (order_id, created_at desc);

create index if not exists customer_email_notifications_user_idx
  on public.customer_email_notifications (user_id, created_at desc);

alter table public.customer_email_notifications enable row level security;

revoke all on table public.customer_email_notifications from public, anon, authenticated;
grant select, insert, update on table public.customer_email_notifications to service_role;

comment on table public.customer_email_notifications is
  'Fila e registo idempotente de emails transacionais enviados aos clientes em nome da 360 Merchandising.';
