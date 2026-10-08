import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, imports = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, URL, AbortSignal, ...globals, require: name => {
    if (!(name in imports)) throw Error(`Unexpected import: ${name}`); return imports[name];
  }});
  return exports;
}
const shared = load('src/lib/orders/mockup.ts');
const link = 'https://online-mockup.com/pt/11111111-1111-4111-8111-111111111111/';
const entry = { Link: link, LinkPDF: 'https://online-mockup.com/actions/download.php?lang=pt&h=private',
  OrderNumber: 'CCO-26/TEST', InternalReference: 'LC-TEST', Version: 1, CreateDate: '2026-10-07T17:47:29' };
const snapshot = entries => ({ ApprovalMockups: entries, Count: entries.length, ErrorCode: null, ErrorMessage: null });
function harness(payload = snapshot([entry]), options = {}) {
  const calls = [], writes = [];
  const api = load('src/lib/stricker/orders/mockups.ts', {
    'server-only': {}, '@/lib/orders/mockup': shared,
    '@/lib/stricker/auth': { getValidStrickerSessionToken: async () => 'unit-test-private-token' },
    '@/lib/stricker/config': { getStrickerConfig: () => ({ apiBaseUrl: 'https://supplier.example.test/api' }) },
    '@/lib/supabase/admin': { createSupabaseAdminClient: () => ({ rpc: async (name, args) => {
      writes.push({name, args}); return {data:{matched:1,queued:1},error:options.databaseFailure ? {} : null};
    }}) },
  }, { fetch: async (url, init) => { calls.push({url, init});
    if(options.networkFailure) throw Error('private URL and token must never escape');
    return {ok: !options.httpFailure, json:async()=>payload};
  }});
  return { api, calls, writes };
}
test('only the neutral HTTPS approval portal is allowed', () => {
  assert.equal(shared.safeMockupUrl(link),link);
  for (const value of [null,'javascript:alert(1)',link.replace('https:','http:'),link.replace('online-mockup.com','online-mockup.com.evil.test'),
    link.replace('online-mockup.com','user:password@online-mockup.com'),link.replace('.com/','.com:444/'),link+'?redirect=evil',link+'#data',entry.LinkPDF]) {
    assert.equal(shared.safeMockupUrl(value),null,value);
  }
});
test('real response shape maps exact internal reference and highest version without provider writes', async () => {
  const h = harness(snapshot([entry,{...entry,Version:2}]));
  await h.api.syncStrickerMockups();
  assert.equal(h.calls.length,1);assert.equal(h.calls[0].url.pathname,'/api/ApprovalMockups');
  assert.equal(h.calls[0].init.method,'GET');assert.equal(h.calls[0].init.cache,'no-store');
  assert.equal(h.writes.length,1);assert.equal(h.writes[0].name,'reconcile_order_mockups');
  const proof=h.writes[0].args.p_mockups[0];
  assert.equal(proof.internal_reference,'LC-TEST');assert.equal(proof.version,2);assert.equal(proof.approval_url,link);
  assert.equal(h.writes[0].args.p_mockups.length,1);
});
test('partial, malformed, conflicting and failed snapshots never mutate proofs', async () => {
  for (const value of [null,{}, {...snapshot([entry]),Count:2},{...snapshot([entry]),ErrorCode:80},
    snapshot([{...entry,Link:'https://stricker-europe.com/proof'}]),snapshot([{...entry,Version:0}]),
    snapshot([{...entry,CreateDate:'invalid'}]),snapshot([entry,{...entry,InternalReference:'OTHER'}])]) {
    const h=harness(value);await assert.rejects(h.api.syncStrickerMockups(),/preservado/);assert.equal(h.writes.length,0);
  }
  for(const option of ['networkFailure','httpFailure']) {
    const h=harness(undefined,{[option]:true});await assert.rejects(h.api.syncStrickerMockups(), error=>/preservado/.test(error.message)&&!/token|private URL/.test(error.message));assert.equal(h.writes.length,0);
  }
});
test('valid empty snapshots reconcile; supplier orders without shop references remain unmatched', async()=>{
  const h=harness(snapshot([]));await h.api.syncStrickerMockups();assert.equal(h.writes[0].args.p_mockups.length,0);
  const parsed=h.api.parseApprovalMockups(snapshot([{...entry,InternalReference:null}]));assert.equal(parsed[0].internal_reference,'');
});
test('pending proof prevents misleading requests for artwork; disappearance never means approved',()=>{
  const {api}=harness();
  assert.equal(api.effectiveMockupOrderStatus('WAITING_ART_WORK','pending'),'PENDING_MOCKUP_APPROVAL');
  assert.equal(api.effectiveMockupOrderStatus('PROCESSING','pending'),'PENDING_MOCKUP_APPROVAL');
  assert.equal(api.effectiveMockupOrderStatus('WAITING_ART_WORK','awaiting_confirmation'),'PROCESSING');
  assert.equal(api.effectiveMockupOrderStatus('PRODUCTION','awaiting_confirmation'),'PRODUCTION');
  for(const terminal of ['SHIPPED','SENT','CANCELED','CANCELLED']) assert.equal(api.effectiveMockupOrderStatus(terminal,'pending'),terminal);
  assert.equal(api.effectiveMockupOrderStatus('WAITING_ART_WORK',undefined),'WAITING_ART_WORK');
});
test('no approval action for cancelled, unpaid, deleted or completed orders',()=>{
  assert.equal(shared.canRequestMockupApproval({status:'sent_to_supplier',payment_status:'paid'}),true);
  for(const status of ['cancelled','refunded','failed','shipped','delivered']) assert.equal(shared.canRequestMockupApproval({status,payment_status:'paid'}),false);
  assert.equal(shared.canRequestMockupApproval({status:'processing',payment_status:'pending'}),false);
  assert.equal(shared.canRequestMockupApproval({status:'processing',payment_status:'paid',deleted_at:'2026-10-08'}),false);
});
