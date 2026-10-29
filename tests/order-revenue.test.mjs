import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, imports = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require: name => { assert.ok(name in imports, name); return imports[name]; }, ...globals });
  return exports;
}

function actionHarness({ authorized = true, failure = false, throws = false } = {}) {
  const calls = [];
  const action = load('src/app/admin/encomendas/revenue-actions.ts', {
    '@/lib/auth/assert-admin': { assertAdminAccess: async path => {
      assert.equal(path, '/admin/encomendas');
      if (!authorized) throw Error('unauthorized');
      return { userId: 'authenticated-admin' };
    } },
    '@/lib/supabase/admin': { createSupabaseAdminClient: () => {
      calls.push('database');
      return { from: table => ({ insert: async data => {
        calls.push({ table, data });
        if (throws) throw Error('private connection details');
        return { error: failure ? { message: 'private database details' } : null };
      } }) };
    } },
    'next/cache': { revalidatePath: path => calls.push(path) },
  }).resetOrderRevenueAction;
  return { action, calls };
}

function confirmedForm() {
  const form = new FormData();
  form.set('confirmReset', 'yes');
  return form;
}

test('unauthorized reset never reaches the database', async () => {
  const h = actionHarness({ authorized: false });
  await assert.rejects(h.action({}, confirmedForm()), /unauthorized/);
  assert.deepEqual(h.calls, []);
});

test('missing confirmation never changes a counter', async () => {
  const h = actionHarness();
  assert.ok((await h.action({}, new FormData())).error);
  assert.deepEqual(h.calls, []);
});

test('reset writes only an audit marker, with the session actor and database time', async () => {
  const h = actionHarness();
  const form = confirmedForm();
  form.set('reset_by', 'spoofed-actor');
  form.set('reset_at', '2000-01-01T00:00:00Z');
  form.set('grand_total', '0');
  assert.equal((await h.action({}, form)).saved, true);
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls)), [
    'database',
    { table: 'admin_order_revenue_resets', data: { reset_by: 'authenticated-admin' } },
    '/admin/encomendas',
  ]);
});

test('database failures are actionable, do not leak details, and do not report success', async () => {
  for (const options of [{ failure: true }, { throws: true }]) {
    const h = actionHarness(options);
    const result = await h.action({}, confirmedForm());
    assert.match(result.error, /Tenta novamente/);
    assert.doesNotMatch(result.error, /private/);
    assert.equal(result.saved, undefined);
    assert.equal(h.calls.includes('/admin/encomendas'), false);
  }
});

function timerHarness(start, boundary) {
  let now = Date.parse(start), timer, listener, refreshes = 0;
  class FakeDate extends Date { static now() { return now; } }
  const { scheduleRevenueRollover } = load('src/lib/admin/orders/revenue-rollover.ts', {}, {
    Date: FakeDate,
    setTimeout: (fn, delay) => { timer = { fn, delay }; return 1; },
    clearTimeout: () => { timer = undefined; },
    document: {
      addEventListener: (name, fn) => { assert.equal(name, 'visibilitychange'); listener = fn; },
      removeEventListener: (name, fn) => { assert.equal(fn, listener); listener = undefined; },
    },
  });
  const stop = scheduleRevenueRollover(boundary, () => refreshes++);
  return {
    stop, get timer() { return timer; }, get listener() { return listener; }, get refreshes() { return refreshes; },
    advance: value => { now = Date.parse(value); },
  };
}

test('a 31-day month schedules safely without polling the database', () => {
  const h = timerHarness('2026-10-01T00:00:00Z', '2026-11-01T00:00:00Z');
  assert.equal(h.timer.delay, 86_400_000);
  h.advance('2026-10-02T00:00:00Z'); h.timer.fn();
  assert.equal(h.refreshes, 0);
  assert.equal(h.timer.delay, 86_400_000);
  h.stop(); assert.equal(h.timer, undefined); assert.equal(h.listener, undefined);
});

test('an open or sleeping tab refreshes once when the month changes', () => {
  const h = timerHarness('2026-10-31T23:59:59Z', '2026-11-01T00:00:00Z');
  h.advance('2026-11-01T00:00:02Z'); h.listener();
  assert.equal(h.refreshes, 1);
  h.listener(); assert.equal(h.refreshes, 1);
  assert.equal(h.timer, undefined);
  h.stop();
});
