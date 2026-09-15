import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(file, imports={}) {
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,console:{warn(){}},require:name=>{if(!(name in imports))throw Error(name);return imports[name];}});return exports;
}
const preview=load('src/lib/orders/artwork-preview.ts');
const {hydrateOrderArtworkGeometry:hydrate}=load('src/lib/orders/artwork-geometry.ts',{'server-only':{},'@/lib/orders/artwork-preview':preview});
const item={customization_location_id:'location',service_code:'service',personalization_data:{textLayer:{content:'Keep this'}}};
const raw={HotSpot1Left:10,HotSpot1Top:20,HotSpot1Width:40,HotSpot1Height:60};
function client(results,filters=[]) { return {from(table){const q={select(){return q;},in(key,values){filters.push([table,key,values]);return q;},then(resolve,reject){return (results[table] instanceof Error ? Promise.reject(results[table]) : Promise.resolve(results[table])).then(resolve,reject);}};return q;}}; }
for(const failure of [{data:null,error:{code:'57014'}},new Error('network')]) {
 test(`optional options failure preserves location geometry (${failure instanceof Error?'network':'database'})`,async()=>{
  const result=await hydrate(client({product_customization_options:failure,product_customization_locations:{data:[{id:'location',raw_payload:raw}],error:null}}),[item]);
  assert.equal(result[0].personalization_data.printAreaGeometry.left,10);assert.equal(result[0].personalization_data.textLayer.content,'Keep this');
 });
 test(`both lookups failing preserve original item (${failure instanceof Error?'network':'database'})`,async()=>{
  const result=await hydrate(client({product_customization_options:failure,product_customization_locations:failure}),[item]);assert.equal(result[0],item);
 });
}
test('option lookup uses indexed service filter and only exact geometry',async()=>{
 const filters=[];
 const result=await hydrate(client({product_customization_options:{data:[{location_id:'location',service_code:'other',raw_payload:{...raw,HotSpot1Left:99}},{location_id:'location',service_code:'service',raw_payload:raw}],error:null},product_customization_locations:{data:null,error:{code:'57014'}}},filters),[item]);
 assert.equal(result[0].personalization_data.printAreaGeometry.left,10);assert.ok(filters.some(([table,key,values])=>table==='product_customization_options'&&key==='service_code'&&values[0]==='service'));
});
test('without a service code only location data is queried',async()=>{
 const filters=[];await hydrate(client({product_customization_locations:{data:[],error:null}},filters),[{...item,service_code:null}]);assert.equal(filters.length,1);assert.equal(filters[0][0],'product_customization_locations');
});
test('saved geometry never depends on live catalogue availability',async()=>{
 const saved={...item,personalization_data:{printAreaGeometry:{left:1,top:2,width:3,height:4}}};const result=await hydrate({from(){throw Error('must not query');}},[saved]);assert.equal(result[0],saved);
});
