create or replace function public.apply_bulk_price_margin(
  target_batch_id uuid,
  target_type text,
  target_margin_percentage numeric
)
returns integer
language plpgsql
security definer
set search_path = public
set statement_timeout = '60s'
as $$
declare
  changed_rows integer := 0;
begin
  if target_type not in ('products', 'personalizations') then
    raise exception 'Tipo de alteração global inválido.';
  end if;

  if target_margin_percentage < 0 or target_margin_percentage >= 95 then
    raise exception 'A margem deve estar entre 0 e 94,999%%.';
  end if;

  if not exists (
    select 1
    from public.bulk_price_change_batches as batch
    where batch.id = target_batch_id
      and batch.target_type = apply_bulk_price_margin.target_type
      and batch.status = 'applied'
  ) then
    raise exception 'A alteração global não foi encontrada ou já não está ativa.';
  end if;

  if target_type = 'products' then
    insert into public.bulk_price_change_items (
      batch_id,
      entity_type,
      entity_id,
      previous_values
    )
    select
      target_batch_id,
      'product_price',
      id,
      jsonb_build_object(
        'pricing_mode', pricing_mode,
        'margin_percentage', margin_percentage,
        'margin_rate', margin_rate,
        'markup_percentage', markup_percentage,
        'fixed_markup', fixed_markup,
        'manual_price', manual_price,
        'final_price', final_price,
        'base_price', base_price,
        'is_manual_override', is_manual_override,
        'override_reason', override_reason
      )
    from public.product_prices;

    update public.product_prices as price
    set
      pricing_mode = 'margin',
      margin_percentage = target_margin_percentage,
      margin_rate = target_margin_percentage / 100,
      markup_percentage = null,
      fixed_markup = null,
      manual_price = null,
      base_price = supplier_price,
      final_price = ceil(
        supplier_price / (1 - target_margin_percentage / 100) * 100
      ) / 100,
      is_manual_override = true,
      override_reason = 'Margem global aplicada pelo administrador',
      override_updated_at = now()
    where price.id is not null;
  else
    insert into public.bulk_price_change_items (
      batch_id,
      entity_type,
      entity_id,
      previous_values
    )
    select
      target_batch_id,
      'printing_price',
      id,
      jsonb_build_object(
        'pricing_mode', pricing_mode,
        'margin_percentage', margin_percentage,
        'margin_rate', margin_rate,
        'markup_percentage', markup_percentage,
        'fixed_markup', fixed_markup,
        'manual_price', manual_price,
        'final_price', final_price,
        'base_price', base_price,
        'is_manual_override', is_manual_override,
        'override_reason', override_reason
      )
    from public.printing_price_tables
    where is_active = true;

    update public.printing_price_tables
    set
      pricing_mode = 'margin',
      margin_percentage = target_margin_percentage,
      margin_rate = target_margin_percentage / 100,
      markup_percentage = null,
      fixed_markup = null,
      manual_price = null,
      base_price = supplier_price,
      final_price = ceil(
        supplier_price / (1 - target_margin_percentage / 100) * 100
      ) / 100,
      is_manual_override = true,
      override_reason = 'Margem global aplicada pelo administrador',
      override_updated_at = now()
    where is_active = true;
  end if;

  get diagnostics changed_rows = row_count;

  update public.bulk_price_change_batches
  set affected_rows = changed_rows
  where id = target_batch_id;

  return changed_rows;
end;
$$;

revoke execute on function public.apply_bulk_price_margin(uuid, text, numeric)
from public, anon, authenticated;

grant execute on function public.apply_bulk_price_margin(uuid, text, numeric)
to service_role;

update public.pricing_rules
set
  margin_rate = case price_type
    when 'product' then 0.35
    when 'personalization' then 0.30
    when 'setup' then 0.30
    else margin_rate
  end,
  markup_rate = null,
  rounding_mode = 'ceil_01',
  updated_at = now()
where scope = 'global'
  and is_active = true
  and price_type in ('product', 'personalization', 'setup');

do $$
declare
  product_batch_id uuid;
  personalization_batch_id uuid;
begin
  insert into public.bulk_price_change_batches (
    target_type,
    margin_percentage
  )
  values ('products', 35)
  returning id into product_batch_id;

  perform public.apply_bulk_price_margin(
    product_batch_id,
    'products',
    35
  );

  insert into public.bulk_price_change_batches (
    target_type,
    margin_percentage
  )
  values ('personalizations', 30)
  returning id into personalization_batch_id;

  perform public.apply_bulk_price_margin(
    personalization_batch_id,
    'personalizations',
    30
  );
end;
$$;
