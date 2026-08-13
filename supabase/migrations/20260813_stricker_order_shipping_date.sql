alter table public.orders
add column if not exists supplier_shipping_date date;

comment on column public.orders.supplier_shipping_date is
'Data de expedição devolvida pela API Stricker em OrderV1/OrderDetailsV1.';
