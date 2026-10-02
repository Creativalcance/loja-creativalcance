import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, imports = {}, extra = '', globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8') + extra, {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { exports, console, Date, Error, Map, Set, ...globals,
    require(name) { if (!(name in imports)) throw Error(`Unexpected import ${name}`); return imports[name]; },
  });
  return exports;
}
const progressApi = load('src/lib/stricker/customization-job-progress.ts');
const result = (overrides = {}) => ({ recordsProcessed: 25, recordsTotal: 100,
  optionsImported: 75, optionsFailed: 0, hasMore: true, nextOffset: 25, nextCursor: 'next', ...overrides });

test('checkpoint advances only after all option writes succeed', () => {
  const progress = { ...progressApi.initialCustomizationProgress(), stage: 'options' };
  assert.throws(() => progressApi.advanceCustomizationProgress(progress, result({ optionsFailed: 1 })), /lote será repetido/);
  assert.equal(progress.offset, 0);
  assert.equal(progress.cursor, null);
  const next = progressApi.advanceCustomizationProgress(progress, result());
  assert.equal(next.offset, 25); assert.equal(next.cursor, 'next'); assert.equal(next.attempts, 0);
});
test('checkpoint rejects repeated or missing cursors', () => {
  for (const nextCursor of [null, 'same']) assert.throws(() => progressApi.advanceCustomizationProgress(
    { ...progressApi.initialCustomizationProgress(), cursor: 'same' }, result({ nextCursor })), /paginação inválida/);
});
test('completion preserves cumulative totals even on an empty sentinel page', () => {
  const next = progressApi.advanceCustomizationProgress({ ...progressApi.initialCustomizationProgress(), offset: 100, optionsImported: 300 },
    result({ hasMore: false, nextCursor: null, nextOffset: null, recordsProcessed: 0, optionsImported: 0 }));
  assert.equal(next.offset, 100); assert.equal(next.optionsImported, 300);
});

const sync = load('src/lib/stricker/rest/sync-customization-options.ts', {
  '@/lib/supabase/admin': {}, '@/lib/stricker/auth': {}, '@/lib/stricker/images': { buildStrickerPrintingLinesImageUrl: value => value },
  '@/lib/stricker/sync-control': {}, '@/lib/stricker/service-code': { isSupplierServiceCode: value => !!value },
  '@/lib/stricker/change-detection': load('src/lib/stricker/change-detection.ts'),
}, '\nexport { fetchPrintingPriceTables, fetchCachedSupplierOptions, findSupplierOption, getCustomizationPairsForLocation, buildCustomizationOptionRows, buildComponentMaps, deactivateStaleCustomizationOptions, upsertCustomizationOptions };');
const location = { id: 'loc', product_id: 'p', variant_id: 'v', supplier_id: 's', location_index: 2,
  location_name: 'Corpo', external_location_id: 'v:L2', raw_payload: {
    Component2: 'Esferográfica', Location2: 'Corpo', TableCodes2: 'LSR2-01, PDP6-01',
    TableCodesOptions2: 'LSR2-01-01, LSR2-02-01, PDP6-01-01, PDP6-01-04',
    CustomizationTypes2: 'Laser, Tampografia', MaxColors2: '1, 4',
  } };
test('retains all supplier areas including LSR2-02 when representative table is LSR2-01', () => {
  const pairs = sync.getCustomizationPairsForLocation(location);
  assert.equal(pairs.length, 4);
  assert.equal(pairs[1].tableCode, 'LSR2-02');
  assert.equal(pairs[1].techniqueName, 'Laser');
  assert.equal(pairs[3].tableCode, 'PDP6-01');
});
test('a sole supplier code for a different area is not associated to this location', () => {
  const map = new Map([['91777:PDP6-01-04', [{ Component: 'Esferográfica', Location: 'Corpo 2', ServiceCode: 'wrong' }]]]);
  assert.equal(sync.findSupplierOption({ productReference: '91777', tableCodeOption: 'PDP6-01-04', componentName: 'Esferográfica', locationName: 'Corpo', supplierOptionsByProductAndTable: map }), null);
});
test('four-colour table remains four-colour despite the slot containing the list 1, 4', () => {
  const row = sync.buildCustomizationOptionRows({ lang: 'PT', locations: [location],
    variantsById: new Map([['v', { id: 'v', product_id: 'p' }]]), productReferencesById: new Map([['p', '91777']]),
    componentMaps: sync.buildComponentMaps([]), priceTableMaps: { byCode: new Map(), byOption: new Map([['PDP6-01-04', { id: 'price', max_colors: 4, final_price: 2 }]]) },
    supplierOptionsByProductAndTable: new Map([['91777:PDP6-01-04', [{ Component: 'Esferográfica', Location: 'Corpo', ServiceCode: '91777.16.27.PDP6-01-04' }]]]),
  })[0];
  assert.equal(row.max_colors, 4); assert.equal(row.is_active, true); assert.equal(row.printing_price_table_id, 'price');
  assert.equal(JSON.stringify(row.raw_payload), '{}', 'Resolved options must be compact before reaching the DB trigger');
});
test('price reads paginate past 1000 rows with stable ordering and deduplicate overlap', async () => {
  const reads = []; const rows = Array.from({ length: 1400 }, (_, i) => ({ id: `p${i}`, quantity_min: i }));
  const client = { from() { let column; let start = 0; let end = 999; const read = { orders: [], filters: [] }; reads.push(read);
    return { select() { return this; }, eq(key,value) { read.filters.push([key,value]); return this; }, in(key) { column = key; return this; },
      order(key) { read.orders.push(key); return this; }, range(a,b) { start=a; end=b; return this; },
      returns() { return Promise.resolve({ data: column === 'table_code' ? rows.slice(start,end+1) : rows.slice(0,20), error: null }); },
    }; } };
  const fetched = await sync.fetchPrintingPriceTables({ supabaseAdmin: client, supplierId: 's', tableCodes: ['PDP6-01'] });
  assert.equal(fetched.length, 1400); assert.equal(reads.length, 3);
  assert.ok(reads.every(read => read.orders[0] === 'id'));
  assert.ok(reads.every(read => read.filters.some(([key,value]) => key === 'is_active' && value === true)));
});

function workerFixture({ stage = 'options', attempts = 0, batchError, failed = 0, canceled = false, hasMore = false } = {}) {
  const job = { id: 'job', language: 'PT', status: 'pending', errors: [], raw_payload: {
    ...progressApi.initialCustomizationProgress(), stage, attempts, sourceCapturedAt: stage === 'options' ? '2026-10-01T21:00:00Z' : undefined,
  } };
  const writes = []; const batchCalls = []; let sourceCalls = 0;
  const client = { from() { let update;
    const q = { select() { return q; }, eq() { return q; }, in() { return q; }, order() { return q; }, limit() { return q; },
      update(value) { update = value; return q; }, maybeSingle() { return Promise.resolve({ data: job, error: null }); },
      then(resolve, reject) { if (update) { writes.push(structuredClone(update)); Object.assign(job, update); }
        return Promise.resolve({ error: null }).then(resolve,reject); },
    }; return q; } };
  const api = load('src/lib/stricker/customization-jobs.ts', {
    'node:crypto': { randomUUID: () => 'owner' }, '@/lib/supabase/admin': { createSupabaseAdminClient: () => client },
    '@/lib/stricker/auth': { getStrickerSupplierId: async () => 's' },
    '@/lib/stricker/rest/sync-customization-options': { syncRestCustomizationOptions: async args => { batchCalls.push(args); if (batchError) throw Error(batchError); return result({ hasMore, nextCursor: hasMore ? 'next' : null, nextOffset: hasMore ? 25 : null, optionsFailed: failed }); } },
    '@/lib/stricker/rest/sync-customization-options-source': { syncRestCustomizationOptionsSource: async () => { sourceCalls++; return { capturedAt: '2026-10-01T21:00:00Z' }; } },
    './customization-job-progress': progressApi,
    './sync-control': { assertSyncNotCancelled: async () => { if (canceled) throw Error('canceled'); }, isSyncCancelledError: error => error.message === 'canceled' },
  });
  return { api, job, writes, batchCalls, sourceCalls: () => sourceCalls };
}
test('source capture and batch generation use separate invocation budgets', async () => {
  const f = workerFixture({ stage: 'source' }); await f.api.processCustomizationJob();
  assert.equal(f.sourceCalls(), 1); assert.equal(f.batchCalls.length, 0);
  assert.equal(f.job.raw_payload.stage, 'options'); assert.equal(f.job.raw_payload.attempts, 0);
  assert.equal(f.job.raw_payload.sourceCapturedAt, '2026-10-01T21:00:00Z');
});
test('successful worker saves completion and totals', async () => {
  const f = workerFixture(); await f.api.processCustomizationJob();
  assert.equal(f.job.status, 'success'); assert.equal(f.job.raw_payload.offset, 25);
  assert.equal(f.job.raw_payload.sourceCapturedAt, '2026-10-01T21:00:00Z');
});

test('a legacy checkpoint without a snapshot restarts with a complete capture', async () => {
  const f = workerFixture(); delete f.job.raw_payload.sourceCapturedAt;
  f.job.raw_payload.offset = 250; await f.api.processCustomizationJob();
  assert.equal(f.sourceCalls(), 1); assert.equal(f.batchCalls.length, 0);
  assert.equal(f.job.raw_payload.offset, 0); assert.equal(f.job.raw_payload.stage, 'options');
});
test('source reads exclude obsolete records left behind by delayed cleanup', async () => {
  const filters = [];
  const client = { from() { const q = { select() { return q; }, eq(key,value) { filters.push([key,value]); return q; },
    in() { return q; }, order() { return q; }, range() { return q; }, returns() { return Promise.resolve({ data: [], error: null }); } }; return q; } };
  await sync.fetchCachedSupplierOptions({ supabaseAdmin: client, supplierId: 's', lang: 'PT', productReferences: ['91777'], sourceCapturedAt: 'snapshot' });
  assert.ok(filters.some(([key,value]) => key === 'last_seen_at' && value === 'snapshot'));
});
for (const opts of [{ batchError: 'network failure' }, { failed: 1 }]) test('failed batch preserves cursor for retry', async () => {
  const f = workerFixture(opts); await f.api.processCustomizationJob();
  assert.equal(f.job.status, 'running'); assert.equal(f.job.raw_payload.offset, 0); assert.equal(f.job.raw_payload.cursor, null);
  assert.equal(f.job.raw_payload.attempts, 1);
});
test('three killed invocations stop automatic retries before another supplier call', async () => {
  const f = workerFixture({ attempts: 3 }); await f.api.processCustomizationJob();
  assert.equal(f.job.status, 'failed'); assert.equal(f.batchCalls.length, 0);
});
test('canceled parent does not run another batch', async () => {
  const f = workerFixture({ canceled: true }); const response = await f.api.processCustomizationJob();
  assert.equal(response.status, 'canceled'); assert.equal(f.batchCalls.length, 0);
});

const pages = load('src/lib/supabase/read-all-pages.ts');
test('editor data reads continue past the default cap and retain the last row', async () => {
  const items = Array.from({ length: 2301 }, (_, i) => i); const ranges = [];
  const data = await pages.readAllPages(async (from, to) => {
    ranges.push([from, to]); return { data: items.slice(from, to + 1), error: null };
  });
  assert.equal(data.length, 2301); assert.equal(data.at(-1), 2300);
  assert.deepEqual(ranges, [[0,999],[1000,1999],[2000,2999]]);
});
test('a later page failure is surfaced instead of exposing a partial price list', async () => {
  await assert.rejects(() => pages.readAllPages(async from => from === 0
    ? { data: Array(1000).fill(1), error: null } : { data: null, error: { message: 'database unavailable' } }), /database unavailable/);
});

const pageSource = fs.readFileSync('src/app/(public)/produto/[slug]/personalizar/page.tsx', 'utf8');
const helpers = load('src/app/(public)/produto/[slug]/personalizar/page.tsx', {
  'react/jsx-runtime': {}, 'next/link': {}, 'next/navigation': {}, 'lucide-react': {},
  '@/components/product/ProductCustomizationEditor': {}, '@/lib/commerce/minimum-order-quantity': {},
  '@/lib/stricker/images': {}, '@/lib/supabase/server': {}, '@/lib/supabase/read-all-pages': pages,
  '@/lib/stricker/service-code': { isSupplierServiceCode: value => !!value },
  '@/lib/i18n/config': {}, '@/lib/i18n/colors': {}, '@/lib/i18n/catalog': {}, '@/lib/i18n/messages': {}, '@/lib/i18n/server': {},
  '@/lib/customization/editor-catalog': {},
}, '\nexport { codeBelongsToTechnique, codeBelongsToSlot };');
test('editor groups areas of the same technique while price selection keeps the precise area', () => {
  assert.equal(helpers.codeBelongsToTechnique('LSR2-02-01', 'LSR2-01'), true);
  assert.equal(helpers.codeBelongsToTechnique('PDP6-01-04', 'LSR2-01'), false);
  assert.equal(helpers.codeBelongsToSlot('LSR2-02-01', 'LSR2-01'), false);
  assert.match(pageSource, /readAllPages<ProductCustomizationOption>/);
  assert.match(pageSource, /readAllPages<PrintingPriceTable>/);
});

test('worker runs only one batch and enforces the saved cooldown on the next invocation', async () => {
  const f = workerFixture({ hasMore: true });
  await f.api.processCustomizationJob();
  assert.equal(f.batchCalls.length, 1);
  assert.equal(f.batchCalls[0].limit, 25);
  assert.equal(f.sourceCalls(), 0);
  assert.equal(f.job.status, 'running');
  assert.equal(f.job.raw_payload.offset, 25);
  const next = await f.api.processCustomizationJob();
  assert.equal(next.status, 'cooldown');
  assert.equal(f.batchCalls.length, 1);
});

test('failed work waits ten minutes without advancing or requesting supplier data', async () => {
  const f = workerFixture({ batchError: 'statement timeout' });
  const before = Date.now();
  await f.api.processCustomizationJob();
  assert.ok(Date.parse(f.job.raw_payload.nextRunAt) >= before + 600000);
  assert.equal(f.job.raw_payload.offset, 0);
  await f.api.processCustomizationJob();
  assert.equal(f.batchCalls.length, 1);
  assert.equal(f.sourceCalls(), 0);
});

function writeFixture(existing, error = null) {
  const writes = [];
  const client = { from() { const q = {
    select() { return q; }, in() { return q; }, order() { return q; }, range() { return q; },
    returns() { return Promise.resolve({ data: existing, error: null }); },
    upsert(rows) { writes.push(rows); return Promise.resolve({ error }); },
  }; return q; } };
  return { client, writes };
}
test('sync writes only changed or new options, preserving rows from other variants', async () => {
  const first = { product_id:'p', variant_id:'v1', supplier_id:'s', service_code:'code', max_colors:4, is_active:true, raw_payload:{} };
  const second = { ...first, variant_id:'v2', max_colors:1 };
  const f = writeFixture([first, second]);
  const result = await sync.upsertCustomizationOptions({ supabaseAdmin:f.client,
    rows:[{...first}, {...second, max_colors:4}, {...first, service_code:'new'}] });
  assert.equal(result.imported, 3); assert.equal(result.written, 2); assert.equal(result.unchanged, 1);
  assert.deepEqual(Array.from(f.writes[0], r => [r.variant_id,r.service_code]), [['v2','code'],['v1','new']]);
});
test('unchanged options cause no writes, including nested payloads with different key order', async () => {
  const row = { product_id:'p',variant_id:'v',supplier_id:'s',service_code:'code',raw_payload:{ a:1,b:2 } };
  const f = writeFixture([{...row,raw_payload:{ b:2,a:1 }}]);
  const result = await sync.upsertCustomizationOptions({ supabaseAdmin:f.client,rows:[row] });
  assert.equal(result.written, 0); assert.equal(f.writes.length, 0);
});
test('database overload aborts a batch after one write attempt instead of recursively retrying', async () => {
  const f = writeFixture([], { message:'canceling statement due to statement timeout' });
  await assert.rejects(() => sync.upsertCustomizationOptions({ supabaseAdmin:f.client,
    rows:[{ product_id:'p',variant_id:'v',supplier_id:'s',service_code:'code',raw_payload:{} }] }), /statement timeout/);
  assert.equal(f.writes.length, 1);
});

const catalog = load('src/lib/customization/editor-catalog.ts');
test('editor compression preserves all prices, service codes, areas and variants losslessly', () => {
  const prices = Array.from({ length:80 }, (_,i) => ({ id:`p${i}`,table_code:'PDP6-01',table_code_option:'PDP6-01-04',
    service_code:'91777.16.27.PDP6-01-04',quantity_min:i+1,quantity_max:null,final_price:1.25,max_colors:4,area_cm2:10 }));
  const locations = Array.from({ length:20 }, (_,i) => ({ id:`l${i}`,variant_id:`v${i}`,source_location_id:`s${i}`,
    print_area_geometry:{left:5,top:7,width:100,height:120},price_tiers:prices.map(p => ({...p})) }));
  const packed = catalog.packEditorCatalog(locations);
  assert.equal(packed.prices.length, 80);
  assert.deepEqual(JSON.parse(JSON.stringify(catalog.unpackEditorCatalog(packed))), locations);
  assert.ok(JSON.stringify(packed).length < JSON.stringify(locations).length * 0.15);
  const differentServices = catalog.packEditorCatalog([{...locations[0],price_tiers:[prices[0],{...prices[0],service_code:'different-area'}]}]);
  assert.equal(differentServices.prices.length, 2);
});

test('obsolete and invented services become inactive while official services and history remain', async () => {
  const updates = [];
  const existing = [{ id: 'good', variant_id: 'v', service_code: 'official' },
    { id: 'invented', variant_id: 'v', service_code: '91777-103:C2:L2:PDP6-01-04' },
    { id: 'removed', variant_id: 'v', service_code: 'removed-supplier-code' }];
  const client = { from() { let change; let ids;
    const q = { select() { return q; }, eq() { return q; }, in(key,values) { if (key === 'id') ids = values; return q; },
      order() { return q; }, range() { return q; }, returns() { return Promise.resolve({ data: existing, error: null }); },
      update(value) { change = value; return q; }, then(resolve,reject) { updates.push({ change, ids: Array.from(ids) }); return Promise.resolve({ error: null }).then(resolve,reject); },
    }; return q; } };
  await sync.deactivateStaleCustomizationOptions({ supabaseAdmin: client, supplierId: 's',
    variants: [{ id: 'v', product_id: 'p' }], productReferencesById: new Map([['p','91777']]),
    supplierOptions: [{ ProdReference: '91777', ServiceCode: 'official' }],
  });
  assert.deepEqual(JSON.parse(JSON.stringify(updates)), [{ change: { is_active: false }, ids: ['invented','removed'] }]);
});
