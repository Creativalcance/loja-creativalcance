create table if not exists public.integration_sync_locks (
  lock_key text primary key,
  owner_token uuid not null,
  acquired_at timestamptz not null default now(),
  expires_at timestamptz not null
);

alter table public.integration_sync_locks enable row level security;

revoke all on table public.integration_sync_locks from public, anon, authenticated;
grant select, insert, update, delete on table public.integration_sync_locks to service_role;

create or replace function public.try_acquire_integration_sync_lock(
  target_lock_key text,
  target_owner_token uuid,
  target_ttl_seconds integer default 600
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_rows integer;
begin
  if nullif(trim(target_lock_key), '') is null then
    raise exception 'A chave do bloqueio é obrigatória.';
  end if;

  insert into public.integration_sync_locks (
    lock_key,
    owner_token,
    acquired_at,
    expires_at
  )
  values (
    trim(target_lock_key),
    target_owner_token,
    now(),
    now() + make_interval(secs => greatest(60, least(target_ttl_seconds, 3600)))
  )
  on conflict (lock_key) do update
  set owner_token = excluded.owner_token,
      acquired_at = excluded.acquired_at,
      expires_at = excluded.expires_at
  where public.integration_sync_locks.expires_at <= now()
     or public.integration_sync_locks.owner_token = excluded.owner_token;

  get diagnostics affected_rows = row_count;
  return affected_rows = 1;
end;
$$;

create or replace function public.release_integration_sync_lock(
  target_lock_key text,
  target_owner_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_rows integer;
begin
  delete from public.integration_sync_locks
  where lock_key = trim(target_lock_key)
    and owner_token = target_owner_token;

  get diagnostics affected_rows = row_count;
  return affected_rows = 1;
end;
$$;

revoke execute on function public.try_acquire_integration_sync_lock(text, uuid, integer)
from public, anon, authenticated;
revoke execute on function public.release_integration_sync_lock(text, uuid)
from public, anon, authenticated;

grant execute on function public.try_acquire_integration_sync_lock(text, uuid, integer)
to service_role;
grant execute on function public.release_integration_sync_lock(text, uuid)
to service_role;

revoke execute on function public.reconcile_stricker_commercial_availability(uuid, text)
from public, anon, authenticated;
grant execute on function public.reconcile_stricker_commercial_availability(uuid, text)
to service_role;

