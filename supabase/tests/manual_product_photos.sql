-- Run after the migration. Fixtures and Storage metadata are rolled back.
begin;
select set_config('request.jwt.claims','{}',true);
do $$
declare
 actor uuid:=gen_random_uuid(); category_id uuid:=gen_random_uuid();
 p uuid; other_product uuid; supplier_product uuid; first_image uuid; second_image uuid; foreign_image uuid;
 version timestamptz; payload jsonb; selection jsonb; snapshot jsonb; rejected boolean;
 file_path text; upload_url text; uploaded_id uuid;
begin
 insert into auth.users(id,email) values(actor,actor::text||'@example.invalid');
 update public.profiles set role='admin',is_active=true where id=actor;
 insert into public.categories(id,name,slug,catalog_source) values(category_id,'Photo test',category_id::text,'manual');
 payload:=jsonb_build_object('sku','PHOTO-'||actor,'name','Photo test','slug','photo-test-'||actor,
   'catalog_source','manual','fulfillment_route','internal_360','min_order_quantity',10,
   'status','draft','is_active',false,'is_featured',false,'is_purchasable',false,'availability_status','in_stock_pt');
 p:=public.create_manual_catalog_product(payload,category_id,2,100,'https://example.invalid/old.png');
 other_product:=public.create_manual_catalog_product(payload||jsonb_build_object('sku','OTHER-'||actor,'slug','other-'||actor),category_id,2,100,'https://example.invalid/other.png');
 insert into public.products(sku,name,slug,catalog_source,fulfillment_route)
   values('SUP-'||actor,'Supplier fixture','supplier-'||actor,'supplier_sync','supplier_api') returning id into supplier_product;
 select id into first_image from public.product_images where product_id=p;
 select id into foreign_image from public.product_images where product_id=other_product;
 insert into public.product_images(product_id,external_url,storage_url,sort_order,image_type,is_primary)
   values(p,'https://example.invalid/second.png','https://example.invalid/stored-second.png',1,'gallery',false) returning id into second_image;
 file_path:=actor::text||'/'||gen_random_uuid()::text||'.png';
 upload_url:='https://example.supabase.co/storage/v1/object/public/product-360-photos/'||file_path;
 insert into storage.objects(bucket_id,name) values('product-360-photos',file_path);
 payload:=jsonb_build_object('name','Photo test updated','sku','PHOTO-'||actor,'slug','photo-test-'||actor,
   'category_id',category_id,'price',2,'minimum',10,'stock',100,'status','draft','featured',false);
 execute 'set local role service_role';
 select updated_at into version from public.products where id=p;
 selection:=jsonb_build_array(jsonb_build_object('id',second_image),jsonb_build_object('id',first_image),jsonb_build_object('url',upload_url));
 perform public.manage_manual_product(actor,p,'edit',version,payload||jsonb_build_object('photos',selection));
 assert (select count(*)=3 from public.product_images where product_id=p),'Gallery was lost';
 assert (select count(*)=1 from public.product_images where product_id=p and is_primary),'Expected one featured image';
 assert (select is_primary and sort_order=0 and storage_url='https://example.invalid/stored-second.png' from public.product_images where id=second_image),'Featured selection or original storage URL lost';
 assert (select not is_primary and sort_order=1 and external_url='https://example.invalid/old.png' from public.product_images where id=first_image),'Old image overwritten';
 select id into uploaded_id from public.product_images where product_id=p and storage_url=upload_url;
 assert uploaded_id is not null,'Uploaded photo not saved';
 assert (select jsonb_array_length(previous_values->'images')=2 from public.manual_product_changes where product_id=p),'Gallery audit missing';

 -- A later edit keeps every photo and allows a newly uploaded photo to become featured.
 select updated_at into version from public.products where id=p;
 selection:=jsonb_build_array(jsonb_build_object('id',uploaded_id),jsonb_build_object('id',second_image),jsonb_build_object('id',first_image));
 perform public.manage_manual_product(actor,p,'edit',version,payload||jsonb_build_object('photos',selection));
 assert (select is_primary and sort_order=0 from public.product_images where id=uploaded_id),'New upload cannot be featured';
 assert (select count(*)=3 from public.product_images where product_id=p),'Repeated save lost photos';
 select jsonb_agg(to_jsonb(i) order by id) into snapshot from public.product_images i where product_id=p;
 select updated_at into version from public.products where id=p;
 for selection in select value from jsonb_array_elements(jsonb_build_array(
   jsonb_build_array(jsonb_build_object('id',foreign_image)),
   jsonb_build_array(jsonb_build_object('id',first_image),jsonb_build_object('id',first_image)),
   jsonb_build_array(jsonb_build_object('externalUrl','javascript:alert(1)')),
   jsonb_build_array(jsonb_build_object('url',replace(upload_url,actor::text,gen_random_uuid()::text))),
   jsonb_build_array(jsonb_build_object('url',replace(upload_url,'.png','-missing.png'))),
   'null'::jsonb, '{}'::jsonb
 )) loop
   rejected:=false;
   begin perform public.manage_manual_product(actor,p,'edit',version,payload||jsonb_build_object('photos',selection));
   exception when raise_exception then rejected:=true;end;
   assert rejected,'Invalid gallery accepted';
   assert (select jsonb_agg(to_jsonb(i) order by id)=snapshot from public.product_images i where product_id=p),'Failed edit partially changed gallery';
 end loop;
 rejected:=false;
 begin perform public.manage_manual_product(actor,p,'edit',version-interval '1 second',payload||jsonb_build_object('photos','[]'::jsonb));
 exception when raise_exception then rejected:=true;end;
 assert rejected,'Stale edit accepted';
 rejected:=false;
 begin perform public.manage_manual_product(actor,supplier_product,'edit',(select updated_at from public.products where id=supplier_product),payload||jsonb_build_object('photos','[]'::jsonb));
 exception when raise_exception then rejected:=true;end;
 assert rejected,'Supplier product accepted';
 assert not has_function_privilege('anon','public.manage_manual_product(uuid,uuid,text,timestamptz,jsonb)','execute'),'Anonymous gallery mutation';
 assert not has_function_privilege('authenticated','public.manage_manual_product(uuid,uuid,text,timestamptz,jsonb)','execute'),'Client gallery mutation';

 -- Explicit removal changes associations only; Storage and other products stay intact.
 perform public.manage_manual_product(actor,p,'edit',version,payload||jsonb_build_object('photos',jsonb_build_array(jsonb_build_object('id',first_image))));
 assert (select count(*)=1 from public.product_images where product_id=p),'Removal not saved';
 assert (select is_primary and sort_order=0 from public.product_images where id=first_image),'Remaining photo not featured';
 assert exists(select 1 from storage.objects where bucket_id='product-360-photos' and name=file_path),'Storage file deleted';
 assert exists(select 1 from public.product_images where id=foreign_image),'Other product changed';
 select updated_at into version from public.products where id=p;
 perform public.manage_manual_product(actor,p,'edit',version,payload||jsonb_build_object('photos','[]'::jsonb));
 assert not exists(select 1 from public.product_images where product_id=p),'Empty gallery not saved';
 -- The optional URL path remains supported in the new gallery.
 select updated_at into version from public.products where id=p;
 perform public.manage_manual_product(actor,p,'edit',version,payload||jsonb_build_object('photos',jsonb_build_array(jsonb_build_object('externalUrl','https://example.invalid/new.png'))));
 assert (select is_primary and external_url='https://example.invalid/new.png' from public.product_images where product_id=p),'External URL not saved';
end $$;
reset role;
rollback;
select 'PASS: gallery edit, featured selection, uploads, rollback, concurrency, permissions and legacy URLs' as result;
