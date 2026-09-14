begin;

-- Add a restricted commercial role; existing customer/admin authorizations are unchanged.
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('customer','admin','sales'));

create table public.sales_agents (
 id uuid primary key default gen_random_uuid(), user_id uuid unique references public.profiles(id),
 full_name text not null, email text not null check(email=lower(trim(email))), phone text not null default '',
 company_name text not null default '', tax_id text not null default '', billing_address text not null default '', iban text not null default '',
 countries text[] not null check(cardinality(countries) between 1 and 50), locale text not null default 'pt' check(locale in ('pt','en','fr','es','de','it')),
 status text not null default 'draft' check(status in ('draft','invited','active','suspended')),
 supplier_rate_bps integer check(supplier_rate_bps between 0 and 10000), manual_rate_bps integer check(manual_rate_bps between 0 and 10000),
 hold_days integer check(hold_days between 0 and 365), attribution_months integer check(attribution_months between 0 and 120), recurring boolean,
 commission_enabled boolean not null default false, monthly_target_cents bigint not null default 0 check(monthly_target_cents>=0),
 starts_on date not null default current_date, ends_on date, invitation_sent_at timestamptz, invitation_error text,
 last_reconciled_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(ends_on is null or ends_on>=starts_on),
 check(not commission_enabled or (supplier_rate_bps is not null and manual_rate_bps is not null and hold_days is not null and attribution_months is not null and recurring is not null)),
 check(status not in ('invited','active') or user_id is not null)
);
create unique index sales_agents_email_unique on public.sales_agents(lower(email));
create table public.sales_customer_assignments (
 id uuid primary key default gen_random_uuid(), agent_id uuid not null references public.sales_agents(id), customer_user_id uuid not null references public.profiles(id),
 customer_name text not null, customer_email text not null, starts_at timestamptz not null default now(), expires_at timestamptz, ended_at timestamptz,
 assigned_by uuid not null references public.profiles(id), reason text not null default '', created_at timestamptz not null default now(),
 check(expires_at is null or expires_at>starts_at)
);
create unique index sales_one_current_assignment on public.sales_customer_assignments(customer_user_id) where ended_at is null;
create index sales_assignment_agent on public.sales_customer_assignments(agent_id);
create index sales_assignment_actor on public.sales_customer_assignments(assigned_by);
create table public.sales_contacts (
 id uuid primary key default gen_random_uuid(), agent_id uuid not null references public.sales_agents(id), name text not null, email text not null,
 phone text not null default '', company_name text not null default '', country_code text not null check(country_code ~ '^[A-Z]{2}$'),
 stage text not null default 'new' check(stage in ('new','contacted','qualified','proposal','won','lost')),
 notes text not null default '', next_contact_on date, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index sales_contacts_email on public.sales_contacts(lower(trim(email)));
create index sales_contacts_agent on public.sales_contacts(agent_id);
create table public.sales_order_attributions (
 order_id uuid primary key references public.orders(id), agent_id uuid not null references public.sales_agents(id),
 assignment_id uuid not null references public.sales_customer_assignments(id), rule_snapshot jsonb not null,
 created_at timestamptz not null default now()
);
create index sales_attribution_agent on public.sales_order_attributions(agent_id);
create index sales_attribution_assignment on public.sales_order_attributions(assignment_id);
create table public.sales_commissions (
 order_id uuid primary key references public.sales_order_attributions(order_id), agent_id uuid not null references public.sales_agents(id),
 order_number text not null, customer_name text not null, currency text not null,
 supplier_base_cents bigint not null default 0, manual_base_cents bigint not null default 0,
 original_cents bigint not null default 0 check(original_cents>=0), earned_cents bigint not null default 0 check(earned_cents>=0), paid_cents bigint not null default 0,
 refund_cents bigint not null default 0, review_required boolean not null default false,
 state text not null default 'forecast' check(state in ('unconfigured','forecast','eligible','review','cancelled')),
 eligible_at timestamptz, delivered_seen_at timestamptz, approved_at timestamptz, approved_by uuid references public.profiles(id), approved_cents bigint,
 rule_snapshot jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index sales_commission_agent on public.sales_commissions(agent_id);
create index sales_commission_approver on public.sales_commissions(approved_by);
create table public.sales_refund_allocations (
 order_id uuid primary key references public.sales_commissions(order_id), refund_cents bigint not null check(refund_cents>0),
 supplier_net_cents bigint not null check(supplier_net_cents>=0), manual_net_cents bigint not null check(manual_net_cents>=0),
 reason text not null check(length(trim(reason))>=5), recorded_by uuid not null references public.profiles(id), updated_at timestamptz not null default now()
);
create index sales_refund_actor on public.sales_refund_allocations(recorded_by);
create table public.sales_payouts (
 id uuid primary key default gen_random_uuid(), agent_id uuid not null references public.sales_agents(id), period date not null,
 currency text not null, amount_cents bigint not null check(amount_cents>0), reference text not null check(length(trim(reference))>=3),
 proof_path text, paid_at timestamptz not null, recorded_by uuid not null references public.profiles(id), created_at timestamptz not null default now()
);
create index sales_payout_agent on public.sales_payouts(agent_id);
create index sales_payout_actor on public.sales_payouts(recorded_by);
create table public.sales_payout_items (
 payout_id uuid not null references public.sales_payouts(id), order_id uuid not null references public.sales_commissions(order_id), amount_cents bigint not null,
 primary key(payout_id,order_id)
);
create index sales_payout_item_order on public.sales_payout_items(order_id);
create table public.sales_audit_log (
 id bigint generated always as identity primary key, agent_id uuid references public.sales_agents(id), actor_id uuid references public.profiles(id),
 action text not null, record_id text, details jsonb not null default '{}', created_at timestamptz not null default now()
);
create index sales_audit_agent on public.sales_audit_log(agent_id);
create index sales_audit_actor on public.sales_audit_log(actor_id);
create table public.sales_email_notifications (
 id uuid primary key default gen_random_uuid(), agent_id uuid not null references public.sales_agents(id),
 payout_id uuid unique references public.sales_payouts(id), email_to text not null, locale text not null, payload jsonb not null,
 status text not null default 'pending' check(status in ('pending','sending','sent','failed')), attempts integer not null default 0,
 attempted_at timestamptz, sent_at timestamptz, provider_id text, error text, created_at timestamptz not null default now()
);
create index sales_email_agent on public.sales_email_notifications(agent_id);
create index sales_email_pending on public.sales_email_notifications(status,created_at) where status<>'sent';

create table public.sales_payment_checks (
 payment_id uuid primary key references public.payments(id), order_id uuid not null references public.sales_order_attributions(order_id),
 refund_cents bigint not null check(refund_cents>=0), observed_at timestamptz not null
);
create index sales_payment_check_order on public.sales_payment_checks(order_id);
-- All client access is SELECT-only and scoped. Existing order/payment/raw-supplier tables remain closed to sales.
do $$ declare t text; begin
 foreach t in array array['sales_agents','sales_customer_assignments','sales_contacts','sales_order_attributions','sales_commissions','sales_refund_allocations','sales_payouts','sales_payout_items','sales_audit_log','sales_email_notifications','sales_payment_checks'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 execute format('create policy admin_read on public.%I for select to authenticated using ((select public.is_admin()))',t);
 end loop;
end $$;
grant usage,select on sequence public.sales_audit_log_id_seq to service_role;
create policy sales_own_agent on public.sales_agents for select to authenticated using (
 user_id=(select auth.uid()) and status in ('invited','active') and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='sales' and p.is_active)
);
do $$ declare t text; begin
 foreach t in array array['sales_customer_assignments','sales_contacts','sales_order_attributions','sales_commissions','sales_payouts'] loop
 execute format('create policy sales_own_rows on public.%I for select to authenticated using (exists(select 1 from public.sales_agents a where a.id=agent_id and a.user_id=(select auth.uid()) and a.status in (''active'',''invited'')))',t);
 end loop;
end $$;
create policy sales_own_payout_items on public.sales_payout_items for select to authenticated using (exists(select 1 from public.sales_payouts p where p.id=payout_id and exists(select 1 from public.sales_agents a where a.id=p.agent_id and a.user_id=(select auth.uid()) and a.status in ('active','invited'))));

create schema if not exists private;
-- The trigger needs privileged reads to snapshot assignment terms, including for existing authenticated insert paths.
-- It is not callable through the Data API and never accepts caller-supplied attribution/rates.
create function private.sales_snapshot_order() returns trigger language plpgsql security definer set search_path='' as $$
declare a record; begin
 if auth.uid() is not null and new.user_id is distinct from auth.uid() and not public.is_admin() then raise exception 'Forbidden order owner'; end if;
 select x.id assignment_id,g.* into a from public.sales_customer_assignments x join public.sales_agents g on g.id=x.agent_id
 join public.profiles p on p.id=g.user_id and p.role='sales' and p.is_active
 where x.customer_user_id=new.user_id and x.ended_at is null and x.starts_at<=new.created_at and (x.expires_at is null or x.expires_at>new.created_at)
 and g.status='active' and g.starts_on<=new.created_at::date and (g.ends_on is null or g.ends_on>=new.created_at::date) limit 1;
 if found then
 insert into public.sales_order_attributions(order_id,agent_id,assignment_id,rule_snapshot)
 values(new.id,a.id,a.assignment_id,jsonb_build_object('enabled',a.commission_enabled,'supplier_rate_bps',a.supplier_rate_bps,'manual_rate_bps',a.manual_rate_bps,'hold_days',a.hold_days,'recurring',a.recurring,'attribution_months',a.attribution_months,'version',1));
 end if;return new;
end $$;
revoke all on function private.sales_snapshot_order() from public,anon,authenticated;
create trigger sales_snapshot_new_order after insert on public.orders for each row execute function private.sales_snapshot_order();

-- Service-only, security-invoker reconciliation. No changes to orders, prices, payments or supplier submission.
create function public.sales_refresh_commissions(p_agent_id uuid) returns integer language plpgsql security invoker set search_path='' as $$
declare r record; old public.sales_commissions%rowtype; alloc public.sales_refund_allocations%rowtype;
 gross bigint; supplier_gross bigint; net bigint; sb bigint; mb bigint; original bigint; earned bigint; refunded bigint; captured numeric; review boolean; eligible timestamptz; delivered timestamptz; st text; n integer:=0;
begin
 perform pg_advisory_xact_lock(hashtextextended('sales:'||p_agent_id::text,0));
 for r in select a.*,o.order_number,o.customer_name,o.currency,o.discount_total,o.grand_total,o.status order_status,o.payment_status,o.paid_at,o.delivered_at,o.fulfillment_status,o.deleted_at
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
 elsif r.deleted_at is not null or r.order_status in ('cancelled','refunded','failed') or r.payment_status in ('refunded','cancelled','failed') or (refunded>=round(r.grand_total*100) and refunded>0) then earned:=0;st:='cancelled';
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

create function public.sales_admin_mutate(p_actor uuid,p_action text,p_data jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
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
   if a.user_id is not null then update public.profiles set full_name=p_data->>'full_name',phone=p_data->>'phone',is_active=(p_data->>'status' in ('active','invited')) where id=a.user_id and role='sales';end if;
   aid:=rid;details:=jsonb_build_object('previous_status',a.status,'status',p_data->>'status','supplier_rate_bps',p_data->'supplier_rate_bps','manual_rate_bps',p_data->'manual_rate_bps','hold_days',p_data->'hold_days','recurring',p_data->'recurring','enabled',p_data->'commission_enabled');
 elsif p_action='link_account' then
   rid:=(p_data->>'user_id')::uuid;
   select * into p from public.profiles where id=rid for update;
   if aid is null or a.user_id is not null or a.status<>'draft' or p.id is null or lower(p.email)<>a.email or p.role<>'customer' or exists(select 1 from public.orders where user_id=rid) then raise exception 'Não foi possível associar a nova conta comercial.';end if;
   update public.profiles set role='sales',is_active=true where id=rid;
   update public.sales_agents set user_id=rid,status='invited',updated_at=now() where id=aid;
 elsif p_action='assign_customer' then
   if a.status<>'active' then raise exception 'Ativa o comercial antes de atribuir clientes.';end if;
   select * into p from public.profiles where id=(p_data->>'customer_user_id')::uuid and role='customer' and is_active;
   if not found then raise exception 'Cliente inexistente ou inativo.';end if;
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

create function public.sales_observe_refund(p_payment_id uuid,p_refund_cents bigint,p_amount_cents bigint,p_currency text,p_observed_at timestamptz) returns void language plpgsql security invoker set search_path='' as $$
declare p public.payments%rowtype;begin
 select * into p from public.payments where id=p_payment_id and provider='stripe';
 if not found or not exists(select 1 from public.sales_order_attributions where order_id=p.order_id) then return;end if;
 if p_refund_cents<0 or p_refund_cents>p_amount_cents or p_amount_cents<>round(p.amount*100) or lower(p.currency)<>lower(p_currency) then raise exception 'Os dados do pagamento não correspondem à encomenda.';end if;
 insert into public.sales_payment_checks(payment_id,order_id,refund_cents,observed_at) values(p.id,p.order_id,p_refund_cents,p_observed_at)
 on conflict(payment_id) do update set refund_cents=excluded.refund_cents,observed_at=excluded.observed_at where public.sales_payment_checks.observed_at<=excluded.observed_at;
end $$;
revoke all on function public.sales_observe_refund(uuid,bigint,bigint,text,timestamptz) from public,anon,authenticated;
grant execute on function public.sales_observe_refund(uuid,bigint,bigint,text,timestamptz) to service_role;

create function public.sales_summary(p_agent_id uuid default null) returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(t),'[]'::jsonb) from (
 select c.agent_id,c.currency,
 coalesce(sum(c.earned_cents) filter(where c.state='forecast'),0) forecast_cents,
 coalesce(sum(greatest(0,c.earned_cents-c.paid_cents)) filter(where c.state='eligible' and c.approved_at is null),0) eligible_cents,
 coalesce(sum(c.earned_cents-c.paid_cents) filter(where c.approved_at is not null and c.approved_cents=c.earned_cents and (c.state='eligible' or (c.state='cancelled' and c.paid_cents>c.earned_cents))),0) approved_cents,
 coalesce(sum(c.paid_cents),0) paid_cents,
 coalesce(sum(least(0,c.earned_cents-c.paid_cents)),0) adjustment_cents,
 count(*) filter(where c.review_required) review_count,
 coalesce(sum(greatest(0,c.supplier_base_cents+c.manual_base_cents-coalesce(r.supplier_net_cents,0)-coalesce(r.manual_net_cents,0))) filter(where o.payment_status in ('paid','partially_refunded') and o.status not in ('cancelled','refunded','failed') and o.deleted_at is null and o.paid_at>=date_trunc('month',now())),0) month_sales_cents
 from public.sales_commissions c join public.orders o on o.id=c.order_id left join public.sales_refund_allocations r on r.order_id=c.order_id
 where p_agent_id is null or c.agent_id=p_agent_id group by c.agent_id,c.currency
 ) t;
$$;
revoke all on function public.sales_summary(uuid) from public,anon,authenticated;
grant execute on function public.sales_summary(uuid) to service_role;

revoke all on function public.sales_refresh_commissions(uuid),public.sales_admin_mutate(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.sales_refresh_commissions(uuid),public.sales_admin_mutate(uuid,text,jsonb) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('sales-documents','sales-documents',false,3145728,array['application/pdf','image/png','image/jpeg']);
-- Documents use existing server-side signed URL patterns after explicit agent/admin authorization. No public storage policy.
commit;
