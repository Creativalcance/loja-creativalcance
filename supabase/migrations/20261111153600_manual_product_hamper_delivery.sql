begin;
alter table public.products
  add column shipping_profile text not null default 'standard',
  add column delivery_unit_price numeric(12,2);
alter table public.products add constraint products_manual_delivery_profile check (
  (shipping_profile='standard' and delivery_unit_price is null) or
  (shipping_profile='christmas_hamper_2026' and catalog_source='manual'
    and fulfillment_route='internal_360' and supplier_id is null
    and delivery_unit_price is not null and delivery_unit_price>0 and delivery_unit_price<=10000)
);

create or replace function public.enforce_product_minimum_order_quantity()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  new.min_order_quantity := greatest(coalesce(new.min_order_quantity,1),
    case when new.shipping_profile='christmas_hamper_2026' and new.catalog_source='manual'
      and new.fulfillment_route='internal_360' and new.supplier_id is null then 1 else 10 end);
  return new;
end;
$$;
create or replace function public.manage_manual_product(p_actor uuid,p_product_id uuid,p_action text,p_expected_updated_at timestamptz,p_data jsonb default '{}')
returns jsonb language plpgsql security invoker set search_path='' as $$
declare before_product public.products%rowtype; after_product public.products%rowtype; price_row public.product_prices%rowtype; stock_row public.product_stocks%rowtype;
 image_id uuid; category_name text; selected_category_id uuid; next_status text; quantity integer; price numeric; stock integer; old_values jsonb;
 photo jsonb; photo_url text; photo_ids uuid[] := array[]::uuid[]; photo_urls text[] := array[]::text[]; photo_position integer := 0;
begin
 if not exists(select 1 from public.profiles where id=p_actor and role='admin' and is_active) then raise exception 'Sem permissão administrativa.';end if;
 select * into before_product from public.products where id=p_product_id for update;
 if not found or before_product.catalog_source<>'manual' or before_product.fulfillment_route<>'internal_360' or before_product.supplier_id is not null then raise exception 'Só é possível gerir produtos manuais 360 nesta operação.';end if;
 if before_product.updated_at is distinct from p_expected_updated_at then raise exception 'O produto foi alterado. Atualiza a página antes de guardar.';end if;
 if p_action not in ('edit','status','delete','restore') then raise exception 'Operação inválida.';end if;
 if before_product.deleted_at is not null and p_action<>'restore' then raise exception 'Restaura o produto antes de o editar.';end if;
 if before_product.deleted_at is null and p_action='restore' then raise exception 'O produto não está eliminado.';end if;
 old_values:=jsonb_build_object('product',to_jsonb(before_product)-'supplier_payload'-'search_vector');
 if p_action='edit' then
   quantity:=(p_data->>'minimum')::integer;price:=(p_data->>'price')::numeric;stock:=(p_data->>'stock')::integer;selected_category_id:=(p_data->>'category_id')::uuid;
   if quantity is null or quantity < (case when coalesce(p_data->>'shipping_profile',before_product.shipping_profile)='christmas_hamper_2026' then 1 else 10 end) or price is null or price<=0 or price>1000000 or stock is null or stock<0 or length(trim(coalesce(p_data->>'name','')))<2 or length(trim(coalesce(p_data->>'sku','')))<1 or coalesce(p_data->>'slug','') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'Dados do produto inválidos.';end if;
   if (p_data ? 'weight' and (p_data->>'weight')::numeric is not null
       and ((p_data->>'weight')::numeric<=0 or (p_data->>'weight')::numeric>1000000))
       or length(coalesce(p_data->>'dimensions',''))>200 then raise exception 'Peso ou dimensões inválidos.';end if;
   if exists(select 1 from public.products where id<>p_product_id and lower(sku)=lower(p_data->>'sku')) then raise exception 'Já existe um produto com este SKU.';end if;
   select name into category_name from public.categories where id=selected_category_id and is_active;
   if not found then raise exception 'Seleciona uma categoria ativa.';end if;
   -- Only the simple manual base price/stock created by the 360 product flow is edited here.
   if exists(select 1 from public.product_variants where product_id=p_product_id) or (select count(*) from public.product_prices where product_id=p_product_id)>1 or (select count(*) from public.product_stocks where product_id=p_product_id)>1 then raise exception 'Este produto tem variantes ou escalões adicionais. Gere esses dados antes de usar a edição simples.';end if;
   select * into price_row from public.product_prices where product_id=p_product_id and variant_id is null and supplier_id is null for update;
   select * into stock_row from public.product_stocks where product_id=p_product_id and variant_id is null and supplier_id is null and warehouse_code='360' for update;
   if price_row.id is null or stock_row.id is null then raise exception 'Faltam o preço ou o stock base do produto.';end if;
   old_values:=old_values||jsonb_build_object('price',to_jsonb(price_row),'stock',to_jsonb(stock_row)-'raw_payload','categories',(select jsonb_agg(to_jsonb(pc)) from public.product_categories pc where product_id=p_product_id),'images',(select jsonb_agg(to_jsonb(pi)) from public.product_images pi where product_id=p_product_id and variant_id is null and supplier_id is null));
   update public.product_prices set quantity_min=quantity,manual_price=price,final_price=price,pricing_mode='manual',price_source='manual',is_manual_override=true,override_updated_at=now(),override_updated_by=p_actor,override_reason='Edição do produto manual 360',calculated_at=now() where id=price_row.id;
   update public.product_stocks set available_quantity=stock,updated_at=now() where id=stock_row.id;
   update public.product_categories set is_primary=false where product_id=p_product_id;
   insert into public.product_categories(product_id,category_id,is_primary) values(p_product_id,selected_category_id,true) on conflict(product_id,category_id) do update set is_primary=true;
   if p_data ? 'photos' then
     if jsonb_typeof(p_data->'photos') is distinct from 'array' then
       raise exception 'A seleção de fotografias é inválida.';
     end if;
     if jsonb_array_length(p_data->'photos') > 10 then
       raise exception 'Seleciona até 10 fotografias.';
     end if;
     -- The product row above is locked; gallery and product data commit together.
     update public.product_images set is_primary=false
       where product_id=p_product_id and variant_id is null and supplier_id is null
       and image_type in ('main','gallery','manual','box') and is_primary;
     for photo in select value from jsonb_array_elements(p_data->'photos') loop
       if jsonb_typeof(photo) is distinct from 'object' then
         raise exception 'A seleção de fotografias é inválida.';
       end if;
       if (select count(*) from jsonb_object_keys(photo)) <> 1 then
         raise exception 'A seleção de fotografias é inválida.';
       end if;
       image_id := null;
       photo_url := null;
       if photo ? 'id' then
         select id,coalesce(storage_url,external_url) into image_id,photo_url
           from public.product_images
           where id=(photo->>'id')::uuid and product_id=p_product_id
           and variant_id is null and supplier_id is null
           and image_type in ('main','gallery','manual','box') for update;
         if not found or image_id=any(photo_ids) then
           raise exception 'Uma fotografia já não pertence a este produto. Atualiza a página.';
         end if;
       elsif photo ? 'url' or photo ? 'externalUrl' then
         photo_url := coalesce(photo->>'url',photo->>'externalUrl');
         if photo_url is null or length(photo_url)>4000 or photo_url !~ '^https?://[^/@[:space:]]+(/|$)' then
           raise exception 'Indica um URL HTTP ou HTTPS válido para a imagem.';
         end if;
         if photo ? 'url' then
           if photo_url !~ ('^https://[^/]+/storage/v1/object/public/product-360-photos/'||p_actor::text||'/[a-f0-9-]{36}\.(jpg|png|webp)$')
             or not exists(select 1 from storage.objects where bucket_id='product-360-photos'
               and name=split_part(photo_url,'/storage/v1/object/public/product-360-photos/',2)) then
             raise exception 'Uma fotografia não corresponde a um carregamento autorizado.';
           end if;
         end if;
       else
         raise exception 'A seleção de fotografias é inválida.';
       end if;
       if photo_url=any(photo_urls) then raise exception 'Seleciona fotografias diferentes.';end if;
       if image_id is null then
         insert into public.product_images(product_id,external_url,storage_url,alt_text,sort_order,image_type,is_primary)
         values(p_product_id,photo_url,case when photo ? 'url' then photo_url else null end,p_data->>'name',photo_position,
           case when photo_position=0 then 'main' else 'gallery' end,photo_position=0)
         returning id into image_id;
       else
         update public.product_images set sort_order=photo_position,is_primary=(photo_position=0),
           image_type=case when photo_position=0 then 'main' else 'gallery' end where id=image_id;
       end if;
       photo_ids := array_append(photo_ids,image_id);
       photo_urls := array_append(photo_urls,photo_url);
       photo_position := photo_position+1;
     end loop;
     -- Remove only gallery associations omitted explicitly by the administrator.
     -- Stored files remain intact (they may still be referenced elsewhere).
     delete from public.product_images where product_id=p_product_id and variant_id is null and supplier_id is null
       and image_type in ('main','gallery','manual','box') and not(id=any(photo_ids));
   else
     -- Compatibility with already-open forms and deployments using the legacy URL field.
   select id into image_id from public.product_images where product_id=p_product_id and variant_id is null and is_primary order by sort_order,id limit 1 for update;
   if nullif(trim(p_data->>'image_url'),'') is null then
     if image_id is not null then delete from public.product_images where id=image_id;end if;
   elsif image_id is not null then
     update public.product_images set external_url=p_data->>'image_url',storage_url=null,alt_text=p_data->>'name' where id=image_id;
   else
     insert into public.product_images(product_id,external_url,alt_text,sort_order,image_type,is_primary) values(p_product_id,p_data->>'image_url',p_data->>'name',0,'main',true);
   end if;
   end if;
   next_status:=p_data->>'status';
   update public.products set
     weight=case when p_data ? 'weight' then (p_data->>'weight')::numeric else weight end,
     dimensions=case when p_data ? 'dimensions' then nullif(p_data->>'dimensions','') else dimensions end,
     shipping_profile=coalesce(p_data->>'shipping_profile',shipping_profile),
     delivery_unit_price=case when p_data ? 'delivery_unit_price' then (p_data->>'delivery_unit_price')::numeric else delivery_unit_price end,
     name=p_data->>'name',sku=p_data->>'sku',slug=p_data->>'slug',short_description=nullif(p_data->>'short_description',''),description=nullif(p_data->>'description',''),brand=nullif(p_data->>'brand',''),material=nullif(p_data->>'material',''),min_order_quantity=quantity,lead_time_days=nullif(p_data->>'lead_time_days','')::integer,seo_title=nullif(p_data->>'seo_title',''),seo_description=nullif(p_data->>'seo_description',''),type_name=category_name,is_featured=(p_data->>'featured')::boolean,featured_override=(p_data->>'featured')::boolean where id=p_product_id;
 elsif p_action='status' then next_status:=p_data->>'status';
 elsif p_action='delete' then next_status:='archived';
 else next_status:='draft';end if;
 if next_status is null or next_status not in ('active','inactive','draft','archived') then raise exception 'Estado inválido.';end if;
 select coalesce(sum(available_quantity),0) into stock from public.product_stocks where product_id=p_product_id;
 select min_order_quantity into quantity from public.products where id=p_product_id;
 update public.products set status=next_status,is_active=(next_status='active'),is_purchasable=(next_status='active' and stock>=quantity),availability_status=case when stock>=quantity then 'in_stock_pt' else 'unavailable' end,is_stockout=(stock<quantity),deleted_at=case when p_action='delete' then now() when p_action='restore' then null else deleted_at end,updated_at=now() where id=p_product_id returning * into after_product;
 insert into public.manual_product_changes(product_id,actor_id,action,previous_values,new_values)
 values(p_product_id,p_actor,p_action,old_values,jsonb_build_object('product',to_jsonb(after_product)-'supplier_payload'-'search_vector','edit',case when p_action='edit' then p_data else '{}'::jsonb end));
 return jsonb_build_object('id',p_product_id,'old_slug',before_product.slug,'slug',after_product.slug,'updated_at',after_product.updated_at);
end $$;
revoke all on function public.manage_manual_product(uuid,uuid,text,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function public.manage_manual_product(uuid,uuid,text,timestamptz,jsonb) to service_role;


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
  v_product.shipping_profile := coalesce(v_product.shipping_profile,'standard');
  if v_product.min_order_quantity is null or v_product.min_order_quantity <
      (case when v_product.shipping_profile='christmas_hamper_2026' then 1 else 10 end)
    or (v_product.weight is not null and (v_product.weight<=0 or v_product.weight>1000000))
    or length(coalesce(v_product.dimensions,''))>200 then
    raise exception 'Quantidade mínima, peso ou dimensões inválidos.';
  end if;
  insert into public.products (
    supplier_id, external_id, sku, name, slug, short_description, description,
    brand, material, type_name, min_order_quantity, lead_time_days, seo_title,
    seo_description, status, is_active, is_featured, is_customizable,
    availability_status, is_purchasable, supplier_payload, catalog_source,
    fulfillment_route,weight,dimensions,shipping_profile,delivery_unit_price
  ) values (
    null, null, v_product.sku, v_product.name, v_product.slug,
    v_product.short_description, v_product.description, v_product.brand,
    v_product.material, v_category_name, v_product.min_order_quantity,
    v_product.lead_time_days, v_product.seo_title, v_product.seo_description,
    v_product.status, v_product.is_active, v_product.is_featured, false,
    v_product.availability_status, v_product.is_purchasable, '{}'::jsonb,
    'manual', 'internal_360',v_product.weight,v_product.dimensions,v_product.shipping_profile,v_product.delivery_unit_price
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
    ) values (v_id, null, null, trim(p_image_url), v_product.name, 0, 'main', true);
  end if;
  return v_id;
end;
$$;

revoke all on function public.create_manual_catalog_product(jsonb, uuid, numeric, integer, text) from public;
grant execute on function public.create_manual_catalog_product(jsonb, uuid, numeric, integer, text) to service_role;


commit;
