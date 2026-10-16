import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { z } from 'zod';
function load(file, imports) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, require: name => { assert.ok(name in imports, name); return imports[name]; } });
  return exports;
}
const validation = load('src/lib/catalog-identity/validation.ts', { zod: { z } });
const id = '11111111-1111-4111-8111-111111111111';
function form(status = 'draft') {
  const data = new FormData(); data.set('productId', id); data.set('version', '1'); data.set('reviewStatus', status);
  for (const locale of validation.identityLocales) { data.set(`${locale}.name`, `Name ${locale}`); data.set(`${locale}.description`, 'Verified description'); }
  return data;
}
function harness({ authorized = true, conflict = false, failure = false } = {}) {
  const writes = [], calls = [];
  const admin = { from(table) {
    assert.ok(['products','product_commercial_identities'].includes(table));
    const q = { select: () => q, not: () => q, is: () => q,
      eq: (key, value) => { calls.push({ table, key, value }); return q; },
      update: data => { writes.push({ table, data }); return q; },
      maybeSingle: async () => ({ data: table === 'products' ? { id } : conflict ? null : { product_id: id }, error: failure ? { message: 'private database message' } : null }),
    }; return q;
  } };
  return { writes, calls, action: load('src/app/admin/identidade-360/actions.ts', {
    '@/lib/auth/assert-admin': { assertAdminAccess: async () => { if (!authorized) throw Error('unauthorized'); return { userId: id }; } },
    '@/lib/supabase/admin': { createSupabaseAdminClient: () => { calls.push('admin'); return admin; } },
    'next/cache': { revalidatePath: value => calls.push(value) },
    '@/lib/catalog-identity/validation': validation,
  }).saveCommercialIdentity };
}
test('reviewed identities require six names; drafts allow unfinished names', () => {
  const data = form('ready'); assert.ok(validation.readIdentityForm(data).success);
  data.set('de.name',''); assert.equal(validation.readIdentityForm(data).success, false);
  data.set('reviewStatus','draft'); assert.ok(validation.readIdentityForm(data).success);
});
test('rejects HTML, oversized text, invalid IDs, and unsupported publication requests', () => {
  for (const [key, value] of [['pt.name','<script>'],['en.name','x'.repeat(181)],['productId','not-an-id'],['version','0'],['reviewStatus','published']]) {
    const data = form(); data.set(key,value); assert.equal(validation.readIdentityForm(data).success, false);
  }
});
test('unauthorized request cannot access the database', async () => {
  const h = harness({ authorized: false }); await assert.rejects(h.action({},form())); assert.equal(h.calls.length,0); assert.equal(h.writes.length,0);
});
test('only commercial text is saved, never product, SKU, pricing, payment or supplier data', async () => {
  const h = harness(); const data = form(); data.set('public_reference','93669'); data.set('supplier_sku','altered');
  assert.equal((await h.action({},data)).saved,true); assert.equal(h.writes.length,1);
  assert.equal(h.writes[0].table,'product_commercial_identities');
  assert.deepEqual(Object.keys(h.writes[0].data).sort(),['review_status','translations','updated_by']);
  assert.ok(h.calls.some(c => c.key === 'version' && c.value === 1));
});
test('stale editor cannot silently overwrite another administrator', async () => {
  const h = harness({ conflict: true }); const result = await h.action({},form()); assert.match(result.error,/outro separador/); assert.equal(result.saved,undefined);
});
test('database errors remain user-safe and invalid forms cause no writes', async () => {
  const h = harness({ failure: true }); assert.ok((await h.action({},form())).error); assert.equal(h.writes.length,0);
  const invalid = harness(); const data = form(); data.set('productId','bad'); assert.ok((await invalid.action({},data)).error); assert.equal(invalid.calls.length,0);
});
