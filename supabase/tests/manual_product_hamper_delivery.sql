-- Fixtures and all changes roll back; no live products are altered.
begin;
select set_config('request.jwt.claims','{}',true);
do $$
declare actor uuid:=gen_random_uuid(); category_id uuid:=gen_random_uuid();
 p uuid; normal_id uuid; supplier_product uuid; photo_id uuid;
 payload jsonb; edited jsonb; version timestamptz; rejected boolean;
begin
 insert into auth.users(id,email) values(actor,actor::text||'@example.invalid');
 update public.profiles set role='admin',is_active=true where id=actor;
 insert into public.categories(id,name,slug,catalog_source) values(category_id,'Hamper test',category_id::text,'manual');
 payload:=jsonb_build_object('sku','HAMPER-'||actor,'name','Hamper fixture','slug','hamper-'||actor,
   'catalog_source','manual','fulfillment_route','internal_360','min_order_quantity',1,
   'status','active','is_active',true,'is_featured',false,'is_purchasable',true,'availability_status','in_stock_pt',
   'weight',2270,'dimensions','30 × 20 × 15 cm','shipping_profile','christmas_hamper_2026','delivery_unit_price',6);
 execute 'set local role service_role';
 p:=public.create_manual_catalog_product(payload,category_id,19.98,100,'https://example.invalid/hamper.png');
 select id into photo_id from public.product_images where product_id=p;
 assert (select min_order_quantity=1 and weight=2270 and dimensions='30 × 20 × 15 cm' and delivery_unit_price=6 from public.products where id=p),'Hamper logistics not saved';
 assert (select quantity_min=1 and final_price=19.98 from public.product_prices where product_id=p),'Hamper cannot be priced at one unit';

 normal_id:=public.create_manual_catalog_product(payload||jsonb_build_object('sku','NORMAL-'||actor,'slug','normal-'||actor,
   'shipping_profile','standard','delivery_unit_price',null,'min_order_quantity',10),category_id,2,100,null);
 update public.products set min_order_quantity=1 where id=normal_id;
 assert (select min_order_quantity=10 from public.products where id=normal_id),'Standard minimum changed';
 insert into public.products(sku,name,slug,catalog_source,fulfillment_route,min_order_quantity)
   values('SUP-'||actor,'Supplier fixture','supplier-'||actor,'supplier_sync','supplier_api',1) returning id into supplier_product;
 assert (select min_order_quantity=10 from public.products where id=supplier_product),'Supplier minimum changed';
 rejected:=false;
 begin update public.products set shipping_profile='christmas_hamper_2026',delivery_unit_price=6,min_order_quantity=1 where id=supplier_product;
 exception when check_violation then rejected:=true;end;
 assert rejected,'Supplier product accepted hamper policy';

 edited:=jsonb_build_object('name','Updated hamper','sku','HAMPER-'||actor,'slug','hamper-'||actor,
   'category_id',category_id,'price',19.98,'minimum',1,'stock',99,'status','active','featured',false,
   'weight',3420,'dimensions','40 × 30 × 20 cm','shipping_profile','christmas_hamper_2026','delivery_unit_price',9.5,
   'photos',jsonb_build_array(jsonb_build_object('id',photo_id)));
 select updated_at into version from public.products where id=p;
 perform public.manage_manual_product(actor,p,'edit',version,edited);
 assert (select weight=3420 and dimensions='40 × 30 × 20 cm' and delivery_unit_price=9.5 and min_order_quantity=1 from public.products where id=p),'Edit did not save physical data and delivery';
 assert (select is_primary from public.product_images where id=photo_id),'Logistics edit lost featured photo';
 assert (select quantity_min=1 and final_price=19.98 from public.product_prices where product_id=p),'Edit changed price or minimum';
 select updated_at into version from public.products where id=p;
 rejected:=false;
 begin perform public.manage_manual_product(actor,p,'edit',version,edited||jsonb_build_object('delivery_unit_price',null));
 exception when check_violation then rejected:=true;end;
 assert rejected,'Missing delivery fee accepted';
 rejected:=false;
 begin perform public.manage_manual_product(actor,p,'edit',version,edited||jsonb_build_object('weight',-1));
 exception when raise_exception then rejected:=true;end;
 assert rejected,'Negative weight accepted';
 assert (select weight=3420 and delivery_unit_price=9.5 from public.products where id=p),'Rejected edit partially saved';

 perform public.manage_manual_product(actor,p,'edit',version,edited||jsonb_build_object('shipping_profile','standard','delivery_unit_price',null,'minimum',10));
 assert (select shipping_profile='standard' and min_order_quantity=10 and delivery_unit_price is null from public.products where id=p),'Return to standard delivery failed';
 assert (select quantity_min=10 from public.product_prices where product_id=p),'Standard quantity tier not restored';
 assert not has_function_privilege('authenticated','public.manage_manual_product(uuid,uuid,text,timestamptz,jsonb)','execute'),'Client write access granted';
end $$;
reset role;
rollback;
select 'PASS: hamper creation/edit, weight, dimensions, price tier, photo preservation, isolation and invalid-input rollback' as result;
