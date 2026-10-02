set local lock_timeout = '1s';
set local statement_timeout = '15s';

-- Read the active identifiers once through the covering index. Only stale
-- rows reach the UPDATE; valid rows and all historical references remain.
create function public.reconcile_customization_generation_batch(
  p_supplier_id uuid, p_allowed_services jsonb, p_location_services jsonb
) returns integer language plpgsql security invoker set search_path = ''
as $$
declare
  variant_ids uuid[];
  changed_count integer;
begin
  if p_supplier_id is null
    or jsonb_typeof(p_allowed_services) is distinct from 'object'
    or jsonb_typeof(p_location_services) is distinct from 'object' then
    raise exception 'Expected supplier and service maps';
  end if;
  variant_ids := array(select key::uuid from jsonb_each(p_allowed_services));
  if cardinality(variant_ids) > 100
    or (select count(*) from jsonb_each(p_location_services)) > 1000 then
    raise exception 'Customization reconciliation batch exceeds its bounds';
  end if;
  if exists (
    select 1 from jsonb_each(p_allowed_services)
    where jsonb_typeof(value) is distinct from 'array'
  ) or exists (
    select 1 from jsonb_each(p_location_services)
    where jsonb_typeof(value) is distinct from 'array'
  ) then raise exception 'Expected arrays of service codes'; end if;

  with candidates as materialized (
    select id, variant_id, location_id, service_code
    from public.product_customization_options
    where supplier_id = p_supplier_id and variant_id = any(variant_ids)
      and is_active = true
  ), stale as materialized (
    select id from candidates c
    where not ((p_allowed_services -> c.variant_id::text) ? c.service_code)
      or (p_location_services ? c.location_id::text
        and not ((p_location_services -> c.location_id::text) ? c.service_code))
  ), changed as (
    update public.product_customization_options o set is_active = false
    from stale s where o.id = s.id and o.supplier_id = p_supplier_id and o.is_active = true
    returning o.id
  ) select count(*) into changed_count from changed;
  return changed_count;
end;
$$;
revoke all on function public.reconcile_customization_generation_batch(uuid,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.reconcile_customization_generation_batch(uuid,jsonb,jsonb) to service_role;

-- Rollback the application before dropping the worker-only function.
