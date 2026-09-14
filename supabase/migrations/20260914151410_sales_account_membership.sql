begin;
-- Membership adds commercial access to the existing customer/admin identity.
-- Preserve global account suspension; the commercial status is independent from now on.
update public.profiles set role='customer' where role='sales';
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check check(role in ('customer','admin'));
alter table public.sales_agents add column account_kind text not null default 'new_account' check(account_kind in ('new_account','existing_account'));
alter table public.sales_email_notifications add column kind text not null default 'payout' check(kind in ('payout','access'));
alter table public.sales_email_notifications add constraint sales_email_kind_payload check((kind='payout' and payout_id is not null) or (kind='access' and payout_id is null));
create unique index sales_one_access_notice on public.sales_email_notifications(agent_id) where kind='access';
alter policy sales_own_agent on public.sales_agents using (
 user_id=(select auth.uid()) and status in ('invited','active') and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('customer','admin') and p.is_active)
);
create or replace function private.sales_snapshot_order() returns trigger language plpgsql security definer set search_path='' as $$
declare a record; begin
 if auth.uid() is not null and new.user_id is distinct from auth.uid() and not public.is_admin() then raise exception 'Forbidden order owner'; end if;
 select x.id assignment_id,g.* into a from public.sales_customer_assignments x join public.sales_agents g on g.id=x.agent_id
 join public.profiles p on p.id=g.user_id and p.role in ('customer','admin') and p.is_active
 where x.customer_user_id=new.user_id and x.ended_at is null and x.starts_at<=new.created_at and (x.expires_at is null or x.expires_at>new.created_at)
 and g.user_id is distinct from new.user_id and g.status='active' and g.starts_on<=new.created_at::date and (g.ends_on is null or g.ends_on>=new.created_at::date) limit 1;
 if found then
 insert into public.sales_order_attributions(order_id,agent_id,assignment_id,rule_snapshot)
 values(new.id,a.id,a.assignment_id,jsonb_build_object('enabled',a.commission_enabled,'supplier_rate_bps',a.supplier_rate_bps,'manual_rate_bps',a.manual_rate_bps,'hold_days',a.hold_days,'recurring',a.recurring,'attribution_months',a.attribution_months,'version',1));
 end if;return new;
end $$;

create or replace function public.sales_refresh_commissions(p_agent_id uuid) returns integer language plpgsql security invoker set search_path='' as $$
declare r record; old public.sales_commissions%rowtype; alloc public.sales_refund_allocations%rowtype;
 gross bigint; supplier_gross bigint; net bigint; sb bigint; mb bigint; original bigint; earned bigint; refunded bigint; captured numeric; review boolean; eligible timestamptz; delivered timestamptz; st text; n integer:=0;
begin
 perform pg_advisory_xact_lock(hashtextextended('sales:'||p_agent_id::text,0));
 for r in select a.*,o.user_id order_user_id,o.order_number,o.customer_name,o.currency,o.discount_total,o.grand_total,o.status order_status,o.payment_status,o.paid_at,o.delivered_at,o.fulfillment_status,o.deleted_at
 from public.sales_order_attributions a join public.orders o on o.id=a.order_id where a.agent_id=p_agent_id order by a.created_at loop
 select * into old from public.sales_commissions where order_id=r.order_id for update;
 select round(coalesce(sum(i.total),0)*100)::bigint,round(coalesce(sum(i.total) filter(where i.fulfillment_route<>'internal_360'),0)*100)::bigint into gross,supplier_gross from public.order_items i where i.order_id=r.order_id;
 net:=greatest(0,gross-round(greatest(0,r.discount_total)*100)::bigint);
 sb:=case when gross>0 then round(net::numeric*supplier_gross/gross)::bigint else 0 end;mb:=net-sb;
 original:=round(sb::numeric*coalesce((r.rule_snapshot->>'supplier_rate_bps')::int,0)/10000)::bigint+round(mb::numeric*coalesce((r.rule_snapshot->>'manual_rate_bps')::int,0)/10000)::bigint;
 select round(coalesce(sum(p.amount_refunded),0)*100)::bigint,coalesce(sum(case when p.status in ('paid','partially_refunded','refunded') then greatest(p.amount_received,case when p.provider in ('manual','bank_transfer') and p.paid_at is not null then p.amount else 0 end) else 0 end),0)
 into refunded,captured from public.payments p where p.order_id=r.order_id;
 select greatest(refunded,coalesce(sum(refund_cents),0)) into refunded from public.sales_payment_checks where order_id=r.order_id;
 delivered:=case when r.order_status='delivered' or r.fulfillment_status='delivered' then coalesce(r.delivered_at,old.delivered_seen_at,now()) else old.delivered_seen_at end;
 eligible:=case when delivered is not null then delivered+make_interval(days=>coalesce((r.rule_snapshot->>'hold_days')::int,0)) end;
 earned:=original;review:=false;st:='forecast';
 if not coalesce((r.rule_snapshot->>'enabled')::boolean,false) then earned:=0;st:='unconfigured';
 elsif r.order_user_id=(select user_id from public.sales_agents where id=p_agent_id) or r.deleted_at is not null or r.order_status in ('cancelled','refunded','failed') or r.payment_status in ('refunded','cancelled','failed') or (refunded>=round(r.grand_total*100) and refunded>0) then earned:=0;st:='cancelled';
 else
   if refunded>0 or r.payment_status='partially_refunded' then
     select * into alloc from public.sales_refund_allocations where order_id=r.order_id;
     if alloc.order_id is null or alloc.refund_cents<>refunded or alloc.supplier_net_cents>sb or alloc.manual_net_cents>mb then review:=true;
     else earned:=round((sb-alloc.supplier_net_cents)::numeric*coalesce((r.rule_snapshot->>'supplier_rate_bps')::int,0)/10000)::bigint+round((mb-alloc.manual_net_cents)::numeric*coalesce((r.rule_snapshot->>'manual_rate_bps')::int,0)/10000)::bigint; end if;
   end if;
   if (r.rule_snapshot->>'recurring')::boolean=false and exists(
     select 1 from public.sales_order_attributions a2 join public.orders o2 on o2.id=a2.order_id
     where a2.assignment_id=r.assignment_id and a2.order_id<>r.order_id and o2.paid_at is not null and o2.payment_status in ('paid','partially_refunded') and o2.status not in ('cancelled','refunded','failed') and o2.deleted_at is null
     and coalesce((select sum(refund_cents) from public.sales_payment_checks where order_id=o2.id),0)<round(o2.grand_total*100)
     and (r.paid_at is null or (o2.paid_at,o2.id)<(r.paid_at,r.order_id))
   ) then earned:=0;st:='cancelled';
   elsif review then st:='review';
   elsif captured>=r.grand_total and r.grand_total>0 and r.payment_status in ('paid','partially_refunded') and (r.order_status='delivered' or r.fulfillment_status='delivered') and eligible<=now() then st:='eligible';end if;
 end if;
 if old.order_id is null then
 insert into public.sales_commissions(order_id,agent_id,order_number,customer_name,currency,supplier_base_cents,manual_base_cents,original_cents,earned_cents,refund_cents,review_required,state,eligible_at,delivered_seen_at,rule_snapshot)
 values(r.order_id,r.agent_id,r.order_number,r.customer_name,r.currency,sb,mb,original,earned,refunded,review,st,eligible,delivered,r.rule_snapshot);
 elsif (old.supplier_base_cents,old.manual_base_cents,old.original_cents,old.earned_cents,old.refund_cents,old.review_required,old.state,old.eligible_at,old.delivered_seen_at) is distinct from (sb,mb,original,earned,refunded,review,st,eligible,delivered) then
 update public.sales_commissions set supplier_base_cents=sb,manual_base_cents=mb,original_cents=original,earned_cents=earned,refund_cents=refunded,review_required=review,state=st,eligible_at=eligible,delivered_seen_at=delivered,
 approved_at=null,approved_by=null,approved_cents=null,updated_at=now() where order_id=r.order_id;
 end if;
 if old.order_id is null or (old.earned_cents,old.refund_cents,old.state) is distinct from (earned,refunded,st) then
 insert into public.sales_audit_log(agent_id,action,record_id,details) values(r.agent_id,'commission_reconciled',r.order_id::text,jsonb_build_object('previous_cents',old.earned_cents,'earned_cents',earned,'refund_cents',refunded,'state',st));n:=n+1;
 end if;
 end loop;return n;
end $$;

create or replace function public.sales_admin_mutate(p_actor uuid,p_action text,p_data jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare a public.sales_agents%rowtype; c public.sales_commissions%rowtype; p public.profiles%rowtype; existing public.sales_payouts%rowtype;
 aid uuid; rid uuid; total bigint; months integer; expires timestamptz; country text; details jsonb;
begin
 if not exists(select 1 from public.profiles where id=p_actor and role='admin' and is_active) then raise exception 'Sem permissão administrativa.';end if;
 perform pg_advisory_xact_lock(hashtextextended('sales-admin',0));
 aid:=nullif(p_data->>'agent_id','')::uuid;
 if aid is not null then select * into a from public.sales_agents where id=aid for update;if not found then raise exception 'Comercial inexistente.';end if;end if;
 if p_action='save_agent' then
   if a.user_id is not null and a.email<>lower(trim(p_data->>'email')) then raise exception 'O email de uma conta associada não pode ser alterado neste formulário.';end if;
   for country in select jsonb_array_elements_text(p_data->'countries') loop if country !~ '^[A-Z]{2}$' then raise exception 'País inválido.';end if;end loop;
   rid:=coalesce(aid,gen_random_uuid());
   insert into public.sales_agents(id,full_name,email,phone,company_name,tax_id,billing_address,iban,countries,locale,status,supplier_rate_bps,manual_rate_bps,hold_days,attribution_months,recurring,commission_enabled,monthly_target_cents,starts_on,ends_on,user_id)
   values(rid,p_data->>'full_name',lower(trim(p_data->>'email')),coalesce(p_data->>'phone',''),coalesce(p_data->>'company_name',''),coalesce(p_data->>'tax_id',''),coalesce(p_data->>'billing_address',''),coalesce(p_data->>'iban',''),array(select jsonb_array_elements_text(p_data->'countries')),p_data->>'locale',p_data->>'status',(p_data->>'supplier_rate_bps')::int,(p_data->>'manual_rate_bps')::int,(p_data->>'hold_days')::int,(p_data->>'attribution_months')::int,(p_data->>'recurring')::boolean,(p_data->>'commission_enabled')::boolean,(p_data->>'monthly_target_cents')::bigint,(p_data->>'starts_on')::date,(p_data->>'ends_on')::date,a.user_id)
   on conflict(id) do update set full_name=excluded.full_name,email=excluded.email,phone=excluded.phone,company_name=excluded.company_name,tax_id=excluded.tax_id,billing_address=excluded.billing_address,iban=excluded.iban,countries=excluded.countries,locale=excluded.locale,status=excluded.status,supplier_rate_bps=excluded.supplier_rate_bps,manual_rate_bps=excluded.manual_rate_bps,hold_days=excluded.hold_days,attribution_months=excluded.attribution_months,recurring=excluded.recurring,commission_enabled=excluded.commission_enabled,monthly_target_cents=excluded.monthly_target_cents,starts_on=excluded.starts_on,ends_on=excluded.ends_on,updated_at=now();
   -- Commercial edits never modify the customer's identity, locale, role or global account status.
   aid:=rid;details:=jsonb_build_object('previous_status',a.status,'status',p_data->>'status','supplier_rate_bps',p_data->'supplier_rate_bps','manual_rate_bps',p_data->'manual_rate_bps','hold_days',p_data->'hold_days','recurring',p_data->'recurring','enabled',p_data->'commission_enabled');
 elsif p_action in ('link_account','link_existing_account') then
   rid:=(p_data->>'user_id')::uuid;
   select * into p from public.profiles where id=rid for update;
   if aid is null or a.user_id is not null or a.status<>'draft' or p.id is null or p.role not in ('customer','admin') or not p.is_active then raise exception 'Não foi possível associar esta conta. Atualiza a página.';end if;
   if a.email is distinct from p_data->>'expected_email' or a.updated_at is distinct from (p_data->>'expected_updated_at')::timestamptz then raise exception 'A ficha mudou. Guarda os dados e confirma novamente a conta.';end if;
   -- Auth identity and email confirmation are verified with the Auth Admin API before this service-only call.
   if lower(p.email) is distinct from a.email then raise exception 'O email da conta mudou. Atualiza a ficha.';end if;
   if exists(select 1 from public.sales_agents where user_id=rid and id<>aid) then raise exception 'Esta conta já está associada a outro comercial.';end if;
   if p_action='link_account' and (p.role<>'customer' or exists(select 1 from public.orders where user_id=rid)) then raise exception 'Usa a associação à conta existente.';end if;
   update public.sales_agents set user_id=rid,account_kind=case when p_action='link_existing_account' then 'existing_account' else 'new_account' end,status=case when p_action='link_existing_account' then 'active' else 'invited' end,invitation_error=null,updated_at=now() where id=aid;
   details:=jsonb_build_object('user_id',rid,'preserved_role',p.role,'account_kind',case when p_action='link_existing_account' then 'existing_account' else 'new_account' end);
   if p_action='link_existing_account' then
     insert into public.sales_email_notifications(agent_id,kind,email_to,locale,payload)
     values(aid,'access',a.email,a.locale,jsonb_build_object('name',a.full_name,'user_id',rid));
   end if;
 elsif p_action='queue_access_notice' then
   if a.user_id is null or a.status<>'active' then raise exception 'O acesso comercial não está ativo.';end if;
   if not exists(select 1 from public.profiles profile_row where profile_row.id=a.user_id and profile_row.is_active) then raise exception 'Verifica o estado da conta associada.';end if;
   insert into public.sales_email_notifications(agent_id,kind,email_to,locale,payload)
   values(aid,'access',a.email,a.locale,jsonb_build_object('name',a.full_name,'user_id',a.user_id))
   on conflict (agent_id) where kind='access' do update set status='pending',attempts=0,error=null
   where sales_email_notifications.status='failed' and sales_email_notifications.attempts>=5;
   rid:=aid;
 elsif p_action='assign_customer' then
   if a.status<>'active' then raise exception 'Ativa o comercial antes de atribuir clientes.';end if;
   select * into p from public.profiles where id=(p_data->>'customer_user_id')::uuid and role='customer' and is_active;
   if not found then raise exception 'Cliente inexistente ou inativo.';end if;
   if p.id=a.user_id then raise exception 'O comercial não pode atribuir-se à sua própria carteira.';end if;
   if length(trim(coalesce(p_data->>'reason','')))<5 then raise exception 'Indica o motivo da atribuição.';end if;
   if a.attribution_months is null then raise exception 'Define a duração da carteira na ficha do comercial.';end if;
   months:=a.attribution_months; expires:=case when months=0 then null else now()+make_interval(months=>months) end;
   if exists(select 1 from public.sales_customer_assignments where customer_user_id=p.id and agent_id=aid and ended_at is null and (expires_at is null or expires_at>now())) then raise exception 'O cliente já pertence a esta carteira.';end if;
   update public.sales_customer_assignments set ended_at=now() where customer_user_id=p.id and ended_at is null;
   insert into public.sales_customer_assignments(agent_id,customer_user_id,customer_name,customer_email,expires_at,assigned_by,reason)
   values(aid,p.id,coalesce(p.full_name,p.email),p.email,expires,p_actor,p_data->>'reason') returning id into rid;
 elsif p_action='end_assignment' then
   rid:=(p_data->>'assignment_id')::uuid;
   if length(trim(coalesce(p_data->>'reason','')))<5 then raise exception 'Indica o motivo.';end if;
   update public.sales_customer_assignments set ended_at=now() where id=rid and agent_id=aid and ended_at is null;
   if not found then raise exception 'Atribuição inexistente ou já terminada.';end if;
 elsif p_action in ('approve','allocate_refund') then
   perform public.sales_refresh_commissions(aid);
   select * into c from public.sales_commissions where order_id=(p_data->>'order_id')::uuid and agent_id=aid for update;
   if not found then raise exception 'Comissão inexistente.';end if;
   rid:=c.order_id;
   if p_action='approve' then
     if c.review_required or (c.state<>'eligible' and not(c.state='cancelled' and c.paid_cents>c.earned_cents)) or c.earned_cents=c.paid_cents then raise exception 'A comissão ainda não pode ser aprovada.';end if;
     if c.earned_cents<>(p_data->>'expected_cents')::bigint then raise exception 'O valor mudou. Atualiza a página antes de aprovar.';end if;
     update public.sales_commissions set approved_at=now(),approved_by=p_actor,approved_cents=earned_cents,updated_at=now() where order_id=c.order_id;
   else
     if c.refund_cents<=0 or (p_data->>'refund_cents')::bigint<>c.refund_cents then raise exception 'O reembolso mudou. Atualiza a página.';end if;
     if (p_data->>'supplier_net_cents')::bigint>c.supplier_base_cents or (p_data->>'manual_net_cents')::bigint>c.manual_base_cents or (p_data->>'supplier_net_cents')::bigint+(p_data->>'manual_net_cents')::bigint>c.refund_cents then raise exception 'A parcela elegível não pode exceder as bases ou o reembolso recebido.';end if;
     insert into public.sales_refund_allocations(order_id,refund_cents,supplier_net_cents,manual_net_cents,reason,recorded_by)
     values(c.order_id,c.refund_cents,(p_data->>'supplier_net_cents')::bigint,(p_data->>'manual_net_cents')::bigint,p_data->>'reason',p_actor)
     on conflict(order_id) do update set refund_cents=excluded.refund_cents,supplier_net_cents=excluded.supplier_net_cents,manual_net_cents=excluded.manual_net_cents,reason=excluded.reason,recorded_by=excluded.recorded_by,updated_at=now();
     perform public.sales_refresh_commissions(aid);
   end if;
 elsif p_action='payout' then
   rid:=(p_data->>'request_id')::uuid;
   select * into existing from public.sales_payouts where id=rid;
   if found then
     if existing.agent_id<>aid or existing.amount_cents<>(p_data->>'expected_cents')::bigint or existing.reference<>p_data->>'reference' then raise exception 'Referência de operação já utilizada.';end if;
     return jsonb_build_object('id',rid,'duplicate',true);
   end if;
   perform public.sales_refresh_commissions(aid);
   if exists(select 1 from public.sales_commissions where agent_id=aid and currency=p_data->>'currency' and (review_required or (paid_cents>earned_cents and approved_cents is distinct from earned_cents))) then raise exception 'Revê e aprova os reembolsos e ajustes desta carteira antes de registar o pagamento.';end if;
   select coalesce(sum(earned_cents-paid_cents),0) into total from public.sales_commissions where agent_id=aid and currency=p_data->>'currency' and approved_at is not null and approved_cents=earned_cents and (state='eligible' or (state='cancelled' and paid_cents>earned_cents));
   if total<=0 or total<>(p_data->>'expected_cents')::bigint then raise exception 'O saldo mudou ou não existem comissões aprovadas. Atualiza a página.';end if;
   if (p_data->>'paid_at')::date>current_date or (p_data->>'paid_at')::date<date '2020-01-01' then raise exception 'Data de pagamento inválida.';end if;
   if nullif(p_data->>'proof_path','') is not null and p_data->>'proof_path' not like aid::text||'/%' then raise exception 'Comprovativo inválido.';end if;
   insert into public.sales_payouts(id,agent_id,period,currency,amount_cents,reference,proof_path,paid_at,recorded_by)
   values(rid,aid,date_trunc('month',(p_data->>'period')::date)::date,p_data->>'currency',total,p_data->>'reference',nullif(p_data->>'proof_path',''),(p_data->>'paid_at')::timestamptz,p_actor);
   insert into public.sales_payout_items(payout_id,order_id,amount_cents)
   select rid,order_id,earned_cents-paid_cents from public.sales_commissions where agent_id=aid and currency=p_data->>'currency' and approved_at is not null and approved_cents=earned_cents and earned_cents<>paid_cents and (state='eligible' or (state='cancelled' and paid_cents>earned_cents));
   update public.sales_commissions set paid_cents=earned_cents,updated_at=now() where order_id in(select order_id from public.sales_payout_items where payout_id=rid);
   insert into public.sales_email_notifications(agent_id,payout_id,email_to,locale,payload) values(aid,rid,a.email,a.locale,jsonb_build_object('name',a.full_name,'amount_cents',total,'currency',p_data->>'currency','period',p_data->>'period','reference',p_data->>'reference'));
 else raise exception 'Operação comercial desconhecida.';end if;
 insert into public.sales_audit_log(agent_id,actor_id,action,record_id,details) values(aid,p_actor,p_action,rid::text,coalesce(details,jsonb_build_object('reason',p_data->>'reason')));
 return jsonb_build_object('id',rid);
end $$;
commit;
