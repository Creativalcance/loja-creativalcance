import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
function load(path, imports, globals={}) {
  const exports={};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},
  }).outputText,{exports,console,...globals,require:name=>{if(!(name in imports))throw Error(name);return imports[name];}});
  return exports;
}
const config=load('src/lib/i18n/config.ts',{});
function buttons(node) {
  if(!node||typeof node!=='object')return [];
  const children=Array.isArray(node.props?.children)?node.props.children:[node.props?.children];
  return [...(node.type==='button'?[node]:[]),...children.flat(Infinity).flatMap(buttons)];
}
for(const failure of [false,true])test(`language navigation ${failure?'stays put when saving fails':'saves shopping before changing locale and keeps query/hash'}`,async()=>{
  const events=[];let openState=0;let release;
  const waiting=new Promise((resolve,reject)=>{release=()=>failure?reject(Error('save failed')):resolve();});
  const document={cookie:''};
  const view=load('src/components/layout/LanguageSwitcher.tsx',{
    react:{useEffect(){},useId:()=> 'menu',useRef:()=>({current:null}),useState:initial=>[openState++===0?true:initial,()=>{}],useTransition:()=>[false,fn=>fn()]},
    'react/jsx-runtime':jsx,'next/image':{__esModule:true,default:()=>null},
    'next/navigation':{usePathname:()=>'/produto/estojo',useRouter:()=>({push:url=>events.push(url)})},
    'lucide-react':{Check:()=>null,ChevronDown:()=>null,LoaderCircle:()=>null},
    '@/lib/i18n/config':config,
    '@/lib/cart/login-snapshot':{preserveShoppingBeforeNavigation:()=>{events.push('save');return waiting;}},
  },{document,window:{location:{search:'?cor=azul&quantidade=100',hash:'#personalizar'}}}).default({locale:'pt',label:'Idioma'});
  const english=buttons(view).find(button=>button.props.role==='menuitemradio'&&button.props.children[1].props.lang==='en-GB');
  english.props.onClick();assert.deepEqual(events,['save']);assert.equal(document.cookie,'');
  release();await new Promise(resolve=>setImmediate(resolve));
  if(failure){assert.deepEqual(events,['save']);assert.equal(document.cookie,'');}
  else {assert.deepEqual(events,['save','/en/produto/estojo?cor=azul&quantidade=100#personalizar']);assert.match(document.cookie,/site-locale=en;/);}
});
test('only configured public supplier images use the image optimizer',()=>{
  const {canOptimizeCatalogImage}=load('src/lib/catalog/image-optimization.ts',{}, {URL});
  assert.equal(canOptimizeCatalogImage('https://cdn.hideacontent.com/public/products/1000x1000/11196.jpg'),true);
  for(const source of ['blob:local-artwork','data:image/png;base64,AAA','https://storage.example/private/logo.png','https://cdn.hideacontent.com/private/logo.png','https://cdn.hideacontent.com.evil.test/public/products/logo.jpg'])assert.equal(canOptimizeCatalogImage(source),false);
});
