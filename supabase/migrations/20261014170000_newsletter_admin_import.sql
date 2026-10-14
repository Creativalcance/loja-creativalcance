-- Importações administrativas: manter separados os emails de boas-vindas.
alter table public.newsletter_subscribers drop constraint if exists newsletter_subscribers_welcome_email_status_check;
alter table public.newsletter_subscribers add constraint newsletter_subscribers_welcome_email_status_check
  check (welcome_email_status = any(array['pending','sending','sent','failed','skipped']::text[]));
alter table public.newsletter_subscribers
  add column if not exists imported_at timestamptz,
  add column if not exists consent_evidence text,
  add column if not exists imported_by uuid;
create table if not exists public.newsletter_import_batches (
  id uuid primary key default gen_random_uuid(),
  imported_at timestamptz not null default now(),
  imported_by uuid,
  source_filename text not null,
  consent_evidence text not null,
  consented_at timestamptz not null,
  locale text not null,
  total_rows integer not null,
  imported_count integer not null,
  duplicate_count integer not null,
  invalid_count integer not null,
  constraint newsletter_import_batches_counts check (
    total_rows >= 0 and imported_count >= 0 and duplicate_count >= 0 and invalid_count >= 0
  )
);
alter table public.newsletter_import_batches enable row level security;
comment on table public.newsletter_import_batches is 'Auditoria de importações administrativas; acesso pelo cliente de serviço em operações autenticadas.';
