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
  }).outputText, { exports, URL, Intl, Buffer, console, process: { env: {} }, ...globals,
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
  const tables = { orders: [], customer_email_notifications: [], admin_notifications: [],
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
    'node:crypto': crypto, 'node:timers/promises': { setTimeout: async () => {} },
    '@/lib/i18n/config': config, '@/lib/customer/order-status': statuses,
    '@/lib/supabase/admin': { createSupabaseAdminClient: () => db },
    '@/lib/i18n/catalog': { getLocalizedProductTexts: async ({ locale }) => {
      if (state.translationFailure) throw new Error('Translation service unavailable');
      return new Map([['supplier-product', { name: { en: 'Bottle', fr: 'Bouteille', es: 'Botella', de: 'Flasche', it: 'Bottiglia' }[locale] }]]);
    } },
  };
  return { db, requests, state, errors, globals,
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
