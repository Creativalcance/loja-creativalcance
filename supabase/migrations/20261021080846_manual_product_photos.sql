begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('product-360-photos','product-360-photos',true,3000000,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Keep the existing creation RPC unchanged. This wrapper commits the entire gallery atomically.
create or replace function public.create_manual_catalog_product_with_photos(
  p_product jsonb, p_category_id uuid, p_price numeric, p_stock integer,
  p_image_url text default null, p_image_urls text[] default '{}'::text[]
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_id uuid; v_url text; v_position integer := 0;
begin
  if p_image_urls is null or cardinality(p_image_urls) > 10 then
    raise exception using errcode='22023', message='manual_product_photos_invalid';
  end if;
  foreach v_url in array p_image_urls loop
    if v_url is null or v_url !~ '^https://[^/]+/storage/v1/object/public/product-360-photos/[a-f0-9-]{36}/[a-f0-9-]{36}\.(jpg|png|webp)$' then
      raise exception using errcode='22023', message='manual_product_photo_url_invalid';
    end if;
  end loop;
  v_id := public.create_manual_catalog_product(p_product,p_category_id,p_price,p_stock,
    case when cardinality(p_image_urls)>0 then null else p_image_url end);
  foreach v_url in array p_image_urls loop
    insert into public.product_images(product_id,external_url,storage_url,alt_text,sort_order,image_type,is_primary)
    values(v_id,v_url,v_url,p_product->>'name',v_position,case when v_position=0 then 'main' else 'gallery' end,v_position=0);
    v_position := v_position+1;
  end loop;
  return v_id;
end;
$$;
revoke all on function public.create_manual_catalog_product_with_photos(jsonb,uuid,numeric,integer,text,text[]) from public,anon,authenticated;
grant execute on function public.create_manual_catalog_product_with_photos(jsonb,uuid,numeric,integer,text,text[]) to service_role;
commit;
