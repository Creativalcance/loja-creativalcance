alter table public.profiles
  add column if not exists company_name text,
  add column if not exists tax_id text,
  add column if not exists billing_email text;

alter table public.customer_addresses
  add column if not exists label text;

alter table public.carts
  add column if not exists billing_address_id uuid references public.customer_addresses(id) on delete set null;

create index if not exists carts_billing_address_id_idx
  on public.carts (billing_address_id);

create unique index if not exists customer_addresses_one_default_per_type
  on public.customer_addresses (user_id, address_type)
  where is_default = true and user_id is not null;

create index if not exists customer_addresses_user_type_idx
  on public.customer_addresses (user_id, address_type, is_default desc, created_at desc);

drop policy if exists "Users can manage own addresses" on public.customer_addresses;
drop policy if exists "Customers manage own addresses" on public.customer_addresses;
drop policy if exists "Admins manage customer addresses" on public.customer_addresses;

create policy "Customers manage own addresses"
  on public.customer_addresses
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Admins manage customer addresses"
  on public.customer_addresses
  for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
