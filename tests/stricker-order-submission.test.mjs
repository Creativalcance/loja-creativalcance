import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, imports = {}, suffix = '') {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8') + suffix, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, console, Date, URL, Uint8Array, Error, process: { env: {} },
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
    id: 'item-a', fulfillment_route: 'supplier_api', product_name: 'A6 notebook fixture', supplier_sku: '93670-106',
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

function submissionHarness({ personalized = true } = {}) {
  const writes = [], notifications = [], requests = [];
  const state = order([item({ personalization_required: personalized })], {
    supplier_submission_status: 'failed', supplier_order_stamp: null,
    supplier_submission_attempts: 1,
  });
  const h = { failService: false, files: new Map([['fixture/artwork-a.png', [1, 2, 3]]]), downloads: [] };
  const admin = {
    from(table) {
      let operation = 'select';
      const query = {
        select() { return this; }, eq() { return this; }, neq() { return this; },
        update(value) {
          operation = 'update'; writes.push({ table, operation, value: plain(value) });
          if (table === 'orders') Object.assign(state, plain(value));
          if (table === 'order_items') Object.assign(state.order_items[0], plain(value));
          return this;
        },
        insert(value) { operation = 'insert'; writes.push({ table, operation, value: plain(value) }); return this; },
        result() {
          if (table === 'orders') return { data: operation === 'select' ? plain(state) : { id: state.id }, error: null };
          if (table === 'order_items') return { data: plain(state.order_items[0]), error: null };
          if (table === 'supplier_order_events') return { data: { id: 'event-fixture' }, error: null };
          return { data: null, error: null };
        },
        async maybeSingle() { return this.result(); },
        async single() { return this.result(); },
        then(resolve) { resolve(this.result()); },
      };
      return query;
    },
    storage: { from(bucket) {
      assert.equal(bucket, 'customization-artwork');
      return { async download(storagePath) {
        h.downloads.push(storagePath);
        const bytes = h.files.get(storagePath);
        if (!bytes) return { data: null, error: { message: 'Artwork file unavailable' } };
        return { data: { async arrayBuffer() { return new Uint8Array(bytes).buffer; } }, error: null };
      } };
    } },
  };
  const client = load('src/lib/stricker/orders/client.ts', {
    '@/lib/stricker/config': {}, '@/lib/stricker/auth': {},
  });
  const api = load('src/lib/stricker/orders/submit-order.ts', {
    'node:path': { default: path },
    'node:crypto': { createHash },
    '@/lib/notifications/stricker-order-submitted': { async notifyStrickerOrderSubmitted() {} },
    '@/lib/notifications/customer-email': {
      async notifyOrderStatusChanged(value) { notifications.push(value); },
      async notifyOrderTrackingAvailable() {},
    },
    '@/lib/supabase/admin': { createSupabaseAdminClient: () => admin },
    '@/lib/stricker/orders/client': {
      ...client,
      async submitStrickerProductOrder(payload, options) {
        requests.push({ method: 'OrderV1', payload: plain(payload), options });
        return { response: {}, orderDetails: { OrderStamp: 'supplier-order-fixture',
          Status: personalized ? 'WAITING_ART_WORK' : 'PROCESSING',
          OrderLines: [{ Sku: '93670-106', OrderLineStamp: 'supplier-line-fixture' }] } };
      },
      async submitStrickerServiceOrder(payload, options) {
        requests.push({ method: 'ServiceOrderV1', payload: plain(payload), options });
        if (h.failService) throw new Error('Supplier service temporarily unavailable');
        return { response: {}, orderDetails: { OrderStamp: 'supplier-order-fixture', Status: 'PROCESSING' } };
      },
    },
    '@/lib/stricker/orders/map-order-payload': mapping,
    '@/lib/stricker/resolve-customization-service-code': {},
  }, '\nexport { markOrderAsFailed };');
  return Object.assign(h, { api, admin, writes, notifications, requests, state });
}

test('paid print order uses OrderV1 then ServiceOrderV1 with the same artwork, dimensions and approval', async () => {
  const h = submissionHarness();
  const result = await h.api.submitPaidOrderToStricker('order-fixture');
  assert.equal(result.success, true);
  assert.deepEqual(h.requests.map(request => request.method), ['OrderV1', 'ServiceOrderV1']);
  const product = h.requests[0].payload;
  assert.deepEqual(product.order, [{ Sku: '93670-106', Quantity: 30, LineType: 'PRINT', WaitArtWork: true, Sample: false }]);
  assert.equal(product.internalReference, 'LC-FIXTURE');
  assert.equal(product.shippingDate, null);
  assert.deepEqual(h.requests[1].payload, { orderStamp: 'supplier-order-fixture', order: [{
    OrderLineStamp: 'supplier-line-fixture', ServCode: '93670.4.4.SUB1-01-F', Group: 1,
    Color1: '', Color2: '', Color3: '', Color4: '', Color5: '',
    LogoArea: 150.2208, LogoWidth: 104.32, LogoHeight: 144, Appproved: false,
    Files: [{ FileName: 'artwork', FileExtension: '.png', FileBytes: [1, 2, 3] }],
  }] });
  assert.ok(h.requests.every(request => request.options.testMode === true));
  assert.equal(h.state.payment_status, 'paid');
  assert.equal(h.state.supplier_submission_status, 'submitted');
  assert.equal(h.state.supplier_last_status, 'PROCESSING');
  assert.equal(h.state.order_items[0].supplier_artwork_submission_status, 'submitted');
  const event = h.writes.find(write => write.value.event_type === 'service_order_submission');
  assert.deepEqual(event.value.request_payload.order[0].Files, [{
    FileName: 'artwork', FileExtension: '.png', FileSize: 3,
    FileSHA256: createHash('sha256').update(new Uint8Array([1, 2, 3])).digest('hex'),
  }]);
  const repeated = await h.api.submitPaidOrderToStricker('order-fixture');
  assert.equal(repeated.alreadySubmitted, true);
  assert.equal(h.requests.length, 2);
});

test('composed artwork includes the unchanged customer original in the same service request', async () => {
  const h = submissionHarness();
  const sourceBytes = Array.from({ length: 256 }, (_, i) => i);
  h.files.set('fixture/source.pdf', sourceBytes);
  Object.assign(h.state.order_items[0].personalization_data, {
    hasComposedArtwork: true, sourceArtworkStoragePath: 'fixture/source.pdf',
    sourceArtworkFileName: 'Logótipo final.PDF',
  });
  const result = await h.api.submitPaidOrderToStricker('order-fixture');
  assert.equal(result.success, true);
  assert.deepEqual(h.requests.map(request => request.method), ['OrderV1', 'ServiceOrderV1']);
  const files = h.requests[1].payload.order[0].Files;
  assert.deepEqual(files, [
    { FileName: 'artwork', FileExtension: '.png', FileBytes: [1, 2, 3] },
    { FileName: 'original-Logotipo-final', FileExtension: '.pdf', FileBytes: sourceBytes },
  ]);
  const loggedFiles = h.writes.find(write => write.value.event_type === 'service_order_submission')
    .value.request_payload.order[0].Files;
  assert.equal(loggedFiles[1].FileSize, 256);
  assert.equal(loggedFiles[1].FileSHA256, createHash('sha256').update(new Uint8Array(sourceBytes)).digest('hex'));
  assert.ok(loggedFiles.every(file => !('FileBytes' in file)));
  assert.ok(files.every(file => !('FileSHA256' in file)));
  assert.equal(h.requests[1].payload.order[0].Appproved, false);
  await h.api.submitPaidOrderToStricker('order-fixture');
  assert.equal(h.requests.length, 2);
});

test('a missing original blocks incomplete artwork submission and retry reuses the accepted order', async () => {
  const h = submissionHarness();
  Object.assign(h.state.order_items[0].personalization_data, {
    sourceArtworkStoragePath: 'fixture/missing.png', sourceArtworkFileName: 'original.png',
  });
  const result = await h.api.submitPaidOrderToStricker('order-fixture');
  assert.equal(result.success, false);
  assert.equal(h.state.order_items[0].supplier_artwork_submission_status, 'failed');
  assert.equal(h.state.payment_status, 'paid');
  assert.deepEqual(h.requests.map(request => request.method), ['OrderV1']);
  h.files.set('fixture/missing.png', [128, 255, 0]);
  const retry = await h.api.submitPaidOrderToStricker('order-fixture');
  assert.equal(retry.success, true);
  assert.deepEqual(h.requests.map(request => request.method), ['OrderV1', 'ServiceOrderV1']);
  assert.equal(h.requests[1].payload.orderStamp, 'supplier-order-fixture');
  assert.equal(h.requests[1].payload.order[0].Files.length, 2);
});

test('an empty original cannot be reported as successfully sent', async () => {
  const h = submissionHarness();
  h.files.set('fixture/empty.png', []);
  Object.assign(h.state.order_items[0].personalization_data, {
    sourceArtworkStoragePath: 'fixture/empty.png', sourceArtworkFileName: 'empty.png',
  });
  const result = await h.api.submitPaidOrderToStricker('order-fixture');
  assert.equal(result.success, false);
  assert.deepEqual(h.requests.map(request => request.method), ['OrderV1']);
  assert.match(result.errors.join(' '), /vazio/);
});

test('an original referencing the same storage object is not attached twice', async () => {
  const h = submissionHarness();
  h.state.order_items[0].personalization_data.sourceArtworkStoragePath = 'fixture/artwork-a.png';
  const result = await h.api.submitPaidOrderToStricker('order-fixture');
  assert.equal(result.success, true);
  assert.equal(h.requests[1].payload.order[0].Files.length, 1);
  assert.deepEqual(h.downloads, ['fixture/artwork-a.png']);
});

test('personalization retry reuses the accepted product order and cannot create a duplicate order', async () => {
  const h = submissionHarness();
  h.failService = true;
  const failed = await h.api.submitPaidOrderToStricker('order-fixture');
  assert.equal(failed.success, false);
  assert.equal(h.state.supplier_submission_status, 'partially_submitted');
  assert.equal(h.state.supplier_order_stamp, 'supplier-order-fixture');
  assert.equal(h.state.payment_status, 'paid');
  h.failService = false;
  const retried = await h.api.submitPaidOrderToStricker('order-fixture');
  assert.equal(retried.success, true);
  assert.deepEqual(h.requests.map(request => request.method), ['OrderV1', 'ServiceOrderV1', 'ServiceOrderV1']);
  assert.deepEqual(h.requests[2].payload, h.requests[1].payload);
});

test('non-personalized orders still use a single product request without waiting for artwork', async () => {
  const h = submissionHarness({ personalized: false });
  assert.equal((await h.api.submitPaidOrderToStricker('order-fixture')).success, true);
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].payload.order[0].LineType, 'SIMPLE');
  assert.equal(h.requests[0].payload.order[0].WaitArtWork, false);
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
