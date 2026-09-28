import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(file, imports = {}, suffix = '') {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8') + suffix, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, Intl, Date, FormData, console, require(name) {
    if (!(name in imports)) throw Error(`Unexpected import ${name}`);
    return imports[name];
  } });
  return exports;
}
const stock = load('src/lib/commerce/stock-availability.ts');
const minimum = load('src/lib/commerce/minimum-order-quantity.ts');
const pricing = load('src/lib/pricing/calculate-cart-item.ts', {'@/lib/commerce/minimum-order-quantity':minimum});
function db(rows, fail = '') {
  const writes = [];
  return { writes, from(table) {
    let operation = 'select';
    const query = {
      select(){return this;},eq(){return this;},in(){return this;},or(){return this;},single(){return this;},maybeSingle(){return this;},
      insert(value){operation='insert';writes.push({table,operation,value});return this;},
      delete(){operation='delete';writes.push({table,operation});return this;},
      then(resolve,reject){return Promise.resolve({data:rows[table]??null,error:table===fail?{message:'private database detail'}:null}).then(resolve,reject);},
    };return query;
  }};
}
test('stock excludes past forecasts and other variants, but includes today and future',()=>{
  assert.equal(stock.orderableStock([{variant_id:'a',available_quantity:10}], [
    {variant_id:'a',expected_date:'2026-09-27',expected_quantity:500},
    {variant_id:'a',expected_date:'2026-09-28',expected_quantity:20},
    {variant_id:'a',expected_date:'2026-09-29',expected_quantity:30},
    {variant_id:'b',expected_date:'2026-09-29',expected_quantity:100},
  ],'a','2026-09-28'),60);
});
test('stock uses Lisbon day across UTC midnight boundary',()=>{
  assert.equal(stock.stockBusinessDay(new Date('2026-09-27T23:30:00Z')),'2026-09-28');
});
test('checkout aggregates separate customization lines for the same variant',async()=>{
  const admin=db({product_stocks:[{product_id:'p',variant_id:'a',available_quantity:15}],product_future_stocks:[]});
  const api=load('src/lib/commerce/check-stock.ts', {'@/lib/supabase/admin':{createSupabaseAdminClient:()=>admin},'./stock-availability':stock});
  const item={product_id:'p',variant_id:'a',quantity:10};
  await api.assertStockAvailable([item]);
  await assert.rejects(api.assertStockAvailable([item,item]),/ultrapassa/);
  await assert.rejects(api.assertStockAvailable([{...item,quantity:-1}]),/inválida/);
});
const goodItem={product_id:'p',variant_id:null,quantity:10,unit_price:2,subtotal:20,personalization_unit_price:0,personalization_total:0,setup_cost:0,extras_total:0,total:20,customization_draft_id:null,personalization_technique_id:null};
function validator() {
  const admin=db({products:{id:'p',supplier_id:'s',min_order_quantity:10,product_prices:[{variant_id:null,quantity_min:10,quantity_max:null,final_price:2,currency:'EUR'}]}});
  return load('src/lib/checkout/validate-cart-pricing.ts', {
    '@/lib/supabase/admin':{createSupabaseAdminClient:()=>admin},
    '@/lib/pricing/calculate-cart-item':pricing,'@/lib/pricing/resolve-customization-price':{},
    '@/lib/stricker/resolve-customization-service-code':{},'@/lib/commerce/minimum-order-quantity':minimum,
  });
}
test('valid catalogue price is accepted without changing amounts',async()=>{
  await validator().validateCartPricing([goodItem],'EUR',0);
});
for (const [field,value] of [['unit_price',0.01],['subtotal',0.1],['total',1],['extras_total',-19],['setup_cost',NaN]]) {
  test(`checkout rejects manipulated ${field}`,async()=>{
    await assert.rejects(validator().validateCartPricing([{...goodItem,[field]:value}],'EUR',0),/atualizados/);
  });
}
test('checkout rejects unapproved discount and currency',async()=>{
  await assert.rejects(validator().validateCartPricing([goodItem],'EUR',10),/desconto/);
  await assert.rejects(validator().validateCartPricing([goodItem],'USD',0),/atualizados/);
});
function quote(fail='') {
  const admin=db({quote_requests:{id:'q'}},fail);
  const api=load('src/lib/quote/actions.ts', {
    '@/lib/supabase/admin':{createSupabaseAdminClient:()=>admin},
    '@/lib/supabase/server':{createSupabaseServerClient:async()=>({auth:{getUser:async()=>({data:{user:null}})}})},
    '@/lib/i18n/config':load('src/lib/i18n/config.ts'),
  });
  const form=new FormData();for(const [k,v] of Object.entries({contactName:'Test',contactEmail:'test@example.com',quantity:'10',locale:'en'}))form.set(k,v);
  return {admin,form,run:()=>api.createQuoteRequestAction({},form)};
}
test('anonymous quote is saved through server with localized response',async()=>{
  const q=quote();const result=await q.run();assert.equal(result.success,true);
  assert.match(result.message,/Quotation request received/);
  assert.equal(q.admin.writes[0].value.user_id,null);
});
test('quote item failure compensates header and hides database internals',async()=>{
  const q=quote('quote_request_items');const result=await q.run();
  assert.equal(result.success,false);assert.doesNotMatch(result.message,/private database/);
  assert.equal(q.admin.writes.at(-1).operation,'delete');
});
test('invalid quote never reaches database',async()=>{
  const q=quote();q.form.set('quantity','-1');assert.equal((await q.run()).success,false);assert.equal(q.admin.writes.length,0);
});

test('supplier price batches keep non-null modes and manual override flags on every row', async()=>{
  const rounding = load('src/lib/pricing/round-price.ts');
  const calculator = load('src/lib/pricing/calculate-product-price.ts', {'@/lib/pricing/round-price':rounding});
  const imports = Object.fromEntries(['@/lib/supabase/admin','@/lib/stricker/change-detection','@/lib/stricker/auth','@/lib/stricker/rest/client','@/lib/stricker/rest/session','@/lib/stricker/sync-control'].map(k=>[k,{}]));
  imports['@/lib/pricing/apply-pricing-rule'] = {findBestPricingRule:()=>null};
  imports['@/lib/pricing/calculate-product-price'] = calculator;
  const api = load('src/lib/stricker/rest/sync-customization-tables.ts',imports,'\nexport { buildPrintingPriceTableRows, upsertPrintingPriceTables };');
  const rows = api.buildPrintingPriceTableRows({supplierId:'s',lang:'PT',pricingRules:[],records:[{TableCode:'A',MinQt1:10,Price1:1},{TableCode:'B',MinQt1:10,Price1:2}]});
  assert.equal(rows.length,2);
  const override = {...rows[0],is_manual_override:true,pricing_mode:'manual',final_price:7,manual_price:7};
  let saved;
  const q={select(){return this;},eq(){return this;},in(){return this;},or(){return this;},then(resolve){resolve({data:[override],error:null});},upsert(data,options){saved=data;assert.equal(options.defaultToNull,false);return Promise.resolve({error:null});}};
  await api.upsertPrintingPriceTables({supabaseAdmin:{from:()=>q},rows});
  assert.equal(saved[0].final_price,7);assert.equal(saved[0].is_manual_override,true);
  assert.equal(saved[1].is_manual_override,false);
  for(const row of saved) {assert.ok(row.pricing_mode);assert.ok(row.handling_pricing_mode);assert.equal(typeof row.handling_is_manual_override,'boolean');}
});
