-- Run inside BEGIN / ROLLBACK only. No email worker or supplier call is made.
-- Exercises the real schema with an eligible existing order; no fixtures persist.
do $$
declare
  o public.orders%rowtype;
  snapshot jsonb;
  result jsonb;
  original_approvals jsonb;
  checkout_items jsonb;
  before_count integer;
begin
  select * into strict o from public.orders
  where deleted_at is null and payment_status='paid' and supplier_test_mode=false
    and supplier_order_stamp is not null and source_cart_id is not null and user_id is not null
    and status not in ('cancelled','refunded','failed','shipped','delivered')
    and exists(select 1 from public.order_items i where i.order_id=orders.id and i.personalization_required)
  order by created_at desc limit 1;
  if o.artwork_email is distinct from (select coalesce(nullif(btrim(artwork_email),''),o.customer_email) from public.carts where id=o.source_cart_id) then
    raise exception 'approval recipient was not backfilled from checkout';
  end if;
  select jsonb_agg(jsonb_build_object('id',id,'approved',artwork_approved) order by id) into original_approvals from public.order_items where order_id=o.id;
  update public.orders set artwork_email='approval-fixture@example.test' where id=o.id;
  delete from public.customer_email_notifications where order_id=o.id and event_type='order_mockup_available';
  delete from public.order_mockups where order_id=o.id;
  snapshot := jsonb_build_array(jsonb_build_object('order_number','TEST-MOCKUP-ONLY','internal_reference',o.order_number,
    'version',1,'approval_url','https://online-mockup.com/pt/11111111-1111-4111-8111-111111111111/', 'supplier_created_at','2026-10-08T09:00:00'));
  result := public.reconcile_order_mockups(snapshot);
  if result->>'queued'<>'1' or result->>'matched'<>'1' then raise exception 'first proof not queued: %',result; end if;
  if not exists(select 1 from public.customer_email_notifications where order_id=o.id and event_type='order_mockup_available'
    and email_to='approval-fixture@example.test' and payload->>'version'='1') then raise exception 'wrong approval recipient'; end if;
  result := public.reconcile_order_mockups(snapshot);
  if result->>'queued'<>'0' then raise exception 'duplicate email queued'; end if;
  snapshot := jsonb_set(snapshot,'{0,version}','2');
  result := public.reconcile_order_mockups(snapshot);
  if result->>'queued'<>'1' then raise exception 'new version not queued'; end if;
  if not exists(select 1 from public.order_mockups where order_id=o.id and version=1 and state='superseded') then raise exception 'old version still actionable'; end if;
  perform public.reconcile_order_mockups('[]');
  if not exists(select 1 from public.order_mockups where order_id=o.id and version=2 and state='awaiting_confirmation') then raise exception 'absence wrongly treated as approval'; end if;
  if original_approvals is distinct from (select jsonb_agg(jsonb_build_object('id',id,'approved',artwork_approved) order by id) from public.order_items where order_id=o.id) then raise exception 'real artwork approval changed'; end if;
  select count(*) into before_count from public.order_mockups;
  result := public.reconcile_order_mockups(jsonb_set(snapshot,'{0,internal_reference}','"UNKNOWN-REFERENCE"'));
  if result->>'matched'<>'0' or (select count(*) from public.order_mockups)<>before_count then raise exception 'unmatched order associated'; end if;
  update public.orders set status='cancelled' where id=o.id;
  result := public.reconcile_order_mockups(snapshot);
  if result->>'queued'<>'0' or exists(select 1 from public.order_mockups where order_id=o.id and state='pending') then raise exception 'cancelled order receives proof'; end if;

  if has_table_privilege('anon','public.order_mockups','SELECT')
    or has_table_privilege('authenticated','public.order_mockups','SELECT')
    or has_function_privilege('anon','public.reconcile_order_mockups(jsonb)','EXECUTE')
    or has_function_privilege('authenticated','public.reconcile_order_mockups(jsonb)','EXECUTE') then raise exception 'private links or reconciliation exposed'; end if;

  -- Both initial insertion and unpaid checkout retry must snapshot the cart email.
  select jsonb_agg(to_jsonb(i)) into checkout_items from public.order_items i where order_id=o.id;
  update public.carts set status='active',artwork_email='checkout-approver@example.test' where id=o.source_cart_id;
  update public.orders set payment_status='pending',source_cart_id=null where id=o.id;
  o.id := gen_random_uuid(); o.order_number := 'MOCKUP-CHECKOUT-FIXTURE-' || o.id::text;
  perform public.prepare_checkout_order(o.source_cart_id,o.user_id,'{}',to_jsonb(o),checkout_items);
  if (select artwork_email from public.orders where id=o.id) <> 'checkout-approver@example.test' then raise exception 'new checkout lost recipient'; end if;
  update public.carts set artwork_email='revised-approver@example.test' where id=o.source_cart_id;
  perform public.prepare_checkout_order(o.source_cart_id,o.user_id,'{}',to_jsonb(o),checkout_items);
  if (select artwork_email from public.orders where id=o.id) <> 'revised-approver@example.test' then raise exception 'checkout retry lost recipient'; end if;
end;
$$;
