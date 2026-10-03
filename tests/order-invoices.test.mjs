import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import ts from 'typescript';

function load(file, imports = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, File, Buffer, URL, console, require: name => {
    if (!(name in imports)) throw new Error(`Unexpected import ${name}`);
    return imports[name];
  } });
  return exports;
}
const files = load('src/lib/orders/invoice-file.ts', { 'node:crypto': crypto });
const orderId = '11111111-1111-4111-8111-111111111111';
const otherId = '22222222-2222-4222-8222-222222222222';
const pdf = () => new File(['%PDF-1.7 invoice-fixture'], 'invoice.pdf', { type: 'application/pdf' });
const copy = load('src/lib/i18n/config.ts');

test('PDF upload has immutable order-scoped names, deduplicates the same invoice and distinguishes replacements', async () => {
  const a = await files.prepareInvoiceFile(orderId, 'FT 2026/123', pdf());
  const b = await files.prepareInvoiceFile(orderId, 'FT 2026/123', pdf());
  const c = await files.prepareInvoiceFile(orderId, 'FT 2026/124', pdf());
  const d = await files.prepareInvoiceFile(otherId, 'FT 2026/123', pdf());
  assert.equal(a.path, b.path); assert.notEqual(a.path, c.path); assert.notEqual(a.path, d.path);
  assert.equal(files.isOrderInvoicePath(orderId, a.path), true);
  assert.equal(files.isOrderInvoicePath(otherId, a.path), false);
  for (const path of ['../invoice.pdf', `${orderId}/../${'a'.repeat(64)}.pdf`, 'https://evil.example/invoice.pdf']) {
    assert.equal(files.isOrderInvoicePath(orderId, path), false);
  }
  assert.match(a.fileName, /^Fatura-FT-2026-123.pdf$/);
});

test('empty, oversized, disguised and unsupported invoice uploads are rejected on the server', async () => {
  const invalid = [new File([], 'empty.pdf'), new File(['<script>bad</script>'], 'fake.pdf', { type: 'application/pdf' }),
    new File(['%PDF-1.7'], 'file.html', { type: 'text/html' }), new File([new Uint8Array(files.MAX_INVOICE_BYTES + 1)], 'large.pdf')];
  for (const file of invalid) await assert.rejects(files.prepareInvoiceFile(orderId, 'FT 1', file));
  await assert.rejects(files.prepareInvoiceFile(orderId, 'A'.repeat(101), pdf()));
  await assert.rejects(files.prepareInvoiceFile(orderId, 'FT\nInjected', pdf()));
  await assert.rejects(files.prepareInvoiceFile('../other-order', 'FT 1', pdf()));
});

test('private download signs only the exact order path for 60 seconds and retains legacy HTTPS invoices', async () => {
  const saved = await files.prepareInvoiceFile(orderId, 'FT 1', pdf());
  const calls = [];
  const access = load('src/lib/orders/invoice-access.ts', { 'server-only': {}, '@/lib/orders/invoice-file': files,
    '@/lib/customer/order-details': { safeDocumentUrl: value => value?.startsWith('https://') ? value : null } });
  const admin = { storage: { from: bucket => ({ createSignedUrl: async (...args) => {
    calls.push({ bucket, args }); return { data: { signedUrl: 'https://storage.example/private-signed' }, error: null };
  } }) } };
  await assert.rejects(access.orderInvoiceUrl(admin, { id: otherId, invoice_storage_path: saved.path }));
  assert.equal(calls.length, 0);
  assert.equal(await access.orderInvoiceUrl(admin, { id: orderId, invoice_storage_path: saved.path }), 'https://storage.example/private-signed');
  assert.equal(calls[0].bucket, 'order-invoices'); assert.equal(calls[0].args[1], 60);
  assert.equal(await access.orderInvoiceUrl(admin, { id: orderId, invoice_url: 'https://legacy.example/invoice.pdf' }), 'https://legacy.example/invoice.pdf');
  assert.equal(calls.length, 1);
});

function harness({ denied = false, conflict = false, delivery = 'sent', existing = null } = {}) {
  let accessed = false, reads = 0, uploaded = 0, sends = 0, writes = 0;
  const order = { id: orderId, order_number: 'LC-TEST', status: 'shipped', payment_status: 'paid',
    invoice_storage_path: existing?.path ?? null, invoice_number: existing ? 'FT 1' : null,
    invoice_status: existing ? 'issued' : 'pending', updated_at: 'version-1', deleted_at: null, metadata: {} };
  const db = { storage: { from: bucket => ({ upload: async (path, bytes, options) => {
    assert.equal(accessed, true); assert.equal(bucket, 'order-invoices'); assert.equal(options.upsert, false);
    assert.match(bytes.toString(), /^%PDF-/); assert.ok(path.startsWith(orderId + '/')); uploaded++;
    return { data: { path }, error: null };
  } }) }, from: name => {
    reads++; assert.equal(accessed, true);
    let mutation = null, single = false, predicates = [], result;
    const q = { select: () => q, eq: (k, v) => { predicates.push(row => row[k] === v); return q; },
      is: (k, v) => { predicates.push(row => row[k] === v); return q; },
      maybeSingle: () => { single = true; return q; }, update: data => { mutation = data; return q; }, insert: () => q,
      then: resolve => {
        if (!result) {
          let row = name === 'orders' && predicates.every(p => p(order)) ? order : null;
          if (mutation && name === 'orders') {
            if (conflict) row = null;
            else if (row) { Object.assign(row, mutation); writes++; }
          }
          result = { data: single ? row ? { ...row } : null : row ? [{ ...row }] : [], error: null };
        }
        return Promise.resolve(result).then(resolve);
      } };
    return q;
  } };
  const actions = load('src/lib/admin/orders/actions.ts', {
    'next/cache': { revalidatePath: () => {} }, '@/lib/i18n/config': copy,
    '@/lib/supabase/admin': { createSupabaseAdminClient: () => db },
    '@/lib/auth/assert-admin': { assertAdminAccess: async () => {
      if (denied) throw new Error('FORBIDDEN'); accessed = true; return { userId: 'admin' };
    } },
    '@/lib/orders/invoice-file': files,
    '@/lib/notifications/customer-email': { deliverSavedOrderInvoice: async (id, path) => {
      assert.equal(id, order.id); assert.equal(path, order.invoice_storage_path); sends++; return delivery;
    } },
  });
  const form = new FormData(); form.set('orderId', order.id); form.set('invoiceNumber', 'FT 1');
  if (!existing) form.set('invoiceFile', pdf());
  return { actions, form, order, metrics: () => ({ reads, uploaded, sends, writes }) };
}

test('invoice mutation rejects non-admin access before reading the order or accepting a PDF', async () => {
  const h = harness({ denied: true });
  assert.equal((await h.actions.updateOrderInvoiceAction({}, h.form)).success, false);
  assert.deepEqual(h.metrics(), { reads: 0, uploaded: 0, sends: 0, writes: 0 });
});
test('invoice upload persists a private PDF before sending and retains it if email delivery fails', async () => {
  for (const delivery of ['sent', 'failed']) {
    const h = harness({ delivery });
    const result = await h.actions.updateOrderInvoiceAction({}, h.form);
    assert.equal(result.success, true, result.message);
    assert.equal(h.metrics().uploaded, 1); assert.equal(h.metrics().sends, 1);
    assert.equal(h.order.invoice_url, null); assert.equal(h.order.invoice_number, 'FT 1');
    assert.equal(files.isOrderInvoicePath(orderId, h.order.invoice_storage_path), true);
    if (delivery === 'failed') assert.match(result.message, /guardada.*email falhou/);
  }
});
test('concurrent order changes prevent associating or emailing the uploaded invoice', async () => {
  const h = harness({ conflict: true });
  const result = await h.actions.updateOrderInvoiceAction({}, h.form);
  assert.equal(result.success, false); assert.match(result.message, /alterada entretanto/);
  assert.equal(h.metrics().sends, 0); assert.equal(h.order.invoice_storage_path, null);
});
test('retrying the saved invoice needs no new upload, but changing its number requires the corresponding PDF', async () => {
  const existing = await files.prepareInvoiceFile(orderId, 'FT 1', pdf());
  const h = harness({ existing });
  const result = await h.actions.updateOrderInvoiceAction({}, h.form);
  assert.equal(result.success, true, result.message); assert.equal(h.metrics().uploaded, 0); assert.equal(h.metrics().sends, 1);
  h.form.set('invoiceNumber', 'FT 2');
  assert.equal((await h.actions.updateOrderInvoiceAction({}, h.form)).success, false);
  assert.equal(h.metrics().sends, 1);
});
