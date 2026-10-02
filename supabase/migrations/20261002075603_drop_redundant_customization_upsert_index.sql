-- The unique constraint already maintains an identical btree. Keeping both
-- indexes doubles this part of every option write (177 MB at incident review).
-- Refuse to wait on storefront traffic or remove a non-equivalent index.
set local lock_timeout = '1s';
set local statement_timeout = '15s';

do $$
begin
  if to_regclass('public.product_customization_options_upsert_idx') is not null
    and not exists (
      select 1
      from pg_index redundant
      join pg_index retained on retained.indrelid = redundant.indrelid
        and retained.indkey = redundant.indkey
        and retained.indclass = redundant.indclass
        and retained.indcollation = redundant.indcollation
        and retained.indoption = redundant.indoption
      where redundant.indexrelid = to_regclass('public.product_customization_options_upsert_idx')
        and retained.indexrelid = to_regclass('public.product_customization_options_product_id_variant_id_supplie_key')
        and retained.indisunique and retained.indisvalid
        and not redundant.indisunique
        and redundant.indexprs is null and retained.indexprs is null
        and redundant.indpred is null and retained.indpred is null
    ) then
    raise exception 'Equivalent unique index missing; redundant index removal aborted';
  end if;
end;
$$;

drop index if exists public.product_customization_options_upsert_idx;

-- Rollback, if ever required (outside a transaction):
-- create index concurrently product_customization_options_upsert_idx
-- on public.product_customization_options (product_id, variant_id, supplier_id, service_code);
