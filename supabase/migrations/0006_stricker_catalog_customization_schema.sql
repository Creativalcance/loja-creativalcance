create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.product_customization_components (
  id uuid primary key default gen_random_uuid(),

  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete cascade,

  external_component_id text not null,
  component_code text,
  component_name text,
  component_index integer,

  image_url text,
  storage_url text,

  is_default boolean not null default false,
  is_customizable boolean not null default true,

  raw_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (product_id, variant_id, supplier_id, external_component_id)
);

create table if not exists public.product_customization_locations (
  id uuid primary key default gen_random_uuid(),

  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete cascade,
  component_id uuid references public.product_customization_components(id) on delete cascade,

  external_location_id text not null,
  location_code text,
  location_name text,
  location_index integer,

  max_printing_area_mm text,
  max_area_cm numeric(12,4),
  max_area_cm2 numeric(12,4),

  location_image_url text,
  location_storage_url text,
  area_image_url text,
  area_storage_url text,
  printing_lines_image_url text,
  printing_lines_storage_url text,

  is_default boolean not null default false,
  is_active boolean not null default true,

  raw_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (product_id, variant_id, supplier_id, external_location_id)
);

create table if not exists public.printing_price_tables (
  id uuid primary key default gen_random_uuid(),

  supplier_id uuid not null references public.suppliers(id) on delete cascade,

  external_id text not null,
  table_code text not null,
  table_code_option text,

  technique_code text,
  technique_name text,

  price_by_color boolean not null default false,
  price_by_area boolean not null default false,
  price_by_stitches boolean not null default false,
  allow_full_color boolean not null default false,

  max_colors integer,
  max_area numeric(12,4),
  area_cm numeric(12,4),
  area_cm2 numeric(12,4),
  stitches integer,
  additional_stitches integer,

  handling_cost_code text,
  handling_cost numeric(12,4) not null default 0,

  currency text not null default 'EUR',

  quantity_min integer not null default 1,
  quantity_max integer,
  supplier_price numeric(12,4) not null default 0,
  base_price numeric(12,4) not null default 0,
  margin_percentage numeric(7,4) not null default 0,
  final_price numeric(12,4) not null default 0,

  is_active boolean not null default true,

  raw_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (supplier_id, external_id)
);

create table if not exists public.product_customization_options (
  id uuid primary key default gen_random_uuid(),

  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete cascade,

  component_id uuid references public.product_customization_components(id) on delete set null,
  location_id uuid references public.product_customization_locations(id) on delete set null,
  printing_price_table_id uuid references public.printing_price_tables(id) on delete set null,

  service_code text not null,
  customization_type_code text,
  customization_type_name text,

  table_code text,
  table_code_option text,

  component_code text,
  component_name text,
  location_code text,
  location_name text,

  logo_area numeric(12,4),
  logo_width numeric(12,4),
  logo_height numeric(12,4),

  max_colors integer,
  max_printing_area_mm text,
  table_max_area_cm numeric(12,4),
  table_max_area_cm2 numeric(12,4),

  price_by_color boolean not null default false,
  price_by_area boolean not null default false,

  handling_cost numeric(12,4) not null default 0,
  supplier_price numeric(12,4) not null default 0,
  final_price numeric(12,4) not null default 0,
  currency text not null default 'EUR',

  is_default boolean not null default false,
  is_active boolean not null default true,

  printing_lines_image_url text,
  printing_lines_storage_url text,

  raw_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (product_id, variant_id, supplier_id, service_code)
);

create table if not exists public.product_future_stocks (
  id uuid primary key default gen_random_uuid(),

  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete cascade,

  warehouse_code text not null default 'STRICKER',
  expected_date date not null,
  expected_quantity integer not null default 0 check (expected_quantity >= 0),

  raw_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (product_id, variant_id, supplier_id, warehouse_code, expected_date)
);

create table if not exists public.supplier_catalog_categories (
  id uuid primary key default gen_random_uuid(),

  supplier_id uuid not null references public.suppliers(id) on delete cascade,

  external_id text not null,
  parent_external_id text,

  type_code text,
  type_name text,
  subtype_code text,
  subtype_name text,

  language text not null default 'PT',

  mapped_category_id uuid references public.categories(id) on delete set null,

  is_active boolean not null default true,

  raw_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (supplier_id, external_id, language)
);

create table if not exists public.supplier_restricted_products (
  id uuid primary key default gen_random_uuid(),

  supplier_id uuid not null references public.suppliers(id) on delete cascade,

  external_product_id text not null,
  product_reference text not null,
  sku text,
  country_code text not null,

  reason text,

  raw_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supplier_canceled_products (
  id uuid primary key default gen_random_uuid(),

  supplier_id uuid not null references public.suppliers(id) on delete cascade,

  external_product_id text not null,
  product_reference text not null,
  sku text,

  canceled_at timestamptz,
  reason text,

  raw_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.product_variants
add column if not exists color_code text,
add column if not exists color_desc_1 text,
add column if not exists color_hex_1 text,
add column if not exists color_desc_2 text,
add column if not exists color_hex_2 text,
add column if not exists optional_image_1_url text,
add column if not exists optional_image_2_url text,
add column if not exists optional_image_1_storage_url text,
add column if not exists optional_image_2_storage_url text;

alter table public.products
add column if not exists type_code text,
add column if not exists type_name text,
add column if not exists subtype_code text,
add column if not exists subtype_name text,
add column if not exists taric text,
add column if not exists is_stockout boolean not null default false,
add column if not exists online_exclusive boolean not null default false,
add column if not exists product_care text,
add column if not exists composition text,
add column if not exists packing text,
add column if not exists certificates jsonb not null default '[]'::jsonb,
add column if not exists properties jsonb not null default '[]'::jsonb,
add column if not exists related_references jsonb not null default '[]'::jsonb,
add column if not exists keywords jsonb not null default '[]'::jsonb;

alter table public.product_prices
add column if not exists catalog_price numeric(12,4),
add column if not exists your_price numeric(12,4),
add column if not exists price_source text not null default 'supplier';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_prices_price_source_check'
  ) then
    alter table public.product_prices
    add constraint product_prices_price_source_check
    check (price_source in ('price', 'your_price', 'manual', 'supplier'));
  end if;
end;
$$;

alter table public.product_stocks
add column if not exists future_quantities jsonb not null default '[]'::jsonb,
add column if not exists stock_scope text not null default 'global';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_stocks_stock_scope_check'
  ) then
    alter table public.product_stocks
    add constraint product_stocks_stock_scope_check
    check (stock_scope in ('global', 'country', 'warehouse'));
  end if;
end;
$$;

create index if not exists product_customization_components_product_id_idx
on public.product_customization_components(product_id);

create index if not exists product_customization_components_variant_id_idx
on public.product_customization_components(variant_id);

create index if not exists product_customization_locations_product_id_idx
on public.product_customization_locations(product_id);

create index if not exists product_customization_locations_variant_id_idx
on public.product_customization_locations(variant_id);

create index if not exists printing_price_tables_supplier_id_idx
on public.printing_price_tables(supplier_id);

create index if not exists printing_price_tables_table_code_idx
on public.printing_price_tables(table_code);

create index if not exists product_customization_options_product_id_idx
on public.product_customization_options(product_id);

create index if not exists product_customization_options_variant_id_idx
on public.product_customization_options(variant_id);

create index if not exists product_customization_options_service_code_idx
on public.product_customization_options(service_code);

create index if not exists product_future_stocks_product_id_idx
on public.product_future_stocks(product_id);

create index if not exists product_future_stocks_variant_id_idx
on public.product_future_stocks(variant_id);

create index if not exists product_future_stocks_expected_date_idx
on public.product_future_stocks(expected_date);

create index if not exists supplier_catalog_categories_supplier_id_idx
on public.supplier_catalog_categories(supplier_id);

create index if not exists supplier_catalog_categories_type_code_idx
on public.supplier_catalog_categories(type_code);

create index if not exists supplier_catalog_categories_subtype_code_idx
on public.supplier_catalog_categories(subtype_code);

create index if not exists supplier_restricted_products_country_code_idx
on public.supplier_restricted_products(country_code);

create index if not exists supplier_canceled_products_product_reference_idx
on public.supplier_canceled_products(product_reference);

create unique index if not exists supplier_restricted_products_unique_idx
on public.supplier_restricted_products (
  supplier_id,
  product_reference,
  coalesce(sku, ''),
  country_code
);

create unique index if not exists supplier_canceled_products_unique_idx
on public.supplier_canceled_products (
  supplier_id,
  product_reference,
  coalesce(sku, '')
);

drop trigger if exists product_customization_components_set_updated_at on public.product_customization_components;
create trigger product_customization_components_set_updated_at
before update on public.product_customization_components
for each row
execute function public.set_updated_at();

drop trigger if exists product_customization_locations_set_updated_at on public.product_customization_locations;
create trigger product_customization_locations_set_updated_at
before update on public.product_customization_locations
for each row
execute function public.set_updated_at();

drop trigger if exists printing_price_tables_set_updated_at on public.printing_price_tables;
create trigger printing_price_tables_set_updated_at
before update on public.printing_price_tables
for each row
execute function public.set_updated_at();

drop trigger if exists product_customization_options_set_updated_at on public.product_customization_options;
create trigger product_customization_options_set_updated_at
before update on public.product_customization_options
for each row
execute function public.set_updated_at();

drop trigger if exists product_future_stocks_set_updated_at on public.product_future_stocks;
create trigger product_future_stocks_set_updated_at
before update on public.product_future_stocks
for each row
execute function public.set_updated_at();

drop trigger if exists supplier_catalog_categories_set_updated_at on public.supplier_catalog_categories;
create trigger supplier_catalog_categories_set_updated_at
before update on public.supplier_catalog_categories
for each row
execute function public.set_updated_at();

drop trigger if exists supplier_restricted_products_set_updated_at on public.supplier_restricted_products;
create trigger supplier_restricted_products_set_updated_at
before update on public.supplier_restricted_products
for each row
execute function public.set_updated_at();

drop trigger if exists supplier_canceled_products_set_updated_at on public.supplier_canceled_products;
create trigger supplier_canceled_products_set_updated_at
before update on public.supplier_canceled_products
for each row
execute function public.set_updated_at();

alter table public.product_customization_components enable row level security;
alter table public.product_customization_locations enable row level security;
alter table public.printing_price_tables enable row level security;
alter table public.product_customization_options enable row level security;
alter table public.product_future_stocks enable row level security;
alter table public.supplier_catalog_categories enable row level security;
alter table public.supplier_restricted_products enable row level security;
alter table public.supplier_canceled_products enable row level security;

drop policy if exists "Public can read active product customization components" on public.product_customization_components;
create policy "Public can read active product customization components"
on public.product_customization_components
for select
to anon, authenticated
using (is_customizable = true);

drop policy if exists "Admins can manage product customization components" on public.product_customization_components;
create policy "Admins can manage product customization components"
on public.product_customization_components
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'sales')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'sales')
  )
);

drop policy if exists "Public can read active product customization locations" on public.product_customization_locations;
create policy "Public can read active product customization locations"
on public.product_customization_locations
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Admins can manage product customization locations" on public.product_customization_locations;
create policy "Admins can manage product customization locations"
on public.product_customization_locations
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'sales')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'sales')
  )
);

drop policy if exists "Public can read active printing price tables" on public.printing_price_tables;
create policy "Public can read active printing price tables"
on public.printing_price_tables
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Admins can manage printing price tables" on public.printing_price_tables;
create policy "Admins can manage printing price tables"
on public.printing_price_tables
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'sales')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'sales')
  )
);

drop policy if exists "Public can read active product customization options" on public.product_customization_options;
create policy "Public can read active product customization options"
on public.product_customization_options
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Admins can manage product customization options" on public.product_customization_options;
create policy "Admins can manage product customization options"
on public.product_customization_options
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'sales')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'sales')
  )
);

drop policy if exists "Public can read product future stocks" on public.product_future_stocks;
create policy "Public can read product future stocks"
on public.product_future_stocks
for select
to anon, authenticated
using (true);

drop policy if exists "Admins can manage product future stocks" on public.product_future_stocks;
create policy "Admins can manage product future stocks"
on public.product_future_stocks
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'sales')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'sales')
  )
);

drop policy if exists "Public can read active supplier catalog categories" on public.supplier_catalog_categories;
create policy "Public can read active supplier catalog categories"
on public.supplier_catalog_categories
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Admins can manage supplier catalog categories" on public.supplier_catalog_categories;
create policy "Admins can manage supplier catalog categories"
on public.supplier_catalog_categories
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'sales')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'sales')
  )
);

drop policy if exists "Admins can manage supplier restricted products" on public.supplier_restricted_products;
create policy "Admins can manage supplier restricted products"
on public.supplier_restricted_products
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'sales')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'sales')
  )
);

drop policy if exists "Admins can manage supplier canceled products" on public.supplier_canceled_products;
create policy "Admins can manage supplier canceled products"
on public.supplier_canceled_products
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'sales')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'sales')
  )
);