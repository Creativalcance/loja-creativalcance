alter table public.orders
  add column invoice_storage_path text,
  add column invoice_file_name text,
  add column invoice_uploaded_at timestamptz;

alter table public.orders add constraint orders_invoice_storage_path_check check (
  invoice_storage_path is null or
  invoice_storage_path ~ ('^' || id::text || '/[a-f0-9]{64}[.]pdf$')
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('order-invoices', 'order-invoices', false, 3145728, array['application/pdf'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
-- No client storage policies: uploads and signed downloads require server authorization.

alter table public.customer_email_notifications
  drop constraint customer_email_notifications_event_type_check;
alter table public.customer_email_notifications
  add constraint customer_email_notifications_event_type_check check (event_type in (
    'account_welcome', 'order_confirmation', 'order_status_changed',
    'order_tracking_available', 'invoice_required', 'order_invoice_available'
  ));
alter table public.customer_email_notifications drop constraint customer_email_notifications_email_status_check;
alter table public.customer_email_notifications add constraint customer_email_notifications_email_status_check
  check (email_status in ('pending', 'sending', 'sent', 'failed', 'cancelled'));

-- The email is queued in the same transaction as the order update. This covers
-- supplier sync, manual dispatch and retries without relying on a browser staying open.
create or replace function private.queue_order_invoice_emails()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  billing jsonb;
  shipping jsonb;
  items jsonb;
  paid_total numeric;
  refunded_total numeric;
  is_test boolean;
  mail_locale text;
begin
  if new.deleted_at is not null then return new; end if;

  if new.payment_status = 'paid'
     and new.status not in ('cancelled', 'refunded', 'failed')
     and (new.status in ('shipped', 'delivered') or new.fulfillment_status in ('shipped', 'delivered'))
     and coalesce(new.invoice_status, 'pending') = 'pending'
     and new.invoice_storage_path is null and new.invoice_url is null
     and (new.status is distinct from old.status or new.fulfillment_status is distinct from old.fulfillment_status
       or new.shipped_at is distinct from old.shipped_at or new.payment_status is distinct from old.payment_status)
     and not exists (select 1 from public.customer_email_notifications where event_key = 'invoice-required:' || new.id::text)
  then
    select jsonb_build_object('name', a.contact_name, 'company', a.company_name, 'taxId', a.tax_id,
      'email', a.contact_email, 'phone', a.contact_phone, 'line1', a.address_line_1,
      'line2', a.address_line_2, 'postalCode', a.postal_code, 'city', a.city,
      'district', a.district, 'country', a.country_code)
    into billing from public.customer_addresses a where a.id = new.billing_address_id;
    select jsonb_build_object('name', a.contact_name, 'company', a.company_name, 'taxId', a.tax_id,
      'email', a.contact_email, 'phone', a.contact_phone, 'line1', a.address_line_1,
      'line2', a.address_line_2, 'postalCode', a.postal_code, 'city', a.city,
      'district', a.district, 'country', a.country_code)
    into shipping from public.customer_addresses a where a.id = new.shipping_address_id;
    select jsonb_agg(jsonb_build_object('sku', i.product_sku, 'name', i.product_name,
      'quantity', i.quantity, 'unitPrice', i.unit_price, 'subtotal', i.subtotal,
      'personalizationTotal', i.personalization_total, 'setupCost', i.setup_cost,
      'extrasTotal', i.extras_total, 'total', i.total,
      'technique', i.customization_technique_name, 'location', i.customization_location_name,
      'notes', i.personalization_notes) order by i.created_at, i.id)
    into items from public.order_items i where i.order_id = new.id;
    select sum(coalesce(nullif(p.amount_received, 0), p.amount)), sum(coalesce(p.amount_refunded, 0))
    into paid_total, refunded_total from public.payments p
    where p.order_id = new.id and upper(p.currency) = upper(new.currency)
      and p.status in ('paid', 'succeeded', 'refunded', 'partially_refunded');
    select not e.livemode into is_test from public.stripe_webhook_events e
      where e.order_id = new.id and e.status = 'processed' order by e.processed_at desc limit 1;
    is_test := coalesce(is_test, new.stripe_checkout_session_id like 'cs_test_%', new.supplier_test_mode, true);

    insert into public.customer_email_notifications (event_key, event_type, order_id, email_to, locale, payload)
    values ('invoice-required:' || new.id::text, 'invoice_required', new.id,
      'info@creativalcance.com', 'pt', jsonb_build_object(
        'orderId', new.id, 'orderNumber', new.order_number, 'testMode', is_test,
        'createdAt', new.created_at, 'paidAt', new.paid_at,
        'shippedAt', coalesce(new.shipped_at, new.delivered_at, now()),
        'customerName', new.customer_name, 'customerEmail', new.customer_email,
        'customerPhone', new.customer_phone, 'companyName', new.company_name, 'taxId', new.company_tax_id,
        'billingAddress', billing, 'shippingAddress', shipping,
        'customerNotes', new.customer_notes, 'customerReference', new.internal_reference,
        'currency', new.currency, 'subtotal', new.subtotal,
        'personalizationTotal', new.personalization_total, 'setupTotal', new.setup_total,
        'shippingTotal', new.shipping_total, 'discountTotal', new.discount_total,
        'taxTotal', new.tax_total, 'taxRate', new.metadata->'taxRate',
        'grandTotal', new.grand_total, 'amountPaid', paid_total, 'amountRefunded', refunded_total,
        'shippingMethod', new.shipping_method, 'shippingCarrier', new.shipping_carrier,
        'trackingNumber', new.tracking_number, 'trackingUrl', new.tracking_url, 'items', coalesce(items, '[]'::jsonb)
      )) on conflict (event_key) do nothing;
  end if;

  if new.invoice_storage_path is not null and new.invoice_number is not null
     and new.invoice_status in ('issued', 'sent')
     and not exists (select 1 from public.customer_email_notifications
       where event_key = 'order-invoice:' || new.id::text || ':' || split_part(split_part(new.invoice_storage_path, '/', 2), '.', 1))
  then
    mail_locale := lower(coalesce(new.metadata->>'locale', 'pt'));
    if mail_locale not in ('pt', 'en', 'fr', 'es', 'de', 'it') then mail_locale := 'pt'; end if;
    insert into public.customer_email_notifications
      (event_key, event_type, order_id, user_id, email_to, locale, payload)
    values ('order-invoice:' || new.id::text || ':' || split_part(split_part(new.invoice_storage_path, '/', 2), '.', 1),
      'order_invoice_available', new.id, new.user_id, new.customer_email, mail_locale,
      jsonb_build_object('orderId', new.id, 'orderNumber', new.order_number,
        'customerName', new.customer_name, 'invoiceNumber', new.invoice_number,
        'invoicePath', new.invoice_storage_path, 'invoiceFileName', new.invoice_file_name))
    on conflict (event_key) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function private.queue_order_invoice_emails() from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.queue_order_invoice_emails() to service_role;
-- The trigger is enabled in the follow-up migration after the new email renderer
-- is deployed, so an older worker can never send an unrecognized event type.
