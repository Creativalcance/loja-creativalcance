import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';

function load(file, imports = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText,
    { exports, Response, AbortController, AbortSignal, Date, console, ...globals, require(name) { if (!(name in imports)) throw Error(`Unexpected import ${name}`); return imports[name]; } });
  return exports;
}
const guestId = '11111111-1111-4111-8111-111111111111';
function routeFixture({ user = null, session = guestId, count = 2, cart = { id: 'owned-cart' }, error = null, authError = null } = {}) {
  const calls = [];
  const admin = { from(table) {
    calls.push([table, 'from']);
    return { select(...args) { calls.push([table, 'select', ...args]); return this; }, eq(...args) { calls.push([table, 'eq', ...args]); return this; },
      is(...args) { calls.push([table, 'is', ...args]); return this; }, limit() { return this; }, abortSignal() { return this; },
      async maybeSingle() { return { data: cart, error }; }, then(resolve) { resolve({ count, error }); } };
  } };
  const route = load('src/app/api/cart/count/route.ts', {
    'next/headers': { cookies: async () => ({ get: () => session ? { value: session } : undefined }) },
    '@/lib/supabase/server': { createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user }, error: authError }) } }) },
    '@/lib/supabase/admin': { createSupabaseAdminClient: () => admin },
    '@/lib/auth/availability': load('src/lib/auth/availability.ts'),
  });
  return { ...route, calls };
}

test('cart count is private and scoped to the verified customer or unclaimed guest cart', async () => {
  for (const user of [null, { id: 'verified-user' }]) {
    const route = routeFixture({ user });
    const response = await route.GET(new Request('https://shop.test/api/cart/count?user_id=someone-else&cart_id=another-cart'));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { count: 2 });
    assert.match(response.headers.get('cache-control'), /private, no-store/);
    assert.equal(response.headers.get('vercel-cdn-cache-control'), 'no-store');
    assert.ok(route.calls.some(call => call.join(':') === 'carts:eq:status:active'));
    assert.ok(route.calls.some(call => call.join(':') === 'cart_items:eq:cart_id:owned-cart'));
    assert.ok(route.calls.some(call => call[0] === 'cart_items' && call[1] === 'select' && call[3].head && call[3].count === 'exact'));
    if (user) {
      assert.ok(route.calls.some(call => call.join(':') === 'carts:eq:user_id:verified-user'));
      assert.ok(!route.calls.some(call => call.includes('session_id')));
    } else {
      assert.ok(route.calls.some(call => call.join(':') === `carts:eq:session_id:${guestId}`));
      assert.ok(route.calls.some(call => call[1] === 'is' && call[2] === 'user_id' && call[3] === null));
    }
  }
});

test('empty visitors require no cart query; outages do not report a false empty cart', async () => {
  for (const session of [null, '', 'invalid-session']) {
    const route = routeFixture({ session });
    assert.deepEqual(await (await route.GET()).json(), { count: 0 });
    assert.equal(route.calls.length, 0);
  }
  assert.deepEqual(await (await routeFixture({ cart: null }).GET()).json(), { count: 0 });
  for (const options of [{ error: { message: 'private DB detail' } }, { authError: { status: 503 } }]) {
    const response = await routeFixture(options).GET();
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'Cart count unavailable' });
  }
});

test('counter deduplicates reads, ignores stale responses and preserves the last count on errors', async () => {
  const requests = [];
  const store = load('src/lib/cart/count-store.ts', {}, { fetch: (_url, options) => new Promise(resolve => requests.push({ resolve, options })) });
  let notices = 0;
  const unsubscribe = store.subscribeCartCount(() => notices++);
  const first = store.refreshCartCount();
  assert.equal(store.refreshCartCount(), first);
  const newer = store.refreshCartCount(true);
  requests[1].resolve(Response.json({ count: 3 })); await newer;
  requests[0].resolve(Response.json({ count: 1 })); await first;
  assert.equal(store.getCartCount(), 3);
  assert.equal(notices, 1);
  assert.equal(requests[0].options.signal.aborted, true);
  await store.refreshCartCount(); assert.equal(requests.length, 2);
  const failed = store.refreshCartCount(true);
  requests[2].resolve(Response.json({ error: 'unavailable' }, { status: 503 })); await failed;
  assert.equal(store.getCartCount(), 3);
  const empty = store.refreshCartCount(true);
  requests[3].resolve(Response.json({ count: 0 })); await empty;
  assert.equal(store.getCartCount(), 0);
  unsubscribe();
});

test('changing account clears the old count and invalidates in-flight results', async () => {
  const requests = [];
  const store = load('src/lib/cart/count-store.ts', {}, { fetch: () => new Promise(resolve => requests.push(resolve)) });
  store.syncCartCountOwner('user-a');
  const first = store.refreshCartCount(); requests[0](Response.json({ count: 4 })); await first;
  store.syncCartCountOwner('user-a'); assert.equal(requests.length, 1);
  store.syncCartCountOwner(null); assert.equal(store.getCartCount(), null);
  const reset = store.refreshCartCount(); requests[1](Response.json({ count: 0 })); await reset;
  assert.equal(store.getCartCount(), 0);
});

test('successful additions and removal redirects refresh the badge without changing action results', async () => {
  let refreshed = 0, success = true;
  const redirect = new Error('NEXT_REDIRECT');
  const actions = load('src/lib/cart/client-actions.ts', {
    './actions': { addToCartAction: async () => ({ success, message: 'result' }), removeCartItemAction: async () => { throw redirect; } },
    './count-store': { notifyCartChanged: () => refreshed++ },
  });
  assert.equal((await actions.addToCartWithFeedback({}, new FormData())).message, 'result');
  assert.equal(refreshed, 1);
  success = false; await actions.addToCartWithFeedback({}, new FormData()); assert.equal(refreshed, 1);
  await assert.rejects(actions.removeCartItemWithFeedback({}, new FormData()), error => error === redirect);
  assert.equal(refreshed, 2);
});

test('badge is accessible, localized, hidden when empty and compact for bulk carts', () => {
  const locales = load('src/lib/i18n/config.ts');
  for (const locale of ['pt', 'en', 'fr', 'es', 'de', 'it']) for (const count of [null, 0, 1, 2, 120]) {
    const Header = load('src/components/layout/HeaderCartLink.tsx', {
      react: { useEffect() {}, useSyncExternalStore: () => count }, 'react/jsx-runtime': jsx,
      'next/link': ({ children, ...props }) => React.createElement('a', props, children),
      'next/navigation': { usePathname: () => '/' }, 'lucide-react': { ShoppingCart: () => null },
      '@/lib/i18n/config': locales, '@/lib/supabase/browser': {}, '@/lib/cart/count-store': {},
    }).default;
    const html = renderToStaticMarkup(React.createElement(Header, { locale, label: 'Cart' }));
    assert.ok(html.includes(`href="${locale === 'pt' ? '' : '/' + locale}/carrinho"`));
    assert.equal(html.includes('aria-hidden="true"'), count > 0);
    assert.ok(html.includes('aria-live="polite"'));
    if (count === 120) { assert.ok(html.includes('99+')); assert.ok(html.includes('Cart: 120')); }
  }
});
