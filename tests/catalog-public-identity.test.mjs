import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as crypto from 'node:crypto';
function load(file, imports, extra = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, URL, URLSearchParams, Response, Map, console, ...extra, require: name => { assert.ok(name in imports, name); return imports[name]; } });
  return exports;
}
const id = '11111111-1111-4111-8111-111111111111';
const row = { product_id:id,public_reference:'360-ABCDEF123456',review_status:'ready',translations:{pt:{name:'Bloco Horizonte 360'},en:{name:'Notebook Horizonte 360'}},products:{slug:'heaney-93669',supplier_id:'supplier'} };
function fixture(rows=[row]) {
  const q = {select:()=>q,order:()=>q,eq:()=>q,maybeSingle:async()=>({data:rows[0]??null,error:null}),range:async()=>({data:rows,error:null}),in:async()=>({data:[{variant_id:'variant',public_reference:'360-V-ABC'}],error:null})};
  return load('src/lib/catalog-identity/public.ts', {
    'server-only':{}, 'node:crypto':crypto, react:{cache:fn=>fn}, 'next/cache':{unstable_cache:fn=>fn},
    '@/lib/supabase/admin':{createSupabaseAdminClient:()=>({from:()=>q})},
  });
}
test('public identity contains only approved display values; supplier mapping stays server-side', async()=>{
  const api=fixture();const result=await api.getPublicIdentity(id,'en');
  assert.equal(result.name,'Notebook Horizonte 360');assert.equal(result.reference,'360-ABCDEF123456');assert.equal(result.slug,'360-abcdef123456');
  assert.doesNotMatch(JSON.stringify(result),/93669|heaney|supplier/);
  assert.equal(await api.resolveSupplierSlug(result.slug),'heaney-93669');
  assert.equal(await api.resolveSupplierSlug('old-link'),'old-link');
});
test('unreviewed or missing translations never fall back to supplier names; manual products remain untouched',async()=>{
  assert.equal((await fixture([{...row,review_status:'draft'}]).getPublicIdentity(id)).name,'Produto 360-ABCDEF123456');
  assert.equal((await fixture().getPublicIdentity(id,'de')).name,'Produkt 360-ABCDEF123456');
  assert.equal(await fixture([{...row,products:{...row.products,supplier_id:null}}]).getPublicIdentity(id),null);
});
test('new names and references are searchable and redirects retain customization selection',async()=>{
  const api=fixture();assert.equal((await api.findPublicProductIds('Horizonte','pt'))[0],id);
  assert.equal((await api.findPublicProductIds('360-ABCDEF123456','en'))[0],id);
  const path=api.preserveProductQuery('/en/produto/360-abcdef123456/personalizar',{draft:'draft-id',cor:'variant',quantidade:'50',local:'location'});
  const url=new URL(path,'https://example.test');assert.equal(url.searchParams.get('draft'),'draft-id');assert.equal(url.searchParams.get('quantidade'),'50');
  assert.equal((await api.getPublicVariantReferences(['variant'])).get('variant'),'360-V-ABC');
});
test('public gallery addresses are stable and do not expose source filenames',()=>{
  const api=fixture();const asset=api.publicMediaAsset('https://cdn.hideacontent.com/public/products/1000x1000/93669_103.jpg');
  assert.equal(asset.length,24);assert.doesNotMatch(api.publicMediaUrl(id,asset),/93669|hideacontent/);
});
test('media route accepts only stored public images and rejects arbitrary assets or hosts',async()=>{
  let fetches=0;let source='https://cdn.hideacontent.com/public/products/1000x1000/93669_103.jpg';
  const filters=[];
  const q={select:()=>q,eq:(...args)=>{filters.push(args);return q;},is:()=>q,maybeSingle:async()=>({data:{sku:'93669',product_images:[],product_variants:[]},error:null})};
  const route=load('src/app/api/catalog/media/[productId]/route.ts',{
    '@/lib/catalog-identity/public':fixture(), 'next/server':{NextResponse:Response},'next/cache':{unstable_cache:fn=>fn},
    '@/lib/supabase/admin':{createSupabaseAdminClient:()=>({from:()=>q})},
    '@/lib/catalog/product-gallery':{buildProductGallery:()=>[{url:source,zoomUrl:source,thumbnailUrl:source}]},
  },{process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://storage.example.test'}},AbortSignal,fetch:async(url,options)=>{fetches++;assert.equal(options.redirect,'error');return new Response('image',{headers:{'content-type':'image/jpeg'}});}});
  const req=asset=>({nextUrl:new URL(`https://store.test/api/catalog/media/${id}?asset=${asset}`)});const context={params:Promise.resolve({productId:id})};
  assert.equal((await route.GET(req('https://evil.test'),context)).status,400);assert.equal(fetches,0);
  assert.equal((await route.GET(req('main'),context)).status,200);assert.equal(fetches,1);
  source='https://127.0.0.1/private';assert.equal((await route.GET(req('main'),context)).status,404);assert.equal(fetches,1);
  assert.ok(filters.some(([k,v])=>k==='is_active'&&v===true));assert.ok(filters.some(([k,v])=>k==='status'&&v==='active'));
});
