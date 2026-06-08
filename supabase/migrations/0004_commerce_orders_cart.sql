create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),

  user_id uuid references auth.users(id) on delete cascade,

  address_type text not null default 'shipping'
    check (address_type in ('billing', 'shipping')),

  company_name text,
  tax_id text,

  contact_name text not null,
  contact_email text,
  contact_phone text,

  address_line_1 text not null,
  address_line_2 text,
  postal_code text not null,
  city text not null,
  district text,
  country_code text not null default 'PT',

  is_default boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),

  user_id uuid references auth.users(id) on delete cascade,
  session_id text,

  status text not null default 'active'
    check (status in ('active', 'converted', 'abandoned', 'expired')),

  currency text not null default 'EUR',

  subtotal numeric(12,2) not null default 0,
  personalization_total numeric(12,2) not null default 0,
  setup_total numeric(12,2) not null default 0,
  shipping_total numeric(12,2) not null default 0,
  discount_total numeric(12,2) not null default 0,
  tax_total numeric(12,2) not null default 0,
  grand_total numeric(12,2) not null default 0,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint carts_user_or_session_check
    check (user_id is not null or session_id is not null)
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),

  cart_id uuid not null references public.carts(id) on delete cascade,

  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid references public.product_variants(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,

  product_sku text not null,
  product_name text not null,

  quantity integer not null check (quantity > 0),

  unit_price numeric(12,4) not null default 0,
  personalization_unit_price numeric(12,4) not null default 0,
  setup_cost numeric(12,2) not null default 0,

  subtotal numeric(12,2) not null default 0,
  personalization_total numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,

  personalization_required boolean not null default false,
  personalization_technique_id uuid references public.printing_techniques(id) on delete set null,
  personalization_notes text,

  personalization_data jsonb not null default '{}'::jsonb,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.personalization_files (
  id uuid primary key default gen_random_uuid(),

  user_id uuid references auth.users(id) on delete set null,

  cart_item_id uuid references public.cart_items(id) on delete cascade,
  order_item_id uuid,

  file_name text not null,
  file_url text not null,
  file_type text,
  file_size_bytes bigint,

  upload_status text not null default 'uploaded'
    check (upload_status in ('uploaded', 'validated', 'rejected')),

  validation_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),

  user_id uuid references auth.users(id) on delete set null,

  order_number text not null unique,

  customer_email text not null,
  customer_name text not null,
  customer_phone text,

  company_name text,
  company_tax_id text,

  status text not null default 'pending_payment'
    check (status in (
      'pending_payment',
      'paid',
      'processing',
      'sent_to_supplier',
      'supplier_confirmed',
      'in_production',
      'shipped',
      'delivered',
      'cancelled',
      'refunded',
      'failed'
    )),

  payment_status text not null default 'pending'
    check (payment_status in (
      'pending',
      'authorized',
      'paid',
      'failed',
      'refunded',
      'partially_refunded',
      'cancelled'
    )),

  fulfillment_status text not null default 'unfulfilled'
    check (fulfillment_status in (
      'unfulfilled',
      'partially_fulfilled',
      'fulfilled',
      'shipped',
      'delivered',
      'cancelled'
    )),

  currency text not null default 'EUR',

  subtotal numeric(12,2) not null default 0,
  personalization_total numeric(12,2) not null default 0,
  setup_total numeric(12,2) not null default 0,
  shipping_total numeric(12,2) not null default 0,
  discount_total numeric(12,2) not null default 0,
  tax_total numeric(12,2) not null default 0,
  grand_total numeric(12,2) not null default 0,

  billing_address_id uuid references public.customer_addresses(id) on delete set null,
  shipping_address_id uuid references public.customer_addresses(id) on delete set null,

  stripe_checkout_session_id text,
  stripe_payment_intent_id text,

  invoice_number text,
  invoice_url text,
  invoice_status text default 'pending'
    check (invoice_status in ('pending', 'issued', 'sent', 'cancelled')),

  customer_notes text,
  internal_notes text,

  metadata jsonb not null default '{}'::jsonb,

  paid_at timestamptz,
  cancelled_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),

  order_id uuid not null references public.orders(id) on delete cascade,

  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,

  product_sku text not null,
  product_name text not null,

  quantity integer not null check (quantity > 0),

  unit_price numeric(12,4) not null default 0,
  personalization_unit_price numeric(12,4) not null default 0,
  setup_cost numeric(12,2) not null default 0,

  subtotal numeric(12,2) not null default 0,
  personalization_total numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,

  personalization_required boolean not null default false,
  personalization_technique_id uuid references public.printing_techniques(id) on delete set null,
  personalization_notes text,
  personalization_data jsonb not null default '{}'::jsonb,

  supplier_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.personalization_files
drop constraint if exists personalization_files_order_item_id_fkey;

alter table public.personalization_files
add constraint personalization_files_order_item_id_fkey
foreign key (order_item_id)
references public.order_items(id)
on delete cascade;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),

  order_id uuid not null references public.orders(id) on delete cascade,

  provider text not null default 'stripe'
    check (provider in ('stripe', 'bank_transfer', 'manual')),

  provider_payment_id text,
  provider_checkout_session_id text,

  status text not null default 'pending'
    check (status in (
      'pending',
      'authorized',
      'paid',
      'failed',
      'refunded',
      'partially_refunded',
      'cancelled'
    )),

  amount numeric(12,2) not null,
  currency text not null default 'EUR',

  paid_at timestamptz,
  failed_at timestamptz,
  refunded_at timestamptz,

  raw_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),

  order_id uuid not null references public.orders(id) on delete cascade,

  previous_status text,
  new_status text not null,

  changed_by uuid references auth.users(id) on delete set null,

  notes text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create table if not exists public.supplier_orders (
  id uuid primary key default gen_random_uuid(),

  order_id uuid not null references public.orders(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,

  supplier_order_reference text,

  status text not null default 'pending'
    check (status in (
      'pending',
      'ready_to_send',
      'sent',
      'confirmed',
      'in_production',
      'shipped',
      'delivered',
      'cancelled',
      'failed'
    )),

  payload_sent jsonb not null default '{}'::jsonb,
  payload_response jsonb not null default '{}'::jsonb,

  error_message text,

  sent_at timestamptz,
  confirmed_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,

  tracking_number text,
  tracking_url text,
  carrier text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (order_id, supplier_id)
);

create table if not exists public.supplier_order_items (
  id uuid primary key default gen_random_uuid(),

  supplier_order_id uuid not null references public.supplier_orders(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,

  supplier_product_id text,
  supplier_variant_id text,
  supplier_sku text,

  quantity integer not null check (quantity > 0),

  payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (supplier_order_id, order_item_id)
);

create table if not exists public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),

  cart_id uuid references public.carts(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,

  provider text not null default 'stripe'
    check (provider in ('stripe')),

  provider_session_id text not null unique,

  status text not null default 'created'
    check (status in ('created', 'open', 'completed', 'expired', 'cancelled', 'failed')),

  amount_total numeric(12,2) not null default 0,
  currency text not null default 'EUR',

  checkout_url text,

  raw_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_addresses_user_id_idx
on public.customer_addresses(user_id);

create index if not exists carts_user_id_idx
on public.carts(user_id);

create index if not exists carts_session_id_idx
on public.carts(session_id);

create index if not exists carts_status_idx
on public.carts(status);

create index if not exists cart_items_cart_id_idx
on public.cart_items(cart_id);

create index if not exists cart_items_product_id_idx
on public.cart_items(product_id);

create index if not exists orders_user_id_idx
on public.orders(user_id);

create index if not exists orders_order_number_idx
on public.orders(order_number);

create index if not exists orders_customer_email_idx
on public.orders(customer_email);

create index if not exists orders_status_idx
on public.orders(status);

create index if not exists orders_payment_status_idx
on public.orders(payment_status);

create index if not exists orders_created_at_idx
on public.orders(created_at desc);

create index if not exists order_items_order_id_idx
on public.order_items(order_id);

create index if not exists order_items_product_id_idx
on public.order_items(product_id);

create index if not exists payments_order_id_idx
on public.payments(order_id);

create index if not exists supplier_orders_order_id_idx
on public.supplier_orders(order_id);

create index if not exists supplier_orders_supplier_id_idx
on public.supplier_orders(supplier_id);

create index if not exists supplier_orders_status_idx
on public.supplier_orders(status);

create index if not exists checkout_sessions_provider_session_id_idx
on public.checkout_sessions(provider_session_id);

create index if not exists personalization_files_cart_item_id_idx
on public.personalization_files(cart_item_id);

create index if not exists personalization_files_order_item_id_idx
on public.personalization_files(order_item_id);

alter table public.customer_addresses enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.personalization_files enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.order_status_history enable row level security;
alter table public.supplier_orders enable row level security;
alter table public.supplier_order_items enable row level security;
alter table public.checkout_sessions enable row level security;

drop policy if exists "Users can manage own addresses" on public.customer_addresses;
create policy "Users can manage own addresses"
on public.customer_addresses
for all
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'sales')
  )
)
with check (
  user_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'sales')
  )
);

drop policy if exists "Users can manage own carts" on public.carts;
create policy "Users can manage own carts"
on public.carts
for all
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'sales')
  )
)
with check (
  user_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'sales')
  )
);

drop policy if exists "Anon can create carts" on public.carts;
create policy "Anon can create carts"
on public.carts
for insert
to anon
with check (user_id is null and session_id is not null);

drop policy if exists "Users can manage own cart items" on public.cart_items;
create policy "Users can manage own cart items"
on public.cart_items
for all
to authenticated
using (
  exists (
    select 1 from public.carts c
    where c.id = cart_items.cart_id
      and (
        c.user_id = auth.uid()
        or exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and p.role in ('admin', 'super_admin', 'sales')
        )
      )
  )
)
with check (
  exists (
    select 1 from public.carts c
    where c.id = cart_items.cart_id
      and (
        c.user_id = auth.uid()
        or exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and p.role in ('admin', 'super_admin', 'sales')
        )
      )
  )
);

drop policy if exists "Anon can create cart items" on public.cart_items;
create policy "Anon can create cart items"
on public.cart_items
for insert
to anon
with check (
  exists (
    select 1 from public.carts c
    where c.id = cart_items.cart_id
      and c.user_id is null
      and c.session_id is not null
      and c.status = 'active'
  )
);

drop policy if exists "Users can view own orders" on public.orders;
create policy "Users can view own orders"
on public.orders
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'sales')
  )
);

drop policy if exists "Service and admins can create orders" on public.orders;
create policy "Service and admins can create orders"
on public.orders
for insert
to authenticated
with check (
  user_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'sales')
  )
);

drop policy if exists "Admins can update orders" on public.orders;
create policy "Admins can update orders"
on public.orders
for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'sales')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'sales')
  )
);

drop policy if exists "Users can view own order items" on public.order_items;
create policy "Users can view own order items"
on public.order_items
for select
to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and (
        o.user_id = auth.uid()
        or exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and p.role in ('admin', 'super_admin', 'sales')
        )
      )
  )
);

drop policy if exists "Admins can manage order items" on public.order_items;
create policy "Admins can manage order items"
on public.order_items
for all
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'sales')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'sales')
  )
);

drop policy if exists "Users can view own payments" on public.payments;
create policy "Users can view own payments"
on public.payments
for select
to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = payments.order_id
      and (
        o.user_id = auth.uid()
        or exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and p.role in ('admin', 'super_admin', 'sales')
        )
      )
  )
);

drop policy if exists "Admins can manage supplier orders" on public.supplier_orders;
create policy "Admins can manage supplier orders"
on public.supplier_orders
for all
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'sales')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'sales')
  )
);

drop policy if exists "Admins can manage supplier order items" on public.supplier_order_items;
create policy "Admins can manage supplier order items"
on public.supplier_order_items
for all
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'sales')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'sales')
  )
);

drop policy if exists "Users can manage own personalization files" on public.personalization_files;
create policy "Users can manage own personalization files"
on public.personalization_files
for all
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'sales')
  )
)
with check (
  user_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'sales')
  )
);

drop policy if exists "Admins can view checkout sessions" on public.checkout_sessions;
create policy "Admins can view checkout sessions"
on public.checkout_sessions
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'sales')
  )
);

drop policy if exists "Admins can view order status history" on public.order_status_history;
create policy "Admins can view order status history"
on public.order_status_history
for select
to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_status_history.order_id
      and (
        o.user_id = auth.uid()
        or exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and p.role in ('admin', 'super_admin', 'sales')
        )
      )
  )
);

create or replace function public.generate_order_number()
returns text
language plpgsql
as $$
declare
  next_number bigint;
begin
  select coalesce(max((regexp_replace(order_number, '\D', '', 'g'))::bigint), 0) + 1
  into next_number
  from public.orders
  where order_number ~ '^LC[0-9]+$';

  return 'LC' || lpad(next_number::text, 8, '0');
end;
$$;

create or replace function public.set_order_number()
returns trigger
language plpgsql
as $$
begin
  if new.order_number is null or length(trim(new.order_number)) = 0 then
    new.order_number = public.generate_order_number();
  end if;

  return new;
end;
$$;

drop trigger if exists orders_set_order_number on public.orders;
create trigger orders_set_order_number
before insert on public.orders
for each row
execute function public.set_order_number();

drop trigger if exists customer_addresses_set_updated_at on public.customer_addresses;
create trigger customer_addresses_set_updated_at
before update on public.customer_addresses
for each row
execute function public.set_updated_at();

drop trigger if exists carts_set_updated_at on public.carts;
create trigger carts_set_updated_at
before update on public.carts
for each row
execute function public.set_updated_at();

drop trigger if exists cart_items_set_updated_at on public.cart_items;
create trigger cart_items_set_updated_at
before update on public.cart_items
for each row
execute function public.set_updated_at();

drop trigger if exists personalization_files_set_updated_at on public.personalization_files;
create trigger personalization_files_set_updated_at
before update on public.personalization_files
for each row
execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();

drop trigger if exists order_items_set_updated_at on public.order_items;
create trigger order_items_set_updated_at
before update on public.order_items
for each row
execute function public.set_updated_at();

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
before update on public.payments
for each row
execute function public.set_updated_at();

drop trigger if exists supplier_orders_set_updated_at on public.supplier_orders;
create trigger supplier_orders_set_updated_at
before update on public.supplier_orders
for each row
execute function public.set_updated_at();

drop trigger if exists supplier_order_items_set_updated_at on public.supplier_order_items;
create trigger supplier_order_items_set_updated_at
before update on public.supplier_order_items
for each row
execute function public.set_updated_at();

drop trigger if exists checkout_sessions_set_updated_at on public.checkout_sessions;
create trigger checkout_sessions_set_updated_at
before update on public.checkout_sessions
for each row
execute function public.set_updated_at();