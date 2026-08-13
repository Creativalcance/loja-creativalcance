create table if not exists public.supplier_printing_slas (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  table_code_option text not null,
  warehouse_code text not null check (warehouse_code in ('PT', 'CZ')),
  quantity_min integer not null check (quantity_min > 0),
  quantity_max integer,
  production_days integer not null check (production_days > 0),
  is_available boolean not null default true,
  raw_payload jsonb not null default '{}'::jsonb,
  source_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (supplier_id, table_code_option, warehouse_code, quantity_min)
);

create index if not exists supplier_printing_slas_lookup_idx
on public.supplier_printing_slas
  (supplier_id, table_code_option, warehouse_code, quantity_min);

alter table public.supplier_printing_slas enable row level security;

revoke all on table public.supplier_printing_slas from public, anon, authenticated;
grant select, insert, update, delete on table public.supplier_printing_slas to service_role;

comment on table public.supplier_printing_slas is
'SLA de produção recebido do dataset printingslas da Stricker. Days=99 é guardado como indisponível.';

create table if not exists public.supplier_fulfillment_settings (
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  warehouse_code text not null check (warehouse_code in ('PT', 'CZ')),
  preparation_business_days integer not null check (preparation_business_days >= 0),
  transport_business_days integer not null check (transport_business_days >= 0),
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (supplier_id, warehouse_code)
);

alter table public.supplier_fulfillment_settings enable row level security;

revoke all on table public.supplier_fulfillment_settings from public, anon, authenticated;
grant select, insert, update, delete on table public.supplier_fulfillment_settings to service_role;

insert into public.supplier_fulfillment_settings (
  supplier_id,
  warehouse_code,
  preparation_business_days,
  transport_business_days
)
select id, 'PT', 1, 2
from public.suppliers
where slug = 'stricker'
on conflict (supplier_id, warehouse_code) do update
set preparation_business_days = excluded.preparation_business_days,
    transport_business_days = excluded.transport_business_days,
    is_active = true,
    updated_at = now();

insert into public.supplier_fulfillment_settings (
  supplier_id,
  warehouse_code,
  preparation_business_days,
  transport_business_days
)
select id, 'CZ', 1, 4
from public.suppliers
where slug = 'stricker'
on conflict (supplier_id, warehouse_code) do update
set preparation_business_days = excluded.preparation_business_days,
    transport_business_days = excluded.transport_business_days,
    is_active = true,
    updated_at = now();
