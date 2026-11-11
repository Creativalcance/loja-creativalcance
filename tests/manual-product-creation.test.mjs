import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { z } from 'zod';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import * as photos from '../src/lib/manual-products/photos.ts';

function load(file, imports = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, { exports, FormData, URL, Error, crypto, console,
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co' } },
    require(name) { if (!(name in imports)) throw Error(`Unexpected import ${name}`); return imports[name]; }, ...globals });
  return exports;
}
const validation = load('src/lib/manual-products/validation.ts', { zod: { z } });
const actor = '11111111-1111-4111-8111-111111111111';
const id = '22222222-2222-4222-8222-222222222222';
const archived = { id, name: 'Estrela', deleted_at: '2026-11-11T13:15:56Z', catalog_source: 'manual', fulfillment_route: 'internal_360', supplier_id: null };
function form(extra = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ name: 'Estrela', sku: '360-CABAZ-001', categoryId: id, price: '59,99', stock: '100', minimum: '1', shipping_profile: 'christmas_hamper_2026', delivery_unit_price: '6', weight_kg: '6,57', status: 'draft', ...extra })) data.set(key, value);
  return data;
}
function server({ conflicts = {}, rpcError = null, queryError = null, authorized = true } = {}) {
  const writes = [], reads = [], invalidations = [];
  const db = {
    from(table) {
      assert.equal(table, 'products');
      let filter;
      return { select() { return this; }, limit() { return this; },
        eq(field, value) { filter = field; reads.push({ field, value }); return this; },
        async maybeSingle() { return { data: conflicts[filter] ?? null, error: queryError }; } };
    },
    async rpc(name, args) { writes.push({ name, args }); return { data: rpcError ? null : id, error: rpcError }; },
  };
  const actions = load('src/app/admin/produtos/actions.ts', {
    'next/cache': { revalidatePath: (...args) => invalidations.push(args) },
    'next/navigation': { redirect: url => { throw Object.assign(Error('NEXT_REDIRECT'), { url }); } },
    '@/lib/auth/assert-admin': { assertAdminAccess: async () => { if (!authorized) throw Error('denied'); return { userId: actor }; } },
    '@/lib/supabase/admin': { createSupabaseAdminClient: () => db },
    '@/lib/manual-products/validation': validation,
    '@/lib/manual-products/photos': photos,
  });
  return { ...actions, writes, reads, invalidations };
}

test('preflight identifies the deleted Estrela URL and offers restoration without writes', async () => {
  const h = server({ conflicts: { slug: archived } });
  const result = await h.validateManualProductCreationAction(form());
  assert.equal(result.success, false);
  assert.match(result.message, /eliminados/);
  assert.equal(result.conflicts[0].field, 'slug');
  assert.equal(result.conflicts[0].deleted, true);
  assert.equal(result.conflicts[0].href, `/admin/produtos/${id}`);
  assert.equal(h.writes.length, 0);
});

test('uniqueness races return actionable data rather than throwing a redacted server exception', async () => {
  const h = server({ rpcError: { code: '23505', message: 'private database detail' }, conflicts: { slug: archived } });
  const result = await h.createManualProductAction(form());
  assert.equal(result.success, false);
  assert.equal(result.conflicts[0].name, 'Estrela');
  assert.equal(h.invalidations.length, 0);
  assert.ok(!JSON.stringify(result).includes('private database detail'));
});

test('all expected validation and database failures are serializable results', async () => {
  for (const extra of [{ price: '0' }, { weight_kg: '0' }, { stock: '0' }, { shipping_profile: 'standard', minimum: '1' }, { imageUrl: 'javascript:alert(1)' }]) {
    const h = server();
    const result = await h.createManualProductAction(form(extra));
    assert.equal(result.success, false);
    assert.ok(result.message.length > 0);
    assert.equal(h.writes.length, 0);
    assert.ok(!result.message.includes('"code"'));
  }
  const h = server({ rpcError: { code: 'XX000', message: 'private database detail' } });
  assert.match((await h.createManualProductAction(form())).message, /Não foi possível guardar/);
  const unavailable = server({ queryError: { message: 'private connection detail' } });
  assert.equal((await unavailable.validateManualProductCreationAction(form())).success, false);
  assert.equal(unavailable.writes.length, 0);
});

test('only manual products expose restoration links and every entry point requires admin access', async () => {
  const h = server({ conflicts: { sku: { ...archived, catalog_source: 'supplier_sync', fulfillment_route: 'supplier_api' } } });
  assert.equal((await h.validateManualProductCreationAction(form())).conflicts[0].href, null);
  for (const method of ['validateManualProductCreationAction', 'createManualProductAction']) {
    const denied = server({ authorized: false });
    await assert.rejects(denied[method](form()), /denied/);
    assert.equal(denied.reads.length, 0);
    assert.equal(denied.writes.length, 0);
  }
});

test('successful creation preserves logistics, photo order and the normal redirect', async () => {
  const h = server();
  const url = `https://example.supabase.co/storage/v1/object/public/product-360-photos/${actor}/${id}.png`;
  assert.equal((await h.validateManualProductCreationAction(form())).success, true);
  await assert.rejects(h.createManualProductAction(form({ imageUrls: JSON.stringify([url]) })), error => error.message === 'NEXT_REDIRECT' && error.url === '/admin/produtos');
  assert.equal(h.writes[0].args.p_product.weight, 6570);
  assert.equal(h.writes[0].args.p_product.min_order_quantity, 1);
  assert.equal(h.writes[0].args.p_product.delivery_unit_price, 6);
  assert.equal(h.writes[0].args.p_image_urls[0], url);
  assert.ok(h.invalidations.some(([path, scope]) => path === '/' && scope === 'layout'));
});

// Exercise actual component handlers with stable hooks, including retry state.
function client(actions) {
  const slots = [];
  let cursor = 0, pending;
  const hooks = { ...React,
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useEffect() {},
    useTransition() { return [false, callback => { pending = callback(); }]; },
  };
  class BrowserFormData extends FormData {
    constructor(source) { super(); if (source) for (const [key, value] of source.entries()) this.append(key, value); }
  }
  class PreviewURL extends URL { static createObjectURL() { return 'blob:photo-preview'; } static revokeObjectURL() {} }
  const Component = load('src/app/admin/produtos/novo/ProductCreationForm.tsx', {
    react: hooks, 'react/jsx-runtime': jsx,
    'next/image': ({ unoptimized, ...props }) => React.createElement('img', props),
    '../actions': actions, '../photo-actions': actions,
    '@/lib/manual-products/photos': photos,
  }, { FormData: BrowserFormData, URL: PreviewURL }).default;
  const render = () => { cursor = 0; return Component({ children: React.createElement('input', { name: 'name', defaultValue: 'Estrela' }) }); };
  function find(tree, predicate) {
    if (!tree || typeof tree !== 'object') return null;
    if (predicate(tree)) return tree;
    for (const child of React.Children.toArray(tree.props?.children)) { const result = find(child, predicate); if (result) return result; }
    return null;
  }
  const addPhoto = () => find(render(), e => e.props?.type === 'file').props.onChange({ target: { files: [new File(['photo'], 'estrela.png', { type: 'image/png' })], value: '' } });
  const submit = async () => { render().props.onSubmit({ preventDefault() {}, currentTarget: form() }); await pending; };
  return { render, addPhoto, submit };
}

test('client keeps fields and photos on conflict, opens restoration in a new tab and avoids upload', async () => {
  let uploads = 0, writes = 0;
  const h = client({
    validateManualProductCreationAction: () => server({ conflicts: { slug: archived } }).validateManualProductCreationAction(form()),
    uploadManualProductPhoto: async () => { uploads++; },
    createManualProductAction: async () => { writes++; },
  });
  h.addPhoto(); await h.submit();
  const html = renderToStaticMarkup(h.render());
  assert.equal(uploads, 0); assert.equal(writes, 0);
  assert.match(html, /estrela.png/);
  assert.match(html, /value="Estrela"/);
  assert.match(html, /URL amigável: Estrela.*eliminado/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /Abrir produto para restaurar/);
});

test('retry reuses successful uploads and unexpected client failures never expose React errors', async () => {
  let uploads = 0, attempts = 0;
  const h = client({
    validateManualProductCreationAction: async () => ({ success: true }),
    uploadManualProductPhoto: async () => { uploads++; return { url: 'https://example.invalid/photo.png' }; },
    createManualProductAction: async () => {
      attempts++;
      if (attempts === 1) return { success: false, message: 'Já existe um produto com este URL.' };
      throw Error('Minified React error #441');
    },
  });
  h.addPhoto(); await h.submit(); await h.submit();
  assert.equal(uploads, 1); assert.equal(attempts, 2);
  const html = renderToStaticMarkup(h.render());
  assert.match(html, /estrela.png/);
  assert.match(html, /Os dados e as fotografias mantêm-se/);
  assert.ok(!html.includes('React error'));
});
