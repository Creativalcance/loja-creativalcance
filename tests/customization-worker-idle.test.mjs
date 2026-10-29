import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, imports) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, console, require: name => imports[name] ?? {} });
  return exports;
}

function preflight(data, error = null) {
  const filters = [];
  const query = {
    select: value => { filters.push(['select', value]); return query; },
    eq: (...args) => { filters.push(['eq', ...args]); return query; },
    in: (...args) => { filters.push(['in', ...args]); return query; },
    order: (...args) => { filters.push(['order', ...args]); return query; },
    limit: n => { assert.equal(n, 1); return query; },
    maybeSingle: async () => ({ data, error }),
  };
  const api = load('src/lib/stricker/customization-jobs.ts', {
    '@/lib/supabase/admin': { createSupabaseAdminClient: () => ({ from: table => {
      assert.equal(table, 'supplier_dataset_imports'); return query;
    } }) },
    '@/lib/stricker/auth': { getStrickerSupplierId: async () => 'supplier-a' },
  });
  return { run: api.hasRunnableCustomizationJob, filters };
}

test('idle and cooldown jobs do not require lock writes; due and legacy jobs remain runnable', async () => {
  assert.equal(await preflight(null).run(), false);
  assert.equal(await preflight({ next_run_at: new Date(Date.now() + 600_000).toISOString() }).run(), false);
  for (const next_run_at of [null, '', 'invalid', '2020-01-01T00:00:00Z']) {
    assert.equal(await preflight({ next_run_at }).run(), true);
  }
  const h = preflight(null); await h.run();
  assert.ok(h.filters.some(f => f[0] === 'eq' && f[1] === 'supplier_id' && f[2] === 'supplier-a'));
  assert.ok(h.filters.some(f => f[0] === 'eq' && f[1] === 'dataset_name' && f[2] === 'customizationOptionsJob'));
  assert.ok(h.filters.some(f => f[0] === 'in' && f[1] === 'status' && f[2].join(',') === 'pending,running'));
  assert.ok(h.filters.some(f => f[0] === 'order' && f[1] === 'created_at' && f[2].ascending));
});
test('preflight database errors are surfaced instead of silently claiming the queue is empty', async () => {
  await assert.rejects(preflight(null, { message: 'connection timeout' }).run(), /connection timeout/);
});
test('worker skips all lock RPCs while idle and retains locking around real work', async () => {
  for (const ready of [false, true]) {
    const calls = [];
    const api = load('src/lib/stricker/automatic-sync.ts', {
      'node:crypto': { randomUUID: () => 'owner' },
      '@/lib/supabase/admin': { createSupabaseAdminClient: () => ({ rpc: async name => {
        calls.push(name); return { data: true, error: null };
      } }) },
      '@/lib/stricker/customization-jobs': {
        hasRunnableCustomizationJob: async () => ready,
        processCustomizationJob: async () => { calls.push('process'); return { idle: true }; },
      },
    });
    const result = await api.runStrickerAutomaticSync('customization-options-worker');
    assert.equal(result.skipped, !ready);
    assert.deepEqual(calls, ready ? ['try_acquire_integration_sync_lock', 'process', 'release_integration_sync_lock'] : []);
  }
});
test('failed preflight does not start work or acquire a lock', async () => {
  const api = load('src/lib/stricker/automatic-sync.ts', {
    '@/lib/stricker/customization-jobs': {
      hasRunnableCustomizationJob: async () => { throw new Error('unavailable'); },
    },
  });
  await assert.rejects(api.runStrickerAutomaticSync('customization-options-worker'), /unavailable/);
});
