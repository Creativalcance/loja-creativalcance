import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, imports) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, console, require: name => {
    if (!(name in imports)) throw new Error(`Unexpected import: ${name}`);
    return imports[name];
  } });
  return exports;
}

const product = { id: 'product-a', supplier_id: 'stricker', external_id: '12345', sku: '12345', name: 'Nome original PT' };
const record = { ProdReference: '12345', Name: 'BRAND', SEOName: 'Localized bottle', Description: 'Localized description', Materials: 'Localized steel', Type: 'Localized category', SubType: 'Localized subcategory' };

function harness(lang, payload = { Language: lang, Products: [record] }, existing = []) {
  const writes = [];
  let fetched;
  const admin = {
    from(table) {
      let operation = 'select'; let value;
      const filters = {};
      const query = {
        select: () => query,
        insert: input => { operation = 'insert'; value = input; return query; },
        update: input => { operation = 'update'; value = input; return query; },
        upsert: (input, options) => { operation = 'upsert'; value = input; assert.equal(options.onConflict, 'product_id,language'); return query; },
        eq: (key, input) => { filters[key] = input; return query; },
        in: (key, input) => { filters[key] = input; return query; },
        returns: () => query,
        single: () => query,
        then(resolve, reject) {
          if (operation !== 'select') writes.push({ table, operation, value });
          let data;
          if (table === 'supplier_dataset_imports') data = operation === 'insert' ? { id: 'import-a' } : null;
          else if (table === 'products' && operation === 'select') data = [product];
          else if (table === 'product_translations') data = operation === 'select' ? existing.filter(t => t.language === filters.language) : null;
          else throw new Error(`Unexpected table access: ${table}/${operation}`);
          if (operation !== 'select') assert.ok(['supplier_dataset_imports', 'product_translations'].includes(table));
          return Promise.resolve({ data, error: null }).then(resolve, reject);
        },
      };
      return query;
    },
  };
  const module = load('src/lib/stricker/rest/sync-products.ts', {
    '@/lib/supabase/admin': { createSupabaseAdminClient: () => admin },
    '@/lib/stricker/auth': { getStrickerSupplierId: async () => 'stricker' },
    '@/lib/stricker/change-detection': { hasSupplierPayloadChanged: (a, b) => JSON.stringify(a) !== JSON.stringify(b) },
    '@/lib/stricker/images': { buildStrickerProductImageUrl: () => { throw new Error('Translations must not change images'); } },
    '@/lib/stricker/rest/client': { fetchStrickerDataset: async request => { fetched = request; return payload; } },
    '@/lib/stricker/rest/session': { getValidStrickerSessionToken: async () => 'test-session' },
    '@/lib/stricker/sync-control': { assertSyncNotCancelled: async () => {} },
  });
  return { run: () => module.syncRestProducts({ lang }), writes, request: () => fetched };
}

for (const lang of ['EN', 'FR', 'ES', 'DE', 'IT']) {
  test(`${lang} imports translated text and leaves canonical products, prices, stock, images and personalization untouched`, async () => {
    const h = harness(lang);
    const result = await h.run();
    assert.equal(h.request().lang, lang);
    assert.equal(h.request().dataset, 'products');
    assert.equal(result.productsImported, 0);
    assert.equal(result.imagesImported, 0);
    assert.equal(result.productTranslationsImported, 1);
    const row = h.writes.find(w => w.table === 'product_translations').value[0];
    assert.equal(row.product_id, product.id);
    assert.equal(row.supplier_id, product.supplier_id);
    assert.equal(row.language, lang);
    assert.equal(row.description, record.Description);
    assert.equal(row.material, record.Materials);
    assert.equal(row.type_name, record.Type);
    const finished = h.writes.at(-1).value;
    assert.equal(finished.records_imported, 1);
    assert.equal(finished.status, 'success');
    assert.equal(finished.raw_payload.canonicalDataUpdated, false);
  });
}

test('unchanged translations are not written twice', async () => {
  const h = harness('IT', undefined, [{ product_id: product.id, language: 'IT', supplier_payload: record }]);
  const result = await h.run();
  assert.equal(result.productTranslationsImported, 0);
  assert.equal(h.writes.filter(w => w.table === 'product_translations').length, 0);
  assert.equal(h.writes.at(-1).value.raw_payload.translationsUnchanged, 1);
});

test('mismatched language and empty datasets fail before catalog writes', async () => {
  for (const payload of [{ Language: 'PT', Products: [record] }, { Language: 'IT', Products: [] }]) {
    const h = harness('IT', payload);
    await assert.rejects(h.run(), /Idioma inesperado|catálogo de produtos vazio/);
    assert.ok(h.writes.every(w => w.table === 'supplier_dataset_imports'));
    assert.equal(h.writes.at(-1).value.status, 'failed');
  }
});

test('a reference missing from the Portuguese catalog is reported without creating or changing a product', async () => {
  const h = harness('ES', { Language: 'ES', Products: [record, { ...record, ProdReference: 'unknown-reference' }] });
  const result = await h.run();
  assert.equal(result.productTranslationsImported, 1);
  const log = h.writes.at(-1).value;
  assert.equal(log.status, 'partial_success');
  assert.equal(log.records_failed, 1);
  assert.equal(log.raw_payload.productsMissingCanonicalRecord, 1);
});

test('new cron jobs use existing locking and dispatch the intended language', async () => {
  const calls = [];
  const imports = Object.fromEntries([
    'sync-catalog-datasets', 'sync-commercial-status', 'sync-customization-options',
    'sync-customization-options-source', 'sync-customization-tables', 'sync-optionals',
    'sync-stocks-by-country', 'sync-printing-slas',
  ].map(name => [`@/lib/stricker/rest/${name}`, {}]));
  const sync = load('src/lib/stricker/automatic-sync.ts', {
    ...imports,
    '@/lib/i18n/config': load('src/lib/i18n/config.ts'),
    'node:crypto': { randomUUID: () => 'owner-a' },
    '@/lib/supabase/admin': { createSupabaseAdminClient: () => ({ rpc: async (name, params) => { calls.push({ name, params }); return { data: true, error: null }; } }) },
    '@/lib/stricker/auth': {},
    '@/lib/stricker/orders/sync-order-status': {},
    '@/lib/stricker/rest/sync-products': { syncRestProducts: async params => { calls.push(params); return { lang: params.lang }; } },
  });
  const crons = JSON.parse(fs.readFileSync('vercel.json', 'utf8')).crons;
  for (const lang of ['ES', 'DE', 'IT']) {
    const job = `products-${lang.toLowerCase()}`;
    assert.equal(sync.isStrickerAutomaticSyncJob(job), true);
    assert.equal(crons.filter(c => c.path === `/api/cron/stricker/${job}`).length, 1);
    const result = await sync.runStrickerAutomaticSync(job);
    assert.equal(result.result.lang, lang);
    assert.equal(calls.at(-3).name, 'try_acquire_integration_sync_lock');
    assert.equal(calls.at(-3).params.target_lock_key, 'stricker:automatic-sync');
    assert.equal(calls.at(-1).name, 'release_integration_sync_lock');
  }
  assert.equal(sync.isStrickerAutomaticSyncJob('products-unsupported'), false);
});
