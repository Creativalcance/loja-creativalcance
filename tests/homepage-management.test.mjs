import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { z } from 'zod';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';

function load(file, imports = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText,
    { exports, URL, AbortSignal, console, Date, require(name) { if (!(name in imports)) throw Error(`Unexpected import ${name}`); return imports[name]; } });
  return exports;
}
const configModule = load('src/lib/homepage/config.ts', { zod: { z } });
const locales = load('src/lib/i18n/config.ts');
const id = '11111111-1111-4111-8111-111111111111';
const otherId = '22222222-2222-4222-8222-222222222222';
function configuration() {
  const config = structuredClone(configModule.defaultHomepageConfig);
  config.campaign.productIds = [id];
  config.sections[0].enabled = true;
  return config;
}
test('configuration rejects duplicate blocks/products, unsafe URLs and an empty homepage', () => {
  assert.equal(configModule.homepageSchema.safeParse(configuration()).success, true);
  for (const change of [c => c.sections[1] = c.sections[0], c => c.campaign.productIds = [id, id], c => c.campaign.productIds = [], c => c.sections.forEach(s => s.enabled = false), c => c.campaign.collectionPath = '//example.invalid', c => c.campaign.collectionPath = '/\\example.invalid', c => c.campaign.collectionPath = 'javascript:alert(1)', c => c.campaign.text.pt.title = '']) {
    const config = configuration(); change(config);
    assert.equal(configModule.homepageSchema.safeParse(config).success, false);
  }
  const config = configuration(); config.campaign.text.en.title = '';
  assert.equal(configModule.campaignText(config, 'en').title, config.campaign.text.pt.title);
  assert.deepEqual([...configModule.moveItem(['a', 'b', 'c'], 2, -1)], ['a', 'c', 'b']);
});

function actionHarness({ authorized = true, available = [id], stale = false, failure = false } = {}) {
  const writes = [], invalidations = [], filters = [];
  const db = { from(table) {
    const query = { select() { return this; }, in() { return this; }, is() { return this; },
      eq(key, value) { filters.push([table, key, value]); return this; },
      update(value) { writes.push(value); return this; },
      maybeSingle: async () => ({ data: stale ? null : { version: 4 }, error: failure ? { code: 'XX000' } : null }),
      then(resolve) { resolve({ data: available.map(id => ({ id })), error: null }); } };
    return query;
  } };
  const actions = load('src/app/admin/homepage/actions.ts', {
    'next/cache': { revalidatePath: (...args) => invalidations.push(args), updateTag: tag => invalidations.push([tag]) },
    '@/lib/auth/assert-admin': { assertAdminAccess: async () => { if (!authorized) throw Error('denied'); return { userId: 'trusted-admin' }; } },
    '@/lib/supabase/admin': { createSupabaseAdminClient: () => db },
    '@/lib/homepage/config': configModule,
  });
  return { ...actions, writes, invalidations, filters };
}
test('publishing uses trusted authorization, a version guard and immediate cache invalidation', async () => {
  const h = actionHarness();
  const result = await h.saveHomepageAction(JSON.stringify(configuration()), 3);
  assert.equal(result.success, true); assert.equal(result.version, 4);
  assert.equal(h.writes[0].updated_by, 'trusted-admin');
  assert.equal(h.writes[0].version, 4);
  assert.ok(h.filters.some(([table, field, value]) => table === 'homepage_settings' && field === 'version' && value === 3));
  assert.ok(h.invalidations.some(([tag]) => tag === configModule.HOMEPAGE_CACHE_TAG));
  assert.ok(h.invalidations.some(([path, scope]) => path === '/' && scope === 'layout'));
});
test('invalid, unavailable and concurrent edits cannot replace the published configuration', async () => {
  for (const options of [{ available: [] }, { stale: true }, { failure: true }]) {
    const h = actionHarness(options);
    assert.equal((await h.saveHomepageAction(JSON.stringify(configuration()), 3)).success, false);
    assert.equal(h.invalidations.length, 0);
  }
  const h = actionHarness();
  assert.equal((await h.saveHomepageAction('{}', 3)).success, false); assert.equal(h.writes.length, 0);
  const denied = actionHarness({ authorized: false });
  await assert.rejects(denied.saveHomepageAction(JSON.stringify(configuration()), 3), /denied/);
  await assert.rejects(denied.searchHomepageProductsAction('Galileia'), /denied/);
  assert.equal(denied.writes.length, 0); assert.equal(denied.filters.length, 0);
});

const Link = ({ children, ...props }) => React.createElement('a', props, children);
const icons = new Proxy({}, { get: () => () => null });
const Campaign = load('src/components/homepage/Campaign.tsx', {
  'react/jsx-runtime': jsx, 'next/link': Link,
  'next/image': ({ priority, ...props }) => React.createElement('img', props),
  'lucide-react': icons, '@/lib/i18n/config': locales, '@/lib/homepage/config': configModule,
}).default;
const product = { id, name: 'Galileia', slug: 'galileia', image: '/api/catalog/media/' + id, price: 19.98, minimum: 1 };
test('campaign renders real product prices and localized purchase links for all six languages', () => {
  for (const locale of configModule.HOME_LOCALES) {
    const html = renderToStaticMarkup(React.createElement(Campaign, { config: configuration(), products: [product], locale }));
    assert.ok(html.includes(locales.localizePath('/produto/galileia', locale) + '#comprar'));
    assert.ok(html.includes(configModule.campaignText(configuration(), locale).productCta));
    assert.match(html, /Galileia/);
    assert.ok(html.includes('19,98') || html.includes('19.98'));
  }
  assert.equal(renderToStaticMarkup(React.createElement(Campaign, { config: configuration(), products: [], locale: 'pt' })), '');
});

test('public data keeps selected order and reads only active, purchasable, non-deleted product IDs', async () => {
  const filters = [];
  const rows = [product, { ...product, id: otherId, slug: 'outro' }].map(p => ({ ...p, min_order_quantity: 1, supplier_id: null, product_images: [{ id }], product_prices: [{ final_price: '19.98', quantity_min: 1, currency: 'EUR' }] }));
  const query = { select() { return this; }, limit() { return this; }, abortSignal() { return this; },
    in(key, ids) { filters.push([key, ids]); return this; }, eq(key, value) { filters.push([key, value]); return this; }, is(key, value) { filters.push([key, value]); return this; },
    then(resolve) { resolve({ data: rows, error: null }); } };
  const data = load('src/lib/homepage/data.ts', {
    'server-only': {}, 'next/cache': { unstable_cache: fn => fn },
    '@/lib/supabase/admin': { createSupabaseAdminClient: () => ({ from: () => query }) },
    '@/lib/catalog-identity/public': { getPublicIdentity: async () => null, publicMediaUrl: id => '/api/catalog/media/' + id },
    './config': configModule,
  });
  const selected = await data.getHomepageProducts([otherId, id], 'pt');
  assert.deepEqual(selected.map(p => p.id), [otherId, id]);
  assert.ok(filters.some(([key, value]) => key === 'status' && value === 'active'));
  assert.ok(filters.some(([key, value]) => key === 'is_purchasable' && value === true));
  assert.ok(filters.some(([key, value]) => key === 'deleted_at' && value === null));
});

test('homepage respects block order and hides sections without leaving a broken buying anchor', async () => {
  const config = configuration(); config.sections = configModule.moveItem(config.sections, 0, 1);
  config.sections.find(s => s.id === 'how_to_buy').enabled = false;
  const empty = () => null;
  const Home = load('src/app/page.tsx', {
    react: React, 'react/jsx-runtime': jsx, 'next/image': empty, 'next/link': Link, 'lucide-react': icons,
    '@/lib/homepage/data': { loadHomepage: async () => ({ config, products: [product] }) },
    '@/components/homepage/Campaign': Campaign,
    '@/lib/seo/languages': { buildLanguageAlternates: () => ({}) },
    '@/lib/catalog/materials-collection': { MATERIALS_PATH: '/materiais', MATERIALS_CARD_IMAGE: '', materialMessages: { pt: { title: '', intro: '' } } },
    '@/components/layout/SiteFooter': empty, '@/components/layout/SiteHeader': empty, '@/components/newsletter/NewsletterSignup': empty,
    '@/components/smart-merch/SmartMerchSearchForm': () => React.createElement('p', null, 'SMART_SEARCH'),
    '@/lib/i18n/config': locales, '@/lib/i18n/server': { getCurrentLocale: async () => 'pt' },
    '@/lib/i18n/messages': { getMessages: () => ({ home: { title: 'Homepage', benefits: [], steps: [], categoryCards: Array(5).fill(['Category', 'Description']) } }) },
  }).default;
  const html = renderToStaticMarkup(await Home());
  assert.ok(html.indexOf('SMART_SEARCH') < html.indexOf('id="destaques"'));
  assert.ok(!html.includes('id="como-comprar"'));
  assert.ok(html.includes('href="/ajuda"'));
  assert.equal((html.match(/<h1/g) ?? []).length, 1);
});
