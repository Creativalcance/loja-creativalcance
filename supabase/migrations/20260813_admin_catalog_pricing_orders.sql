alter table public.products
add column if not exists featured_override boolean;

comment on column public.products.featured_override is
'Escolha manual do administrador. NULL mantém o destaque definido pela Stricker.';

update public.products
set is_featured = true
where status = 'active'
  and is_active = true
  and featured_override is null;

create or replace function public.preserve_product_featured_override()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.featured_override is null and new.status = 'active' and new.is_active then
      new.is_featured := true;
    elsif new.featured_override is not null then
      new.is_featured := new.featured_override;
    end if;
  elsif old.featured_override is not null and new.featured_override is not distinct from old.featured_override then
    new.featured_override := old.featured_override;
    new.is_featured := old.featured_override;
  elsif new.featured_override is not null then
    new.is_featured := new.featured_override;
  end if;
  return new;
end;
$$;

drop trigger if exists products_preserve_featured_override on public.products;
create trigger products_preserve_featured_override
before insert or update on public.products
for each row execute function public.preserve_product_featured_override();

create table if not exists public.bulk_price_change_batches (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('products', 'personalizations')),
  margin_percentage numeric(7,3) not null check (margin_percentage >= 0 and margin_percentage < 95),
  affected_rows integer not null default 0,
  status text not null default 'applied' check (status in ('applied', 'reverted')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  reverted_by uuid references auth.users(id) on delete set null,
  reverted_at timestamptz
);

create table if not exists public.bulk_price_change_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.bulk_price_change_batches(id) on delete cascade,
  entity_type text not null check (entity_type in ('product_price', 'printing_price')),
  entity_id uuid not null,
  previous_values jsonb not null,
  created_at timestamptz not null default now(),
  unique (batch_id, entity_type, entity_id)
);

alter table public.bulk_price_change_batches enable row level security;
alter table public.bulk_price_change_items enable row level security;

revoke all on table public.bulk_price_change_batches from public, anon, authenticated;
revoke all on table public.bulk_price_change_items from public, anon, authenticated;
grant select, insert, update, delete on table public.bulk_price_change_batches to service_role;
grant select, insert, update, delete on table public.bulk_price_change_items to service_role;

create or replace function public.apply_bulk_price_margin(
  target_batch_id uuid,
  target_type text,
  target_margin_percentage numeric
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  changed_rows integer := 0;
begin
  if target_type not in ('products', 'personalizations') then
    raise exception 'Tipo de alteração global inválido.';
  end if;
  if target_margin_percentage < 0 or target_margin_percentage >= 95 then
    raise exception 'A margem deve estar entre 0 e 94,999%%.';
  end if;

  if target_type = 'products' then
    insert into public.bulk_price_change_items(batch_id, entity_type, entity_id, previous_values)
    select target_batch_id, 'product_price', id,
      jsonb_build_object(
        'pricing_mode', pricing_mode, 'margin_percentage', margin_percentage,
        'margin_rate', margin_rate, 'markup_percentage', markup_percentage,
        'fixed_markup', fixed_markup, 'manual_price', manual_price,
        'final_price', final_price, 'base_price', base_price,
        'is_manual_override', is_manual_override, 'override_reason', override_reason
      )
    from public.product_prices;

    update public.product_prices
    set pricing_mode = 'margin',
        margin_percentage = target_margin_percentage,
        margin_rate = target_margin_percentage / 100,
        markup_percentage = null,
        fixed_markup = null,
        manual_price = null,
        base_price = supplier_price,
        final_price = round(supplier_price / (1 - target_margin_percentage / 100), 2),
        is_manual_override = true,
        override_reason = 'Margem global aplicada pelo administrador',
        override_updated_at = now();
  else
    insert into public.bulk_price_change_items(batch_id, entity_type, entity_id, previous_values)
    select target_batch_id, 'printing_price', id,
      jsonb_build_object(
        'pricing_mode', pricing_mode, 'margin_percentage', margin_percentage,
        'margin_rate', margin_rate, 'markup_percentage', markup_percentage,
        'fixed_markup', fixed_markup, 'manual_price', manual_price,
        'final_price', final_price, 'base_price', base_price,
        'is_manual_override', is_manual_override, 'override_reason', override_reason
      )
    from public.printing_price_tables where is_active = true;

    update public.printing_price_tables
    set pricing_mode = 'margin',
        margin_percentage = target_margin_percentage,
        margin_rate = target_margin_percentage / 100,
        markup_percentage = null,
        fixed_markup = null,
        manual_price = null,
        base_price = supplier_price,
        final_price = round(supplier_price / (1 - target_margin_percentage / 100), 2),
        is_manual_override = true,
        override_reason = 'Margem global aplicada pelo administrador',
        override_updated_at = now()
    where is_active = true;
  end if;

  get diagnostics changed_rows = row_count;
  update public.bulk_price_change_batches set affected_rows = changed_rows where id = target_batch_id;
  return changed_rows;
end;
$$;

create or replace function public.revert_bulk_price_margin(target_batch_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  changed_rows integer := 0;
  printing_rows integer := 0;
begin
  update public.product_prices p
  set pricing_mode = i.previous_values->>'pricing_mode',
      margin_percentage = nullif(i.previous_values->>'margin_percentage','')::numeric,
      margin_rate = nullif(i.previous_values->>'margin_rate','')::numeric,
      markup_percentage = nullif(i.previous_values->>'markup_percentage','')::numeric,
      fixed_markup = nullif(i.previous_values->>'fixed_markup','')::numeric,
      manual_price = nullif(i.previous_values->>'manual_price','')::numeric,
      final_price = (i.previous_values->>'final_price')::numeric,
      base_price = (i.previous_values->>'base_price')::numeric,
      is_manual_override = coalesce((i.previous_values->>'is_manual_override')::boolean, false),
      override_reason = i.previous_values->>'override_reason',
      override_updated_at = now()
  from public.bulk_price_change_items i
  where i.batch_id = target_batch_id and i.entity_type = 'product_price' and p.id = i.entity_id;
  get diagnostics changed_rows = row_count;

  update public.printing_price_tables p
  set pricing_mode = i.previous_values->>'pricing_mode',
      margin_percentage = nullif(i.previous_values->>'margin_percentage','')::numeric,
      margin_rate = nullif(i.previous_values->>'margin_rate','')::numeric,
      markup_percentage = nullif(i.previous_values->>'markup_percentage','')::numeric,
      fixed_markup = nullif(i.previous_values->>'fixed_markup','')::numeric,
      manual_price = nullif(i.previous_values->>'manual_price','')::numeric,
      final_price = (i.previous_values->>'final_price')::numeric,
      base_price = (i.previous_values->>'base_price')::numeric,
      is_manual_override = coalesce((i.previous_values->>'is_manual_override')::boolean, false),
      override_reason = i.previous_values->>'override_reason',
      override_updated_at = now()
  from public.bulk_price_change_items i
  where i.batch_id = target_batch_id and i.entity_type = 'printing_price' and p.id = i.entity_id;
  get diagnostics printing_rows = row_count;
  changed_rows := changed_rows + printing_rows;
  return changed_rows;
end;
$$;

revoke execute on function public.apply_bulk_price_margin(uuid, text, numeric) from public, anon, authenticated;
revoke execute on function public.revert_bulk_price_margin(uuid) from public, anon, authenticated;
grant execute on function public.apply_bulk_price_margin(uuid, text, numeric) to service_role;
grant execute on function public.revert_bulk_price_margin(uuid) to service_role;

alter table public.orders
add column if not exists supplier_invoice_number text,
add column if not exists supplier_invoice_url text,
add column if not exists supplier_invoice_status text default 'pending',
add column if not exists supplier_cost_total numeric(12,2) not null default 0,
add column if not exists deleted_at timestamptz,
add column if not exists deleted_by uuid references auth.users(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_supplier_invoice_status_check'
  ) then
    alter table public.orders
    add constraint orders_supplier_invoice_status_check
    check (supplier_invoice_status in ('pending', 'received', 'validated', 'paid', 'cancelled'));
  end if;
end
$$;

create index if not exists orders_deleted_at_idx on public.orders(deleted_at);
