import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const clone = value => JSON.parse(JSON.stringify(value));
function load(file, imports = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, console, URL, Date, AbortController, setTimeout, clearTimeout,
    process: { env: {} }, ...globals, require(name) {
      assert.ok(name in imports, `Unexpected dependency ${name}`); return imports[name];
    } });
  return exports;
}
function client(body, requests = []) {
  return load('src/lib/stricker/orders/client.ts', {
    '@/lib/stricker/config': { getStrickerConfig: () => ({ apiBaseUrl: 'https://supplier.example.test' }) },
    '@/lib/stricker/auth': { getValidStrickerSessionToken: async () => 'fixture-token' },
  }, { fetch: async (url, init) => { requests.push({ url, init }); return new Response(JSON.stringify(body)); } });
}
const parsing = client({});
const shipped = { OrderStamp: 'stamp-fixture', Status: 'SHIPPED', ShippingDate: '13/10/2026',
  Tracking: 'https://tracking.example.test/?reference=fixture', Courier: 'PTDPD' };
function fixture(overrides = {}) {
  return { id: 'order-fixture', order_number: 'LC-FIXTURE', supplier_order_stamp: 'stamp-fixture',
    supplier_test_mode: false, payment_status: 'paid', deleted_at: null, status: 'sent_to_supplier',
    fulfillment_status: 'sent_to_supplier', supplier_last_status: 'PROCESSING', supplier_shipping_date: '2026-10-07',
    supplier_tracking_number: null, supplier_tracking_url: null, supplier_status_notification: null,
    shipped_at: null, delivered_at: null, cancelled_at: null, ...overrides };
}
function harness(overrides = {}, options = {}) {
  const h = { state: fixture(overrides), writes: [], notifications: new Map(), calls: [], adminFail: false };
  const db = { from(table) {
    let values, single = false; const predicates = [];
    const q = { select: () => q, not: () => q, is: () => q, or: () => q, order: () => q, limit: () => q,
      eq: (key, value) => { predicates.push(row => row[key] === value); return q; }, in: () => q,
      returns: () => q, single: () => { single = true; return q; }, maybeSingle: () => { single = true; return q; },
      update: value => { values = clone(value); return q; },
      then(resolve, reject) {
        if (values && options.completeBeforeSave && 'supplier_last_response' in values) {
          h.state.status = h.state.fulfillment_status = 'delivered';
        }
        const matches = predicates.every(p => p(h.state));
        if (values && matches) { h.writes.push(values); Object.assign(h.state, values); }
        const data = table === 'order_mockups' ? [] : matches ? (single ? clone(h.state) : [clone(h.state)]) : (single ? null : []);
        return Promise.resolve({ data, error: null }).then(resolve, reject);
      } }; return q;
  } };
  const notify = (key, value) => { h.calls.push(key); h.notifications.set(key, clone(value)); };
  const sync = load('src/lib/stricker/orders/sync-order-status.ts', {
    '@/lib/supabase/admin': { createSupabaseAdminClient: () => db },
    '@/lib/stricker/orders/client': { ...parsing,
      getStrickerOrders: async () => { h.calls.push('list'); if (options.listFailure) throw Error('invalid list');
        return { orders: new Map(options.absent ? [] : [['stamp-fixture', options.row ?? shipped]]), truncated: false }; },
      getStrickerOrderDetails: async () => { h.calls.push('details'); return { orderDetails: options.detail ?? { OrderStamp: 'stamp-fixture', Status: 'WAITING_ART_WORK' }, response: {} }; },
    },
    '@/lib/stricker/orders/mockups': { effectiveMockupOrderStatus: status => status,
      syncStrickerMockups: async () => { h.calls.push('mockups'); return {}; } },
    '@/lib/notifications/customer-email': {
      notifyOrderTrackingAvailable: async (id, opts) => { assert.equal(opts.enqueueOnly, true); notify('tracking', { id }); },
      notifyOrderStatusChanged: async params => { assert.equal(params.enqueueOnly, true); notify(params.eventId, params); },
    },
    '@/lib/notifications/supplier-order-status-changed': { notifySupplierOrderStatusChanged: async params => {
      h.calls.push('admin-attempt'); if (h.adminFail) throw Error('mail unavailable'); notify('admin', params);
    } },
  });
  h.run = sync.syncSubmittedStrickerOrders; h.next = sync.nextLocalOrderStatus; return h;
}

test('OrdersV1 uses a single read-only request and validates the response', async () => {
  const requests = []; const result = await client({ OrdersDetails: [shipped], Count: 1 }, requests).getStrickerOrders({ testMode: false });
  assert.equal(result.orders.get('stamp-fixture').Status, 'SHIPPED'); assert.equal(requests.length, 1);
  assert.equal(requests[0].init.method, 'GET'); assert.equal(requests[0].init.body, undefined);
  const url = new URL(requests[0].url); assert.equal(url.pathname, '/OrdersV1');
  assert.equal(url.searchParams.get('test'), 'false'); assert.equal(url.searchParams.get('number'), '100');
  for (const body of [{ Count: 2, OrdersDetails: [shipped] }, { Count: 2, OrdersDetails: [shipped, shipped] },
    { Count: 1, OrdersDetails: [{ Status: 'SHIPPED' }] }, { ErrorCode: '1', ErrorMessage: 'failed' }]) {
    await assert.rejects(client(body).getStrickerOrders({ testMode: false }));
  }
});
test('European dates are unambiguous and invalid dates are rejected', () => {
  assert.equal(parsing.normalizeStrickerDate('7/10/2026'), '2026-10-07');
  assert.equal(parsing.normalizeStrickerDate('13/10/2026'), '2026-10-13');
  assert.equal(parsing.normalizeStrickerDate('2026-10-13T10:00:00Z'), '2026-10-13');
  for (const date of ['31/02/2026', '2026-13-01', '', 'tomorrow']) assert.equal(parsing.normalizeStrickerDate(date), null);
});
test('Tracking URL is a URL, not a parcel number; invalid URLs are not exposed', () => {
  assert.equal(parsing.extractStrickerTrackingNumber(shipped), null);
  assert.equal(parsing.extractStrickerTrackingUrl(shipped), shipped.Tracking);
  assert.equal(parsing.extractStrickerTrackingNumber({ Tracking: 'parcel-123' }), 'parcel-123');
  for (const Tracking of ['javascript:alert(1)', 'https://user:password@example.test', 'parcel-123'])
    assert.equal(parsing.extractStrickerTrackingUrl({ Tracking }), null);
});
test('list shipment overrides stale details, saves durable intent before notifying, and does not duplicate next cycle', async () => {
  const h = harness(); const result = await h.run();
  assert.equal(result.updated, 1); assert.equal(h.state.status, 'shipped');
  assert.equal(h.state.supplier_shipping_date, '2026-10-13'); assert.equal(h.state.tracking_url, shipped.Tracking);
  assert.equal(h.state.tracking_number, null); assert.equal(h.state.shipping_carrier, 'PTDPD');
  assert.equal(h.state.delivered_at, null); assert.ok(h.writes[0].supplier_status_notification);
  assert.equal(h.state.supplier_status_notification, null); assert.ok(!h.calls.includes('details'));
  assert.deepEqual([...h.notifications.keys()], ['tracking', 'admin']);
  h.calls.length = 0; await h.run(); assert.ok(!h.calls.includes('admin-attempt')); assert.ok(!h.calls.includes('tracking'));
});
test('completed, cancelled, refunded, and sandbox orders cause no provider call, write or notification', async () => {
  for (const overrides of [{ status: 'delivered' }, { fulfillment_status: 'delivered' }, { status: 'cancelled' },
    { status: 'refunded' }, { supplier_test_mode: true }]) {
    const h = harness(overrides); await h.run(); assert.equal(h.calls.length, 0); assert.equal(h.writes.length, 0);
  }
});
test('dry run reads only and does not reconcile mockups or enqueue mail', async () => {
  const h = harness(); const result = await h.run({ dryRun: true });
  assert.equal(result.updated, 1); assert.deepEqual(h.calls, ['list']); assert.equal(h.writes.length, 0);
});
test('failed admin notification retains intent and retries unchanged snapshot without new notification identity', async () => {
  const h = harness(); h.adminFail = true;
  assert.equal((await h.run()).notificationsFailed, 1); assert.ok(h.state.supplier_status_notification);
  h.adminFail = false; await h.run(); assert.equal(h.state.supplier_status_notification, null);
  assert.deepEqual([...h.notifications.keys()], ['tracking', 'admin']);
  h.calls.length = 0; await h.run(); assert.ok(!h.calls.includes('admin-attempt'));
});
test('manual completion discards obsolete pending notification without notifying', async () => {
  const h = harness(); h.adminFail = true; await h.run(); h.calls.length = 0;
  h.state.status = h.state.fulfillment_status = 'delivered'; await h.run();
  assert.equal(h.state.supplier_status_notification, null); assert.ok(!h.calls.includes('admin-attempt'));
  assert.ok(!h.calls.includes('tracking')); assert.equal(h.state.status, 'delivered');
});
test('concurrent manual completion wins compare-and-set and creates no notification', async () => {
  const h = harness({}, { completeBeforeSave: true }); await h.run();
  assert.equal(h.state.status, 'delivered'); assert.equal(h.notifications.size, 0); assert.equal(h.writes.length, 0);
});
test('missing entry can read details but cannot regress shipped state or erase tracking', async () => {
  const h = harness({ status: 'shipped', fulfillment_status: 'shipped', supplier_last_status: 'SHIPPED',
    supplier_tracking_url: shipped.Tracking }, { absent: true });
  await h.run(); assert.ok(h.calls.includes('details')); assert.equal(h.state.status, 'shipped');
  assert.equal(h.state.supplier_tracking_url, shipped.Tracking); assert.equal(h.notifications.size, 0);
});
test('wrong stamp never mutates supplier state or notifies; failed list never falls back to stale details', async () => {
  const h = harness({}, { row: { ...shipped, OrderStamp: 'another-order' } });
  assert.equal((await h.run()).failed, 1); assert.equal(h.state.status, 'sent_to_supplier'); assert.equal(h.notifications.size, 0);
  const failed = harness({}, { listFailure: true }); await assert.rejects(failed.run());
  assert.deepEqual(failed.calls, ['list']); assert.equal(failed.writes.length, 0);
});
test('delivery requires explicit supplier confirmation and terminal states never regress', async () => {
  const h = harness({}, { row: { ...shipped, Status: 'DELIVERED' } }); await h.run();
  assert.equal(h.state.status, 'delivered'); assert.ok(h.state.delivered_at);
  assert.ok(h.notifications.has('supplier:stamp-fixture:delivered')); assert.ok(!h.notifications.has('tracking'));
  assert.equal(h.next('delivered', 'SHIPPED'), 'delivered'); assert.equal(h.next('shipped', 'INVOICED'), 'shipped');
});
