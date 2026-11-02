import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server.js';

function load(file, imports = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, URL, Response, Date, console, ...globals, require: name => {
    assert.ok(name in imports, name); return imports[name];
  }});
  return exports;
}
const config = load('src/lib/i18n/config.ts');
const site = load('src/lib/seo/site.ts', {}, { process: { env: {} } });
const languages = load('src/lib/seo/languages.ts', { '@/lib/i18n/config': config, '@/lib/seo/site': site });
const xml = load('src/lib/seo/sitemap-xml.ts', { '@/lib/i18n/config': config, '@/lib/seo/site': site });

function fixture({ fail = false } = {}) {
  let reads = 0;
  const rows = Array.from({ length: 501 }, (_, i) => ({
    id: String(i), slug: `supplier-${i}`, supplier_id: 'supplier',
    product_commercial_identities: { public_reference: `360-PRODUCT-${i}` },
    type_name: 'Agendas', subtype_name: 'Diárias', updated_at: '2026-10-20T10:00:00Z',
    product_translations: [{ language: 'EN', type_name: 'Diaries', subtype_name: 'Daily diaries' }],
  }));
  const q = { select() { return this; }, eq() { return this; }, not() { return this; }, order() { return this; },
    range: async (from, to) => { reads++; return { data: rows.slice(from, to + 1), error: fail ? new Error('Database unavailable') : null }; } };
  const api = load('src/lib/seo/sitemap-data.ts', {
    '@/lib/catalog-identity/public': { IDENTITY_CACHE_TAG: 'catalog' },
    '@/lib/i18n/config': config, '@/lib/seo/site': site, '@/lib/seo/languages': languages,
    'next/cache': { unstable_cache: (fn, _key, options) => {
      assert.equal(options.revalidate, 3600);
      const cache = new Map();
      return (...args) => { const key = JSON.stringify(args); if (!cache.has(key)) cache.set(key, fn(...args)); return cache.get(key); };
    } },
    '@/lib/supabase/admin': { createSupabaseAdminClient: () => ({ from: () => q }) },
    '@/lib/seo/commercial-pages': { getCommercialPages: () => [] },
    '@/lib/seo/guide-pages': { getGuides: () => [] },
    '@/lib/seo/institutional-pages': { getInstitutionalPages: () => [] },
    '@/lib/seo/landing-pages': { getApplicationPages: () => [], getIndustryPages: () => [] },
    '@/lib/seo/personalization-pages': { getPersonalizationPages: () => [] },
    '@/lib/seo/selection-pages': { getSelectionPages: () => [] },
  });
  return { api, reads: () => reads };
}

test('all six sitemaps contain each primary locale and reciprocal alternates, using the same cached product pages', async () => {
  const f = fixture();
  for (const [locale, { htmlLang }] of Object.entries(config.SITE_LOCALES)) {
    const entries = f.api.localizeSitemapEntries(await f.api.getSitemapEntries(), locale);
    const products = entries.filter(entry => entry.url.includes('/produto/'));
    assert.equal(products.length, 501);
    for (const entry of entries) {
      assert.equal(entry.url, entry.alternates.languages[htmlLang]);
      assert.equal(Object.keys(entry.alternates.languages).length, 7);
      assert.ok(entry.alternates.languages['x-default'].startsWith('https://360-merchandising.com/'));
      assert.doesNotMatch(entry.url, /supplier-/);
    }
    const category = entries.find(entry => entry.url.endsWith(locale === 'en' ? '/categorias/Diaries' : '/categorias/Agendas'));
    assert.ok(category);
    assert.equal(category.alternates.languages['en-GB'], 'https://360-merchandising.com/en/categorias/Diaries');
    assert.ok(entries.some(entry => entry.url.endsWith(locale === 'en' ? '/Diaries/Daily%20diaries' : '/Agendas/Di%C3%A1rias')));
    assert.equal(products[0].lastModified.toISOString(), '2026-10-20T10:00:00.000Z');
  }
  assert.equal(f.reads(), 2, 'six locales must not multiply database scans');
});

test('XML index is small, complete and safe; query characters are escaped', () => {
  const index = xml.sitemapIndexXml();
  assert.equal((index.match(/<sitemap>/g) ?? []).length, 6);
  for (const locale of Object.keys(config.SITE_LOCALES)) assert.ok(index.includes(`/sitemaps/${locale}/sitemap.xml`));
  const result = xml.sitemapXml([{ url: 'https://store.test/?a=1&b=2', alternates: { languages: { en: 'https://store.test/?a=1&b="x"', fr: undefined } } }]);
  assert.match(result, /a=1&amp;b=2/);
  assert.match(result, /&quot;x&quot;/);
  assert.doesNotMatch(result, /undefined/);
  assert.throws(() => xml.sitemapXml(Array(50001).fill({ url: 'https://store.test/' })), /limit/);
});

test('invalid locale avoids database work; an outage returns 503 instead of deleting the catalogue from the sitemap', async () => {
  const f = fixture({ fail: true });
  const route = load('src/app/sitemaps/[locale]/sitemap.xml/route.ts', {
    '@/lib/i18n/config': config, '@/lib/seo/sitemap-data': f.api, '@/lib/seo/sitemap-xml': xml,
  }, { console: { error() {} } });
  const invoke = locale => route.GET(new Request('https://store.test'), { params: Promise.resolve({ locale }) });
  assert.equal((await invoke('xx')).status, 404);
  assert.equal(f.reads(), 0);
  const response = await invoke('pt');
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.doesNotMatch(await response.text(), /<urlset|Database/);
});

test('category titles use natural Portuguese without changing category names or guessing grammatical gender', () => {
  const { buildCategoryTitle } = load('src/lib/seo/category-title.ts');
  assert.equal(buildCategoryTitle('Agendas'), 'Agendas personalizadas para empresas');
  assert.equal(buildCategoryTitle('Canecas'), 'Canecas personalizadas para empresas');
  assert.equal(buildCategoryTitle('Categoria nova'), 'Categoria nova para empresas');
  assert.equal(buildCategoryTitle('Diaries', 'en'), 'Diaries — promotional products');
});

test('marketing cron requires its secret and refreshes two weeks only', async () => {
  let calls = 0;
  const route = load('src/app/api/cron/marketing/weekly/route.ts', {
    'node:crypto': { timingSafeEqual }, 'next/server': { NextResponse },
    '@/lib/marketing-integrations/sync-weekly': { syncRecentMarketingWeeks: async ({ weeks }) => {
      calls++; assert.equal(weeks, 2); return [];
    } },
  }, { Buffer, process: { env: { CRON_SECRET: 'test-secret' } } });
  assert.equal((await route.GET(new NextRequest('https://store.test/api/cron/marketing/weekly'))).status, 401);
  assert.equal(calls, 0);
  assert.equal((await route.GET(new NextRequest('https://store.test/api/cron/marketing/weekly', { headers: { authorization: 'Bearer test-secret' } }))).status, 200);
  assert.equal(calls, 1);
  const schedules = JSON.parse(fs.readFileSync('vercel.json', 'utf8')).crons.filter(job => job.path === '/api/cron/marketing/weekly');
  assert.equal(schedules.length, 1);
  assert.equal(schedules[0].schedule, '35 6 * * *');
});
