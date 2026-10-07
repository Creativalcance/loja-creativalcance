import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, imports = {}, suffix = '') {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8') + suffix, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, console, Date, URL, Uint8Array, process: { env: {} },
    require(name) {
      if (!(name in imports)) throw new Error(`Unexpected dependency: ${name}`);
      return imports[name];
    },
  });
  return exports;
}

const mapping = load('src/lib/stricker/orders/map-order-payload.ts');
const plain = value => JSON.parse(JSON.stringify(value));

function item(overrides = {}) {
  return {
    id: 'item-a', product_name: 'A6 notebook fixture', supplier_sku: '93670-106',
    quantity: 30, personalization_required: true, service_code: '93670.4.4.SUB1-01-F',
    personalization_data: { printColorMode: 'full', printColors: [] },
    table_code_option: 'SUB1-01-F', logo_storage_path: 'fixture/artwork-a.png',
    logo_file_name: 'artwork.png', logo_width_mm: 104.32, logo_height_mm: 144,
    logo_area: 15022.08, artwork_approved: false, ...overrides,
  };
}

function order(items = [item()], overrides = {}) {
  return {
    id: 'order-fixture', order_number: 'LC-FIXTURE', status: 'paid', payment_status: 'paid',
    paid_at: '2026-10-07T09:56:00Z', supplier_test_mode: true, no_shipping: false,
    customer_name: 'Test customer', customer_email: 'customer@example.test',
    shipping_address: { contact_name: 'Test customer', contact_phone: '+351910000000',
      address_line_1: 'Test address', postal_code: '1000-001', city: 'Lisboa', country_code: 'PT' },
    order_items: items, ...overrides,
  };
}

function submissionHarness() {
  const writes = [], notifications = [];
  const admin = {
    from(table) {
      return {
        update(value) { writes.push({ table, operation: 'update', value: plain(value) }); return this; },
        insert(value) { writes.push({ table, operation: 'insert', value: plain(value) }); return this; },
        eq(key, value) { assert.equal(key, 'id'); assert.equal(value, 'order-fixture'); return this; },
        then(resolve) { resolve({ error: null }); },
      };
    },
    storage: { from(bucket) {
      assert.equal(bucket, 'customization-artwork');
      return { async download(storagePath) {
        assert.equal(storagePath, 'fixture/artwork-a.png');
        return { data: { async arrayBuffer() { return new Uint8Array([1, 2, 3]).buffer; } }, error: null };
      } };
    } },
  };
  const api = load('src/lib/stricker/orders/submit-order.ts', {
    'node:path': { default: path },
    '@/lib/notifications/stricker-order-submitted': {},
    '@/lib/notifications/customer-email': {
      async notifyOrderStatusChanged(value) { notifications.push(value); },
    },
    '@/lib/supabase/admin': {},
    '@/lib/stricker/orders/client': {},
    '@/lib/stricker/orders/map-order-payload': mapping,
    '@/lib/stricker/resolve-customization-service-code': {},
  }, '\nexport { markOrderAsFailed, prepareProductPayloadWithArtwork };');
  return { api, admin, writes, notifications };
}

test('OrderV1 embeds the documented artwork group without changing print specifications or approval', async () => {
  const h = submissionHarness();
  const fixture = order();
  const mappedOrder = mapping.mapOrderToStricker(fixture);
  const { payload } = await h.api.prepareProductPayloadWithArtwork({
    supabaseAdmin: h.admin, order: fixture, mappedOrder,
  });
  const line = plain(payload.order[0]);
  assert.equal(line.Quantity, 30);
  assert.equal(line.Sku, '93670-106');
  assert.equal(line.LineType, 'PRINT');
  assert.equal(line.WaitArtWork, false);
  assert.deepEqual(line.ServiceOrderLines, [{
    ServCode: '93670.4.4.SUB1-01-F', Group: 1,
    Color1: '', Color2: '', Color3: '', Color4: '', Color5: '',
    LogoArea: 150.2208, LogoWidth: 104.32, LogoHeight: 144, Appproved: false,
    Files: [{ FileName: 'artwork', FileExtension: '.png', FileBytes: [1, 2, 3] }],
  }]);
  assert.equal(payload.internalReference, 'LC-FIXTURE');
  assert.equal(payload.shippingDate, null);
});

test('services sharing an artwork share a group; different uploads with the same filename stay separate', () => {
  const mapped = mapping.mapOrderToStricker(order([
    item(),
    item({ id: 'simple', personalization_required: false }),
    item({ id: 'same-logo-other-service', service_code: 'other-service' }),
    item({ id: 'different-upload', logo_storage_path: 'fixture/artwork-b.png' }),
    item({ id: 'url-a', logo_storage_path: null, logo_url: 'https://example.test/artwork.png' }),
    item({ id: 'url-b', logo_storage_path: null, logo_url: 'https://example.test/artwork.png' }),
  ]));
  assert.deepEqual(plain(mapped.serviceItems.map(value => value.servicePayload.Group)), [1, 1, 2, 3, 3]);
  assert.equal(mapped.productPayload.order.length, 6);
});

for (const status of ['paid', 'sent_to_supplier', 'shipped']) {
  test(`supplier rejection records the error without downgrading ${status} or sending a failure email`, async () => {
    const h = submissionHarness();
    const message = 'Erro do fornecedor OrderV1: código 80: One or more specs are invalid';
    await h.api.markOrderAsFailed({ supabaseAdmin: h.admin, order: order([], { status }), message });
    assert.equal(h.writes.length, 2);
    const update = h.writes[0];
    assert.equal(update.table, 'orders');
    assert.equal(update.value.supplier_submission_status, 'failed');
    assert.equal(update.value.supplier_submission_error, message);
    assert.ok(update.value.supplier_failed_at);
    assert.equal('status' in update.value, false);
    assert.equal('payment_status' in update.value, false);
    const history = h.writes[1];
    assert.equal(history.table, 'order_status_history');
    assert.equal(history.value.previous_status, status);
    assert.equal(history.value.new_status, status);
    assert.equal(history.value.metadata.supplierSubmissionStatus, 'failed');
    assert.equal(history.value.metadata.error, message);
    assert.deepEqual(h.notifications, []);
  });
}
