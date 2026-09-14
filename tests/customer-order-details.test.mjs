import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';

function load(path, imports = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, { exports, URL, console, require: name => {
    if (!(name in imports)) throw new Error(`Unexpected import ${name}`);
    return imports[name];
  } });
  return exports;
}
const status = load('src/lib/customer/order-status.ts');
const copy = load('src/lib/customer/order-copy.ts');

test('customer status labels never disclose internal status codes or supplier references', () => {
  for (const locale of ['pt','en','fr','es','de','it']) {
    assert.doesNotMatch(status.customerStatus('sent_to_supplier', locale), /supplier|fornecedor|fournisseur/i);
    assert.doesNotMatch(status.customerStatus('SECRET_INTERNAL_CODE', locale), /SECRET_INTERNAL_CODE/);
  }
});

test('order ownership is verified before any privileged data/document access', async () => {
  const filters = []; let privilegedReads = 0;
  const query = { select: () => query, eq: (key,value) => { filters.push([key,value]); return query; }, is: (key,value) => {filters.push([key,value]);return query;}, maybeSingle: async () => ({data:null,error:null}) };
  const details = load('src/lib/customer/order-details.ts', {
    'server-only': {}, 'next/navigation': {notFound:()=>{throw new Error('NOT_FOUND');}},
    '@/lib/auth/assert-customer': { assertCustomerAccess: async () => ({user:{id:'customer-a'},supabase:{from:()=>query}}) },
    '@/lib/supabase/admin': {createSupabaseAdminClient:()=>{privilegedReads++;return {}; }},
  });
  await assert.rejects(details.ownedCustomerOrder('11111111-1111-1111-1111-111111111111','/area-cliente'), /NOT_FOUND/);
  assert.ok(filters.some(([key,value])=>key==='user_id'&&value==='customer-a'));
  assert.ok(filters.some(([key,value])=>key==='deleted_at'&&value===null));
  assert.equal(privilegedReads,0);
  for(const value of ['javascript:alert(1)','data:text/html,test','http://example.com','https://user:pass@example.com']) assert.equal(details.safeDocumentUrl(value),null);
  assert.equal(details.safeDocumentUrl('https://example.com/invoice.pdf'),'https://example.com/invoice.pdf');
});

test('order page presents customer events despite email failure, and distinguishes unavailable invoices', async () => {
  const rows = {
    order_items: [{id:'item',product_name:'Garrafa',quantity:10,unit_price:2,total:20,personalization_required:true,artwork_approved:false,logo_storage_path:'private/logo.svg',mockup_storage_path:'private/mockup.png'}],
    payments: [{id:'payment',status:'paid',amount:24.6,amount_refunded:0,currency:'EUR',created_at:'2026-09-01T10:00:00Z'}],
    order_status_history: [{id:'history',new_status:'sent_to_supplier',created_at:'2026-09-02T10:00:00Z'}],
    customer_email_notifications: [{id:'email',event_type:'order_status_changed',email_status:'failed',payload:{newStatus:'PRODUCTION',internalNotes:'SECRET'},created_at:'2026-09-03T10:00:00Z'}],
    customer_addresses: [],
  };
  const admin = {from: name => {
    const q = {select:()=>q,eq:()=>q,in:()=>q,order:()=>q,then:(resolve)=>Promise.resolve({data:rows[name],error:null}).then(resolve)};return q;
  }};
  const order = {id:'order',order_number:'TEST-360',status:'processing',payment_status:'paid',fulfillment_status:'unfulfilled',created_at:'2026-09-01T10:00:00Z',currency:'EUR',subtotal:20,personalization_total:0,setup_total:0,shipping_total:0,discount_total:0,tax_total:4.6,grand_total:24.6,customer_name:'Test customer',invoice_url:null};
  const page = load('src/app/area-cliente/encomendas/[id]/page.tsx', {
    'react/jsx-runtime':jsx, 'next/link':({children,...props})=>React.createElement('a',props,children),
    '@/components/layout/SiteHeader':()=>null,
    '@/lib/customer/order-details':{ownedCustomerOrder:async()=>({order,user:{id:'customer'},admin}),safeDocumentUrl:value=>typeof value==='string'&&value.startsWith('https://')?value:null},
    '@/lib/customer/order-status':status, '@/lib/customer/order-copy':copy,
    '@/lib/i18n/server':{getCurrentLocale:async()=>'pt'},
    '@/lib/i18n/config':{localizePath:path=>path,SITE_LOCALES:{pt:{intlLocale:'pt-PT'}}},
  });
  const html = renderToStaticMarkup(await page.default({params:Promise.resolve({id:'order'})}));
  for(const text of ['Em produção','Pagamentos','Ficheiro de personalização','Ver simulação','A fatura ainda não está disponível']) assert.ok(html.includes(text),text);
  assert.ok(html.includes('/documento?tipo=mockup'));
  for(const text of ['SECRET','private/logo.svg','sent_to_supplier','email_status','fornecedor']) assert.ok(!html.includes(text),text);
});

test('document downloads check both item and owned order before signing a file', async () => {
  const filters = []; let signed = false;
  const q = {select:()=>q,eq:(key,value)=>{filters.push([key,value]);return q;},maybeSingle:async()=>({data:null,error:null})};
  const route = load('src/app/area-cliente/encomendas/[id]/documento/route.ts', {
    'next/server':{NextResponse:{redirect:()=>{throw new Error('Unexpected redirect');}}},
    'next/navigation':{notFound:()=>{throw new Error('NOT_FOUND');}},
    '@/lib/customer/order-details':{ownedCustomerOrder:async()=>({order:{id:'owned-order'},admin:{from:()=>q,storage:{from:()=>({createSignedUrl:()=>{signed=true;}})}}}),safeDocumentUrl:()=>null},
  });
  const itemId='22222222-2222-2222-2222-222222222222';
  await assert.rejects(route.GET({nextUrl:new URL(`https://store.invalid/?tipo=mockup&artigo=${itemId}`)},{params:Promise.resolve({id:'owned-order'})}),/NOT_FOUND/);
  assert.deepEqual(filters,[['order_id','owned-order'],['id',itemId]]);
  assert.equal(signed,false);
});
