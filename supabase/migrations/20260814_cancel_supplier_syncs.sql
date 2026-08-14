alter table public.supplier_dataset_imports
add column if not exists cancel_requested_at timestamptz,
add column if not exists cancel_requested_by uuid references auth.users(id) on delete set null;

alter table public.supplier_dataset_imports
drop constraint if exists supplier_dataset_imports_status_check;

alter table public.supplier_dataset_imports
add constraint supplier_dataset_imports_status_check
check (status in ('pending', 'running', 'success', 'partial_success', 'failed', 'canceled'));

create index if not exists supplier_dataset_imports_running_idx
on public.supplier_dataset_imports (started_at desc)
where status = 'running';
