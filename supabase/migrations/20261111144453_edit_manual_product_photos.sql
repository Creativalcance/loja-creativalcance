begin;
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
   if quantity is null or quantity<10 or price is null or price<=0 or price>1000000 or stock is null or stock<0 or length(trim(coalesce(p_data->>'name','')))<2 or length(trim(coalesce(p_data->>'sku','')))<1 or coalesce(p_data->>'slug','') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'Dados do produto inválidos.';end if;
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
   update public.products set name=p_data->>'name',sku=p_data->>'sku',slug=p_data->>'slug',short_description=nullif(p_data->>'short_description',''),description=nullif(p_data->>'description',''),brand=nullif(p_data->>'brand',''),material=nullif(p_data->>'material',''),min_order_quantity=quantity,lead_time_days=nullif(p_data->>'lead_time_days','')::integer,seo_title=nullif(p_data->>'seo_title',''),seo_description=nullif(p_data->>'seo_description',''),type_name=category_name,is_featured=(p_data->>'featured')::boolean,featured_override=(p_data->>'featured')::boolean where id=p_product_id;
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


commit;
