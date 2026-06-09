create table if not exists public.supplier_sessions (
  id uuid primary key default gen_random_uuid(),

  supplier_id uuid not null references public.suppliers(id) on delete cascade,

  token text not null,

  status text not null default 'active'
    check (status in ('active', 'invalid', 'closed', 'expired')),

  expires_at timestamptz,
  last_validated_at timestamptz,

  raw_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supplier_dataset_imports (
  id uuid primary key default gen_random_uuid(),

  supplier_id uuid not null references public.suppliers(id) on delete cascade,

  dataset_name text not null,
  language text,
  country text,
  extension text not null default 'json',

  status text not null default 'pending'
    check (status in ('pending', 'running', 'success', 'partial_success', 'failed')),

  records_received integer not null default 0,
  records_imported integer not null default 0,
  records_failed integer not null default 0,

  source_url text,
  payload_hash text,
  raw_payload jsonb,
  errors jsonb not null default '[]'::jsonb,

  started_at timestamptz,
  finished_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supplier_colors (
  id uuid primary key default gen_random_uuid(),

  supplier_id uuid not null references public.suppliers(id) on delete cascade,

  external_id text not null,
  code text not null,
  name text not null,
  hex_code text,

  language text not null default 'PT',

  is_active boolean not null default true,

  raw_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (supplier_id, external_id, language)
);

create index if not exists supplier_sessions_supplier_id_idx
on public.supplier_sessions(supplier_id);

create index if not exists supplier_sessions_status_idx
on public.supplier_sessions(status);

create index if not exists supplier_dataset_imports_supplier_id_idx
on public.supplier_dataset_imports(supplier_id);

create index if not exists supplier_dataset_imports_dataset_name_idx
on public.supplier_dataset_imports(dataset_name);

create index if not exists supplier_dataset_imports_status_idx
on public.supplier_dataset_imports(status);

create index if not exists supplier_colors_supplier_id_idx
on public.supplier_colors(supplier_id);

create index if not exists supplier_colors_code_idx
on public.supplier_colors(code);

create index if not exists supplier_colors_language_idx
on public.supplier_colors(language);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists supplier_sessions_set_updated_at on public.supplier_sessions;
create trigger supplier_sessions_set_updated_at
before update on public.supplier_sessions
for each row
execute function public.set_updated_at();

drop trigger if exists supplier_dataset_imports_set_updated_at on public.supplier_dataset_imports;
create trigger supplier_dataset_imports_set_updated_at
before update on public.supplier_dataset_imports
for each row
execute function public.set_updated_at();

drop trigger if exists supplier_colors_set_updated_at on public.supplier_colors;
create trigger supplier_colors_set_updated_at
before update on public.supplier_colors
for each row
execute function public.set_updated_at();

alter table public.supplier_sessions enable row level security;
alter table public.supplier_dataset_imports enable row level security;
alter table public.supplier_colors enable row level security;

drop policy if exists "Admins can manage supplier sessions" on public.supplier_sessions;
create policy "Admins can manage supplier sessions"
on public.supplier_sessions
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'sales')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'sales')
  )
);

drop policy if exists "Admins can manage supplier dataset imports" on public.supplier_dataset_imports;
create policy "Admins can manage supplier dataset imports"
on public.supplier_dataset_imports
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'sales')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'sales')
  )
);

drop policy if exists "Public can read active supplier colors" on public.supplier_colors;
create policy "Public can read active supplier colors"
on public.supplier_colors
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Admins can manage supplier colors" on public.supplier_colors;
create policy "Admins can manage supplier colors"
on public.supplier_colors
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'sales')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'sales')
  )
);