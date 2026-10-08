import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import ts from 'typescript';

function load(path, imports = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, URL, Intl, Buffer, AbortSignal, console, process: { env: {} }, ...globals,
    require: name => { if (!(name in imports)) throw new Error(`Unexpected import ${name}`); return imports[name]; },
  });
  return exports;
}
const config = load('src/lib/i18n/config.ts');
const statuses = load('src/lib/customer/order-status.ts');
const clone = value => JSON.parse(JSON.stringify(value));

// A small stateful database double: conditional updates really claim rows, and
// duplicate event keys return the existing record rather than creating mail.
function database(seed = {}) {
  const tables = { orders: [], order_mockups: [], customer_email_notifications: [], admin_notifications: [],
    newsletter_subscribers: [], fulfillment_groups: [], fulfillment_group_items: [], ...clone(seed) };
  const db = { tables, failGroupSave: false, from(table) {
    assert.ok(table in tables, `Unexpected table or supplier operation: ${table}`);
    let action = 'read', values, predicates = [], cap = Infinity, single = false, result;
    const query = {
      select: () => query,
      eq: (key, value) => { predicates.push(row => row[key] === value); return query; },
      in: (key, values) => { predicates.push(row => values.includes(row[key])); return query; },
      lt: (key, value) => { predicates.push(row => row[key] != null && row[key] < value); return query; },
      not: (key, op, value) => { assert.equal(op, 'is'); predicates.push(row => row[key] !== value); return query; },
      order: () => query,
      limit: value => { cap = value; return query; },
      update: value => { action = 'update'; values = clone(value); return query; },
      upsert: (value, options) => { assert.equal(options.ignoreDuplicates, true); action = 'upsert'; values = clone(value); return query; },
      maybeSingle: () => { single = true; return query; },
      single: () => { single = true; return query; },
      returns: () => query,
      then: (resolve, reject) => {
        if (!result) {
          let rows = tables[table].filter(row => predicates.every(predicate => predicate(row))).slice(0, cap);
          if (action === 'upsert') {
            rows = [];
            if (!tables[table].some(row => row.event_key === values.event_key)) {
              const row = { id: `${table}-${tables[table].length}`, email_status: 'pending', email_attempts: 0, ...values };
              tables[table].push(row); rows.push(row);
            }
          }
          if (action === 'update' && table === 'fulfillment_groups' && db.failGroupSave) {
            result = { data: null, error: { message: 'fulfillment save unavailable' } };
          } else {
            if (action === 'update') rows.forEach(row => Object.assign(row, values));
            result = { data: clone(single ? rows[0] ?? null : rows), error: null };
          }
        }
        return Promise.resolve(result).then(resolve, reject);
      },
    };
    return query;
  }};
  return db;
}
function fixture(locale = 'pt') {
  return { id: '11111111-1111-4111-8111-111111111111', user_id: 'user', order_number: 'TEST-360',
    customer_email: 'customer@example.test', customer_name: '<script>Cliente</script>', payment_status: 'paid', status: 'processing',
    currency: 'EUR', grand_total: 1234.56, metadata: { locale }, tracking_number: '<TRACK-360>', tracking_url: null,
    shipping_address: null, order_items: [
      { id: 'manual-item', product_id: 'manual-product', product_name: 'Manual 360', product_sku: '360-1', quantity: 10, total: 20 },
      { id: 'supplier-item', product_id: 'supplier-product', product_name: 'Garrafa portuguesa', product_sku: 'SP-1', quantity: 5, total: 15 },
    ] };
}
function harness(seed = {}, options = {}) {
  const db = database(seed), requests = [], errors = [];
  const downloads = [];
  db.storage = { from: bucket => ({ download: async path => {
    assert.equal(bucket, 'order-invoices'); downloads.push(path);
    return options.storageFailure ? { data: null, error: { message: 'private file unavailable' } }
      : { data: new Blob(['%PDF-1.7 invoice-fixture']), error: null };
  } }) };
  const state = { fail: options.fail || false, translationFailure: false };
  const globals = {
    console: { error: (...args) => errors.push(args) },
    process: { env: { RESEND_API_KEY: 'unit-test-only', RESEND_FROM_EMAIL: '360 Merchandising <info@example.test>',
      INTERNAL_ORDER_EMAIL: 'current-internal@example.test', CRON_SECRET: 'unit-test-cron' } },
    fetch: async (url, init) => {
      assert.equal(url, 'https://api.resend.com/emails');
      const request = { headers: init.headers, body: JSON.parse(init.body) }; requests.push(request);
      return { ok: !state.fail, status: state.fail ? 403 : 200,
        json: async () => state.fail ? { message: 'Domain not verified' } : { id: `provider-${requests.length}` } };
    },
  };
  const imports = {
    '@/lib/orders/mockup': load('src/lib/orders/mockup.ts'),
    '@/lib/orders/invoice-file': load('src/lib/orders/invoice-file.ts', {'node:crypto': crypto}),
    '@/lib/notifications/invoice-email': load('src/lib/notifications/invoice-email.ts'),
    'node:crypto': crypto, 'node:timers/promises': { setTimeout: async () => {} },
    '@/lib/i18n/config': config, '@/lib/customer/order-status': statuses,
    '@/lib/supabase/admin': { createSupabaseAdminClient: () => db },
    '@/lib/i18n/catalog': { getLocalizedProductTexts: async ({ locale }) => {
      if (state.translationFailure) throw new Error('Translation service unavailable');
      return new Map([['supplier-product', { name: { en: 'Bottle', fr: 'Bouteille', es: 'Botella', de: 'Flasche', it: 'Bottiglia' }[locale] }]]);
    } },
  };
  return { db, requests, state, errors, globals, downloads,
    customer: load('src/lib/notifications/customer-email.ts', imports, globals),
    internal: load('src/lib/notifications/internal-order.ts', imports, globals),
    newsletter: load('src/lib/newsletter/welcome-email.ts', imports, globals) };
}

const words = { pt: ['Bem-vindo', 'Encomenda', 'Atualização', 'Tracking', 'newsletter'],
  en: ['Welcome', 'Order', 'update', 'Tracking', 'newsletter'],
  fr: ['Bienvenue', 'Commande', 'Mise à jour', 'Suivi', 'newsletter'],
  es: ['bienvenida', 'Pedido', 'Actualización', 'Seguimiento', 'newsletter'],
  de: ['Willkommen', 'Bestellung', 'Aktualisierung', 'Sendungsverfolgung', 'Newsletter'],
  it: ['Benvenuto', 'Ordine', 'Aggiornamento', 'Tracciamento', 'newsletter'] };
for (const locale of Object.keys(words)) {
  test(`${locale}: account, confirmation, status, tracking and newsletter reach the saved recipient in the saved language`, async () => {
    const order = fixture(locale);
    const subscriber = { id: 'subscriber', name: 'Newsletter <script>', email: 'subscriber@example.test', locale,
      status: 'active', consented_at: '2026-09-09T10:00:00Z', welcome_email_status: 'pending', welcome_email_attempts: 0 };
    const h = harness({ orders: [order], newsletter_subscribers: [subscriber] });
    await h.customer.notifyAccountWelcome({ userId: 'user', email: order.customer_email, name: order.customer_name, locale });
    await h.customer.notifyOrderConfirmed(order.id);
    await h.customer.notifyOrderStatusChanged({ orderId: order.id, previousStatus: 'paid', newStatus: 'sent_to_supplier' });
    await h.customer.notifyOrderTrackingAvailable(order.id);
    await h.newsletter.sendNewsletterWelcomeEmail({ subscriberId: subscriber.id, consentedAt: subscriber.consented_at,
      email: 'stale@example.test', name: 'Stale', locale: 'pt' });
    assert.equal(h.errors.length, 0);
    assert.equal(h.requests.length, 5);
    for (const [index, request] of h.requests.entries()) {
      const { body } = request;
      assert.ok(body.subject.includes(words[locale][index]), body.subject);
      assert.match(body.html, new RegExp(`<html lang="${locale}">`));
      assert.ok(body.html.includes(`https://360-merchandising.com${locale === 'pt' ? '' : '/' + locale}/`));
      assert.deepEqual(body.to, [index === 4 ? subscriber.email : order.customer_email]);
      assert.equal(body.tags.find(tag => tag.name === 'locale').value, locale);
      assert.doesNotMatch(body.html, /<script>|sent_to_supplier|fornecedor|supplier|Stricker/);
      assert.ok(request.headers['Idempotency-Key']);
    }
    const confirmation = h.requests[1].body;
    assert.ok(confirmation.text.includes(new Intl.NumberFormat(config.SITE_LOCALES[locale].intlLocale, { style: 'currency', currency: 'EUR' }).format(1234.56)));
    assert.ok(confirmation.text.includes('Manual 360'));
    if (locale !== 'pt') assert.doesNotMatch(confirmation.text, /Garrafa portuguesa/);
    assert.ok(h.requests[2].body.text.includes(statuses.customerStatus('sent_to_supplier', locale)));
    assert.ok(h.requests[3].body.html.includes('&lt;TRACK-360&gt;'));
    await h.customer.notifyOrderConfirmed(order.id);
    await h.newsletter.sendNewsletterWelcomeEmail({ subscriberId: subscriber.id, consentedAt: subscriber.consented_at, ...subscriber });
    assert.equal(h.requests.length, 5, 'repeating a completed event must not send twice');
  });
}

test('failed translations remain queued; retry uses the order language and then freezes translated names', async () => {
  const order = fixture('de'), h = harness({ orders: [order] });
  h.state.translationFailure = true;
  await h.customer.notifyOrderConfirmed(order.id);
  const row = h.db.tables.customer_email_notifications[0];
  assert.equal(row.email_status, 'failed'); assert.equal(h.requests.length, 0);
  h.state.translationFailure = false;
  h.state.fail = true;
  await h.customer.retryPendingCustomerEmails();
  assert.equal(row.payload.items[1].name, 'Flasche');
  h.state.translationFailure = true; h.state.fail = false;
  const retried = await h.customer.retryPendingCustomerEmails();
  assert.equal(retried.sent, 1); assert.equal(row.email_status, 'sent');
  assert.equal(h.requests[0].headers['Idempotency-Key'], h.requests[1].headers['Idempotency-Key']);
  assert.deepEqual(h.requests[0].body, h.requests[1].body);
});

test('concurrent customer retries claim once; exhausted and already sent rows are excluded', async () => {
  const row = { id: 'mail', event_key: 'welcome:user', event_type: 'account_welcome', locale: 'fr',
    payload: { name: 'Client' }, email_to: 'saved@example.test', email_status: 'failed', email_attempts: 2 };
  const h = harness({ customer_email_notifications: [row, { ...row, id: 'exhausted', email_attempts: 5 }, { ...row, id: 'done', email_status: 'sent' }] });
  await Promise.all([h.customer.retryPendingCustomerEmails(), h.customer.retryPendingCustomerEmails()]);
  assert.equal(h.requests.length, 1); assert.equal(h.db.tables.customer_email_notifications[0].email_attempts, 3);
  assert.equal(h.db.tables.customer_email_notifications[1].email_attempts, 5);
});

function internalSeed(status = 'failed', payment = 'paid') {
  const order = fixture('de'); order.payment_status = payment;
  return { orders: [order], fulfillment_groups: [{ id: 'group', order_id: order.id, route: 'internal_360', status }],
    fulfillment_group_items: [{ fulfillment_group_id: 'group', order_item_id: 'manual-item' }],
    admin_notifications: [{ id: 'internal', event_key: 'internal-order:group', event_type: 'internal_order_paid',
      email_to: 'original-internal@example.test', email_status: 'failed', email_attempts: 0, metadata: { fulfillmentGroupId: 'group' } }] };
}
test('manual 360 recovery sends only its own items to the original internal recipient in Portuguese, once', async () => {
  const h = harness(internalSeed());
  assert.equal((await h.internal.retryPendingInternalOrderEmails()).sent, 1);
  assert.equal(h.requests.length, 1);
  const mail = h.requests[0].body;
  assert.deepEqual(mail.to, ['original-internal@example.test']);
  assert.match(mail.html, /<html lang="pt">/); assert.match(mail.text, /Manual 360/);
  assert.doesNotMatch(mail.text, /Garrafa portuguesa|SP-1/);
  assert.equal(h.db.tables.fulfillment_groups[0].status, 'notified');
  await h.internal.retryPendingInternalOrderEmails(); assert.equal(h.requests.length, 1);
});
test('internal recovery never rolls back fulfillment or re-sends after a fulfillment persistence error', async () => {
  const advanced = harness(internalSeed('shipped'));
  await advanced.internal.retryPendingInternalOrderEmails();
  assert.equal(advanced.db.tables.fulfillment_groups[0].status, 'shipped');
  const h = harness(internalSeed()); h.db.failGroupSave = true;
  await h.internal.retryPendingInternalOrderEmails();
  assert.equal(h.db.tables.admin_notifications[0].email_status, 'sent');
  await h.internal.retryPendingInternalOrderEmails(); assert.equal(h.requests.length, 1);
});
test('unpaid or cancelled manual orders cannot trigger processing notifications', async () => {
  for (const payment of ['pending', 'refunded']) {
    const h = harness(internalSeed('pending', payment));
    await h.internal.retryPendingInternalOrderEmails(); assert.equal(h.requests.length, 0);
  }
  const seed = internalSeed(); seed.orders[0].status = 'cancelled';
  const h = harness(seed); await h.internal.retryPendingInternalOrderEmails(); assert.equal(h.requests.length, 0);
});
test('newsletter recovery requires active consent and excludes sent, exhausted or unsubscribed recipients', async () => {
  const row = { id: 'pending', name: 'Client', email: 'saved@example.test', locale: 'it', status: 'active',
    consented_at: '2026-09-09T10:00:00Z', welcome_email_status: 'pending', welcome_email_attempts: 0 };
  const h = harness({ newsletter_subscribers: [row, { ...row, id: 'done', welcome_email_status: 'sent' },
    { ...row, id: 'exhausted', welcome_email_attempts: 5 }, { ...row, id: 'unsubscribed', status: 'unsubscribed' },
    { ...row, id: 'unconsented', consented_at: null }] });
  await h.newsletter.sendNewsletterWelcomeEmail({ subscriberId: row.id, consentedAt: 'old-consent', ...row });
  assert.equal(h.requests.length, 0);
  assert.equal((await h.newsletter.retryPendingNewsletterWelcomeEmails()).sent, 1);
  await h.newsletter.retryPendingNewsletterWelcomeEmails(); assert.equal(h.requests.length, 1);
});
test('unknown internal statuses use translated customer labels instead of exposing operational codes', async () => {
  for (const locale of Object.keys(words)) {
    const order = fixture(locale), h = harness({ orders: [order] });
    await h.customer.notifyOrderStatusChanged({ orderId: order.id, previousStatus: 'paid', newStatus: 'supplier_internal_unknown' });
    assert.ok(h.requests[0].body.text.includes(statuses.customerStatus('unknown', locale)));
    assert.doesNotMatch(h.requests[0].body.text, /supplier|internal_unknown/);
  }
});
test('the existing cron requires its secret before any recovery and invokes only email workers', async () => {
  const calls = [];
  const route = load('src/app/api/cron/customer-emails/route.ts', {
    'node:crypto': crypto, 'next/server': { NextResponse: { json: (body, init) => ({ body, status: init?.status || 200 }) } },
    '@/lib/notifications/customer-email': { retryPendingCustomerEmails: async () => { calls.push('customer'); return { sent: 1 }; } },
    '@/lib/notifications/internal-order': { retryPendingInternalOrderEmails: async () => { calls.push('internal'); return { sent: 1 }; } },
    '@/lib/newsletter/welcome-email': { retryPendingNewsletterWelcomeEmails: async () => { calls.push('newsletter'); return { sent: 1 }; } },
    '@/lib/sales/email': { retrySalesEmails: async () => { calls.push('sales'); return {sent: 1}; } },
  }, { process: { env: { CRON_SECRET: 'test-secret' } } });
  assert.equal((await route.GET({ headers: new Headers() })).status, 401); assert.equal(calls.length, 0);
  assert.equal((await route.GET({ headers: new Headers({ authorization: 'Bearer wrong' }) })).status, 401);
  assert.equal((await route.GET({ headers: new Headers({ authorization: 'Bearer test-secret' }) })).status, 200);
  assert.deepEqual(calls, ['customer', 'internal', 'newsletter', 'sales']);
});

test('repeated genuine status transitions have distinct events while retries keep the same event', async () => {
  const order=fixture('es'),h=harness({orders:[order]});
  for(const eventId of ['change-1','change-1','change-2']) await h.customer.notifyOrderStatusChanged({orderId:order.id,previousStatus:'processing',newStatus:'in_production',eventId});
  assert.equal(h.requests.length,2);
  assert.notEqual(h.requests[0].headers['Idempotency-Key'],h.requests[1].headers['Idempotency-Key']);
  assert.equal(h.requests[1].body.tags.find(tag=>tag.name==='locale').value,'es');
});


function invoiceFixture(locale = 'pt') {
  const order = fixture(locale);
  order.invoice_storage_path = `${order.id}/${'a'.repeat(64)}.pdf`;
  order.invoice_number = 'FT 2026/123'; order.invoice_status = 'issued';
  const email = { id: 'invoice-mail', event_key: `order-invoice:${order.id}:${'a'.repeat(64)}`,
    event_type: 'order_invoice_available', email_to: order.customer_email, locale,
    email_status: 'pending', email_attempts: 0,
    payload: { orderId: order.id, orderNumber: order.order_number, invoiceNumber: order.invoice_number,
      invoicePath: order.invoice_storage_path, invoiceFileName: 'Fatura-2026-123.pdf' } };
  return { order, email };
}
for (const [locale, word] of Object.entries({ pt: 'Fatura', en: 'Invoice', fr: 'Facture', es: 'Factura', de: 'Rechnung', it: 'Fattura' })) {
  test(`${locale}: invoice PDF is attached to the customer email once and available through the customer area`, async () => {
    const { order, email } = invoiceFixture(locale);
    const h = harness({ orders: [order], customer_email_notifications: [email] });
    assert.equal(await h.customer.deliverSavedOrderInvoice(order.id, order.invoice_storage_path), 'sent');
    assert.equal(h.requests.length, 1);
    const mail = h.requests[0].body;
    assert.match(mail.subject, new RegExp(word));
    assert.deepEqual(mail.to, [order.customer_email]);
    assert.deepEqual(mail.attachments, [{ filename: 'Fatura-2026-123.pdf', content: Buffer.from('%PDF-1.7 invoice-fixture').toString('base64') }]);
    assert.match(mail.text, /FT 2026\/123/);
    assert.ok(mail.text.includes(`${locale === 'pt' ? '' : '/' + locale}/area-cliente/encomendas/${order.id}`));
    assert.doesNotMatch(mail.text, /order-invoices|fornecedor|supplier/);
    assert.equal(h.db.tables.orders[0].invoice_status, 'sent');
    await h.customer.deliverSavedOrderInvoice(order.id, order.invoice_storage_path);
    assert.equal(h.requests.length, 1);
  });
}
test('invoice provider failure is retried with identical PDF, recipient, content and idempotency key', async () => {
  const { order, email } = invoiceFixture('de');
  const h = harness({ orders: [order], customer_email_notifications: [email] }, { fail: true });
  assert.equal(await h.customer.deliverSavedOrderInvoice(order.id, order.invoice_storage_path), 'failed');
  assert.equal(h.db.tables.orders[0].invoice_status, 'issued');
  h.state.fail = false;
  await h.customer.retryPendingCustomerEmails();
  assert.equal(h.db.tables.orders[0].invoice_status, 'sent');
  assert.deepEqual(h.requests[0], h.requests[1]);
});
test('an unavailable invoice file stays queued without sending an attachment-free email', async () => {
  const { order, email } = invoiceFixture();
  const h = harness({ orders: [order], customer_email_notifications: [email] }, { storageFailure: true });
  assert.equal(await h.customer.deliverSavedOrderInvoice(order.id, order.invoice_storage_path), 'failed');
  assert.equal(h.requests.length, 0);
  assert.equal(h.db.tables.customer_email_notifications[0].email_status, 'failed');
});
test('superseded and deleted invoices are cancelled before signing, downloading or emailing any document', async () => {
  for (const change of [{ invoice_storage_path: 'replacement.pdf' }, { deleted_at: '2026-10-03' }, { invoice_status: 'cancelled' }]) {
    const { order, email } = invoiceFixture(); Object.assign(order, change);
    const h = harness({ orders: [order], customer_email_notifications: [email] });
    await h.customer.retryPendingCustomerEmails();
    assert.equal(h.requests.length, 0); assert.equal(h.downloads.length, 0);
    assert.equal(h.db.tables.customer_email_notifications[0].email_status, 'cancelled');
  }
});
test('internal invoice alert includes the customer amounts and addresses, never provider costs or internal notes', async () => {
  const order = fixture(); order.status = 'shipped'; order.fulfillment_status = 'shipped';
  const email = { id: 'alert', event_key: `invoice-required:${order.id}`, event_type: 'invoice_required',
    email_to: 'info@creativalcance.com', locale: 'pt', email_status: 'pending', email_attempts: 0,
    payload: { orderId: order.id, orderNumber: order.order_number, testMode: true, customerName: '<script>Client</script>',
      customerEmail: order.customer_email, taxId: '123456789', currency: 'EUR', grandTotal: 49.69, amountPaid: 49.69,
      taxTotal: 9.29, shippingTotal: 4.90, subtotal: 1.40, personalizationTotal: 34.10,
      billingAddress: { line1: 'Rua de Teste', postalCode: '3000-123', city: 'Coimbra', country: 'PT' },
      supplierCost: 'SECRET_COST', internalNotes: 'SECRET_NOTE', items: [{ sku: 'SKU-1', name: 'Bloco', quantity: 10, total: 35.5 }] } };
  const h = harness({ orders: [order], customer_email_notifications: [email] });
  await h.customer.retryPendingCustomerEmails();
  const mail = h.requests[0].body;
  assert.deepEqual(mail.to, ['info@creativalcance.com']); assert.match(mail.subject, /^\[TESTE\]/);
  for (const value of ['49,69', '9,29', '4,90', 'Rua de Teste', '123456789', 'SKU-1']) assert.ok(mail.text.includes(value), value);
  assert.doesNotMatch(mail.html, /<script>|SECRET_COST|SECRET_NOTE/);
  assert.match(mail.html, /&lt;script&gt;/); assert.equal(mail.attachments, undefined);
  await h.customer.retryPendingCustomerEmails(); assert.equal(h.requests.length, 1);
});
test('invoice alert is cancelled if the invoice is already uploaded before the worker runs', async () => {
  const { order } = invoiceFixture(); order.status = 'shipped';
  const h = harness({ orders: [order], customer_email_notifications: [{ id: 'alert', event_key: `invoice-required:${order.id}`,
    event_type: 'invoice_required', email_status: 'pending', email_attempts: 0, email_to: 'info@creativalcance.com', locale: 'pt', payload: { orderId: order.id } }] });
  await h.customer.retryPendingCustomerEmails();
  assert.equal(h.requests.length, 0); assert.equal(h.db.tables.customer_email_notifications[0].email_status, 'cancelled');
});

function mockupFixture(locale = 'pt') {
  const order = fixture(locale); order.artwork_email = 'artwork-approver@example.test';
  const proof = { id: 'proof-1', order_id: order.id, state: 'pending', version: 1,
    approval_url: 'https://online-mockup.com/pt/11111111-1111-4111-8111-111111111111/' };
  const email = { id: 'proof-mail', event_key: 'order-mockup:proof-1:stable-key', event_type: 'order_mockup_available',
    email_to: order.artwork_email, locale, email_status: 'pending', email_attempts: 0,
    payload: { orderId: order.id, orderNumber: order.order_number, mockupId: proof.id, version: proof.version, approvalUrl: proof.approval_url } };
  return {order,proof,email};
}
for(const locale of ['pt','en','fr','es','de','it']) test(`${locale}: branded proof goes only to the checkout approver, once`,async()=>{
  const {order,proof,email}=mockupFixture(locale);
  const h=harness({orders:[order],order_mockups:[proof],customer_email_notifications:[email]});
  await h.customer.retryPendingCustomerEmails();await h.customer.retryPendingCustomerEmails();
  assert.equal(h.requests.length,1);const mail=h.requests[0].body;
  assert.deepEqual(mail.to,[order.artwork_email]);assert.notEqual(order.artwork_email,order.customer_email);
  assert.match(mail.from,/^360 Merchandising/);assert.ok(mail.text.includes(proof.approval_url));
  assert.ok(mail.html.includes(`<html lang="${locale}">`));assert.doesNotMatch(mail.text,/stricker|CCO-26|info@creativalcance/i);
});
test('proof delivery failures retry with the exact same recipient, version and provider idempotency key',async()=>{
  const {order,proof,email}=mockupFixture();const h=harness({orders:[order],order_mockups:[proof],customer_email_notifications:[email]},{fail:true});
  await h.customer.retryPendingCustomerEmails();h.state.fail=false;await h.customer.retryPendingCustomerEmails();
  assert.equal(h.requests.length,2);assert.deepEqual(h.requests[0],h.requests[1]);
});
test('stale proofs, altered links or recipients and cancelled orders never send pending emails',async()=>{
  for(const change of [x=>x.proof.state='superseded',x=>x.proof.state='awaiting_confirmation',x=>x.proof.version=2,
    x=>x.proof.approval_url='https://evil.test',x=>x.order.artwork_email='new-approver@example.test',
    x=>x.order.deleted_at='2026-10-08',x=>x.order.status='cancelled',x=>x.order.status='shipped',
    x=>x.proof.order_id='different-order',x=>x.order.payment_status='refunded']) {
    const f=mockupFixture();change(f);const h=harness({orders:[f.order],order_mockups:[f.proof],customer_email_notifications:[f.email]});
    await h.customer.retryPendingCustomerEmails();assert.equal(h.requests.length,0);
    assert.equal(h.db.tables.customer_email_notifications[0].email_status,'cancelled');
  }
});
