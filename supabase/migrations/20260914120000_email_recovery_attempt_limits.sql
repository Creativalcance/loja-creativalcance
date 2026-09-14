-- Additive counters: preserve sent states and cap automated retries at five.
alter table public.admin_notifications
  add column if not exists email_attempts integer not null default 0 check (email_attempts >= 0);
alter table public.newsletter_subscribers
  add column if not exists welcome_email_attempts integer not null default 0 check (welcome_email_attempts >= 0);
