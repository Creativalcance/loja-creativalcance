set local lock_timeout = '1s';
set local statement_timeout = '15s';

-- Worker-only evidence of a fully generated location. Existing options and
-- order references are retained; absent signatures always mean "reprocess".
create table public.customization_generation_state (
  location_id uuid not null references public.product_customization_locations(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  language text not null,
  input_hash text not null check (length(input_hash) = 64),
  options_count integer not null check (options_count >= 0),
  generated_at timestamptz not null default now(),
  primary key (supplier_id, language, location_id)
);
alter table public.customization_generation_state enable row level security;
revoke all on public.customization_generation_state from public, anon, authenticated;
grant all on public.customization_generation_state to service_role;

-- Preserve the exact first-tier selection used by buildPriceTableMaps while
-- returning each shared table once, instead of all its quantity tiers twice.
create function public.customization_generation_prices(p_supplier_id uuid, p_table_codes text[])
returns setof public.printing_price_tables
language sql stable security invoker set search_path = ''
as $$
  with candidates as materialized (
    select t.* from public.printing_price_tables t
    where t.supplier_id = p_supplier_id and t.is_active = true
      and (t.table_code = any(p_table_codes) or t.table_code_option = any(p_table_codes))
  ), selected as (
    (select distinct on (table_code) id from candidates
      order by table_code, quantity_min, id)
    union
    (select distinct on (table_code_option) id from candidates
      where table_code_option is not null order by table_code_option, quantity_min, id)
  )
  select c.* from candidates c join selected s using (id)
  order by c.quantity_min, c.id;
$$;
revoke all on function public.customization_generation_prices(uuid,text[]) from public, anon, authenticated;
grant execute on function public.customization_generation_prices(uuid,text[]) to service_role;

-- A cheap catalogue-wide guard can skip an entirely unchanged subsequent
-- cycle. Mutable input timestamps detect changes during generation; source
-- last_seen_at is deliberately excluded because a fresh capture changes it.
create function public.customization_generation_catalog_hash(p_supplier_id uuid, p_language text, p_captured_at timestamptz)
returns text language sql stable security invoker set search_path = ''
as $$
 select md5(jsonb_build_array(
   (select md5(string_agg(concat_ws('|',p.id,p.external_id,p.updated_at),',' order by p.id))
      from public.products p where p.supplier_id=p_supplier_id),
   (select md5(string_agg(concat_ws('|',v.id,v.product_id,v.updated_at),',' order by v.id))
      from public.product_variants v where v.supplier_id=p_supplier_id),
   (select md5(string_agg(concat_ws('|',l.id,l.updated_at),',' order by l.id))
      from public.product_customization_locations l where l.supplier_id=p_supplier_id and l.variant_id is not null),
   (select md5(string_agg(concat_ws('|',c.id,c.updated_at),',' order by c.id))
      from public.product_customization_components c where c.supplier_id=p_supplier_id),
   (select md5(string_agg(concat_ws('|',t.id,t.updated_at),',' order by t.id))
      from public.printing_price_tables t where t.supplier_id=p_supplier_id),
   (select md5(string_agg(concat_ws('|',s.service_code,s.payload_hash),',' order by s.service_code))
      from public.supplier_customization_options_cache s
      where s.supplier_id=p_supplier_id and s.language=p_language and s.last_seen_at=p_captured_at)
 )::text);
$$;
revoke all on function public.customization_generation_catalog_hash(uuid,text,timestamptz) from public, anon, authenticated;
grant execute on function public.customization_generation_catalog_hash(uuid,text,timestamptz) to service_role;

-- Rollback: deploy the previous worker first, then drop these two functions
-- and customization_generation_state. No product or order data is removed.
