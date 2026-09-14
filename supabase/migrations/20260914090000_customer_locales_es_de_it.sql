-- Accept the new storefront locales in newsletter and transactional email records.
-- Existing rows and default language remain valid.
alter table public.newsletter_subscribers
  drop constraint if exists newsletter_subscribers_locale_check;
alter table public.newsletter_subscribers
  add constraint newsletter_subscribers_locale_check
  check (locale in ('pt', 'en', 'fr', 'es', 'de', 'it'));

alter table public.customer_email_notifications
  drop constraint if exists customer_email_notifications_locale_check;
alter table public.customer_email_notifications
  add constraint customer_email_notifications_locale_check
  check (locale in ('pt', 'en', 'fr', 'es', 'de', 'it'));
