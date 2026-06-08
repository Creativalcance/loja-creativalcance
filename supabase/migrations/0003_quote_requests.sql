create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),

  user_id uuid references auth.users(id) on delete set null,

  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  company_name text,
  company_tax_id text,

  subject text,
  message text,

  status text not null default 'new'
    check (status in (
      'new',
      'in_analysis',
      'proposal_sent',
      'negotiation',
      'won',
      'lost',
      'cancelled'
    )),

  source text not null default 'website'
    check (source in (
      'website',
      'product_page',
      'admin',
      'sales',
      'campaign'
    )),

  preferred_contact_method text default 'email'
    check (preferred_contact_method in (
      'email',
      'phone',
      'whatsapp'
    )),

  budget_min numeric(12,2),
  budget_max numeric(12,2),

  desired_delivery_date date,

  assigned_sales_user_id uuid references auth.users(id) on delete set null,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quote_request_items (
  id uuid primary key default gen_random_uuid(),

  quote_request_id uuid not null references public.quote_requests(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,

  supplier_id uuid references public.suppliers(id) on delete set null,

  product_sku text,
  product_name text not null,

  quantity integer not null default 1 check (quantity > 0),

  personalization_required boolean not null default true,
  personalization_notes text,

  logo_file_url text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quote_requests_user_id_idx
on public.quote_requests(user_id);

create index if not exists quote_requests_status_idx
on public.quote_requests(status);

create index if not exists quote_requests_contact_email_idx
on public.quote_requests(contact_email);

create index if not exists quote_requests_created_at_idx
on public.quote_requests(created_at desc);

create index if not exists quote_request_items_quote_request_id_idx
on public.quote_request_items(quote_request_id);

create index if not exists quote_request_items_product_id_idx
on public.quote_request_items(product_id);

alter table public.quote_requests enable row level security;
alter table public.quote_request_items enable row level security;

drop policy if exists "Users can create quote requests" on public.quote_requests;
create policy "Users can create quote requests"
on public.quote_requests
for insert
to anon, authenticated
with check (true);

drop policy if exists "Users can view own quote requests" on public.quote_requests;
create policy "Users can view own quote requests"
on public.quote_requests
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'sales')
  )
);

drop policy if exists "Admins can update quote requests" on public.quote_requests;
create policy "Admins can update quote requests"
on public.quote_requests
for update
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

drop policy if exists "Users can create quote request items" on public.quote_request_items;
create policy "Users can create quote request items"
on public.quote_request_items
for insert
to anon, authenticated
with check (true);

drop policy if exists "Users can view related quote request items" on public.quote_request_items;
create policy "Users can view related quote request items"
on public.quote_request_items
for select
to authenticated
using (
  exists (
    select 1
    from public.quote_requests qr
    where qr.id = quote_request_items.quote_request_id
      and (
        qr.user_id = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role in ('admin', 'super_admin', 'sales')
        )
      )
  )
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists quote_requests_set_updated_at on public.quote_requests;
create trigger quote_requests_set_updated_at
before update on public.quote_requests
for each row
execute function public.set_updated_at();

drop trigger if exists quote_request_items_set_updated_at on public.quote_request_items;
create trigger quote_request_items_set_updated_at
before update on public.quote_request_items
for each row
execute function public.set_updated_at();