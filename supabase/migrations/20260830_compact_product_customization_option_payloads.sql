create or replace function public.compact_product_customization_option_raw_payload()
returns trigger
language plpgsql
as $$
begin
  -- product_customization_options is the normalized/materialized table used by
  -- the storefront. Once a supplier printing price table has been resolved,
  -- keeping the full Stricker payload in every materialized option duplicates
  -- several GB of data already available in normalized columns and in the
  -- supplier customization cache.
  --
  -- Preserve the raw payload only for unresolved price-table exceptions so the
  -- supplier data remains available for diagnosis/recovery.
  if new.printing_price_table_id is not null then
    new.raw_payload := '{}'::jsonb;
  end if;

  return new;
end;
$$;

drop trigger if exists product_customization_options_compact_raw_payload
on public.product_customization_options;

create trigger product_customization_options_compact_raw_payload
before insert or update on public.product_customization_options
for each row
execute function public.compact_product_customization_option_raw_payload();
