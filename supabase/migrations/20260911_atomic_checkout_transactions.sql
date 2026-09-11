-- Keep checkout database writes atomic around the external Stripe call.
-- These RPCs are intentionally restricted to service_role because they accept
-- server-built records and operate across RLS-protected commerce tables.

create or replace function public.prepare_checkout_order(
  p_cart_id uuid,
  p_user_id uuid,
  p_cart jsonb,
  p_order jsonb,
  p_items jsonb
)
returns table (id uuid, order_number text)
language plpgsql
security invoker
set search_path = ''
as $$
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
      internal_reference, metadata
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
      v_order.metadata
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
$$;

create or replace function public.record_checkout_payment(
  p_order_id uuid,
  p_cart_id uuid,
  p_user_id uuid,
  p_payment jsonb,
  p_checkout_session jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_payment public.payments%rowtype;
  v_session public.checkout_sessions%rowtype;
  v_existing_payment public.payments%rowtype;
  v_existing_session public.checkout_sessions%rowtype;
begin
  if jsonb_typeof(p_payment) <> 'object' or jsonb_typeof(p_checkout_session) <> 'object' then
    raise exception using errcode = '22023', message = 'checkout_payment_payload_invalid';
  end if;

  v_payment := jsonb_populate_record(null::public.payments, p_payment);
  v_session := jsonb_populate_record(null::public.checkout_sessions, p_checkout_session);

  if v_payment.order_id is distinct from p_order_id
     or v_session.order_id is distinct from p_order_id
     or v_session.cart_id is distinct from p_cart_id
     or v_session.user_id is distinct from p_user_id
     or v_session.provider_session_id is null
     or v_payment.provider_checkout_session_id is distinct from v_session.provider_session_id
     or v_payment.amount is distinct from v_session.amount_total
     or v_payment.currency is distinct from v_session.currency then
    raise exception using errcode = '22023', message = 'checkout_payment_identity_invalid';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_session.provider_session_id, 0)
  );

  select * into v_order
  from public.orders
  where orders.id = p_order_id and source_cart_id = p_cart_id and user_id = p_user_id
  for update;

  if not found or v_order.payment_status = 'paid' then
    raise exception using errcode = 'P0001', message = 'checkout_order_unavailable';
  end if;

  select * into v_existing_payment
  from public.payments
  where provider_checkout_session_id = v_session.provider_session_id
     or (v_payment.provider_payment_intent_id is not null
         and provider_payment_intent_id = v_payment.provider_payment_intent_id)
  limit 1
  for update;

  if found then
    if v_existing_payment.order_id is distinct from p_order_id then
      raise exception using errcode = '23505', message = 'checkout_payment_already_assigned';
    end if;

    update public.payments
    set provider_payment_id = v_payment.provider_payment_id,
        provider_checkout_session_id = v_session.provider_session_id,
        provider_payment_intent_id = v_payment.provider_payment_intent_id,
        status = 'pending', amount = v_payment.amount,
        amount_received = v_payment.amount_received,
        amount_refunded = v_payment.amount_refunded,
        currency = v_payment.currency, raw_payload = v_payment.raw_payload,
        metadata = v_payment.metadata
    where payments.id = v_existing_payment.id;
  else
    insert into public.payments (
      order_id, provider, provider_payment_id, provider_checkout_session_id,
      provider_payment_intent_id, status, amount, amount_received, amount_refunded,
      currency, raw_payload, metadata
    ) values (
      p_order_id, 'stripe', v_payment.provider_payment_id,
      v_session.provider_session_id, v_payment.provider_payment_intent_id,
      'pending', v_payment.amount, v_payment.amount_received,
      v_payment.amount_refunded, v_payment.currency, v_payment.raw_payload,
      v_payment.metadata
    );
  end if;

  select * into v_existing_session
  from public.checkout_sessions
  where provider_session_id = v_session.provider_session_id
  for update;

  if found then
    if v_existing_session.order_id is distinct from p_order_id then
      raise exception using errcode = '23505', message = 'checkout_session_already_assigned';
    end if;

    update public.checkout_sessions
    set cart_id = p_cart_id, order_id = p_order_id, user_id = p_user_id,
        provider_payment_intent_id = v_session.provider_payment_intent_id,
        status = 'open', amount_total = v_session.amount_total,
        currency = v_session.currency, checkout_url = v_session.checkout_url,
        expires_at = v_session.expires_at, raw_payload = v_session.raw_payload,
        metadata = v_session.metadata
    where checkout_sessions.id = v_existing_session.id;
  else
    insert into public.checkout_sessions (
      cart_id, order_id, user_id, provider, provider_session_id,
      provider_payment_intent_id, status, amount_total, currency, checkout_url,
      expires_at, raw_payload, metadata
    ) values (
      p_cart_id, p_order_id, p_user_id, 'stripe', v_session.provider_session_id,
      v_session.provider_payment_intent_id, 'open', v_session.amount_total,
      v_session.currency, v_session.checkout_url, v_session.expires_at,
      v_session.raw_payload, v_session.metadata
    );
  end if;

  update public.orders
  set stripe_checkout_session_id = v_session.provider_session_id,
      stripe_payment_intent_id = v_session.provider_payment_intent_id
  where orders.id = p_order_id;
end;
$$;

revoke all on function public.prepare_checkout_order(uuid, uuid, jsonb, jsonb, jsonb)
from public, anon, authenticated;
grant execute on function public.prepare_checkout_order(uuid, uuid, jsonb, jsonb, jsonb)
to service_role;

revoke all on function public.record_checkout_payment(uuid, uuid, uuid, jsonb, jsonb)
from public, anon, authenticated;
grant execute on function public.record_checkout_payment(uuid, uuid, uuid, jsonb, jsonb)
to service_role;
