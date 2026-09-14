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
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, { exports, URL, console, process: {env:{NEXT_PUBLIC_SITE_URL:'https://shop.example.test'}},
    require: name => { if (name === "@/lib/auth/commercial-access") return load("src/lib/auth/commercial-access.ts");
    if (!(name in imports)) throw new Error(`Unexpected import: ${name}`); return imports[name]; } });
  return exports;
}
const config = load('src/lib/i18n/config.ts');
const authCopy = load('src/lib/i18n/account.ts');
const artwork = load('src/lib/orders/artwork-preview.ts');
const routes = load('src/lib/auth/return-path.ts');

for (const locale of Object.keys(config.SITE_LOCALES)) {
  test(`registration saves explicit ${locale} preference and retains the checkout draft`, async () => {
    let signup; const welcomed = [];
    const auth = load('src/lib/auth/actions.ts', {
      'next/navigation': {redirect: url => {throw new Error(`REDIRECT:${url}`);}},
      '@/lib/supabase/server': {createSupabaseServerClient: async () => ({auth:{signUp:async value => {signup=value; return {data:{user:{id:'user',email:'user@example.test'},session:{}},error:null};}}})},
      '@/lib/i18n/account':authCopy, '@/lib/i18n/config':config,
      '@/lib/notifications/customer-email':{notifyAccountWelcome:async payload=>welcomed.push(payload)},
      '@/lib/auth/return-path':routes, '@/lib/cart/claim-guest':{claimGuestShopping:async()=>{}},
    });
    const form = new FormData();
    for (const [key,value] of Object.entries({fullName:'Client',email:'user@example.test',password:'Example123',confirmPassword:'Example123',locale:'pt',preferredLocale:locale,next:'/fr/checkout?draft=kept&quantidade=20'})) form.set(key,value);
    await assert.rejects(auth.registerAction({},form), /REDIRECT:/);
    assert.equal(signup.options.data.preferred_locale,locale); assert.equal(signup.options.data.locale,locale);
    assert.equal(welcomed[0].locale,locale);
    assert.equal(new URL(signup.options.emailRedirectTo).searchParams.get('next'),config.localizePath('/checkout?draft=kept&quantidade=20',locale));
  });
}

test('registration presents six languages as a preference without navigating away or resetting form fields', () => {
  const form=load('src/components/auth/RegisterForm.tsx',{
    'react/jsx-runtime':jsx, react:React, 'next/link':({children,...props})=>React.createElement('a',props,children),
    '@/lib/auth/actions':{registerAction:async()=>({success:false,message:''})}, '@/lib/i18n/config':config,
    '@/lib/i18n/account':authCopy,'@/lib/i18n/language-preference':load('src/lib/i18n/language-preference.ts'),
  });
  const html=renderToStaticMarkup(React.createElement(form.default,{locale:'fr',nextPath:'/fr/checkout?draft=kept'}));
  assert.match(html,/name="preferredLocale"/); assert.match(html,/value="fr" selected=""/);
  for(const language of Object.values(config.SITE_LOCALES)) assert.ok(html.includes(language.label));
  assert.match(html,/name="next" value="\/fr\/checkout\?draft=kept"/);
});
function adminHarness({denied=false, conflict=false, payment='paid', route='internal_360'}={}) {
  const tables={orders:[{id:'order',order_number:'TEST',status:'processing',payment_status:payment,fulfillment_status:'unfulfilled',metadata:{},updated_at:'2026-09-01T00:00:00Z',order_items:[{fulfillment_route:route}]}],
    order_status_history:[],fulfillment_groups:[{id:'manual',order_id:'order',route:'internal_360',status:'notified'},{id:'supplier',order_id:'order',route:'supplier_api',status:'submitted'}]};
  const emails=[],invalidations=[]; let access=false;
  const admin={from:table=>{
    assert.equal(access,true,'admin authorization must precede privileged reads');
    assert.ok(table in tables,`Unexpected supplier/payment operation ${table}`);
    let mutation,filters=[],single=false,executed;
    const q={select:()=>q,eq:(key,value)=>{filters.push(row=>row[key]===value);return q;},is:()=>q,
      update:values=>{mutation={update:values};return q;},insert:values=>{mutation={insert:values};return q;},
      maybeSingle:()=>{single=true;return q;},
      then:resolve=>{
        if(!executed){let rows=tables[table].filter(row=>filters.every(f=>f(row)));
          if(mutation?.insert){tables[table].push(mutation.insert);rows=[mutation.insert];}
          if(mutation?.update){if(conflict&&table==='orders')rows=[];rows.forEach(row=>Object.assign(row,mutation.update));}
          executed={data:JSON.parse(JSON.stringify(single?rows[0]??null:rows)),error:null};}
        return Promise.resolve(executed).then(resolve);
      }};return q;
  }};
  const actions=load('src/lib/admin/orders/actions.ts',{
    'next/cache':{revalidatePath:path=>invalidations.push(path)},'@/lib/i18n/config':config,
    '@/lib/supabase/admin':{createSupabaseAdminClient:()=>admin},
    '@/lib/auth/assert-admin':{assertAdminAccess:async()=>{if(denied)throw Error('FORBIDDEN');access=true;return {userId:'admin'};}},
    '@/lib/notifications/customer-email':{notifyOrderStatusChanged:async event=>emails.push({type:'status',...event}),notifyOrderTrackingAvailable:async id=>emails.push({type:'tracking',id})},
  });
  return {actions,tables,emails,invalidations};
}
function stateForm(status,fulfillment='unfulfilled') {const f=new FormData();f.set('orderId','order');f.set('status',status);f.set('fulfillmentStatus',fulfillment);return f;}
test('admin changes a manual order, its internal group, history and customer email; supplier processing is untouched',async()=>{
  const h=adminHarness();
  const result=await h.actions.updateOrderStatusAction({},stateForm('shipped'));
  assert.equal(result.success,true,result.message);
  assert.equal(h.tables.orders[0].fulfillment_status,'shipped');assert.equal(h.tables.fulfillment_groups[0].status,'shipped');
  assert.equal(h.tables.fulfillment_groups[1].status,'submitted');assert.equal(h.tables.order_status_history.length,1);
  assert.equal(h.emails[0].newStatus,'shipped');assert.ok(h.emails[0].eventId);
  for(const locale of Object.keys(config.SITE_LOCALES))assert.ok(h.invalidations.includes(config.localizePath('/area-cliente/encomendas/order',locale)));
  await h.actions.updateOrderStatusAction({},stateForm('shipped','shipped'));
  assert.equal(h.emails.length,1);assert.equal(h.tables.order_status_history.length,1);
  await h.actions.updateOrderStatusAction({},stateForm('delivered'));
  assert.equal(h.emails.length,2);assert.equal(h.tables.fulfillment_groups[0].status,'delivered');
});
test('unauthorized, conflicting and invalid supplier states cannot mutate a manual order or send email',async()=>{
  for(const options of [{denied:true},{conflict:true},{}]){
    const h=adminHarness(options);const status=Object.keys(options).length?'shipped':'sent_to_supplier';
    const result=await h.actions.updateOrderStatusAction({},stateForm(status));assert.equal(result.success,false);assert.equal(h.emails.length,0);
    assert.equal(h.tables.orders[0].status,'processing');
  }
});
test('marking a manual order as shipped with existing tracking still sends the state update',async()=>{
  const h=adminHarness();Object.assign(h.tables.orders[0],{tracking_number:'KNOWN',tracking_url:null,shipping_carrier:'Carrier'});
  const f=new FormData();for(const[k,v]of Object.entries({orderId:'order',trackingNumber:'KNOWN',shippingCarrier:'Carrier',markAsShipped:'true'}))f.set(k,v);
  assert.equal((await h.actions.updateOrderTrackingAction({},f)).success,true);
  assert.equal(h.emails[0].type,'status');assert.equal(h.emails[0].newStatus,'shipped');
});
test('composed artwork is displayed once; legacy position, rotation and text remain exact',()=>{
  const item={technical_preview_url:'https://cdn.example.test/product.png',printing_width_mm:'100',printing_height_mm:'180',logo_position_x:'-40',logo_position_y:'39.498433',logo_scale:'188',logo_rotation:'90',logo_width_mm:100,logo_height_mm:20,
    personalization_data:{hasComposedArtwork:true,textLayer:{content:'Already included'}}};
  const composed=artwork.buildOrderArtworkPreview(item,{logoUrl:'/private-artwork',mockupUrl:null});
  assert.deepEqual(JSON.parse(JSON.stringify(composed.artworkPosition)),{x:0,y:0,width:100,rotation:0});
  assert.equal(composed.textArtwork,null);assert.equal(composed.artworkAspectRatio,100/180);
  const legacy=artwork.buildOrderArtworkPreview({...item,personalization_data:{textLayer:{content:'Client text',rotation:35}}},{logoUrl:'/private-artwork',mockupUrl:null});
  assert.equal(legacy.artworkPosition.x,-40);assert.equal(legacy.artworkPosition.width,188);assert.equal(legacy.artworkPosition.rotation,90);
  assert.equal(legacy.textArtwork.content,'Client text');assert.equal(legacy.textArtwork.rotation,35);
  assert.equal(artwork.hasOrderArtworkPreview(artwork.buildOrderArtworkPreview(item,{logoUrl:null,mockupUrl:null})),false,'a bare product image is not a mockup');
  assert.equal(artwork.hasOrderArtworkPreview(artwork.buildOrderArtworkPreview({...item,personalization_data:{textLayer:{content:'Text only'}}},{logoUrl:null,mockupUrl:null})),true);
});
test('original printing geometry is recovered by exact location and service; saved geometry wins',async()=>{
  const rows={product_customization_options:[{location_id:'location',service_code:'exact',raw_payload:{HotSpot1Left:100,HotSpot1Top:160,HotSpot1Width:80,HotSpot1Height:120}},{location_id:'location',service_code:'other',raw_payload:{HotSpot1Left:5,HotSpot1Top:5,HotSpot1Width:10,HotSpot1Height:10}}],product_customization_locations:[]};
  const admin={from:name=>{const q={select:()=>q,in:()=>q,then:resolve=>Promise.resolve({data:rows[name],error:null}).then(resolve)};return q;}};
  const geometry=load('src/lib/orders/artwork-geometry.ts',{'server-only':{},'@/lib/orders/artwork-preview':artwork});
  const item={customization_location_id:'location',service_code:'exact',personalization_data:{}};
  const [result]=await geometry.hydrateOrderArtworkGeometry(admin,[item]);assert.equal(result.personalization_data.printAreaGeometry.left,100);
  const saved={...item,personalization_data:{printAreaGeometry:{left:2,top:2,width:10,height:10}}};
  const [unchanged]=await geometry.hydrateOrderArtworkGeometry({from:()=>{throw Error('Unexpected lookup');}},[saved]);assert.equal(unchanged,saved);
});
test('the legacy mockup document link opens the protected composition, never the blank product image',async()=>{
  const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:{technical_preview_url:'https://supplier.example.test/blank.png'},error:null})};
  const route=load('src/app/area-cliente/encomendas/[id]/documento/route.ts',{
    'next/server':{NextResponse:{redirect:url=>({url:String(url),headers:new Headers()})}},'next/navigation':{notFound:()=>{throw Error('NOT_FOUND');}},
    '@/lib/i18n/config':config,'@/lib/customer/order-details':{ownedCustomerOrder:async()=>({order:{id:'order'},admin:{from:()=>q}}),safeDocumentUrl:value=>value??null},
  });
  const item='22222222-2222-2222-2222-222222222222';
  const response=await route.GET({url:'https://shop.example.test/de/area-cliente/encomendas/order/documento',nextUrl:new URL(`https://shop.example.test/?tipo=mockup&artigo=${item}`),headers:new Headers({'x-site-locale':'de'})},{params:Promise.resolve({id:'order'})});
  assert.equal(response.url,`https://shop.example.test/de/area-cliente/encomendas/order/mockup/${item}`);assert.equal(response.headers.get('Cache-Control'),'private, no-store');
});

test('supplier status changes and tracking trigger customer mail; unchanged polling does not',async()=>{
  const order={id:'supplier-order',order_number:'SUPPLIER-TEST',supplier_order_stamp:'stamp',supplier_last_status:'PROCESSING',status:'sent_to_supplier'};
  let nextStatus='PRODUCTION',nextTracking=null;const mail=[];
  const admin={from:()=>{
    let update;const q={select:()=>q,not:()=>q,is:()=>q,or:()=>q,order:()=>q,limit:()=>q,eq:()=>q,returns:()=>q,
      update:value=>{update=value;return q;},then:resolve=>{const data=[JSON.parse(JSON.stringify(order))];if(update)Object.assign(order,update);return Promise.resolve({data,error:null}).then(resolve);}};return q;
  }};
  const sync=load('src/lib/stricker/orders/sync-order-status.ts',{
    '@/lib/supabase/admin':{createSupabaseAdminClient:()=>admin},
    '@/lib/notifications/supplier-order-status-changed':{notifySupplierOrderStatusChanged:async()=>{}},
    '@/lib/notifications/customer-email':{notifyOrderStatusChanged:async event=>mail.push({type:'status',...event}),notifyOrderTrackingAvailable:async()=>mail.push({type:'tracking'})},
    '@/lib/stricker/orders/client':{getStrickerOrderDetails:async()=>({orderDetails:{},response:{}}),extractStrickerOrderStatus:()=>nextStatus,extractStrickerShippingDate:()=>null,extractStrickerTrackingNumber:()=>nextTracking,extractStrickerTrackingUrl:()=>null},
  });
  assert.equal((await sync.syncSubmittedStrickerOrders()).updated,1);assert.equal(mail[0].newStatus,'PRODUCTION');assert.ok(mail[0].eventId);
  await sync.syncSubmittedStrickerOrders();assert.equal(mail.length,1);
  nextStatus='SHIPPED';nextTracking='TRACK-NEW';await sync.syncSubmittedStrickerOrders();
  assert.equal(mail[1].type,'tracking');assert.equal(order.status,'shipped');
});
