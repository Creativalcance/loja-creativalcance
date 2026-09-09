alter table public.newsletter_subscribers
  add column if not exists welcome_email_status text not null default 'pending'
    check (welcome_email_status in ('pending', 'sending', 'sent', 'failed')),
  add column if not exists welcome_email_provider_id text,
  add column if not exists welcome_email_attempted_at timestamptz,
  add column if not exists welcome_email_sent_at timestamptz,
  add column if not exists welcome_email_error text;

create index if not exists newsletter_subscribers_welcome_status_idx
  on public.newsletter_subscribers (welcome_email_status, created_at desc);
