import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, imports = {}, suffix = '') {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8') + suffix, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { exports, console, Intl, require: name => imports[name] ?? {} });
  return exports;
}
const config = load('src/lib/i18n/config.ts');
const names = {pt:['Preto','Azul'],en:['Black','Blue'],fr:['Noir','Bleu'],es:['Negro','Azul'],de:['Schwarz','Blau'],it:['Nero','Blu']};
const rows = Object.entries(names).flatMap(([locale,labels]) => labels.map((name,i) => ({code:String(103+i),name,language:locale.toUpperCase()})));
rows.push({code:'318',name:'Neon Yellow',language:'EN'},{code:'379',name:'Nato Green/Neon Pink',language:'EN'});
const variants = [
  {id:'black',sku:'93674-103',color_code:'103',color_name:'Preto',color_hex:'#000000',size:null,image_url:'black.jpg'},
  {id:'blue',sku:'93674-104',color_code:'104',color_name:'Azul',color_hex:'#204060',size:'L',image_url:'blue.jpg'},
];
function fixture({fail=false}={}) {
  const reads=[];
  const client = {from:table=>{
    const filters = {};
    const query={select:()=>query,eq:(field,value)=>{filters[field]=value;return query;},in:(field,values)=>{filters[field]=values;return query;},
      returns:async()=>{
        reads.push({table,...filters});
        return {error:fail?{message:'Color read failed'}:null, data:table==='supplier_colors'
          ? rows.filter(row=>filters.supplier_id==='stricker' && filters.language.includes(row.language))
          : variants.filter(v=>filters.id.includes(v.id)).map(v=>({...v,products:{supplier_id:'stricker'}}))};
      }};return query;
  }};
  return {...load('src/lib/i18n/colors.ts',{'@/lib/i18n/config':config,'@/lib/supabase/admin':{createSupabaseAdminClient:()=>client}}), reads};
}
const purchase = load('src/components/product/ProductDirectPurchasePanel.tsx',{},'\nexport {getColorKey,getColorLabel,getVariantLabel};');
const editor = load('src/components/product/ProductCustomizationEditor.tsx',{},'\nexport {getColorLabel};');

for (const locale of Object.keys(names)) {
  test(`${locale}: supplier color labels reach swatches, purchase options and editor without changing variant identity`,async()=>{
    const api=fixture();const before=JSON.stringify(variants);
    const localized=await api.localizeProductColors(variants,'stricker',locale);
    for(let i=0;i<variants.length;i++) {
      assert.equal(localized[i].color_label,names[locale][i]);
      assert.equal(purchase.getColorLabel(localized[i]),names[locale][i]);
      const label=names[locale][i]+(variants[i].size?' · '+variants[i].size:'');
      assert.equal(purchase.getVariantLabel(localized[i]),label);
      assert.equal(editor.getColorLabel(localized[i]),label);
      assert.equal(purchase.getColorKey(localized[i]),purchase.getColorKey(variants[i]));
      for(const key of Object.keys(variants[i])) assert.equal(localized[i][key],variants[i][key]);
    }
    assert.equal(JSON.stringify(variants),before);
    if(locale==='pt') assert.equal(api.reads.length,0);
    else assert.equal(api.reads[0].supplier_id,'stricker');
  });
}

test('missing/retired codes use supplier name matches or documented fallbacks; suppliers remain isolated',async()=>{
  const api=fixture();
  const inputs=[{color_name:'  PRETO  ',color_code:null},{color_name:'Amarelo Néon',color_code:'318'},
    {color_name:'Verde Nato',color_code:'379'},{color_name:'Custom colour',color_code:'unknown'}];
  const localized=await api.localizeProductColors(inputs,'stricker','de');
  assert.deepEqual(Array.from(localized,v=>v.color_label),['Schwarz','Neongelb','NATO-Grün / Neonpink','Custom colour']);
  assert.equal((await api.localizeProductColors([variants[0]],'another-supplier','de'))[0].color_label,'Preto');
  assert.equal((await api.localizeProductColors([variants[0]],null,'de'))[0].color_label,'Preto');
  await assert.rejects(fixture({fail:true}).localizeProductColors(variants,'stricker','de'),/Color read failed/);
});

test('Smart Merch resolves translated colors by variant ID while retaining price, quantity and ranking',async()=>{
  const colors=fixture();
  const presentation=load('src/lib/i18n/product-presentation.ts',{
    '@/lib/i18n/catalog':{getLocalizedProductTexts:async()=>new Map()},'@/lib/i18n/colors':colors,
  });
  const item={id:'product',variantId:'black',variantColor:'Preto',name:'Venture',quantity:25,unitPrice:0.96,matchScore:94,reasons:[]};
  for(const locale of ['en','fr','es','de','it']) {
    const result=await presentation.localizeSmartMerchResponse({results:[item],deadlineNotice:null},locale);
    assert.equal(result.results[0].variantColor,names[locale][0]);
    for(const key of ['id','variantId','quantity','unitPrice','matchScore']) assert.equal(result.results[0][key],item[key]);
  }
  assert.equal(item.variantColor,'Preto');
});

test('daily color refresh covers all storefront languages sequentially under the existing lock',async()=>{
  const events=[];let active=0;
  const sync=load('src/lib/stricker/automatic-sync.ts',{
    'node:crypto':{randomUUID:()=> 'test-owner'},'@/lib/i18n/config':config,
    '@/lib/supabase/admin':{createSupabaseAdminClient:()=>({rpc:async(name)=>{events.push(name);return {data:true,error:null};}})},
    '@/lib/stricker/rest/sync-catalog-datasets':{syncRestCatalogDataset:async({dataset,lang})=>{
      assert.equal(active++,0);assert.equal(dataset,'colors');events.push(lang);await Promise.resolve();active--;return {lang};
    }},
  });
  await sync.runStrickerAutomaticSync('colors');
  assert.deepEqual(events,['try_acquire_integration_sync_lock','PT','EN','FR','ES','DE','IT','release_integration_sync_lock']);
});

test('a missing or wrong-language supplier color response fails without modifying color dictionaries',async()=>{
  for(const payload of [{Language:'PT',Colors:[{ColorCode:'103',Description:'Preto'}]},{Language:'DE',Colors:[]}]) {
    const writes=[];
    const query={insert:value=>{writes.push(value);return query;},select:()=>query,single:async()=>({data:{id:'import'},error:null}),
      update:value=>{writes.push(value);return query;},eq:()=>query,then:resolve=>Promise.resolve({error:null}).then(resolve)};
    const sync=load('src/lib/stricker/rest/sync-catalog-datasets.ts',{
      '@/lib/supabase/admin':{createSupabaseAdminClient:()=>({from:table=>{assert.equal(table,'supplier_dataset_imports');return query;}})},
      '@/lib/stricker/auth':{getStrickerSupplierId:async()=> 'stricker'},
      '@/lib/stricker/rest/session':{getValidStrickerSessionToken:async()=> 'test-session'},
      '@/lib/stricker/rest/client':{fetchStrickerDataset:async()=>payload},
      '@/lib/stricker/sync-control':{assertSyncNotCancelled:async()=>{}},
    });
    await assert.rejects(sync.syncRestCatalogDataset({dataset:'colors',lang:'DE'}),/dicionário de cores válido/);
    assert.equal(writes.at(-1).status,'failed');
  }
});
