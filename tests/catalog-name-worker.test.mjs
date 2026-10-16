import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { timingSafeEqual } from 'node:crypto';
function harness({ secret = 'fixture-secret', failure = false } = {}) {
  const calls = [], exports = {};
  const imports = {
    'node:crypto': { timingSafeEqual },
    'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status ?? 200 }) } },
    '@/lib/supabase/admin': { createSupabaseAdminClient: () => ({ rpc: async (name, args) => {
      calls.push({ name, args }); return { data: { generated: 5 }, error: failure ? {} : null };
    } }) },
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/api/cron/catalog-names/route.ts','utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, Buffer, process: { env: { CRON_SECRET: secret } }, require: name => {
    assert.ok(name in imports, name); return imports[name];
  } });
  return { calls, run: token => exports.GET({ headers: new Headers(token ? { authorization: token } : {}) }) };
}
test('missing or invalid authorization never invokes naming or any other job', async () => {
  const h = harness(); for (const token of [null,'wrong','Bearer wrong']) assert.equal((await h.run(token)).status,401);
  assert.equal(h.calls.length,0); assert.equal((await harness({ secret: '' }).run('Bearer ')).status,401);
});
test('authorized naming invokes only the bounded independent RPC', async () => {
  const h = harness(); assert.equal((await h.run('Bearer fixture-secret')).status,200);
  assert.equal(h.calls.length,1); assert.equal(h.calls[0].name,'generate_commercial_name_drafts'); assert.equal(h.calls[0].args.p_limit,100);
});
test('worker failure is reported without invoking supplier or email operations', async () => {
  const h = harness({ failure:true }); const result = await h.run('Bearer fixture-secret'); assert.equal(result.status,500); assert.equal(h.calls.length,1);
});
