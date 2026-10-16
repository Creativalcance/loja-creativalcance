-- Internal preparation only. Storefront and supplier identifiers are unchanged.
create table public.product_commercial_identities (
  product_id uuid primary key references public.products(id) on delete cascade,
  public_reference text not null unique default ('360-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))),
  translations jsonb not null default '{}'::jsonb check (jsonb_typeof(translations) = 'object'),
  review_status text not null default 'draft' check (review_status in ('draft','ready')),
  version integer not null default 1,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (public_reference ~ '^360-[A-F0-9]{12}$')
);
create table public.variant_commercial_identities (
  variant_id uuid primary key references public.product_variants(id) on delete cascade,
  public_reference text not null unique default ('360-V-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))),
  created_at timestamptz not null default now()
);
create table public.product_commercial_identity_changes (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.product_commercial_identities(product_id) on delete cascade,
  previous_data jsonb not null,
  next_data jsonb not null,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.product_commercial_identities enable row level security;
alter table public.variant_commercial_identities enable row level security;
alter table public.product_commercial_identity_changes enable row level security;
revoke all on public.product_commercial_identities, public.variant_commercial_identities, public.product_commercial_identity_changes from public, anon, authenticated;
grant select, insert, update on public.product_commercial_identities to service_role;
grant select, insert on public.variant_commercial_identities to service_role;
grant select, insert on public.product_commercial_identity_changes to service_role;
grant usage, select on sequence public.product_commercial_identity_changes_id_seq to service_role;

-- Trigger code is private and has no client-callable entry point.
create or replace function private.prepare_commercial_identity() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'products' then
    if new.supplier_id is not null then
      insert into public.product_commercial_identities(product_id) values(new.id) on conflict(product_id) do nothing;
    end if;
  elsif exists(select 1 from public.products where id = new.product_id and supplier_id is not null) then
    insert into public.variant_commercial_identities(variant_id) values(new.id) on conflict(variant_id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function private.prepare_commercial_identity() from public, anon, authenticated;
create trigger prepare_product_commercial_identity after insert on public.products
for each row execute function private.prepare_commercial_identity();
create trigger prepare_variant_commercial_identity after insert on public.product_variants
for each row execute function private.prepare_commercial_identity();

create or replace function private.audit_commercial_identity() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.public_reference is distinct from old.public_reference or new.product_id is distinct from old.product_id then
    raise exception 'commercial_identity_reference_immutable';
  end if;
  new.version := old.version + 1;
  new.updated_at := clock_timestamp();
  insert into public.product_commercial_identity_changes(product_id,previous_data,next_data,changed_by)
  values(old.product_id, to_jsonb(old), to_jsonb(new), new.updated_by);
  return new;
end;
$$;
revoke all on function private.audit_commercial_identity() from public, anon, authenticated;
create trigger audit_product_commercial_identity before update on public.product_commercial_identities
for each row execute function private.audit_commercial_identity();

insert into public.product_commercial_identities(product_id)
select id from public.products where supplier_id is not null on conflict(product_id) do nothing;
insert into public.variant_commercial_identities(variant_id)
select v.id from public.product_variants v join public.products p on p.id=v.product_id
where p.supplier_id is not null on conflict(variant_id) do nothing;

-- Original names are joined live, not copied: sync can update them independently.
create view public.admin_commercial_identity_catalog with (security_invoker = true) as
select i.product_id, i.public_reference, i.translations, i.review_status, i.version, i.updated_at,
  p.sku as supplier_reference, p.name as supplier_name, p.status as product_status,
  p.is_active, p.deleted_at, p.supplier_id
from public.product_commercial_identities i join public.products p on p.id=i.product_id;
revoke all on public.admin_commercial_identity_catalog from public, anon, authenticated;
grant select on public.admin_commercial_identity_catalog to service_role;
