create table if not exists public.supplier_customization_options_cache (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  language text not null default 'PT',
  service_code text not null,
  product_reference text not null,
  table_code text,
  table_code_option text,
  component_name text,
  location_name text,
  payload_hash text not null,
  raw_payload jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (supplier_id, language, service_code)
);

create index if not exists supplier_customization_options_cache_lookup_idx
on public.supplier_customization_options_cache
  (supplier_id, language, product_reference, table_code_option);

create index if not exists supplier_customization_options_cache_seen_idx
on public.supplier_customization_options_cache
  (supplier_id, language, last_seen_at);

drop trigger if exists supplier_customization_options_cache_set_updated_at
on public.supplier_customization_options_cache;

create trigger supplier_customization_options_cache_set_updated_at
before update on public.supplier_customization_options_cache
for each row execute function public.set_updated_at();

alter table public.supplier_customization_options_cache enable row level security;

comment on table public.supplier_customization_options_cache is
  'Captura semanal local do feed customizationOptions. Impede que cada lote de normalização volte a consultar o fornecedor.';
