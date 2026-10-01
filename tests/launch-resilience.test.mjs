import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, imports = {}, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, console: { error() {} }, URL, Date, ...globals,
    require(name) { if (!(name in imports)) throw Error(`Unexpected import ${name}`); return imports[name]; },
  });
  return exports;
}

const product = (id, overrides = {}) => ({ id, sku: id, slug: id, name: id,
  min_order_quantity: 10, is_featured: false, is_customizable: true, ...overrides });
const details = (id, price = 2, stock = 10) => ({ id, product_images: [],
  product_prices: [{ final_price: price, quantity_min: 10, currency: 'EUR' }],
  product_stocks: [{ available_quantity: stock }],
});

function landingFixture({ candidates = [product('a'), product('b')], hydrated = [details('b'), details('a')], failureStage = 0 } = {}) {
  const reads = [];
  const client = { from(table) {
    const stage = reads.length + 1;
    const read = { table, filters: [], orders: [] }; reads.push(read);
    const query = {
      select(value) { read.select = value; return this; },
      eq(key, value) { read.filters.push([key, value]); return this; },
      in(key, value) { read.ids = [key, Array.from(value)]; return this; },
      or(value) { read.filter = value; return this; },
      order(key) { read.orders.push(key); return this; },
      limit(value) { read.limit = value; return this; },
      then(resolve, reject) { return Promise.resolve({ data: stage === 1 ? candidates : hydrated,
        error: stage === failureStage ? { message: 'database unavailable' } : null }).then(resolve, reject); },
    };
    return query;
  } };
  return { reads, ...load('src/lib/seo/landing-products.ts', {
    '@/lib/supabase/server': { createSupabaseServerClient: async () => client },
    '@/lib/i18n/product-presentation': { localizeProductCards: async rows => rows },
  }) };
}

test('landing caps scalar matches before fetching relations for selected IDs only', async () => {
  const f = landingFixture();
  const rows = await f.getLandingProducts(['caneca'], 'pt', 6);
  assert.deepEqual(Array.from(rows, row => row.id), ['a', 'b']);
  assert.equal(f.reads.length, 2);
  assert.equal(f.reads[0].limit, 6);
  assert.doesNotMatch(f.reads[0].select, /product_prices|product_images|product_stocks/);
  assert.deepEqual(f.reads[1].ids, ['id', ['a', 'b']]);
  assert.equal(f.reads[1].filter, undefined);
  for (const read of f.reads) {
    assert.deepEqual(read.filters, [['status', 'active'], ['is_active', true]]);
  }
});

test('landing does not resurrect a product deactivated between the two reads', async () => {
  const f = landingFixture({ hydrated: [details('b')] });
  assert.deepEqual(Array.from(await f.getLandingProducts(['caneca'], 'pt'), row => row.id), ['b']);
});

test('commercial landing retains price, quantity, customizable and stock rules', async () => {
  const f = landingFixture({ candidates: [product('a'), product('b'), product('c', { is_customizable: false })],
    hydrated: [details('a', 3), details('b', 1), details('c', 1)] });
  const rows = await f.getCommercialLandingProducts(['caneca'], 'pt', { maxUnitPrice: 2, targetQuantity: 10, requireCustomizable: true, limit: 3 });
  assert.deepEqual(Array.from(rows, row => row.id), ['b']);
  assert.equal(f.reads[0].limit, 48);
});

test('empty matches skip relation query and invalid terms skip all reads', async () => {
  const f = landingFixture({ candidates: [] });
  assert.equal((await f.getLandingProducts(['caneca'], 'pt')).length, 0);
  assert.equal(f.reads.length, 1);
  assert.equal((await f.getLandingProducts(['%_(),'], 'pt')).length, 0);
  assert.equal(f.reads.length, 1);
});

for (const failureStage of [1, 2]) test(`landing fails safely on query stage ${failureStage}`, async () => {
  const f = landingFixture({ failureStage });
  assert.equal((await f.getLandingProducts(['caneca'], 'pt')).length, 0);
  assert.equal(f.reads.length, failureStage);
});

function supplierClientFixture() {
  let attempts = 0;
  const delays = [];
  const api = load('src/lib/stricker/rest/client.ts', {}, {
    process: { env: {} }, AbortController, DOMException, Error, TypeError,
    setTimeout(callback, ms) { delays.push(ms); if (ms < 60000) callback(); return 1; },
    clearTimeout() {},
    fetch: async () => { attempts++; throw new TypeError('fetch failed'); },
  });
  return { api, delays, attempts: () => attempts };
}

for (const [maxRetries, attempts] of [[0, 1], [1, 2], [2, 3], [999, 3]]) {
  test(`catalogue reads bound retries: ${maxRetries} gives ${attempts} attempts`, async () => {
    const f = supplierClientFixture();
    await assert.rejects(f.api.fetchStrickerDataset({ dataset: 'stocksByCountry', token: 'test-token', lang: 'PT', country: 'PT' },
      { timeoutMs: 60000, maxRetries }), /Falha de rede/);
    assert.equal(f.attempts(), attempts);
  });
}

test('each stock warehouse has one hourly cron, followed by availability, not a combined execution', () => {
  const crons = JSON.parse(fs.readFileSync('vercel.json', 'utf8')).crons;
  const paths = crons.filter(row => /stricker\/(stocks|availability)/.test(row.path));
  assert.deepEqual(paths, [
    { path: '/api/cron/stricker/stocks-pt', schedule: '5 * * * *' },
    { path: '/api/cron/stricker/stocks-cz', schedule: '10 * * * *' },
    { path: '/api/cron/stricker/availability', schedule: '15 * * * *' },
  ]);
});

test('stock download reserves time for writes inside the 300-second runtime', () => {
  const source = fs.readFileSync('src/lib/stricker/rest/sync-stocks-by-country.ts', 'utf8');
  assert.match(source, /timeoutMs: 60_000,\s+maxRetries: 1/);
  assert.doesNotMatch(source, /timeoutMs: 180_000/);
});

function serviceFixture(pages, failPage = -1) {
  const reads = [];
  const admin = { from() {
    const read = { filters: [] }; reads.push(read);
    const q = { select() { return this; }, eq(key, value) { read.filters.push([key, value]); return this; },
      or(value) { read.variantFilter = value; return this; }, is(key, value) { read.filters.push([key, value]); return this; },
      order(key) { read.order = key; return this; }, range(from, to) { read.range = [from, to]; return this; },
      then(resolve, reject) { const page = read.range[0] / 1000;
        return Promise.resolve({ data: pages[page] ?? [], error: page === failPage ? { message: 'page unavailable' } : null }).then(resolve, reject); },
    }; return q;
  } };
  const api = load('src/lib/stricker/resolve-customization-service-code.ts', {
    '@/lib/supabase/admin': {},
    '@/lib/stricker/service-code': load('src/lib/stricker/service-code.ts'),
  });
  return { reads, resolve: overrides => api.resolveCustomizationServiceCode({ supabaseAdmin: admin, productId: 'product',
    variantId: 'variant', locationId: 'location', locationName: 'Frente', techniqueName: 'Serigrafia',
    tableCode: 'SCR1', tableCodeOption: 'SCR1-1', ...overrides }) };
}
const serviceOption = (service_code, overrides = {}) => ({ service_code, product_id: 'product', variant_id: 'variant',
  location_id: 'location', location_name: 'Frente', customization_type_name: 'Serigrafia',
  table_code: 'SCR1', table_code_option: 'SCR1-1', max_colors: 1, is_default: false, ...overrides });

test('service validation finds the selected official code beyond the first 1000 options', async () => {
  const first = Array.from({ length: 1000 }, (_, i) => serviceOption(`other-${i}`, { customization_type_name: 'Laser' }));
  const f = serviceFixture([first, [serviceOption('official-code')]]);
  assert.equal(await f.resolve({ currentServiceCode: 'official-code' }), 'official-code');
  assert.equal(f.reads.length, 2);
  assert.deepEqual(f.reads.map(r => r.range), [[0, 999], [1000, 1999]]);
  for (const read of f.reads) {
    assert.equal(read.variantFilter, 'variant_id.eq.variant,variant_id.is.null');
    assert.equal(read.order, 'id');
  }
});

test('missing exact technique/location/table never falls back to an incompatible sole service', async () => {
  for (const overrides of [{ techniqueName: 'Laser' }, { locationName: 'Costas', locationId: 'back' }, { tableCode: 'LAS1', tableCodeOption: 'LAS1-1' }]) {
    const f = serviceFixture([[serviceOption('official-code')]]);
    assert.equal(await f.resolve(overrides), null);
  }
});

test('ambiguous official services are not selected automatically', async () => {
  const f = serviceFixture([[serviceOption('one'), serviceOption('two')]]);
  assert.equal(await f.resolve(), null);
});

test('failed later service page prevents incomplete validation', async () => {
  const f = serviceFixture([Array.from({ length: 1000 }, () => serviceOption('one'))], 1);
  await assert.rejects(f.resolve(), /page unavailable/);
});

test('generic products query only null-variant service options', async () => {
  const f = serviceFixture([[serviceOption('generic', { variant_id: null })]]);
  assert.equal(await f.resolve({ variantId: null }), 'generic');
  assert.deepEqual(f.reads[0].filters.at(-1), ['variant_id', null]);
});
