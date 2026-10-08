-- Snapshot the requested approval recipient before the source cart can change.
alter table public.orders add column artwork_email text;
update public.orders o set artwork_email = coalesce(nullif(btrim(c.artwork_email), ''), o.customer_email)
from public.carts c where c.id = o.source_cart_id and c.user_id = o.user_id;
update public.orders set artwork_email = customer_email where artwork_email is null;

create table public.order_mockups (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  supplier_order_number text not null,
  version integer not null check (version > 0),
  approval_url text not null check (approval_url ~ '^https://online-mockup[.]com/[a-z]{2}/[0-9a-fA-F-]{36}/?$'),
  supplier_created_at text not null,
  state text not null default 'pending' check (state in ('pending','awaiting_confirmation','superseded','closed')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  state_changed_at timestamptz not null default now(),
  unique (supplier_order_number, version)
);
create index order_mockups_order_id_idx on public.order_mockups(order_id, version desc);
create index order_mockups_active_idx on public.order_mockups(state) where state in ('pending','awaiting_confirmation');
alter table public.order_mockups enable row level security;
revoke all on public.order_mockups from public, anon, authenticated;
grant select, insert, update, delete on public.order_mockups to service_role;
-- Server reads only after order ownership or admin authorization. Links grant approval authority.

alter table public.customer_email_notifications drop constraint customer_email_notifications_event_type_check;
alter table public.customer_email_notifications add constraint customer_email_notifications_event_type_check check (event_type in (
  'account_welcome','order_confirmation','order_status_changed','order_tracking_available',
  'invoice_required','order_invoice_available','order_mockup_available'
));

-- Persist the complete, validated account-wide snapshot and queue emails atomically.
-- This function has no provider write operations, and never records an approval.
create or replace function public.reconcile_order_mockups(p_mockups jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_mockup jsonb;
  v_order public.orders%rowtype;
  existing_order uuid;
  matched_count integer := 0;
  queued_count integer := 0;
begin
  if p_mockups is null or jsonb_typeof(p_mockups) <> 'array' then
    raise exception 'invalid_mockup_snapshot';
  end if;
  perform pg_advisory_xact_lock(hashtext('360:reconcile_order_mockups'));
  for v_mockup in select value from jsonb_array_elements(p_mockups) loop
    if nullif(v_mockup->>'order_number','') is null or nullif(v_mockup->>'approval_url','') is null
      or (v_mockup->>'version')::integer < 1 then raise exception 'invalid_mockup_record'; end if;
    select * into v_order from public.orders
    where order_number = v_mockup->>'internal_reference'
      and deleted_at is null and payment_status = 'paid' and supplier_test_mode = false
      and supplier_order_stamp is not null
      and status not in ('cancelled','refunded','failed','shipped','delivered')
      and exists (select 1 from public.order_items i where i.order_id = orders.id and i.personalization_required);
    if not found then continue; end if;

    select order_id into existing_order from public.order_mockups
      where supplier_order_number = v_mockup->>'order_number' limit 1;
    if found and existing_order <> v_order.id then raise exception 'mockup_order_mismatch'; end if;
    if exists (select 1 from public.order_mockups where supplier_order_number = v_mockup->>'order_number'
      and version > (v_mockup->>'version')::integer) then continue; end if;

    insert into public.order_mockups(order_id,supplier_order_number,version,approval_url,supplier_created_at)
      values (v_order.id,v_mockup->>'order_number',(v_mockup->>'version')::integer,v_mockup->>'approval_url',v_mockup->>'supplier_created_at')
    on conflict (supplier_order_number,version) do update set
      approval_url = excluded.approval_url, last_seen_at = now(), state = 'pending',
      state_changed_at = case when order_mockups.state <> 'pending' then now() else order_mockups.state_changed_at end;
    matched_count := matched_count + 1;
  end loop;

  update public.order_mockups p set state = 'closed', state_changed_at = now()
  from public.orders o where o.id = p.order_id and p.state in ('pending','awaiting_confirmation')
    and (o.deleted_at is not null or o.payment_status <> 'paid' or o.status in ('cancelled','refunded','failed','shipped','delivered'));

  update public.order_mockups p set state = 'superseded', state_changed_at = now()
  where p.state in ('pending','awaiting_confirmation') and exists (
    select 1 from public.order_mockups newer where newer.order_id=p.order_id
      and newer.supplier_order_number=p.supplier_order_number and newer.version>p.version
  );

  -- Absence only means no longer pending. Approval versus revision is not inferred.
  update public.order_mockups p set state = 'awaiting_confirmation', state_changed_at = now()
  where p.state = 'pending' and not exists (
    select 1 from jsonb_array_elements(p_mockups) m
    join public.orders o on o.order_number=m->>'internal_reference' and o.id=p.order_id
    where m->>'order_number'=p.supplier_order_number and (m->>'version')::integer=p.version
  );

  insert into public.customer_email_notifications(event_key,event_type,email_to,locale,user_id,order_id,payload)
  select 'order-mockup:' || p.id::text || ':' || md5(p.approval_url || ':' || o.artwork_email),
    'order_mockup_available', o.artwork_email,
    case when o.metadata->>'locale' in ('pt','en','fr','es','de','it') then o.metadata->>'locale' else 'pt' end,
    o.user_id,o.id,jsonb_build_object('orderId',o.id,'orderNumber',o.order_number,
      'mockupId',p.id,'version',p.version,'approvalUrl',p.approval_url)
  from public.order_mockups p join public.orders o on o.id=p.order_id
  where p.state='pending' and p.last_seen_at=now()
    and o.artwork_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  on conflict (event_key) do nothing;
  get diagnostics queued_count = row_count;
  return jsonb_build_object('matched',matched_count,'queued',queued_count);
end;
$$;
revoke all on function public.reconcile_order_mockups(jsonb) from public, anon, authenticated;
grant execute on function public.reconcile_order_mockups(jsonb) to service_role;

CREATE OR REPLACE FUNCTION public.prepare_checkout_order(p_cart_id uuid, p_user_id uuid, p_cart jsonb, p_order jsonb, p_items jsonb)
 RETURNS TABLE(id uuid, order_number text)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_cart public.carts%rowtype;
  v_order public.orders%rowtype;
  v_existing public.orders%rowtype;
  v_order_id uuid;
  v_order_number text;
begin
  if p_cart_id is null or p_user_id is null then
    raise exception using errcode = '22023', message = 'checkout_cart_and_user_required';
  end if;

  if jsonb_typeof(p_cart) <> 'object'
     or jsonb_typeof(p_order) <> 'object'
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception using errcode = '22023', message = 'checkout_payload_invalid';
  end if;

  select * into v_cart
  from public.carts
  where carts.id = p_cart_id
  for update;

  if not found or v_cart.status <> 'active' or v_cart.user_id is distinct from p_user_id then
    raise exception using errcode = 'P0001', message = 'checkout_cart_unavailable';
  end if;

  v_order := jsonb_populate_record(null::public.orders, p_order);

  if v_order.id is null
     or v_order.order_number is null
     or v_order.source_cart_id is distinct from p_cart_id
     or v_order.user_id is distinct from p_user_id then
    raise exception using errcode = '22023', message = 'checkout_order_identity_invalid';
  end if;

  update public.carts
  set subtotal = coalesce((p_cart ->> 'subtotal')::numeric, v_cart.subtotal),
      personalization_total = coalesce((p_cart ->> 'personalization_total')::numeric, v_cart.personalization_total),
      setup_total = coalesce((p_cart ->> 'setup_total')::numeric, v_cart.setup_total),
      shipping_total = coalesce((p_cart ->> 'shipping_total')::numeric, v_cart.shipping_total),
      discount_total = coalesce((p_cart ->> 'discount_total')::numeric, v_cart.discount_total),
      tax_rate = coalesce((p_cart ->> 'tax_rate')::numeric, v_cart.tax_rate),
      tax_region = p_cart ->> 'tax_region',
      tax_total = coalesce((p_cart ->> 'tax_total')::numeric, v_cart.tax_total),
      grand_total = coalesce((p_cart ->> 'grand_total')::numeric, v_cart.grand_total),
      checkout_step = 'payment',
      payment_started_at = now()
  where carts.id = p_cart_id;

  select * into v_existing
  from public.orders
  where source_cart_id = p_cart_id
  for update;

  if found then
    if v_existing.payment_status = 'paid' then
      raise exception using errcode = 'P0001', message = 'checkout_order_already_paid';
    end if;

    v_order_id := v_existing.id;
    v_order_number := v_existing.order_number;

    update public.orders
    set user_id = p_user_id,
        customer_email = v_order.customer_email,
        artwork_email = coalesce(nullif(btrim(v_cart.artwork_email), ''), v_order.customer_email),
        customer_name = v_order.customer_name,
        customer_phone = v_order.customer_phone,
        company_name = v_order.company_name,
        company_tax_id = v_order.company_tax_id,
        status = 'pending_payment',
        payment_status = 'pending',
        fulfillment_status = 'unfulfilled',
        deleted_at = null,
        deleted_by = null,
        cancelled_at = null,
        currency = v_order.currency,
        subtotal = v_order.subtotal,
        personalization_total = v_order.personalization_total,
        setup_total = v_order.setup_total,
        shipping_total = v_order.shipping_total,
        discount_total = v_order.discount_total,
        tax_total = v_order.tax_total,
        grand_total = v_order.grand_total,
        shipping_address_id = v_order.shipping_address_id,
        customer_notes = v_order.customer_notes,
        supplier_submission_status = 'not_submitted',
        supplier_test_mode = v_order.supplier_test_mode,
        shipping_method = v_order.shipping_method,
        shipping_carrier = v_order.shipping_carrier,
        requested_shipping_date = v_order.requested_shipping_date,
        no_shipping = v_order.no_shipping,
        internal_reference = v_order.internal_reference,
        metadata = v_order.metadata
    where orders.id = v_order_id;

    delete from public.order_items where order_id = v_order_id;
  else
    v_order_id := v_order.id;
    v_order_number := v_order.order_number;

    insert into public.orders (
      id, user_id, order_number, customer_email, customer_name, customer_phone,
      company_name, company_tax_id, status, payment_status, fulfillment_status,
      currency, subtotal, personalization_total, setup_total, shipping_total,
      discount_total, tax_total, grand_total, shipping_address_id, customer_notes,
      source_cart_id, invoice_status, supplier_submission_status, supplier_test_mode,
      shipping_method, shipping_carrier, requested_shipping_date, no_shipping,
      internal_reference, metadata, artwork_email
    ) values (
      v_order_id, p_user_id, v_order_number, v_order.customer_email, v_order.customer_name,
      v_order.customer_phone, v_order.company_name, v_order.company_tax_id,
      'pending_payment', 'pending', 'unfulfilled', v_order.currency, v_order.subtotal,
      v_order.personalization_total, v_order.setup_total, v_order.shipping_total,
      v_order.discount_total, v_order.tax_total, v_order.grand_total,
      v_order.shipping_address_id, v_order.customer_notes, p_cart_id,
      coalesce(v_order.invoice_status, 'pending'), 'not_submitted',
      v_order.supplier_test_mode, v_order.shipping_method, v_order.shipping_carrier,
      v_order.requested_shipping_date, v_order.no_shipping, v_order.internal_reference,
      v_order.metadata, coalesce(nullif(btrim(v_cart.artwork_email), ''), v_order.customer_email)
    );
  end if;

  insert into public.order_items (
    order_id, source_cart_item_id, product_id, variant_id, supplier_id,
    product_sku, product_name, quantity, unit_price, personalization_unit_price,
    setup_cost, extras_total, subtotal, personalization_total, total,
    personalization_required, personalization_technique_id, personalization_notes,
    personalization_data, supplier_payload, customization_draft_id,
    customization_location_id, customization_component_name,
    customization_location_name, customization_technique_name,
    supplier_product_reference, supplier_sku, service_code, table_code,
    table_code_option, handling_cost_code, printing_area_label, printing_width_mm,
    printing_height_mm, printing_area_mm2, logo_file_name, logo_storage_path,
    logo_url, technical_preview_url, logo_position_x, logo_position_y, logo_scale,
    logo_rotation, logo_width_mm, logo_height_mm, logo_area, artwork_status,
    artwork_approved, supplier_submission_status
  )
  select
    v_order_id, item.source_cart_item_id, item.product_id, item.variant_id,
    item.supplier_id, item.product_sku, item.product_name, item.quantity,
    item.unit_price, item.personalization_unit_price, item.setup_cost,
    item.extras_total, item.subtotal, item.personalization_total, item.total,
    item.personalization_required, item.personalization_technique_id,
    item.personalization_notes, item.personalization_data, item.supplier_payload,
    item.customization_draft_id, item.customization_location_id,
    item.customization_component_name, item.customization_location_name,
    item.customization_technique_name, item.supplier_product_reference,
    item.supplier_sku, item.service_code, item.table_code, item.table_code_option,
    item.handling_cost_code, item.printing_area_label, item.printing_width_mm,
    item.printing_height_mm, item.printing_area_mm2, item.logo_file_name,
    item.logo_storage_path, item.logo_url, item.technical_preview_url,
    item.logo_position_x, item.logo_position_y, item.logo_scale,
    item.logo_rotation, item.logo_width_mm, item.logo_height_mm, item.logo_area,
    item.artwork_status, item.artwork_approved, 'not_submitted'
  from jsonb_populate_recordset(null::public.order_items, p_items) as item;

  return query select v_order_id, v_order_number;
end;
$function$
;

