-- Persist the notification intent with the supplier snapshot, before any email.
-- No backfill: completed historical orders must not generate late notifications.
alter table public.orders
  add column if not exists supplier_status_notification jsonb;
