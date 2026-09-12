create or replace function public.create_manual_catalog_product(
  p_product jsonb, p_category_id uuid, p_price numeric, p_stock integer,
  p_image_url text default null
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_product public.products%rowtype; v_id uuid; v_category_name text;
begin
  if p_product ->> 'catalog_source' <> 'manual'
     or p_product ->> 'fulfillment_route' <> 'internal_360'
     or p_price <= 0 or p_stock < 1 then
    raise exception using errcode = '22023', message = 'manual_product_payload_invalid';
  end if;
  select c.name into v_category_name from public.categories c
    where c.id = p_category_id and c.is_active;
  if v_category_name is null then
    raise exception using errcode = '23503', message = 'manual_product_category_invalid';
  end if;
  v_product := jsonb_populate_record(null::public.products, p_product);
  insert into public.products (
    supplier_id, external_id, sku, name, slug, short_description, description,
    brand, material, type_name, min_order_quantity, lead_time_days, seo_title,
    seo_description, status, is_active, is_featured, is_customizable,
    availability_status, is_purchasable, supplier_payload, catalog_source,
    fulfillment_route
  ) values (
    null, null, v_product.sku, v_product.name, v_product.slug,
    v_product.short_description, v_product.description, v_product.brand,
    v_product.material, v_category_name, v_product.min_order_quantity,
    v_product.lead_time_days, v_product.seo_title, v_product.seo_description,
    v_product.status, v_product.is_active, v_product.is_featured, false,
    v_product.availability_status, v_product.is_purchasable, '{}'::jsonb,
    'manual', 'internal_360'
  ) returning id into v_id;
  insert into public.product_categories(product_id, category_id, is_primary)
    values (v_id, p_category_id, true);
  insert into public.product_prices(
    product_id, variant_id, supplier_id, currency, quantity_min, quantity_max,
    supplier_price, base_price, margin_percentage, final_price, catalog_price,
    your_price, price_source, pricing_mode, manual_price, is_manual_override
  ) values (
    v_id, null, null, 'EUR', v_product.min_order_quantity, null,
    p_price, p_price, 0, p_price, p_price, p_price, 'manual', 'manual', p_price, true
  );
  insert into public.product_stocks(
    product_id, variant_id, supplier_id, warehouse_code, available_quantity,
    reserved_quantity, incoming_quantity, stock_scope, raw_payload
  ) values (v_id, null, null, '360', p_stock, 0, 0, 'global', '{}'::jsonb);
  if nullif(trim(p_image_url), '') is not null then
    insert into public.product_images(
      product_id, variant_id, supplier_id, external_url, alt_text,
      sort_order, image_type, is_primary
    ) values (v_id, null, null, trim(p_image_url), v_product.name, 0, 'primary', true);
  end if;
  return v_id;
end;
$$;

revoke all on function public.create_manual_catalog_product(jsonb, uuid, numeric, integer, text) from public;
grant execute on function public.create_manual_catalog_product(jsonb, uuid, numeric, integer, text) to service_role;
