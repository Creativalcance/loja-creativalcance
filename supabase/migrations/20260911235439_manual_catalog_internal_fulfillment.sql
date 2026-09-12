-- Manual catalogue products share the existing storefront and checkout, but
-- are fulfilled by the 360 team instead of a supplier API.

alter table public.categories
  add column if not exists catalog_source text not null default 'supplier_sync';

alter table public.products
  add column if not exists catalog_source text not null default 'supplier_sync',
  add column if not exists fulfillment_route text not null default 'supplier_api';

alter table public.cart_items
  add column if not exists fulfillment_route text not null default 'supplier_api';

alter table public.order_items
  add column if not exists fulfillment_route text not null default 'supplier_api';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'categories_catalog_source_check') then
    alter table public.categories add constraint categories_catalog_source_check
      check (catalog_source in ('supplier_sync', 'manual'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'products_catalog_source_check') then
    alter table public.products add constraint products_catalog_source_check
      check (catalog_source in ('supplier_sync', 'manual'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'products_fulfillment_route_check') then
    alter table public.products add constraint products_fulfillment_route_check
      check (fulfillment_route in ('supplier_api', 'internal_360'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cart_items_fulfillment_route_check') then
    alter table public.cart_items add constraint cart_items_fulfillment_route_check
      check (fulfillment_route in ('supplier_api', 'internal_360'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'order_items_fulfillment_route_check') then
    alter table public.order_items add constraint order_items_fulfillment_route_check
      check (fulfillment_route in ('supplier_api', 'internal_360'));
  end if;
end $$;

create table if not exists public.product_categories (
  product_id uuid not null references public.products(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (product_id, category_id)
);

create table if not exists public.fulfillment_groups (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  route text not null check (route in ('supplier_api', 'internal_360')),
  supplier_id uuid references public.suppliers(id) on delete set null,
  status text not null default 'pending' check (status in (
    'pending', 'processing', 'notified', 'submitted', 'confirmed',
    'in_production', 'shipped', 'delivered', 'failed', 'cancelled'
  )),
  notification_email text,
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  tracking_number text,
  tracking_url text,
  carrier text,
  notified_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fulfillment_group_items (
  fulfillment_group_id uuid not null references public.fulfillment_groups(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (fulfillment_group_id, order_item_id),
  unique (order_item_id)
);

create unique index if not exists fulfillment_groups_route_key
  on public.fulfillment_groups (
    order_id, route,
    coalesce(supplier_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

alter table public.product_categories enable row level security;
alter table public.fulfillment_groups enable row level security;
alter table public.fulfillment_group_items enable row level security;

drop policy if exists product_categories_public_select on public.product_categories;
create policy product_categories_public_select on public.product_categories
  for select to anon, authenticated
  using (exists (
    select 1 from public.products p
    where p.id = product_id and p.is_active and p.status = 'active'
  ));

drop policy if exists product_categories_admin_all on public.product_categories;
create policy product_categories_admin_all on public.product_categories
  for all to authenticated using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Fulfilment is operational and must never be exposed to customers through
-- the Data API. Only authenticated administrators may inspect or update it.
drop policy if exists fulfillment_groups_admin_all on public.fulfillment_groups;
create policy fulfillment_groups_admin_all on public.fulfillment_groups
  for all to authenticated using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists fulfillment_group_items_admin_all on public.fulfillment_group_items;
create policy fulfillment_group_items_admin_all on public.fulfillment_group_items
  for all to authenticated using ((select public.is_admin()))
  with check ((select public.is_admin()));

comment on column public.products.catalog_source is
  'supplier_sync for imported products; manual for products managed by 360.';
comment on column public.products.fulfillment_route is
  'supplier_api sends the line to the supplier integration; internal_360 creates an internal task.';
