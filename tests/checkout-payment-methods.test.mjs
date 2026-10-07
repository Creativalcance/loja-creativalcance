import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as crypto from 'node:crypto';
import ts from 'typescript';

function load(file, imports = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, crypto, FormData, URL, console, Error,
    process: { env: { NODE_ENV: 'production', NEXT_PUBLIC_SITE_URL: 'https://360-merchandising.com' } },
    require(name) {
      if (!(name in imports)) throw new Error(`Unexpected dependency: ${name}`);
      return imports[name];
    },
  });
  return exports;
}

function harness({ stripeError = false } = {}) {
  const requests = [], writes = [];
  const cart = {
    id: 'cart', user_id: 'owner', status: 'active', currency: 'EUR', discount_total: 0,
    customer_name: 'Checkout test', customer_email: 'checkout@example.test',
    shipping_address_id: 'address', shipping_method: 'store_transport',
    customer_addresses: { country_code: 'PT', postal_code: '3050-001' },
    cart_items: [{
      id: 'item', product_id: 'product', variant_id: 'variant', fulfillment_route: 'internal_360',
      product_name: 'Checkout test product', product_sku: 'TEST', quantity: 10,
      unit_price: 2, subtotal: 20, total: 20, personalization_required: false,
    }],
  };
  const session = {
    id: 'cs_test_fixture', url: 'https://checkout.stripe.com/c/pay/cs_test_fixture',
    payment_intent: null, expires_at: 1791374400,
    payment_method_types: ['card', 'mb_way', 'bancontact'],
    wallet_options: { link: { display: 'never' } },
  };
  const admin = {
    from(table) {
      return {
        select() { return this; }, eq() { return this; }, in() { return this; },
        async maybeSingle() { assert.equal(table, 'carts'); return { data: cart }; },
        then(resolve) { assert.equal(table, 'products'); resolve({ data: [{ id: 'product' }] }); },
      };
    },
    async rpc(name, payload) {
      writes.push({ name, payload });
      if (name === 'prepare_checkout_order') return { data: [{ id: 'order', order_number: 'LC-TEST' }] };
      assert.equal(name, 'record_checkout_payment');
      return { error: null };
    },
  };
  const countries = load('src/lib/markets/countries.ts');
  const action = load('src/lib/checkout/payment-actions.ts', {
    '@/lib/checkout/validate-cart-pricing': { async validateCartPricing() {} },
    '@/lib/commerce/check-stock': { async assertStockAvailable() {} },
    '@/lib/markets/policy': load('src/lib/markets/policy.ts', { './countries': countries }),
    '@/lib/markets/i18n': load('src/lib/markets/i18n.ts'),
    'node:crypto': crypto,
    'next/navigation': { redirect(url) { throw Object.assign(new Error('redirect'), { url }); } },
    '@/lib/stripe/server': { createStripeServerClient: () => ({ checkout: { sessions: {
      async create(params, options) {
        requests.push({ params: JSON.parse(JSON.stringify(params)), options });
        if (stripeError) throw new Error('Stripe unavailable');
        return session;
      },
    } } }) },
    '@/lib/supabase/admin': { createSupabaseAdminClient: () => admin },
    '@/lib/supabase/server': { createSupabaseServerClient: async () => ({
      auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) },
    }) },
    '@/lib/i18n/config': load('src/lib/i18n/config.ts'),
    '@/lib/stricker/config': { getStrickerConfig: () => ({ orderTestMode: true }) },
    '@/lib/checkout/shipping-pricing': load('src/lib/checkout/shipping-pricing.ts'),
    '@/lib/stricker/resolve-customization-service-code': {},
  });
  async function run() {
    const form = new FormData();
    for (const [key, value] of Object.entries({ cartId: 'cart', termsAccepted: 'true', locale: 'pt' })) form.set(key, value);
    return action.createPaymentCheckoutSessionAction({}, form);
  }
  return { run, requests, writes, session };
}

test('checkout hides Link while preserving dynamic methods, totals, order metadata and redirect', async () => {
  const h = harness();
  await assert.rejects(h.run(), error => error.url === h.session.url);
  const { params } = h.requests[0];
  assert.deepEqual(params.wallet_options, { link: { display: 'never' } });
  assert.equal(params.payment_method_types, undefined);
  assert.equal(params.excluded_payment_method_types, undefined);
  assert.equal(params.line_items.reduce((sum, item) => sum + item.quantity * item.price_data.unit_amount, 0), 3063);
  assert.equal(params.metadata.orderId, 'order');
  assert.deepEqual(params.payment_intent_data.metadata, params.metadata);
  assert.equal(params.success_url, 'https://360-merchandising.com/checkout/sucesso?session_id={CHECKOUT_SESSION_ID}');
  const payment = h.writes.find(write => write.name === 'record_checkout_payment').payload;
  assert.equal(payment.p_payment.amount, 30.63);
  assert.equal(payment.p_payment.status, 'pending');
  assert.equal(payment.p_checkout_session.checkout_url, h.session.url);
  assert.deepEqual(payment.p_payment.raw_payload.payment_method_types, ['card', 'mb_way', 'bancontact']);
});

test('repeat checkout stays idempotent but does not reuse the previous Link-enabled request', async () => {
  const h = harness();
  await assert.rejects(h.run(), error => error.url === h.session.url);
  await assert.rejects(h.run(), error => error.url === h.session.url);
  assert.equal(h.requests[0].options.idempotencyKey, h.requests[1].options.idempotencyKey);
  const oldKey = `checkout:order:${crypto.createHash('sha256').update(JSON.stringify(h.requests[0].params.line_items)).digest('hex').slice(0, 32)}`;
  assert.notEqual(h.requests[0].options.idempotencyKey, oldKey);
});

test('Stripe failure does not redirect or record a payment session', async () => {
  const h = harness({ stripeError: true });
  const result = await h.run();
  assert.equal(result.success, false);
  assert.match(result.message, /Stripe unavailable/);
  assert.equal(h.writes.some(write => write.name === 'record_checkout_payment'), false);
});
