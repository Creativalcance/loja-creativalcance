create table if not exists public.supplier_manual_import_files (
  id uuid primary key default gen_random_uuid(),

  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  dataset_import_id uuid references public.supplier_dataset_imports(id) on delete set null,

  dataset_name text not null,
  original_filename text not null,
  storage_bucket text not null default 'supplier-imports',
  storage_path text not null,

  mime_type text,
  file_size_bytes bigint not null default 0,
  file_extension text not null,

  parser_status text not null default 'uploaded'
    check (parser_status in ('uploaded', 'parsed', 'failed')),

  records_detected integer not null default 0,
  preview_payload jsonb not null default '{}'::jsonb,
  parser_errors jsonb not null default '[]'::jsonb,

  created_by uuid references auth.users(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists supplier_manual_import_files_supplier_id_idx
on public.supplier_manual_import_files(supplier_id);

create index if not exists supplier_manual_import_files_dataset_name_idx
on public.supplier_manual_import_files(dataset_name);

create index if not exists supplier_manual_import_files_parser_status_idx
on public.supplier_manual_import_files(parser_status);

drop trigger if exists supplier_manual_import_files_set_updated_at on public.supplier_manual_import_files;
create trigger supplier_manual_import_files_set_updated_at
before update on public.supplier_manual_import_files
for each row
execute function public.set_updated_at();

alter table public.supplier_manual_import_files enable row level security;

drop policy if exists "Admins can manage supplier manual import files" on public.supplier_manual_import_files;
create policy "Admins can manage supplier manual import files"
on public.supplier_manual_import_files
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