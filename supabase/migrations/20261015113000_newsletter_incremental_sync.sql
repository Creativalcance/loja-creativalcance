alter table public.newsletter_subscribers add column if not exists resend_synced_at timestamptz;
create index if not exists newsletter_resend_pending_idx
 on public.newsletter_subscribers (created_at, id)
 where status='active' and locale='pt' and unsubscribed_at is null and resend_synced_at is null;
