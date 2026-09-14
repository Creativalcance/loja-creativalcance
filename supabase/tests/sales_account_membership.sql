-- Transactional fixtures only; run after sales_network.sql and roll everything back.
reset role;
select set_config('request.jwt.claims','{}',true);
create temporary table membership_ids(name text primary key,id uuid not null default gen_random_uuid());
insert into membership_ids(name) values('customer'),('admin'),('agent'),('admin_agent'),('own_order'),('cart');
insert into auth.users(id,email,email_confirmed_at,created_at,encrypted_password,raw_user_meta_data)
select id,'membership-'||id||'@example.invalid',now(),now(), 'fixture-password-hash',jsonb_build_object('full_name','Original account name','preferred_locale','en') from membership_ids where name in ('customer','admin');
update public.profiles set role='admin' where id=(select id from membership_ids where name='admin');
insert into public.orders(id,user_id,customer_email,customer_name,grand_total)
select (select id from membership_ids where name='own_order'),id,'membership-'||id||'@example.invalid','Original customer',30 from membership_ids where name='customer';
insert into public.carts(id,user_id) values((select id from membership_ids where name='cart'),(select id from membership_ids where name='customer'));
create temporary table membership_original_profile as select p.* from public.profiles p where id in(select id from membership_ids where name in ('customer','admin'));
grant select on membership_ids to authenticated,service_role;

do $$ declare actor uuid; uid uuid; aid uuid; admid uuid; terms jsonb; result jsonb; expected jsonb; own_order uuid; n integer; begin
 select id into actor from sales_test_ids where name='admin';select id into uid from membership_ids where name='customer';select id into admid from membership_ids where name='admin';
 terms:=jsonb_build_object('full_name','Commercial identity','email','membership-'||uid||'@example.invalid','countries',jsonb_build_array('DE'),'locale','de','status','draft','supplier_rate_bps',500,'manual_rate_bps',1000,'hold_days',0,'attribution_months',12,'recurring',true,'commission_enabled',true,'monthly_target_cents',0,'starts_on',current_date::text);
 result:=public.sales_admin_mutate(actor,'save_agent',terms);aid:=(result->>'id')::uuid;update membership_ids set id=aid where name='agent';
 expected:=jsonb_build_object('agent_id',aid,'user_id',uid,'expected_email',terms->>'email','expected_updated_at',(select updated_at from public.sales_agents where id=aid));
 begin perform public.sales_admin_mutate(uid,'link_existing_account',expected);raise exception 'Nonadmin association succeeded';exception when others then if sqlerrm='Nonadmin association succeeded' then raise;end if;end;
 begin perform public.sales_admin_mutate(actor,'link_existing_account',expected||jsonb_build_object('expected_email','wrong@example.invalid'));raise exception 'Stale identity linked';exception when others then if sqlerrm='Stale identity linked' then raise;end if;end;
 begin perform public.sales_admin_mutate(actor,'link_existing_account',expected||jsonb_build_object('expected_updated_at',now()-interval '1 day'));raise exception 'Stale version linked';exception when others then if sqlerrm='Stale version linked' then raise;end if;end;
 perform public.sales_admin_mutate(actor,'link_existing_account',expected);
 perform pg_temp.sales_assert((select account_kind='existing_account' and status='active' and user_id=uid from public.sales_agents where id=aid),'existing customer acquires active membership');
 perform pg_temp.sales_assert((select role='customer' and is_active from public.profiles where id=uid),'customer role remains intact');
 perform pg_temp.sales_assert((select count(*)=1 from public.orders where user_id=uid),'existing purchase retained');
 perform pg_temp.sales_assert((select count(*)=1 from public.carts where user_id=uid),'existing cart retained');
 perform pg_temp.sales_assert((select encrypted_password='fixture-password-hash' and raw_user_meta_data->>'preferred_locale'='en' from auth.users where id=uid),'password and customer language remain unchanged');
 perform public.sales_admin_mutate(actor,'queue_access_notice',jsonb_build_object('agent_id',aid));
 perform pg_temp.sales_assert((select count(*)=1 from public.sales_email_notifications where agent_id=aid and kind='access' and locale='de' and payload->>'user_id'=uid::text),'activation email uses commercial language and is not duplicated');
 begin perform public.sales_admin_mutate(actor,'assign_customer',jsonb_build_object('agent_id',aid,'customer_user_id',uid,'reason','Invalid self assignment'));raise exception 'Self assignment accepted';exception when others then if sqlerrm='Self assignment accepted' then raise;end if;end;
 -- Defensive trigger: even a legacy/direct self-assignment cannot earn commissions.
 insert into public.sales_customer_assignments(agent_id,customer_user_id,customer_name,customer_email,assigned_by) values(aid,uid,'Self','self@example.invalid',actor);
 insert into public.orders(user_id,customer_email,customer_name,grand_total) values(uid,'self@example.invalid','Self purchase',50) returning id into own_order;
 perform pg_temp.sales_assert(not exists(select 1 from public.sales_order_attributions where order_id=own_order),'own purchases do not create commission attribution');
 perform public.sales_admin_mutate(actor,'save_agent',terms||jsonb_build_object('agent_id',aid,'status','suspended','locale','it','full_name','Changed commercial name'));
 perform pg_temp.sales_assert((select to_jsonb(p)=to_jsonb(o) from public.profiles p join membership_original_profile o using(id) where p.id=uid),'suspending/editing commercial access leaves the base profile byte-for-byte unchanged');
 -- An administrator can also gain a membership without losing administration.
 terms:=terms||jsonb_build_object('email','membership-'||admid||'@example.invalid','status','draft');
 result:=public.sales_admin_mutate(actor,'save_agent',terms);aid:=(result->>'id')::uuid;update membership_ids set id=aid where name='admin_agent';
 perform public.sales_admin_mutate(actor,'link_existing_account',jsonb_build_object('agent_id',aid,'user_id',admid,'expected_email',terms->>'email','expected_updated_at',(select updated_at from public.sales_agents where id=aid)));
 perform pg_temp.sales_assert((select role='admin' and is_active from public.profiles where id=admid),'administrator keeps administration');
 perform pg_temp.sales_assert((select count(*)=1 from public.sales_audit_log where agent_id=aid and action='link_existing_account'),'association is audited');
end $$;
-- Auth identities are verified through the Auth Admin API; no grant on auth.users is added.
set local role service_role;
select pg_temp.sales_assert(public.sales_admin_mutate((select id from membership_ids where name='admin'),'queue_access_notice',jsonb_build_object('agent_id',(select id from membership_ids where name='admin_agent')))->>'id'=(select id::text from membership_ids where name='admin_agent'),'service role can execute the application mutation without auth schema grants');
reset role;
-- An existing session loses only commercial access after suspension.
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from membership_ids where name='customer'),'role','authenticated')::text,true);
set local role authenticated;
select pg_temp.sales_assert((select count(*)=0 from public.sales_agents),'suspended membership is inaccessible via RLS');
select pg_temp.sales_assert((select count(*)=2 from public.orders),'customer keeps access to their own purchases while commercial module is suspended');
select pg_temp.sales_assert((select count(*)=1 from public.carts),'customer retains their cart');
reset role;
select set_config('request.jwt.claims','{}',true);
update public.sales_agents set status='active' where id=(select id from membership_ids where name='agent');
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from membership_ids where name='customer'),'role','authenticated')::text,true);
set local role authenticated;
select pg_temp.sales_assert((select count(*)=1 from public.sales_agents),'reactivated commercial membership restores only own commercial access');
select pg_temp.sales_assert((select count(*)=2 from public.orders),'commercial membership does not expose other customers orders');
select pg_temp.sales_assert(not public.is_admin(),'commercial membership never grants administration');
reset role;
select 'Customer/commercial association, preservation, suspension and self-purchase assertions passed' as result;
