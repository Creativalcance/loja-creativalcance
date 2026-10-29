begin;

-- A reset changes the reporting window only. Orders and accounting records
-- remain untouched, and each manual reset retains its actor and database time.
create table public.admin_order_revenue_resets (
  id uuid primary key default gen_random_uuid(),
  reset_at timestamptz not null default clock_timestamp(),
  reset_by uuid references public.profiles(id) on delete set null
);

create index admin_order_revenue_resets_time_idx
  on public.admin_order_revenue_resets (reset_at desc);
create index admin_order_revenue_resets_actor_idx
  on public.admin_order_revenue_resets (reset_by);

alter table public.admin_order_revenue_resets enable row level security;
revoke all on public.admin_order_revenue_resets from public, anon, authenticated, service_role;
grant select, insert on public.admin_order_revenue_resets to service_role;
create policy service_role_access on public.admin_order_revenue_resets
  for all to service_role using (true) with check (true);

create function public.admin_order_dashboard_statistics(p_at timestamptz default now())
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with month_bounds as (
    select
      date_trunc('month', p_at at time zone 'Europe/Lisbon')
        at time zone 'Europe/Lisbon' as month_start,
      (date_trunc('month', p_at at time zone 'Europe/Lisbon') + interval '1 month')
        at time zone 'Europe/Lisbon' as next_month
  ), period as (
    select b.*, r.reset_at as manual_reset_at,
      coalesce(r.reset_at, b.month_start) as period_start
    from month_bounds b
    left join lateral (
      select reset_at from public.admin_order_revenue_resets
      where reset_at >= b.month_start and reset_at <= p_at
      order by reset_at desc limit 1
    ) r on true
  )
  select jsonb_build_object(
    'total', s.total, 'pendingPayment', s.pending_payment, 'paid', s.paid,
    'supplierErrors', s.supplier_errors, 'inProduction', s.in_production,
    'shipped', s.shipped, 'completed', s.completed, 'cancelled', s.cancelled,
    'delayed', s.delayed, 'revenue', s.revenue, 'supplierCosts', s.supplier_costs,
    'margin', s.revenue - s.supplier_costs,
    'monthStart', p.month_start, 'periodStart', p.period_start,
    'nextMonth', p.next_month, 'manualResetAt', p.manual_reset_at
  )
  from period p
  cross join lateral (
    select
      count(*) as total,
      count(*) filter (where payment_status = 'pending') as pending_payment,
      count(*) filter (where payment_status = 'paid') as paid,
      count(*) filter (where supplier_submission_status = 'failed') as supplier_errors,
      count(*) filter (where status = 'in_production') as in_production,
      count(*) filter (where fulfillment_status = 'shipped') as shipped,
      count(*) filter (where status = 'delivered' or fulfillment_status = 'delivered') as completed,
      count(*) filter (where status = 'cancelled') as cancelled,
      count(*) filter (
        where requested_shipping_date < (p_at at time zone 'Europe/Lisbon')::date
          and fulfillment_status not in ('delivered', 'cancelled')
      ) as delayed,
      coalesce(sum(grand_total) filter (where in_period), 0) as revenue,
      coalesce(sum(supplier_cost_total) filter (where in_period), 0) as supplier_costs
    from (
      select o.*,
        payment_status = 'paid'
        and coalesce(paid_at, created_at) >= p.month_start
        and (p.manual_reset_at is null or coalesce(paid_at, created_at) > p.manual_reset_at)
        and coalesce(paid_at, created_at) < p.next_month
        and coalesce(paid_at, created_at) <= p_at as in_period
      from public.orders o
      where deleted_at is null
    ) orders_in_period
  ) s;
$$;

revoke all on function public.admin_order_dashboard_statistics(timestamptz)
  from public, anon, authenticated;
grant execute on function public.admin_order_dashboard_statistics(timestamptz)
  to service_role;

comment on function public.admin_order_dashboard_statistics(timestamptz) is
  'Order counts plus paid revenue, supplier costs and margin for the current Lisbon month, after any manual counter reset. Does not modify orders.';

commit;
