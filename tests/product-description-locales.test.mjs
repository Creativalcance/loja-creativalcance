import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';

function load(path, imports = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { exports, console, Intl, require: name => {
    if (!(name in imports)) throw new Error(`Unexpected import: ${name}`);
    return imports[name];
  }});
  return exports;
}

const config = load('src/lib/i18n/config.ts');
const messages = load('src/lib/i18n/messages.ts');
const product = {
  id:'product-one', sku:'92583', name:'Saco de oferta', slug:'saco-de-oferta-92583',
  short_description:'Descrição portuguesa do saco', material:'Tecido', type_name:'Compras', subtype_name:'Sacos',
  is_featured:true, is_customizable:true, min_order_quantity:10,
  product_images:[{external_url:'https://example.invalid/bag.png',storage_url:null,alt_text:'Saco português',is_primary:true,sort_order:0}],
  product_prices:[{final_price:0.38,quantity_min:1,currency:'EUR'}], product_stocks:[{available_quantity:100}],
};
const translatedCopy = {
  en:['Gift bag','Large gift bag with drawstring closure'],
  fr:['Sac cadeau','Grand sac cadeau avec fermeture à cordon'],
  es:['Bolsa de regalo','Bolsa de regalo grande con cierre de cordón'],
  de:['Geschenktasche','Große Geschenktasche mit Kordelzug'],
  it:['Sacchetto regalo','Sacchetto regalo grande con chiusura a cordoncino'],
};

function fixture({ failTranslation = false } = {}) {
  const reads = [];
  const translatedRows = Object.entries(translatedCopy).map(([locale,[name,description]])=>({
    product_id:product.id,language:locale.toUpperCase(),name,slug:'translated-slug-must-not-replace-canonical-route',
    short_description:description,description,material:`Material ${locale}`,type_name:`Category ${locale}`,subtype_name:`Subcategory ${locale}`,
    seo_title:null,seo_description:null,
  }));
  const translationQuery = {
    select:()=>translationQuery, in:(field,values)=>{reads.push([field,values]);return translationQuery;},
    returns:async()=>({data:translatedRows,error:failTranslation?{message:'Translation read failed'}:null}),
  };
  const catalog = load('src/lib/i18n/catalog.ts', {
    '@/lib/i18n/config':config,
    '@/lib/supabase/admin':{createSupabaseAdminClient:()=>({from:()=>translationQuery})},
  });
  const presentation = load('src/lib/i18n/product-presentation.ts', {'@/lib/i18n/catalog':catalog});
  const sourceQuery = {select:()=>sourceQuery,eq:()=>sourceQuery,or:()=>sourceQuery,order:()=>sourceQuery,limit:()=>sourceQuery,
    then:resolve=>Promise.resolve({data:[product],error:null}).then(resolve)};
  const landings = load('src/lib/seo/landing-products.ts', {
    '@/lib/supabase/server':{createSupabaseServerClient:async()=>({from:()=>sourceQuery})},
    '@/lib/i18n/product-presentation':presentation,
  });
  return { presentation, landings, reads };
}

for (const [locale,[name,description]] of Object.entries(translatedCopy)) {
  test(`${locale}: guide/application/industry and commercial/selection listings render supplier translations`, async()=>{
    const { landings } = fixture();
    const before = JSON.stringify(product);
    const ordinary = await landings.getLandingProducts(['saco'],locale,8);
    const commercial = await landings.getCommercialLandingProducts(['saco'],locale,{requireCustomizable:true,maxUnitPrice:0.5,targetQuantity:10});
    for (const rows of [ordinary,commercial]) {
      assert.equal(rows.length,1);
      assert.equal(rows[0].name,name);
      assert.equal(rows[0].short_description,description);
      assert.equal(rows[0].slug,product.slug);
      assert.equal(rows[0].sku,product.sku);
      assert.equal(rows[0].product_prices,product.product_prices);
      assert.equal(rows[0].product_stocks,product.product_stocks);
    }
    assert.equal(JSON.stringify(product),before);
    const card = load('src/components/catalog/ProductCard.tsx', {
      'react/jsx-runtime':jsx,
      'next/link':{__esModule:true,default:({children,...props})=>jsx.jsx('a',{...props,children})},
      'lucide-react':{ArrowRight:()=>null,CheckCircle2:()=>null,Star:()=>null},
      '@/lib/i18n/config':config,'@/lib/i18n/messages':messages,
    });
    const html=renderToStaticMarkup(card.default({product:ordinary[0],locale}));
    assert.ok(html.includes(description));
    assert.ok(html.includes(`alt="${name}"`));
    assert.ok(html.includes(`/${locale}/produto/${product.slug}`));
    assert.ok(!html.includes(product.short_description));
  });
}

test('localization retains commercial filters and surfaces translation failures instead of silently showing Portuguese',async()=>{
  const {landings,presentation,reads}=fixture();
  assert.equal((await landings.getCommercialLandingProducts(['saco'],'it',{maxUnitPrice:0.2})).length,0);
  assert.equal((await presentation.localizeProductCards([product],'pt'))[0],product);
  assert.equal(reads.length,0);
  await assert.rejects(fixture({failTranslation:true}).landings.getLandingProducts(['saco'],'es'),/Translation read failed/);
});

test('Smart Merch translates display text without changing rankings, variants, prices, dates or reasons selected',async()=>{
  const {presentation}=fixture();
  const result={id:product.id,name:product.name,slug:product.slug,shortDescription:product.short_description,
    imageAlt:'Saco português',material:'Tecido',typeName:'Compras',subtypeName:'Sacos',variantId:'variant-one',
    quantity:10,unitPrice:0.38,productTotal:3.8,matchScore:90,availableStock:100,estimatedDeliveryDate:'2026-10-01',
    reasons:[{code:'stock',label:'Stock suficiente para a quantidade'}]};
  const response={results:[result],query:{quantity:10},pricingNotice:'Valores em português',deadlineNotice:null,earliestAvailableDate:'2026-10-01'};
  for (const locale of Object.keys(translatedCopy)) {
    const localized=await presentation.localizeSmartMerchResponse(response,locale);
    assert.equal(localized.results[0].shortDescription,translatedCopy[locale][1]);
    for(const key of ['id','slug','variantId','quantity','unitPrice','productTotal','matchScore','availableStock','estimatedDeliveryDate'])
      assert.equal(localized.results[0][key],result[key]);
    assert.equal(localized.results[0].reasons[0].code,'stock');
    assert.notEqual(localized.results[0].reasons[0].label,result.reasons[0].label);
    assert.equal(localized.deadlineNotice,null);
    assert.equal(localized.query,response.query);
  }
  assert.equal(result.name,product.name);
});
