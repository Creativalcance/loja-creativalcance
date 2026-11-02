import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { NextRequest, NextResponse, userAgent } from 'next/server.js';

function load(file, imports = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, Headers, ...globals, require: name => {
    assert.ok(name in imports, name); return imports[name];
  }});
  return exports;
}
const config = load('src/lib/i18n/config.ts');
const detection = load('src/lib/i18n/detection.ts', { '@/lib/i18n/config': config });
const { proxy } = load('src/proxy.ts', {
  'next/server': { NextResponse, userAgent },
  '@/lib/i18n/config': config, '@/lib/i18n/detection': detection,
  '@/lib/auth/availability': load('src/lib/auth/availability.ts'),
  '@/lib/auth/commercial-access': load('src/lib/auth/commercial-access.ts'),
  '@supabase/ssr': { createServerClient: () => { throw new Error('Locale detection must not access the database'); } },
}, { process: { env: {} } });
const human = { accept: 'text/html,application/xhtml+xml', 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36', 'sec-fetch-dest': 'document' };
const request = (path = '/', headers = {}, method = 'GET') => new NextRequest(`https://store.test${path}`, { method, headers: { ...human, ...headers } });

test('the six main markets choose the corresponding locale from the IP country', async () => {
  for (const [country, locale] of [['PT','pt'], ['ES','es'], ['FR','fr'], ['DE','de'], ['IT','it'], ['GB','en']]) {
    const response = await proxy(request('/?utm_source=campaign&ref=abc', { 'x-vercel-ip-country': country }));
    assert.match(response.headers.get('cache-control'), /private, no-store/);
    assert.equal(response.headers.get('vercel-cdn-cache-control'), 'no-store');
    assert.equal(response.cookies.get('site-locale')?.value, locale);
    if (locale === 'pt') { assert.equal(response.status, 200); assert.equal(response.headers.get('location'), null); }
    else {
      assert.equal(response.status, 307);
      const target = new URL(response.headers.get('location'));
      assert.equal(target.pathname, `/${locale}`);
      assert.equal(target.search, '?utm_source=campaign&ref=abc');
    }
  }
});

test('saved preference wins over location, including a manual return to Portuguese', async () => {
  const portuguese = await proxy(request('/', { cookie: 'site-locale=pt', 'x-vercel-ip-country': 'FR' }));
  assert.equal(portuguese.headers.get('location'), null);
  const german = await proxy(request('/', { cookie: 'site-locale=de', 'x-vercel-ip-country': 'PT' }));
  assert.equal(german.headers.get('location'), 'https://store.test/de');
  assert.equal(german.headers.get('set-cookie'), null);
  const invalid = await proxy(request('/', { cookie: 'site-locale=invalid', 'x-vercel-ip-country': 'ES' }));
  assert.equal(invalid.headers.get('location'), 'https://store.test/es');
});

test('browser weights help in multilingual countries and when the country is unavailable', () => {
  assert.equal(detection.detectEntryLocale({ country: 'CH', acceptLanguage: 'fr-CH, de;q=0.8' }), 'fr');
  assert.equal(detection.detectEntryLocale({ country: 'CA', acceptLanguage: 'fr-CA, en;q=0.7' }), 'fr');
  assert.equal(detection.detectEntryLocale({ country: 'CH', acceptLanguage: 'it-CH;q=0.9,fr;q=0.8' }), 'it');
  assert.equal(detection.detectEntryLocale({ acceptLanguage: 'de;q=0, es;q=0.4,fr;q=0.9' }), 'fr');
  assert.equal(detection.detectEntryLocale({ country: 'JP', acceptLanguage: 'ja-JP' }), 'en');
  assert.equal(detection.detectEntryLocale({ country: 'XX', acceptLanguage: 'it;q=invalid,*;q=1' }), 'pt');
  assert.equal(detection.detectEntryLocale({ country: 'constructor' }), 'pt');
  assert.equal(detection.detectEntryLocale({}), 'pt');
});

test('explicit language URLs always render their own locale and do not erase a saved preference', async () => {
  for (const path of ['/en', '/fr/produto/360-test', '/es/checkout', '/de/login', '/it/area-cliente', '/categorias/Agendas']) {
    const response = await proxy(request(path, { cookie: 'site-locale=pt', 'x-vercel-ip-country': 'FR' }));
    assert.equal(response.headers.get('location'), null, path);
    assert.equal(response.headers.get('set-cookie'), null, path);
    const language = path.split('/')[1];
    assert.equal(response.headers.get('x-middleware-request-x-site-locale'), language === 'categorias' ? 'pt' : language);
  }
});

test('API calls, shopping URLs, auth callbacks and XML never receive a geographic redirect or overwrite the cookie', async () => {
  for (const path of ['/api/cart','/api/stripe/webhook','/api/cron/marketing/weekly','/admin','/carrinho','/checkout/pagamento?session_id=abc','/auth/callback?code=test','/login?next=%2Fcheckout','/sitemap.xml','/sitemaps/fr/sitemap.xml','/robots.txt']) {
    const response = await proxy(request(path, { cookie: 'site-locale=fr', 'x-vercel-ip-country': 'DE' }));
    assert.equal(response.headers.get('location'), null, path);
    assert.equal(response.headers.get('set-cookie'), null, path);
  }
});

test('server actions, prefetch, RSC and non-HTML requests do not change locale state', async () => {
  const cases = [
    request('/', { 'x-vercel-ip-country': 'FR' }, 'POST'),
    request('/', { 'x-vercel-ip-country': 'FR' }, 'HEAD'),
    request('/', { 'next-action': 'action', 'x-vercel-ip-country': 'FR' }),
    request('/', { rsc: '1', 'x-vercel-ip-country': 'FR' }),
    request('/', { 'next-router-prefetch': '1', 'x-vercel-ip-country': 'FR' }),
    request('/', { purpose: 'prefetch', 'x-vercel-ip-country': 'FR' }),
    request('/', { 'sec-purpose': 'prefetch;prerender', 'x-vercel-ip-country': 'FR' }),
    request('/', { accept: 'application/json', 'x-vercel-ip-country': 'FR' }),
  ];
  for (const req of cases) {
    const response = await proxy(req);
    assert.equal(response.headers.get('location'), null);
    assert.equal(response.headers.get('set-cookie'), null);
  }
});

test('Google and other known crawlers can reach the Portuguese homepage from any country', async () => {
  for (const bot of ['Googlebot/2.1 (+http://www.google.com/bot.html)', 'bingbot/2.0', 'facebookexternalhit/1.1', 'GPTBot/1.0']) {
    const response = await proxy(request('/', { 'user-agent': bot, 'x-vercel-ip-country': 'US', cookie: 'site-locale=fr' }));
    assert.equal(response.status, 200, bot);
    assert.equal(response.headers.get('location'), null, bot);
    assert.equal(response.headers.get('set-cookie'), null, bot);
    assert.equal(response.headers.get('x-middleware-request-x-site-locale'), 'pt', bot);
  }
});

test('the redirect destination does not loop and subsequent API requests cannot reset it', async () => {
  const first = await proxy(request('/', { 'x-vercel-ip-country': 'FR' }));
  const cookie = `site-locale=${first.cookies.get('site-locale').value}`;
  const second = await proxy(request('/fr', { cookie, 'x-vercel-ip-country': 'FR' }));
  assert.equal(second.headers.get('location'), null);
  assert.equal(second.headers.get('x-middleware-request-x-site-locale'), 'fr');
  const api = await proxy(request('/api/cart', { cookie, accept: 'application/json' }));
  assert.equal(api.headers.get('set-cookie'), null);
  const returning = await proxy(request('/', { cookie, 'x-vercel-ip-country': 'PT' }));
  assert.equal(returning.headers.get('location'), 'https://store.test/fr');
});
