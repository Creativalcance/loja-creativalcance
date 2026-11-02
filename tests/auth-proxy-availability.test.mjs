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
  }).outputText, {exports, Headers, ...globals, require: name => {
    assert.ok(name in imports, name); return imports[name];
  }});
  return exports;
}
const availability = load('src/lib/auth/availability.ts');
const config = load('src/lib/i18n/config.ts');
const detection = load('src/lib/i18n/detection.ts', { '@/lib/i18n/config': config });
const commercial = load('src/lib/auth/commercial-access.ts');

function fixture({ authError = null, profileError = null, userId = 'user', role = 'customer', clearCookie = false } = {}) {
  let authCalls = 0;
  const { proxy } = load('src/proxy.ts', {
    'next/server': {NextResponse, userAgent}, '@/lib/auth/availability': availability,
    '@/lib/i18n/detection': detection,
    '@/lib/i18n/config': config, '@/lib/auth/commercial-access': commercial,
    '@supabase/ssr': {createServerClient: (_url, _key, options) => ({
      auth: {getClaims: async () => {
        authCalls++;
        if (clearCookie) options.cookies.setAll([{name:'sb-test-auth-token',value:'',options:{maxAge:0}}], {'Cache-Control':'private, no-store'});
        return {data: userId ? {claims:{sub:userId}} : null, error:authError};
      }},
      from: () => ({select(){return this;},eq(){return this;},maybeSingle:async()=>({data:{role,is_active:true},error:profileError})}),
    })},
  }, {process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://example.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:'public-test-key'}}});
  return {proxy, calls:()=>authCalls};
}

test('auth and profile outages fail closed with 503 instead of false logout or permission redirects', async () => {
  for (const options of [{authError:{status:522}}, {profileError:{message:'private DB detail'}}]) {
    for (const path of ['/admin','/area-cliente','/api/admin/test']) {
      const r = await fixture(options).proxy(new NextRequest(`https://store.test${path}`));
      assert.equal(r.status,503);
      assert.equal(r.headers.get('location'),null);
      assert.match(r.headers.get('cache-control'),/no-store/);
      assert.equal(r.headers.get('retry-after'),'30');
      assert.doesNotMatch(await r.text(),/private DB detail/);
    }
  }
});
test('a fresh password login does not first refresh an expired session', async () => {
  const f = fixture({authError:{status:522}});
  const r = await f.proxy(new NextRequest('https://store.test/en/login',{method:'POST'}));
  assert.equal(f.calls(),0);
  assert.equal(r.status,200);
});
test('expired session removal reaches the browser on a login redirect', async () => {
  const r = await fixture({userId:null,clearCookie:true}).proxy(new NextRequest('https://store.test/admin'));
  assert.equal(r.status,307);
  assert.equal(new URL(r.headers.get('location')).pathname,'/login');
  assert.equal(r.cookies.get('sb-test-auth-token').value,'');
  assert.match(r.headers.get('cache-control'),/no-store/);
});
test('customer accounts still cannot access admin; administrators retain access', async () => {
  const blocked = await fixture().proxy(new NextRequest('https://store.test/admin'));
  assert.equal(blocked.status,307);
  assert.equal(new URL(blocked.headers.get('location')).pathname,'/');
  const allowed = await fixture({role:'admin'}).proxy(new NextRequest('https://store.test/admin'));
  assert.equal(allowed.status,200);
});

test('public sitemap XML stays free of session calls and locale cookies so it can be cached', async () => {
  const f = fixture();
  for (const path of ['/sitemap.xml', '/sitemaps/pt/sitemap.xml', '/sitemaps/en/sitemap.xml']) {
    const response = await f.proxy(new NextRequest(`https://store.test${path}`));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('set-cookie'), null);
  }
  assert.equal(f.calls(), 0);
});
