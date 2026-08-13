create or replace function public.reconcile_stricker_commercial_availability(
  target_supplier_id uuid,
  target_country_code text default 'PT'
)
returns table (
  products_total bigint,
  products_purchasable bigint,
  products_coming_soon bigint,
  products_unavailable bigint,
  products_restricted bigint,
  products_canceled bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with target_products as materialized (
    select p.id, p.supplier_id, p.external_id, p.sku
    from public.products p
    where p.supplier_id = target_supplier_id
  ),
  active_variants as materialized (
    select variant.product_id
    from public.product_variants variant
    join target_products product on product.id = variant.product_id
    where variant.is_active = true
    group by variant.product_id
  ),
  stock_totals as materialized (
    select
      stock.product_id,
      coalesce(sum(stock.available_quantity) filter (
        where stock.warehouse_code = 'PT'
      ), 0) as stock_pt,
      coalesce(sum(stock.available_quantity) filter (
        where stock.warehouse_code = 'CZ'
      ), 0) as stock_cz
    from public.product_stocks stock
    join target_products product on product.id = stock.product_id
    where stock.supplier_id = target_supplier_id
      and stock.warehouse_code in ('PT', 'CZ')
    group by stock.product_id
  ),
  future_totals as materialized (
    select future.product_id, sum(future.expected_quantity) as future_stock
    from public.product_future_stocks future
    join target_products product on product.id = future.product_id
    where future.supplier_id = target_supplier_id
      and future.warehouse_code in ('PT', 'CZ')
      and future.expected_date >= current_date
    group by future.product_id
  ),
  canceled_products as materialized (
    select product.id as product_id
    from target_products product
    join public.supplier_canceled_products canceled
      on canceled.supplier_id = product.supplier_id
     and canceled.external_product_id = product.external_id
    union
    select product.id
    from target_products product
    join public.supplier_canceled_products canceled
      on canceled.supplier_id = product.supplier_id
     and canceled.product_reference = product.external_id
    union
    select product.id
    from target_products product
    join public.supplier_canceled_products canceled
      on canceled.supplier_id = product.supplier_id
     and canceled.product_reference = product.sku
    union
    select variant.product_id
    from public.product_variants variant
    join target_products product on product.id = variant.product_id
    join public.supplier_canceled_products canceled
      on canceled.supplier_id = product.supplier_id
     and canceled.sku is not null
     and (
       canceled.sku = variant.sku
       or canceled.sku = variant.external_variant_id
     )
  ),
  restricted_products as materialized (
    select product.id as product_id
    from target_products product
    join public.supplier_restricted_products restricted
      on restricted.supplier_id = product.supplier_id
     and upper(restricted.country_code) = upper(target_country_code)
     and restricted.external_product_id = product.external_id
    union
    select product.id
    from target_products product
    join public.supplier_restricted_products restricted
      on restricted.supplier_id = product.supplier_id
     and upper(restricted.country_code) = upper(target_country_code)
     and restricted.product_reference = product.external_id
    union
    select product.id
    from target_products product
    join public.supplier_restricted_products restricted
      on restricted.supplier_id = product.supplier_id
     and upper(restricted.country_code) = upper(target_country_code)
     and restricted.product_reference = product.sku
    union
    select variant.product_id
    from public.product_variants variant
    join target_products product on product.id = variant.product_id
    join public.supplier_restricted_products restricted
      on restricted.supplier_id = product.supplier_id
     and upper(restricted.country_code) = upper(target_country_code)
     and restricted.sku is not null
     and (
       restricted.sku = variant.sku
       or restricted.sku = variant.external_variant_id
     )
  ),
  resolved as materialized (
    select
      product.id,
      canceled.product_id is not null as is_canceled,
      restricted.product_id is not null as is_restricted,
      active_variant.product_id is not null as has_active_variant,
      coalesce(stock.stock_pt, 0) as stock_pt,
      coalesce(stock.stock_cz, 0) as stock_cz,
      coalesce(future.future_stock, 0) as future_stock
    from target_products product
    left join canceled_products canceled on canceled.product_id = product.id
    left join restricted_products restricted on restricted.product_id = product.id
    left join active_variants active_variant on active_variant.product_id = product.id
    left join stock_totals stock on stock.product_id = product.id
    left join future_totals future on future.product_id = product.id
  ),
  commercial_state as materialized (
    select
      resolved.id,
      case
        when resolved.is_canceled then 'archived'
        when resolved.is_restricted then 'inactive'
        when resolved.has_active_variant
          and (resolved.stock_pt > 0 or resolved.stock_cz > 0 or resolved.future_stock > 0)
          then 'active'
        else 'inactive'
      end as resolved_status,
      case
        when resolved.is_canceled then 'canceled'
        when resolved.is_restricted then 'restricted'
        when not resolved.has_active_variant then 'unavailable'
        when resolved.stock_pt > 0 then 'in_stock_pt'
        when resolved.stock_cz > 0 then 'in_stock_cz'
        when resolved.future_stock > 0 then 'coming_soon'
        else 'unavailable'
      end as resolved_availability,
      (
        not resolved.is_canceled
        and not resolved.is_restricted
        and resolved.has_active_variant
        and (resolved.stock_pt > 0 or resolved.stock_cz > 0)
      ) as resolved_purchasable
    from resolved
  ),
  updated as (
    update public.products product
    set
      status = state.resolved_status,
      is_active = state.resolved_status = 'active',
      availability_status = state.resolved_availability,
      is_purchasable = state.resolved_purchasable,
      availability_updated_at = now()
    from commercial_state state
    where product.id = state.id
    returning product.availability_status, product.is_purchasable
  )
  select
    count(*)::bigint,
    count(*) filter (where updated.is_purchasable)::bigint,
    count(*) filter (where updated.availability_status = 'coming_soon')::bigint,
    count(*) filter (where updated.availability_status = 'unavailable')::bigint,
    count(*) filter (where updated.availability_status = 'restricted')::bigint,
    count(*) filter (where updated.availability_status = 'canceled')::bigint
  from updated;
end;
$$;

revoke execute on function public.reconcile_stricker_commercial_availability(uuid, text)
from public, anon, authenticated;

grant execute on function public.reconcile_stricker_commercial_availability(uuid, text)
to service_role;
