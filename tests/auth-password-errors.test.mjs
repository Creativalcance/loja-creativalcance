import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(file, imports = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, process, console, require: (name) => { if (name in imports) return imports[name]; throw Error(name); },
  });
  return exports;
}
const copy = load('src/lib/i18n/account.ts');
const config = load('src/lib/i18n/config.ts');
const compromised = { code: 'weak_password', reasons: ['pwned'], message: 'internal provider error must not appear' };
for (const locale of ['pt', 'en', 'fr', 'es', 'de', 'it']) {
  test(`${locale}: password rejection is translated; unknown errors stay generic`, () => {
    const result = copy.authPasswordError(compromised, locale, 'fallback');
    assert.ok(result.length > 30);
    assert.doesNotMatch(result, /internal provider|fallback/);
    assert.notEqual(result, copy.authPasswordError({ code: 'weak_password', reasons: ['min_length'] }, locale, 'fallback'));
    assert.notEqual(copy.authPasswordError({ code: 'same_password' }, locale, 'fallback'), 'fallback');
    assert.equal(copy.authPasswordError({ code: 'unavailable' }, locale, 'fallback'), 'fallback');
  });
}
test('rejected signup shows the password error without claiming shopping or sending welcome email', async () => {
  let sideEffects = 0;
  const actions = load('src/lib/auth/actions.ts', {
    'next/navigation': { redirect: () => { throw Error('Unexpected redirect'); } },
    '@/lib/supabase/server': { createSupabaseServerClient: async () => ({ auth: { signUp: async () => ({ data: { user: null }, error: compromised }) } }) },
    '@/lib/i18n/account': copy, '@/lib/i18n/config': config,
    '@/lib/notifications/customer-email': { notifyAccountWelcome: async () => sideEffects++ },
    '@/lib/auth/return-path': { safeReturnPath: () => undefined, canReturnTo: () => false },
    '@/lib/auth/commercial-access': {}, '@/lib/cart/claim-guest': { claimGuestShopping: async () => sideEffects++ },
  });
  const form = new FormData();
  for (const [k,v] of Object.entries({ fullName: 'Test', email: 'test@example.invalid', password: 'Example123', confirmPassword: 'Example123', locale: 'en' })) form.set(k,v);
  const result = await actions.registerAction({}, form);
  assert.equal(result.success, false);
  assert.equal(result.message, copy.authPasswordError(compromised, 'en', ''));
  assert.equal(sideEffects, 0);
});
test('password change rejects compromised credentials and activates sales access only after success', async () => {
  let error = compromised, updates = 0, activations = 0;
  const actions = load('src/app/nova-password/actions.ts', {
    '@/lib/sales/access': { activateSalesAccount: async () => activations++ },
    '@/lib/supabase/server': { createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'test' } } }), updateUser: async () => { updates++; return { error }; } } }) },
    '@/lib/i18n/account': copy, '@/lib/i18n/config': config,
  });
  const form = new FormData();
  form.set('password', 'Example123'); form.set('confirmation', 'Example123'); form.set('locale', 'fr');
  const rejected = await actions.updatePasswordAction({}, form);
  assert.equal(rejected.success, false); assert.equal(activations, 0);
  assert.equal(rejected.message, copy.authPasswordError(compromised, 'fr', ''));
  error = null;
  assert.equal((await actions.updatePasswordAction({}, form)).success, true);
  assert.equal(updates, 2); assert.equal(activations, 1);
});
