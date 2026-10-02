set local lock_timeout = '1s';
set local statement_timeout = '15s';

-- One bounded operation replaces repeated HTTP reads and writes. Unchanged
-- rows retain their updated_at and avoid heap/index updates.
create function public.upsert_customization_generation_batch(p_supplier_id uuid, p_rows jsonb)
returns integer language plpgsql security invoker set search_path = ''
as $$
declare changed_count integer;
begin
  if jsonb_typeof(p_rows) is distinct from 'array' then
    raise exception 'Expected an array of customization options';
  end if;
  if jsonb_array_length(p_rows) > 100 then
    raise exception 'Customization batch exceeds 100 options';
  end if;
  if exists (
    select 1 from jsonb_populate_recordset(null::public.product_customization_options, p_rows) r
    where r.supplier_id is distinct from p_supplier_id
  ) then raise exception 'Customization supplier mismatch'; end if;

  with changed as (
    insert into public.product_customization_options as target (
      product_id, variant_id, supplier_id, component_id, location_id, printing_price_table_id, service_code, customization_type_code, customization_type_name, table_code, table_code_option, component_code, component_name, location_code, location_name, logo_area, logo_width, logo_height, max_colors, max_printing_area_mm, table_max_area_cm, table_max_area_cm2, price_by_color, price_by_area, handling_cost, supplier_price, final_price, currency, is_default, is_active, printing_lines_image_url, printing_lines_storage_url, raw_payload
    )
    select r.product_id, r.variant_id, r.supplier_id, r.component_id, r.location_id, r.printing_price_table_id, r.service_code, r.customization_type_code, r.customization_type_name, r.table_code, r.table_code_option, r.component_code, r.component_name, r.location_code, r.location_name, r.logo_area, r.logo_width, r.logo_height, r.max_colors, r.max_printing_area_mm, r.table_max_area_cm, r.table_max_area_cm2, r.price_by_color, r.price_by_area, r.handling_cost, r.supplier_price, r.final_price, r.currency, r.is_default, r.is_active, r.printing_lines_image_url, r.printing_lines_storage_url, r.raw_payload
    from jsonb_populate_recordset(null::public.product_customization_options, p_rows) r
    on conflict (product_id, variant_id, supplier_id, service_code) do update set
      component_id = excluded.component_id,
      location_id = excluded.location_id,
      printing_price_table_id = excluded.printing_price_table_id,
      customization_type_code = excluded.customization_type_code,
      customization_type_name = excluded.customization_type_name,
      table_code = excluded.table_code,
      table_code_option = excluded.table_code_option,
      component_code = excluded.component_code,
      component_name = excluded.component_name,
      location_code = excluded.location_code,
      location_name = excluded.location_name,
      logo_area = excluded.logo_area,
      logo_width = excluded.logo_width,
      logo_height = excluded.logo_height,
      max_colors = excluded.max_colors,
      max_printing_area_mm = excluded.max_printing_area_mm,
      table_max_area_cm = excluded.table_max_area_cm,
      table_max_area_cm2 = excluded.table_max_area_cm2,
      price_by_color = excluded.price_by_color,
      price_by_area = excluded.price_by_area,
      handling_cost = excluded.handling_cost,
      supplier_price = excluded.supplier_price,
      final_price = excluded.final_price,
      currency = excluded.currency,
      is_default = excluded.is_default,
      is_active = excluded.is_active,
      printing_lines_image_url = excluded.printing_lines_image_url,
      printing_lines_storage_url = excluded.printing_lines_storage_url,
      raw_payload = excluded.raw_payload
    where row(target.component_id, target.location_id, target.printing_price_table_id, target.customization_type_code, target.customization_type_name, target.table_code, target.table_code_option, target.component_code, target.component_name, target.location_code, target.location_name, target.logo_area, target.logo_width, target.logo_height, target.max_colors, target.max_printing_area_mm, target.table_max_area_cm, target.table_max_area_cm2, target.price_by_color, target.price_by_area, target.handling_cost, target.supplier_price, target.final_price, target.currency, target.is_default, target.is_active, target.printing_lines_image_url, target.printing_lines_storage_url, target.raw_payload)
      is distinct from row(excluded.component_id, excluded.location_id, excluded.printing_price_table_id, excluded.customization_type_code, excluded.customization_type_name, excluded.table_code, excluded.table_code_option, excluded.component_code, excluded.component_name, excluded.location_code, excluded.location_name, excluded.logo_area, excluded.logo_width, excluded.logo_height, excluded.max_colors, excluded.max_printing_area_mm, excluded.table_max_area_cm, excluded.table_max_area_cm2, excluded.price_by_color, excluded.price_by_area, excluded.handling_cost, excluded.supplier_price, excluded.final_price, excluded.currency, excluded.is_default, excluded.is_active, excluded.printing_lines_image_url, excluded.printing_lines_storage_url, excluded.raw_payload)
    returning 1
  )
  select count(*) into changed_count from changed;
  return changed_count;
end;
$$;
revoke all on function public.upsert_customization_generation_batch(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.upsert_customization_generation_batch(uuid,jsonb) to service_role;

-- Rollback: deploy the previous application, then drop this function.
