create index if not exists supplier_dataset_imports_cancel_requested_by_idx
on public.supplier_dataset_imports (cancel_requested_by)
where cancel_requested_by is not null;
