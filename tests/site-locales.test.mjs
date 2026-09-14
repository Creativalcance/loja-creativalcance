import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import ts from 'typescript';

function load(path, imports = {}, expose = '') {
  const exports = {};
  const source = fs.readFileSync(path, 'utf8') + expose;
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, URL, Intl, console, process: { env: {} }, require: name => {
    if (!(name in imports)) throw new Error(`Unexpected import ${name}`);
    return imports[name];
  }});
  return exports;
}

const config = load('src/lib/i18n/config.ts');
const messages = load('src/lib/i18n/messages.ts');

test('all six languages preserve product identity and shopping parameters when switching', () => {
  for (const locale of ['pt', 'en', 'fr', 'es', 'de', 'it']) {
    assert.equal(config.getSiteLocale(locale.toUpperCase()), locale);
    assert.ok(messages.getMessages(locale).cart.checkout);
    for (const source of ['en', 'fr', 'es', 'de', 'it']) {
      assert.equal(config.localizePath(`/${source}/produto/bottle?draft=123&quantidade=50#logo`, locale),
        `${locale === 'pt' ? '' : `/${locale}`}/produto/bottle?draft=123&quantidade=50#logo`);
      assert.equal(config.localizePath(`/${source}`, locale), locale === 'pt' ? '/' : `/${locale}`);
    }
  }
  assert.equal(config.getSiteLocale('unsupported'), 'pt');
});

test('customer email templates keep the order language, localized URLs, totals and HTML escaping', () => {
  const email = load('src/lib/notifications/customer-email.ts', {
    'node:crypto': crypto,
    '@/lib/customer/order-status': load('src/lib/customer/order-status.ts'),
    '@/lib/i18n/config': config,
    '@/lib/supabase/admin': { createSupabaseAdminClient: () => { throw new Error('No database or email delivery during rendering tests'); } },
  }, '\nexport { renderEmail, normalizeLocale, money };');
  for (const [locale, subject] of [['es', 'Pedido'], ['de', 'Bestellung'], ['it', 'Ordine']]) {
    assert.equal(email.normalizeLocale(locale), locale);
    const rendered = email.renderEmail({ event_type: 'order_confirmation', locale,
      payload: { orderId: '11111111-1111-4111-8111-111111111111', orderNumber: 'TEST-360', customerName: '<script>test</script>',
        currency: 'EUR', grandTotal: 1234.56, items: [{name: '<b>Bottle</b>', quantity: 10, total: 20}] } });
    assert.ok(rendered.subject.includes(subject));
    assert.ok(rendered.html.includes(`<html lang="${locale}">`));
    assert.ok(rendered.html.includes(`/${locale}/area-cliente/encomendas/11111111-1111-4111-8111-111111111111`));
    assert.ok(rendered.html.includes(new Intl.NumberFormat(config.SITE_LOCALES[locale].intlLocale, {style:'currency',currency:'EUR'}).format(1234.56)));
    assert.ok(!rendered.html.includes('<b>Bottle</b>'));
    assert.ok(!rendered.html.includes('<script>'));
  }
});

test('incomplete supplier translations fall back by field without replacing requested-language text', async () => {
  const rows = [
    {product_id:'one', language:'ES', name:'Botella', slug:'botella', description:'Descripción española', short_description:' ', material:null, type_name:'Deporte', subtype_name:null, seo_title:null, seo_description:null},
    {product_id:'one', language:'EN', name:'Bottle', slug:'bottle', description:'English description', short_description:'Short English text', material:'Steel', type_name:'Sports', subtype_name:null, seo_title:null, seo_description:null},
    {product_id:'one', language:'PT', name:'Garrafa', slug:'garrafa', description:'Descrição', short_description:'Texto curto', material:'Aço', type_name:'Desporto', subtype_name:'Garrafas', seo_title:null, seo_description:null},
  ];
  const query = { select:()=>query, eq:()=>query, in:()=>query, returns:async()=>({data:rows,error:null}) };
  const catalog = load('src/lib/i18n/catalog.ts', {
    '@/lib/i18n/config':config,
    '@/lib/supabase/admin': {createSupabaseAdminClient:()=>({from:()=>query})},
  });
  const one = await catalog.getLocalizedProductText({productId:'one',locale:'es'});
  assert.equal(one.name, 'Botella');
  assert.equal(one.language, 'ES');
  assert.equal(one.description, 'Descripción española');
  assert.equal(one.shortDescription, 'Short English text');
  assert.equal(one.material, 'Steel');
  assert.equal(one.subtypeName, 'Garrafas');
  const many = await catalog.getLocalizedProductTexts({productIds:['one'],locale:'es'});
  assert.deepEqual(many.get('one'), one);
});
