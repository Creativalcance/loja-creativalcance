begin;

-- Remove primeiro a restrição legada, que ainda não aceita "customer".
do $$
declare item record;
begin
  for item in
    select conname from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.profiles drop constraint %I', item.conname);
  end loop;
end $$;

-- Normaliza os perfis existentes e define o novo valor predefinido.
update public.profiles
set role = case when role in ('admin', 'super_admin') then 'admin' else 'customer' end;

alter table public.profiles alter column role set default 'customer';

alter table public.profiles
  add constraint profiles_role_check check (role in ('customer', 'admin'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, is_active)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'customer',
    true
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = case when public.profiles.full_name = '' then excluded.full_name else public.profiles.full_name end,
    updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active = true
  );
$$;

-- O perfil usa o telefone nos dados da conta e como pre-preenchimento do checkout.
-- IF NOT EXISTS mantém a migração segura em bases onde a coluna já tenha sido criada.
alter table public.profiles
  add column if not exists phone text;

-- Um Cliente pode editar apenas dados pessoais; nunca role/is_active/email/id.
revoke update on public.profiles from authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

drop policy if exists profiles_update_own_basic on public.profiles;
create policy profiles_update_own_basic on public.profiles
for update to authenticated
using ((id = auth.uid() and role = 'customer' and is_active = true) or public.is_admin())
with check ((id = auth.uid() and role = 'customer' and is_active = true) or public.is_admin());

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_admin_insert on public.profiles;
create policy profiles_admin_insert on public.profiles
for insert to authenticated
with check (public.is_admin());

-- Recria as restantes políticas substituindo os perfis legados por apenas admin.
do $$
declare p record;
declare new_qual text;
declare new_check text;
declare role_clause text := '(select public.is_admin())';
begin
  for p in
    select * from pg_policies
    where schemaname = 'public'
      and tablename <> 'profiles'
      and (coalesce(qual, '') ~ 'super_admin|sales' or coalesce(with_check, '') ~ 'super_admin|sales')
  loop
    new_qual := regexp_replace(coalesce(p.qual, ''),
      '\(p\.id = auth\.uid\(\)\) AND \(p\.role = ANY \(ARRAY\[[^]]+\]\)\)', role_clause, 'g');
    new_qual := regexp_replace(new_qual,
      '\(profiles\.id = auth\.uid\(\)\) AND \(profiles\.role = ANY \(ARRAY\[[^]]+\]\)\)', role_clause, 'g');
    new_check := regexp_replace(coalesce(p.with_check, ''),
      '\(p\.id = auth\.uid\(\)\) AND \(p\.role = ANY \(ARRAY\[[^]]+\]\)\)', role_clause, 'g');
    new_check := regexp_replace(new_check,
      '\(profiles\.id = auth\.uid\(\)\) AND \(profiles\.role = ANY \(ARRAY\[[^]]+\]\)\)', role_clause, 'g');

    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
    execute format('create policy %I on %I.%I as %s for %s to %s%s%s',
      p.policyname, p.schemaname, p.tablename, p.permissive, p.cmd,
      array_to_string(p.roles, ', '),
      case when new_qual <> '' then ' using (' || new_qual || ')' else '' end,
      case when new_check <> '' then ' with check (' || new_check || ')' else '' end);
  end loop;
end $$;

commit;
