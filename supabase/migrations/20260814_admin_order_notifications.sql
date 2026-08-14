create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  event_type text not null,
  order_id uuid references public.orders(id) on delete set null,
  title text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  email_to text,
  email_status text not null default 'pending'
    check (email_status in ('pending', 'sending', 'sent', 'failed')),
  email_provider_id text,
  email_attempted_at timestamptz,
  email_sent_at timestamptz,
  email_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_notifications_created_at_idx
  on public.admin_notifications (created_at desc);

create index if not exists admin_notifications_order_id_idx
  on public.admin_notifications (order_id);

create table if not exists public.admin_notification_reads (
  notification_id uuid not null references public.admin_notifications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

create index if not exists admin_notification_reads_user_id_idx
  on public.admin_notification_reads (user_id, read_at desc);

alter table public.admin_notifications enable row level security;
alter table public.admin_notification_reads enable row level security;

revoke all on table public.admin_notifications from anon, authenticated;
revoke all on table public.admin_notification_reads from anon, authenticated;

comment on table public.admin_notifications is
  'Notificações operacionais internas, criadas no servidor e acessíveis apenas após validação administrativa.';

comment on table public.admin_notification_reads is
  'Estado de leitura individual das notificações por administrador.';
