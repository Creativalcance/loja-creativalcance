import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { z } from "zod";
import React from "react";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
function load(file, imports = {}) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText,
    {
      exports,
      URL,
      URLSearchParams,
      FormData,
      Intl,
      Date,
      console,
      require: (name) => {
        if (!(name in imports)) throw Error(`Unexpected import ${name}`);
        return imports[name];
      },
    },
  );
  return exports;
}
const rules = load("src/lib/manual-products/validation.ts", { zod: { z } });
const id = "10000000-0000-4000-8000-000000000001",
  adminId = "10000000-0000-4000-8000-000000000002",
  version = "2026-09-14T10:20:30.123456+00:00";
const fields = {
  name: "Produto manual",
  sku: "MANUAL-360",
  slug: "produto-manual",
  category_id: id,
  price: "3,2500",
  minimum: "10",
  stock: "0",
  status: "active",
  featured: "on",
  image_url: "https://example.invalid/product.png",
  description: "Descrição",
  short_description: "Resumo",
  brand: "360",
  material: "Algodão",
  lead_time_days: "",
  seo_title: "Título",
  seo_description: "Resumo SEO",
};
function form(operation, extra = {}) {
  const f = new FormData();
  for (const [k, v] of Object.entries({
    productId: id,
    expectedVersion: version,
    operation,
    ...extra,
  }))
    f.set(k, v);
  return f;
}
function harness({ authorized = true, error = null } = {}) {
  const calls = [],
    paths = [];
  let checks = 0;
  const actions = load("src/app/admin/produtos/actions.ts", {
    "next/cache": { revalidatePath: (...p) => paths.push(p) },
    "next/navigation": {
      redirect: () => {
        throw Error("redirect");
      },
    },
    "@/lib/auth/assert-admin": {
      assertAdminAccess: async () => {
        checks++;
        if (!authorized) throw Error("denied");
        return { userId: adminId };
      },
    },
    "@/lib/supabase/admin": {
      createSupabaseAdminClient: () => ({
        rpc: async (name, args) => {
          calls.push({ name, args });
          return { data: { id }, error };
        },
      }),
    },
    "@/lib/manual-products/validation": rules,
  });
  return {
    run: (f) =>
      actions.manageManualProductAction({ success: false, message: "" }, f),
    calls,
    paths,
    checks: () => checks,
  };
}
test("manual edits accept decimal commas and zero stock without trusting a supplied admin ID", async () => {
  const h = harness();
  const r = await h.run(form("edit", { ...fields, p_actor: id }));
  assert.equal(r.success, true);
  assert.equal(h.checks(), 1);
  assert.equal(h.calls[0].args.p_actor, adminId);
  assert.equal(h.calls[0].args.p_data.price, 3.25);
  assert.equal(h.calls[0].args.p_data.stock, 0);
  assert.equal(h.calls[0].args.p_data.lead_time_days, null);
  assert.ok(
    h.paths.some(([path, type]) => path === "/" && type === "layout"),
    "All localized public pages must refresh",
  );
});
test("manual writes reject anonymous/customer access before any mutation", async () => {
  const h = harness({ authorized: false });
  await assert.rejects(
    h.run(form("delete", { confirmDelete: "on" })),
    /denied/,
  );
  assert.equal(h.calls.length, 0);
});
test("invalid product data and unconfirmed deletion do not reach the database", async () => {
  for (const bad of [
    { price: "1e5" },
    { price: "0" },
    { minimum: "1" },
    { stock: "-1" },
    { stock: "" },
    { status: "deleted" },
    { image_url: "javascript:alert(1)" },
    { image_url: "https://user:password@example.invalid/image" },
    { slug: "../admin" },
  ]) {
    const h = harness();
    assert.equal(
      (await h.run(form("edit", { ...fields, ...bad }))).success,
      false,
      JSON.stringify(bad),
    );
    assert.equal(h.calls.length, 0);
  }
  for (const f of [
    form("delete"),
    form("status", { status: "unknown" }),
    form("restore", { productId: "invalid" }),
    form("status", { status: "active", expectedVersion: "" }),
  ]) {
    const h = harness();
    assert.equal((await h.run(f)).success, false);
    assert.equal(h.calls.length, 0);
  }
});
test("state, delete and restore actions retain version protection and cannot smuggle edit payloads", async () => {
  for (const operation of ["status", "delete", "restore"]) {
    const h = harness();
    assert.equal(
      (await h.run(form(operation, { ...fields, confirmDelete: "on" })))
        .success,
      true,
    );
    assert.equal(h.calls[0].args.p_expected_updated_at, version);
    assert.equal(h.calls[0].args.p_action, operation);
    assert.deepEqual(
      Object.keys(h.calls[0].args.p_data),
      operation === "status" ? ["status"] : [],
    );
  }
});
test("concurrent changes and duplicate URLs show useful errors without invalidating successful data", async () => {
  for (const [code, message, expected] of [
    [
      "P0001",
      "O produto foi alterado. Atualiza a página antes de guardar.",
      /Atualiza/,
    ],
    ["23505", "database internals", /SKU ou URL/],
    ["42501", "private detail", /Não foi possível/],
  ]) {
    const h = harness({ error: { code, message } });
    const r = await h.run(form("status", { status: "active" }));
    assert.equal(r.success, false);
    assert.match(r.message, expected);
    assert.equal(h.paths.length, 0);
  }
});
const ActionForm = ({ children, submit }) =>
  React.createElement(
    "form",
    null,
    children,
    React.createElement("button", null, submit),
  );
const controls = load("src/components/admin/manual-products/Controls.tsx", {
  "react/jsx-runtime": jsx,
  "next/link": ({ href, children, ...p }) =>
    React.createElement("a", { href, ...p }, children),
  "./ActionForm": ActionForm,
  "@/lib/manual-products/validation": rules,
});
const product = {
  id,
  name: "Manual fixture",
  status: "active",
  updated_at: version,
  deleted_at: null,
};
test("manual controls expose edit, all four states and explicit confirmation; deleted products offer restore", () => {
  const html = renderToStaticMarkup(
    React.createElement(controls.default, { product }),
  );
  assert.ok(html.includes(`/admin/produtos/${id}`));
  for (const state of ["draft", "active", "inactive", "archived"])
    assert.ok(html.includes(`value="${state}"`));
  assert.match(
    html,
    /<input(?=[^>]*name="confirmDelete")(?=[^>]*required)[^>]*>/,
  );
  const deleted = renderToStaticMarkup(
    React.createElement(controls.default, {
      product: { ...product, deleted_at: version },
    }),
  );
  assert.match(deleted, /Restaurar como rascunho/);
  assert.ok(!deleted.includes('value="delete"'));
  assert.ok(!deleted.includes("Editar produto"));
});
test("edit form retains current price, zero stock, image and descriptions", () => {
  const Edit = load("src/components/admin/manual-products/EditForm.tsx", {
    "react/jsx-runtime": jsx,
    "./ActionForm": ActionForm,
    "./Controls": controls,
    "@/lib/manual-products/validation": rules,
  }).default;
  const html = renderToStaticMarkup(
    React.createElement(Edit, {
      product: {
        ...product,
        sku: "SKU-360",
        slug: "manual-product",
        description: "Descrição atual",
        short_description: "Resumo atual",
        brand: "360",
        min_order_quantity: 10,
        is_featured: true,
      },
      categories: [{ id, name: "Categoria atual", is_active: true }],
      categoryId: id,
      price: 3.25,
      stock: 0,
      imageUrl: "https://example.invalid/current.png",
    }),
  );
  for (const text of [
    "SKU-360",
    "manual-product",
    "Descrição atual",
    "Resumo atual",
    "Categoria atual",
    "https://example.invalid/current.png",
    "3.25",
    "Guardar alterações",
  ])
    assert.ok(html.includes(text));
  assert.match(html, /name="stock"[^>]*value="0"/);
  assert.match(html, /name="expectedVersion"/);
});

test("admin listing makes manual actions visible and preserves source/deleted filters across pages", async () => {
  for (const deleted of [false, true]) {
    const queries = [];
    const rows = [
      {
        ...product,
        sku: "MANUAL",
        catalog_source: "manual",
        fulfillment_route: "internal_360",
        is_active: !deleted,
        deleted_at: deleted ? version : null,
      },
      {
        ...product,
        id: adminId,
        name: "Supplier item",
        sku: "SUPPLIER",
        catalog_source: "supplier_sync",
        fulfillment_route: "supplier_api",
        suppliers: { name: "Supplier" },
      },
    ];
    const client = {
      from: () => {
        const filters = [];
        let head = false;
        const query = {};
        for (const method of [
          "select",
          "order",
          "range",
          "or",
          "eq",
          "is",
          "not",
        ])
          query[method] = (...args) => {
            filters.push([method, ...args]);
            if (method === "select") head = !!args[1]?.head;
            return query;
          };
        query.then = (resolve) =>
          Promise.resolve({
            data: head ? null : rows,
            count: 100,
            error: null,
          }).then(resolve);
        queries.push(filters);
        return query;
      },
    };
    const Page = load("src/app/admin/produtos/page.tsx", {
      "react/jsx-runtime": jsx,
      "next/link": ({ href, children, ...p }) =>
        React.createElement("a", { href, ...p }, children),
      "@/lib/auth/assert-admin": {
        assertAdminAccess: async () => ({ userId: adminId }),
      },
      "@/components/admin/manual-products/Controls": controls.default,
      "lucide-react": Object.fromEntries(
        [
          "ArrowLeft",
          "CheckCircle2",
          "ChevronLeft",
          "ChevronRight",
          "Plus",
          "Search",
          "Star",
          "XCircle",
        ].map((key) => [key, () => null]),
      ),
      "@/lib/supabase/server": {
        createSupabaseServerClient: async () => client,
      },
      "./actions": { updateProductFeaturedAction: async () => {} },
    }).default;
    const html = renderToStaticMarkup(
      await Page({
        searchParams: Promise.resolve({
          origem: "manual",
          status: deleted ? "deleted" : "active",
        }),
      }),
    );
    assert.ok(html.includes(`/admin/produtos/${id}`));
    assert.ok(!html.includes(`/admin/produtos/${adminId}`));
    assert.ok(html.includes("origem=manual&amp;pagina=2"));
    assert.ok(
      queries[0].some(
        ([method, key, val]) =>
          method === "eq" && key === "catalog_source" && val === "manual",
      ),
    );
    assert.ok(
      queries[0].some(
        ([method, key]) =>
          method === (deleted ? "not" : "is") && key === "deleted_at",
      ),
    );
    assert.ok(
      html.indexOf("Ações</th>") < html.indexOf("SKU</th>"),
      "Manual controls should not be hidden at the far end of the table",
    );
  }
});
