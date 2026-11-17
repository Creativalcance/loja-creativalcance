import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';

function load(file, imports = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, ...globals, require(name) {
    if (!(name in imports)) throw Error(`Unexpected import ${name}`);
    return imports[name];
  } });
  return exports;
}

function fixture() {
  const scripts = [], calls = [], cookies = [];
  const window = { location: { hostname: 'www.360-merchandising.com' } };
  const document = {
    set cookie(value) { cookies.push(value); },
    querySelector() { return scripts.find(s => !s.removed) || null; },
    createElement() { return { events: {}, addEventListener(name, fn) { this.events[name] = fn; }, remove() { this.removed = true; } }; },
    head: { appendChild(script) { scripts.push(script); } },
  };
  const pixel = load('src/lib/analytics/meta-pixel.ts', {}, { window, document });
  function loaded() {
    window.fbq.callMethod = (...args) => calls.push(args);
    window.fbq.queue.forEach(args => window.fbq.callMethod(...args));
    window.fbq.queue = [];
    scripts.at(-1).events.load();
  }
  return { ...pixel, window, scripts, calls, cookies, loaded, views: () => calls.filter(c => c[0] === 'trackSingle') };
}

test('no SDK, pixel queue or tracking request before marketing consent', () => {
  const p = fixture();
  for (const path of ['/', '/produto/galileia', '/en/categorias/Hampers']) p.updateMetaPixel(false, path);
  assert.equal(p.scripts.length, 0);
  assert.equal(p.window.fbq, undefined);
});

test('consent initializes the requested pixel once and records one view per page navigation', () => {
  const p = fixture();
  p.updateMetaPixel(true, '/'); p.updateMetaPixel(true, '/');
  assert.equal(p.scripts.length, 1);
  assert.equal(p.scripts[0].async, true);
  assert.equal(p.scripts[0].src, 'https://connect.facebook.net/en_US/fbevents.js');
  p.loaded();
  p.updateMetaPixel(true, '/');
  assert.deepEqual(p.views(), [['trackSingle', '1622422235741386', 'PageView']]);
  p.updateMetaPixel(true, '/produto/galileia'); p.updateMetaPixel(true, '/produto/galileia');
  p.updateMetaPixel(true, '/');
  assert.equal(p.views().length, 3);
  assert.equal(p.calls.filter(c => c[0] === 'init').length, 1);
  assert.equal(p.scripts.length, 1);
  assert.ok(p.calls.find(c => c[0] === 'set' && c[1] === 'autoConfig' && c[2] === false));
});

test('withdrawal during SDK loading sends no stale visit or initialization', () => {
  const p = fixture();
  p.updateMetaPixel(true, '/');
  p.updateMetaPixel(false, '/');
  p.loaded();
  assert.equal(p.views().length, 0);
  assert.equal(p.calls.filter(c => c[0] === 'init').length, 0);
  p.updateMetaPixel(true, '/produto/galileia');
  assert.equal(p.views().length, 1);
});

test('withdrawal revokes tracking, clears host and parent-domain cookies and preserves consent cookie', () => {
  const p = fixture();
  p.updateMetaPixel(true, '/'); p.loaded();
  p.updateMetaPixel(false, '/'); p.updateMetaPixel(false, '/produto/galileia');
  assert.equal(p.views().length, 1);
  assert.deepEqual(p.calls.at(-1), ['consent', 'revoke']);
  assert.ok(p.cookies.includes('_fbp=; Path=/; Max-Age=0; SameSite=Lax; Secure; Domain=360-merchandising.com'));
  assert.ok(p.cookies.includes('_fbc=; Path=/; Max-Age=0; SameSite=Lax; Secure'));
  assert.ok(p.cookies.every(c => /^_fb[pc]=/.test(c)));
  p.updateMetaPixel(true, '/produto/galileia');
  assert.equal(p.views().length, 2);
});

test('remounts and reopening preferences do not duplicate the current page view', () => {
  const p = fixture();
  p.updateMetaPixel(true, '/'); p.loaded();
  p.revokeMetaPixelConsent(); p.updateMetaPixel(true, '/');
  assert.equal(p.views().length, 1);
  assert.deepEqual(p.calls.at(-1), ['consent', 'grant']);
});

test('private and authentication routes never initialize the pixel in any locale', () => {
  for (const locale of ['', '/en', '/fr', '/es', '/de', '/it']) {
    const p = fixture();
    for (const path of ['/admin', '/admin/encomendas/123', '/area-cliente/dados', '/area-comercial', '/auth/callback', '/login', '/registo', '/nova-password', '/recuperar-password']) {
      p.updateMetaPixel(true, locale + path);
    }
    assert.equal(p.scripts.length, 0);
    p.updateMetaPixel(true, locale + '/carrinho'); p.loaded();
    assert.equal(p.views().length, 1);
  }
});

test('a private route reached while the SDK loads suppresses the pending PageView', () => {
  const p = fixture();
  p.updateMetaPixel(true, '/'); p.updateMetaPixel(true, '/area-cliente/dados'); p.loaded();
  assert.equal(p.views().length, 0);
  p.updateMetaPixel(true, '/produto/galileia');
  assert.equal(p.views().length, 1);
});

test('a blocked SDK can be retried on later navigation without breaking the store', () => {
  const p = fixture();
  p.updateMetaPixel(true, '/'); p.scripts[0].events.error();
  p.updateMetaPixel(true, '/produto/galileia'); p.loaded();
  assert.equal(p.scripts.length, 2);
  assert.equal(p.views().length, 1);
  p.window.fbq = () => { throw Error('third-party failure'); };
  assert.doesNotThrow(() => p.revokeMetaPixelConsent());
});

test('client component applies route and consent changes and cleans up on unmount', () => {
  const effects = [], updates = [];
  const Pixel = load('src/components/analytics/MetaPixelTag.tsx', {
    react: { useEffect: (effect, deps) => effects.push({ effect, deps }) },
    'next/navigation': { usePathname: () => '/fr/produit' },
    '@/lib/analytics/meta-pixel': { updateMetaPixel: (...args) => updates.push(args), revokeMetaPixelConsent: () => updates.push(['revoke']) },
  }).default;
  assert.equal(Pixel({ consentGranted: false }), null);
  effects[0].effect(); const cleanup = effects[1].effect(); cleanup();
  assert.deepEqual(updates, [[false, '/fr/produit'], ['revoke']]);
});

test('cookie manager connects explicit marketing permission, independently from analytics', () => {
  for (const preferences of [null, { marketing: false, analytics: true }, { marketing: true, analytics: false }]) {
    let state = 0;
    const Pixel = () => null;
    const Manager = load('src/components/privacy/CookieConsentManager.tsx', {
      react: { useCallback: f => f, useEffect() {}, useState: () => [state++ ? true : preferences, () => {}] },
      'react/jsx-runtime': jsx, 'next/link': () => null,
      '@/components/analytics/GoogleAnalyticsTag': () => null,
      '@/components/analytics/MetaPixelTag': { default: Pixel },
      '@/lib/analytics/meta-pixel': { revokeMetaPixelConsent() {} },
      '@/lib/i18n/config': { localizePath: path => path },
    }).default;
    const node = Manager({ locale: 'pt' }).props.children.find(child => child?.type === Pixel);
    assert.equal(node.props.consentGranted, preferences?.marketing === true);
  }
});
