import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
function load(file, imports = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,
    {exports,Intl,Date,FormData,console,...globals,require:name=>{if (!(name in imports)) throw Error(`Unexpected dependency ${name}`);return imports[name];}});
  return exports;
}
const countries=load('src/lib/markets/countries.ts');
const policy=load('src/lib/markets/policy.ts',{'./countries':countries});
const copy=load('src/lib/markets/i18n.ts');
const exchange=load('src/lib/markets/exchange.ts');
const config=load('src/lib/i18n/config.ts');
test('country codes are explicit ISO addresses, never arbitrary user strings',()=>{
  assert.equal(countries.COUNTRY_CODES.length,249);
  assert.equal(new Set(countries.COUNTRY_CODES).size,249);
  assert.equal(countries.normalizeCountryCode(' us '),'US');
  for(const code of ['ZZ','EU','UK','Portugal','',null,{},'<script>']) assert.equal(countries.normalizeCountryCode(code),null);
});
for(const [postal,rate,region] of [['1000-001',.23,'continental'],['3050001',.23,'continental'],['9000-001',.22,'madeira'],['9400-001',.22,'madeira'],['9500-001',.16,'acores'],['9980-001',.16,'acores']]) {
  test(`Portuguese postal region ${postal}`,()=>{
    const result=policy.assessCheckoutDestination({country_code:'PT',postal_code:postal,address_line_1:'Rua da Madeira, Horta, Flores'});
    assert.equal(result.status,'ready');assert.equal(result.rate,rate);assert.equal(result.region,region);
  });
}
test('no Portuguese default rate for foreign, malformed or unsupported payment currencies',()=>{
  for(const country of countries.COUNTRY_CODES.filter(c=>c!=='PT')) assert.equal(policy.assessCheckoutDestination({country_code:country,postal_code:'1000-001'}).status,'review');
  for(const postal of ['','0000-000','9500','abc']) assert.equal(policy.assessCheckoutDestination({country_code:'PT',postal_code:postal}).status,'review');
  assert.equal(policy.assessCheckoutDestination({country_code:'PT',postal_code:'1000-001'},'USD').reason,'currencyReview');
});
for(const locale of ['pt','en','fr','es','de','it']) test(`country picker and review copy in ${locale}`,()=>{
  const Select=load('src/components/markets/CountrySelect.tsx',{'react/jsx-runtime':jsx,'@/lib/markets/countries':countries}).default;
  const html=renderToStaticMarkup(React.createElement(Select,{locale,name:'country',defaultValue:'PT'}));
  assert.equal((html.match(/<option/g)||[]).length,249);
  assert.match(html,/value="PT" selected=""/);
  assert.ok(copy.marketText('internationalReview',locale).length>20);
});
test('ECB reference rejects missing, stale, invalid and future data',()=>{
  const now=Date.parse('2026-09-14T12:00:00Z');
  const xml=(date,rate)=>`<Cube time='${date}'><Cube currency='USD' rate='${rate}'/></Cube>`;
  assert.equal(exchange.parseEcbUsd(xml('2026-09-11','1.17'),now).rate,1.17);
  for(const [date,rate] of [['2026-09-01','1.17'],['2026-09-15','1.17'],['2026-02-30','1.17'],['2026-09-14','0'],['2026-09-14','NaN']]) assert.equal(exchange.parseEcbUsd(xml(date,rate),now),null);
  assert.equal(exchange.parseEcbUsd('<html>unavailable</html>',now),null);
});
test('direct payment action refuses foreign destination before any mutation or Stripe access',async()=>{
  const mutations=[]; const filters=[];
  const query={select(){return this;},eq(...args){filters.push(args);return this;},async maybeSingle(){return {data:{id:'cart',currency:'EUR',customer_addresses:{country_code:'US',postal_code:'10001'},cart_items:[]}};}};
  const action=load('src/lib/checkout/payment-actions.ts',{
    '@/lib/markets/policy':policy,'@/lib/markets/i18n':copy,'node:crypto':{},'next/navigation':{redirect(){throw Error('unexpected redirect');}},
    '@/lib/stripe/server':{createStripeServerClient(){mutations.push('stripe');throw Error('unexpected stripe');}},
    '@/lib/supabase/admin':{createSupabaseAdminClient:()=>({from:()=>query,rpc:()=>{mutations.push('rpc');throw Error('unexpected mutation');}})},
    '@/lib/supabase/server':{createSupabaseServerClient:async()=>({auth:{getUser:async()=>({data:{user:{id:'owner'}}})}})},
    '@/lib/i18n/config':config,'@/lib/stricker/config':{},'@/lib/checkout/shipping-pricing':{},'@/lib/stricker/resolve-customization-service-code':{},
  });
  const form=new FormData();form.set('cartId','cart');form.set('termsAccepted','true');form.set('locale','en');
  const result=await action.createPaymentCheckoutSessionAction({},form);
  assert.equal(result.success,false);assert.equal(result.message,copy.marketText('internationalReview','en'));
  assert.deepEqual(mutations,[]);assert.ok(filters.some(([key,value])=>key==='user_id'&&value==='owner'));
});
test('customer address saves selected foreign country and preserves VAT prefix',async()=>{
  let inserted;
  const query={select(){return this;},eq(){return this;},then(resolve){resolve({count:1});},async insert(row){inserted=row;return {error:null};}};
  const action=load('src/app/area-cliente/dados/actions.ts',{
    '@/lib/markets/countries':countries,'@/lib/markets/i18n':copy,'next/cache':{revalidatePath(){}},'@/lib/i18n/config':config,
    '@/lib/supabase/server':{createSupabaseServerClient:async()=>({auth:{getUser:async()=>({data:{user:{id:'owner'}}})},from:()=>query})},
  });
  const form=new FormData();for(const [key,value] of Object.entries({locale:'en',country_code:'de',contact_name:'Customer',address_line_1:'Street 1',postal_code:'10115',city:'Berlin',tax_id:'DE 123456789'}))form.set(key,value);
  const result=await action.addCustomerAddressAction({},form);
  assert.equal(result.success,true);assert.equal(inserted.country_code,'DE');assert.equal(inserted.tax_id,'DE123456789');assert.equal(inserted.user_id,'owner');
  inserted=null;form.set('country_code','ZZ');assert.equal((await action.addCustomerAddressAction({},form)).success,false);assert.equal(inserted,null);
});
test('exchange endpoint handles upstream failure without falling back to a made-up rate',async()=>{
  const route=load('src/app/api/markets/exchange-rate/route.ts',{'@/lib/markets/exchange':exchange},{Response,AbortSignal,fetch:async()=>{throw Error('offline');}});
  const response=await route.GET();assert.equal(response.status,503);assert.equal(response.headers.get('cache-control'),'no-store');
  assert.deepEqual(await response.json(),{error:'reference_unavailable'});
});
test('exchange endpoint exposes only validated public reference data',async()=>{
  const today=new Date().toISOString().slice(0,10);let endpoint;
  const route=load('src/app/api/markets/exchange-rate/route.ts',{'@/lib/markets/exchange':exchange},{Response,AbortSignal,fetch:async url=>{endpoint=url;return {ok:true,text:async()=>`<Cube time='${today}'><Cube currency='USD' rate='1.17'/></Cube>`};}});
  const response=await route.GET();assert.equal(response.status,200);assert.equal(endpoint,'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml');
  assert.deepEqual(await response.json(),{rate:1.17,date:today,base:'EUR',quote:'USD'});
});
