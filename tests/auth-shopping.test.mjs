import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, imports = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(code, { exports, URL, console, process, require: (name) => {
    if (!(name in imports)) throw new Error(`Unexpected import: ${name}`);
    return imports[name];
  } });
  return exports;
}

const paths = load('src/lib/auth/return-path.ts');
test('shopping return paths retain locale, draft and quantity; external/recursive redirects are rejected', () => {
  for (const path of ['/checkout', '/en/checkout/expedicao', '/fr/produit?draft=abc', '/es/checkout?draft=abc', '/de/checkout/expedicao', '/it/produto/garrafa/personalizar?quantidade=100', '/produto/teste/personalizar?cor=red&quantidade=100#logo']) {
    assert.equal(paths.safeReturnPath(path), path);
  }
  for (const path of ['//evil.test', 'https://evil.test', '/\\evil.test', '/%5cevil.test', '/%2fexample.com', '/login?next=/login', '/auth/resume', '/en/logout', '/\nexample.com']) {
    assert.equal(paths.safeReturnPath(path), undefined);
  }
  assert.equal(paths.canReturnTo('admin', '/checkout'), true);
  for (const locale of ['en','fr','es','de','it']) {
    assert.equal(paths.canReturnTo('customer', `/${locale}/admin/ordens`), false);
    assert.equal(paths.safeReturnPath(`/${locale}/login?next=/checkout`), undefined);
  }
});

function authentication({ role = 'admin', failLogin = false, failClaim = false } = {}) {
  const events = [];
  const client = {
    auth: {
      signInWithPassword: async () => ({ data: { user: { id: 'test-user' } }, error: failLogin ? new Error('Invalid') : null }),
      signOut: async () => events.push('signout'),
    },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role, is_active: true } }) }) }) }),
  };
  const actions = load('src/lib/auth/actions.ts', {
    'next/navigation': { redirect: (path) => { events.push(path); throw new Error(`REDIRECT:${path}`); } },
    '@/lib/supabase/server': { createSupabaseServerClient: async () => client },
    '@/lib/i18n/account': { authActionMessages: () => ({ invalid: 'Invalid', unexpectedLogin: 'Unexpected' }) },
    '@/lib/i18n/config': { getSiteLocale: (value) => value, localizePath: (path, locale) => locale === 'pt' ? path : `/${locale}${path}` },
    '@/lib/notifications/customer-email': { notifyAccountWelcome: async () => {} },
    '@/lib/auth/return-path': paths,
    '@/lib/cart/claim-guest': { claimGuestShopping: async () => { events.push('claim'); if (failClaim) throw new Error('Claim failed'); } },
  });
  return { actions, events };
}

test('admin buying from store returns to checkout only after recovering guest shopping', async () => {
  const { actions, events } = authentication();
  const form = new FormData();
  for (const [key, value] of Object.entries({ email: 'test@example.invalid', password: 'test', locale: 'en', next: '/en/checkout' })) form.set(key, value);
  await assert.rejects(actions.loginAction({}, form), /REDIRECT:\/en\/checkout/);
  assert.deepEqual(events, ['claim', '/en/checkout']);
});

test('failed login does not claim data; failed recovery does not silently redirect', async () => {
  const form = new FormData();
  form.set('email', 'test@example.invalid'); form.set('password', 'test'); form.set('next', '/checkout');
  const invalid = authentication({ failLogin: true });
  assert.equal((await invalid.actions.loginAction({}, form)).success, false);
  assert.deepEqual(invalid.events, []);
  const failed = authentication({ failClaim: true });
  assert.equal((await failed.actions.loginAction({}, form)).success, false);
  assert.deepEqual(failed.events, ['claim']);
});
