// Run in an isolated, in-memory PostgreSQL database; never against live orders.
// Install @electric-sql/pglite in a temporary directory, then set PGLITE_MODULE
// to its dist/index.js and run: node --test tests/order-revenue.integration.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();

before(async () => {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create table public.profiles (id uuid primary key);
    create table public.orders (
      id uuid primary key default gen_random_uuid(),
      status text not null default 'pending_payment',
      payment_status text not null default 'pending',
      fulfillment_status text not null default 'pending',
      supplier_submission_status text not null default 'not_submitted',
      grand_total numeric not null default 0,
      supplier_cost_total numeric not null default 0,
      requested_shipping_date date,
      paid_at timestamptz, created_at timestamptz not null default now(), deleted_at timestamptz
    );
    grant select on public.orders to service_role;
  `);
  await db.exec(fs.readFileSync('supabase/migrations/20261029105026_monthly_order_revenue.sql', 'utf8'));
});
after(() => db.close());

async function stats(at) {
  return (await db.query('select public.admin_order_dashboard_statistics($1) as result', [at])).rows[0].result;
}

test('Lisbon month boundaries respect daylight saving and year rollover', async () => {
  for (const [at, from, until] of [
    ['2026-03-31T23:00:00Z', '2026-03-31T23:00:00Z', '2026-04-30T23:00:00Z'],
    ['2026-03-31T22:59:59Z', '2026-03-01T00:00:00Z', '2026-03-31T23:00:00Z'],
    ['2026-10-29T12:00:00Z', '2026-09-30T23:00:00Z', '2026-11-01T00:00:00Z'],
    ['2026-11-01T00:00:00Z', '2026-11-01T00:00:00Z', '2026-12-01T00:00:00Z'],
    ['2026-12-31T23:59:59Z', '2026-12-01T00:00:00Z', '2027-01-01T00:00:00Z'],
  ]) {
    const result = await stats(at);
    assert.equal(Date.parse(result.monthStart), Date.parse(from));
    assert.equal(Date.parse(result.nextMonth), Date.parse(until));
    assert.equal(result.revenue, 0); assert.equal(result.margin, 0); assert.equal(result.total, 0);
  }
});

test('monthly revenue uses payment date, excludes unpaid/deleted/future orders, and supports legacy paid records', async () => {
  await db.exec(`
    insert into public.orders(payment_status, grand_total, supplier_cost_total, created_at, paid_at, deleted_at) values
    ('paid', 100, 30, '2026-09-01Z', '2026-10-04Z', null),
    ('paid', 500, 200, '2026-09-01Z', '2026-09-30T22:59:59Z', null),
    ('paid', 20, 5, '2026-09-01Z', '2026-09-30T23:00:00Z', null),
    ('paid', 30, 10, '2026-10-06Z', null, null),
    ('pending', 600, 0, '2026-10-07Z', null, null),
    ('paid', 700, 0, '2026-10-07Z', '2026-10-07Z', '2026-10-08Z'),
    ('paid', 800, 0, '2026-10-07Z', '2026-11-01Z', null);
  `);
  const result = await stats('2026-10-29T12:00:00Z');
  assert.equal(result.total, 6); assert.equal(result.paid, 5); assert.equal(result.pendingPayment, 1);
  assert.equal(result.revenue, 150); assert.equal(result.supplierCosts, 45); assert.equal(result.margin, 105);
});

test('manual reset zeros the counters, preserves every order, and admits only subsequent payments', async () => {
  const before = (await db.query('select jsonb_agg(o order by id) as data from public.orders o')).rows[0].data;
  await db.exec("insert into public.admin_order_revenue_resets(reset_at) values ('2026-10-29T12:00:00Z')");
  const result = await stats('2026-10-29T12:00:00Z');
  assert.equal(result.revenue, 0); assert.equal(result.supplierCosts, 0); assert.equal(result.margin, 0);
  assert.equal(result.total, 6); assert.equal(result.paid, 5);
  assert.deepEqual((await db.query('select jsonb_agg(o order by id) as data from public.orders o')).rows[0].data, before);
  await db.exec(`insert into public.orders(payment_status,grand_total,supplier_cost_total,paid_at) values
    ('paid',11,1,'2026-10-29T12:00:00Z'),
    ('paid',25,10,'2026-10-29T12:00:01Z');`);
  assert.equal((await stats('2026-10-29T12:00:02Z')).revenue, 25);
  assert.equal((await stats('2026-10-29T12:00:02Z')).margin, 15);
  // A future reset must not affect the current window.
  await db.exec("insert into public.admin_order_revenue_resets(reset_at) values ('2026-10-30T12:00:00Z')");
  assert.equal((await stats('2026-10-29T12:00:02Z')).revenue, 25);
  assert.equal((await stats('2026-10-30T12:00:00Z')).revenue, 0);
});

test('the next month discards prior resets and starts at its exact boundary', async () => {
  const result = await stats('2026-11-01T00:00:00Z');
  assert.equal(result.manualResetAt, null);
  assert.equal(result.revenue, 800); // payment exactly on the new boundary
  assert.equal(Date.parse(result.periodStart), Date.parse('2026-11-01T00:00:00Z'));
  assert.equal((await stats('2026-12-01T00:00:00Z')).revenue, 0);
});

test('aggregates are complete beyond the API row limit and retain exact decimal sums', async () => {
  await db.exec(`insert into public.orders(payment_status,grand_total,supplier_cost_total,paid_at)
    select 'paid', 0.10, 0.03, '2027-01-02Z'::timestamptz from generate_series(1,1005);`);
  const result = await stats('2027-01-03Z');
  assert.equal(result.revenue, 100.5); assert.equal(result.supplierCosts, 30.15); assert.equal(result.margin, 70.35);
});

test('client roles cannot read/reset revenue; the server may only append reset markers', async () => {
  for (const role of ['anon', 'authenticated']) {
    const { rows } = await db.query(`select
      has_function_privilege($1, 'public.admin_order_dashboard_statistics(timestamptz)', 'execute') as rpc,
      has_table_privilege($1, 'public.admin_order_revenue_resets', 'select,insert,update,delete') as table_access`, [role]);
    assert.deepEqual(rows[0], { rpc: false, table_access: false });
  }
  const { rows } = await db.query(`select
    has_function_privilege('service_role', 'public.admin_order_dashboard_statistics(timestamptz)', 'execute') as rpc,
    has_table_privilege('service_role', 'public.admin_order_revenue_resets', 'select') as read,
    has_table_privilege('service_role', 'public.admin_order_revenue_resets', 'insert') as append,
    has_table_privilege('service_role', 'public.admin_order_revenue_resets', 'update,delete') as destructive`);
  assert.deepEqual(rows[0], { rpc: true, read: true, append: true, destructive: false });
  await db.exec('set role service_role');
  assert.equal((await stats('2027-01-03Z')).revenue, 100.5);
  await db.exec('reset role');
});
