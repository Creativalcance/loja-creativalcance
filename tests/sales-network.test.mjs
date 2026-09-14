import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import crypto from "node:crypto";
import ts from "typescript";
import { z } from "zod";
import React from "react";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
function load(file, imports = {}, extra = {}) {
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
      FormData,
      File,
      Date,
      Set,
      Map,
      Headers,
      Buffer,
      AbortSignal,
      crypto,
      console,
      process: { env: {} },
      Intl,
      require: (name) => {
        if (name === "server-only") return {};
        if (!(name in imports)) throw new Error(`Unexpected import ${name}`);
        return imports[name];
      },
      ...extra,
    },
  );
  return exports;
}
const config = load("src/lib/i18n/config.ts");
const rules = load("src/lib/sales/validation.ts", { zod: { z } });
const copy = load("src/lib/sales/i18n.ts", { "@/lib/i18n/config": config });
const paths = load("src/lib/auth/return-path.ts");
const id = "10000000-0000-4000-8000-000000000001",
  other = "10000000-0000-4000-8000-000000000002";
const agent = {
  id,
  user_id: id,
  full_name: "Representative",
  email: "rep@example.test",
  locale: "de",
  countries: ["DE", "AT"],
  status: "active",
};
const terms = {
  full_name: "Representative",
  email: "rep@example.test",
  countries: ["DE"],
  locale: "de",
  status: "draft",
  supplier_rate_bps: null,
  manual_rate_bps: null,
  hold_days: null,
  attribution_months: null,
  recurring: null,
  commission_enabled: false,
  monthly_target_cents: 0,
  starts_on: "2026-09-14",
  ends_on: null,
};

test("draft commercial accounts never silently receive commission defaults", () => {
  const parsed = rules.agentSchema.parse(terms);
  assert.equal(parsed.supplier_rate_bps, null);
  assert.equal(parsed.recurring, null);
  assert.equal(parsed.commission_enabled, false);
  assert.equal(
    rules.agentSchema.safeParse({ ...terms, commission_enabled: true }).success,
    false,
  );
  assert.equal(
    rules.agentSchema.safeParse({
      ...terms,
      commission_enabled: true,
      supplier_rate_bps: 500,
      manual_rate_bps: 700,
      hold_days: 14,
      attribution_months: 12,
      recurring: true,
    }).success,
    true,
  );
});
test("invalid rates, money and contract dates are rejected", () => {
  for (const v of ["-1", "1e3", "Infinity", "0.001", "not-money"])
    assert.throws(() => rules.moneyCents(v));
  assert.equal(rules.moneyCents("12,50"), 1250);
  assert.equal(rules.moneyCents("0.29"), 29);
  assert.equal(
    rules.agentSchema.safeParse({ ...terms, supplier_rate_bps: 10001 }).success,
    false,
  );
  assert.equal(
    rules.agentSchema.safeParse({ ...terms, ends_on: "2026-01-01" }).success,
    false,
  );
});
test("commercial return paths never confer admin/customer access", () => {
  for (const locale of Object.keys(config.SITE_LOCALES)) {
    assert.equal(
      paths.canReturnTo(
        "sales",
        config.localizePath("/area-comercial", locale),
      ),
      true,
    );
    assert.equal(
      paths.canReturnTo(
        "customer",
        config.localizePath("/area-comercial", locale),
      ),
      false,
    );
    assert.equal(
      paths.canReturnTo("sales", config.localizePath("/admin", locale)),
      false,
    );
    assert.equal(
      paths.canReturnTo("sales", config.localizePath("/area-cliente", locale)),
      false,
    );
  }
  assert.equal(paths.safeReturnPath("//evil.test"), undefined);
});
test("CSV export protects spreadsheet formulas and quoting", () => {
  for (const value of ["=SUM(1,2)", " +123", "@command", "-10"])
    assert.ok(rules.csvCell(value).startsWith("\"'"));
  assert.equal(rules.csvCell('normal "value"'), '"normal ""value"""');
});
for (const locale of Object.keys(config.SITE_LOCALES))
  test(`commercial portal and invitation have complete ${locale} labels`, () => {
    const t = copy.salesCopy(locale);
    for (const value of Object.values(t)) assert.equal(typeof value, "string");
    assert.equal(
      Object.keys(t).length,
      Object.keys(copy.salesCopy("pt")).length,
    );
    if (locale !== "pt") {
      assert.notEqual(t.title, copy.salesCopy("pt").title);
      assert.notEqual(t.inviteBody, copy.salesCopy("pt").inviteBody);
    }
  });

function accessHarness({
  role = "sales",
  active = true,
  validAgent = true,
  allowedOrder = true,
} = {}) {
  let adminOpened = false;
  const reads = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: { id } }, error: null }) },
    from: (table) => {
      const filters = [];
      const q = {
        select: () => q,
        eq: (k, v) => {
          filters.push([k, v]);
          return q;
        },
        in: () => q,
        maybeSingle: async () => {
          reads.push({ table, filters });
          return {
            data:
              table === "profiles"
                ? { role, is_active: active }
                : table === "sales_agents"
                  ? validAgent
                    ? agent
                    : null
                  : allowedOrder
                    ? { order_id: other }
                    : null,
            error: null,
          };
        },
      };
      return q;
    },
  };
  const mod = load("src/lib/sales/access.ts", {
    react: { cache: (fn) => fn },
    "next/navigation": {
      redirect: (url) => {
        throw new Error("REDIRECT:" + url);
      },
      notFound: () => {
        throw new Error("NOT_FOUND");
      },
    },
    "@/lib/supabase/server": { createSupabaseServerClient: async () => client },
    "@/lib/supabase/admin": {
      createSupabaseAdminClient: () => {
        adminOpened = true;
        return {};
      },
    },
    "@/lib/i18n/config": config,
  });
  return { mod, reads, adminOpened: () => adminOpened };
}
test("an active sales profile and matching agent are both required", async () => {
  for (const args of [
    { role: "customer" },
    { role: "admin" },
    { active: false },
    { validAgent: false },
  ]) {
    const h = accessHarness(args);
    await assert.rejects(h.mod.assertSalesAccess(), /REDIRECT/);
    assert.equal(h.adminOpened(), false);
  }
  const h = accessHarness();
  const result = await h.mod.assertSalesAccess();
  assert.equal(result.agent.id, id);
  assert.deepEqual(h.reads.at(-1).filters, [["user_id", id]]);
});
test("order ownership is checked before privileged document reads", async () => {
  const denied = accessHarness({ allowedOrder: false });
  await assert.rejects(denied.mod.assertSalesOrder(other), /NOT_FOUND/);
  assert.equal(denied.adminOpened(), false);
  const allowed = accessHarness();
  await allowed.mod.assertSalesOrder(other);
  assert.deepEqual(allowed.reads.at(-1).filters, [
    ["order_id", other],
    ["agent_id", id],
  ]);
  assert.equal(allowed.adminOpened(), true);
});

test("commercial email escapes personal content and preserves selected language", async () => {
  const requests = [];
  const mod = load(
    "src/lib/sales/email.ts",
    {
      "@/lib/supabase/admin": { createSupabaseAdminClient: () => ({}) },
      "@/lib/i18n/config": config,
      "./i18n": copy,
    },
    {
      process: {
        env: {
          RESEND_API_KEY: "fixture-secret",
          NEXT_PUBLIC_SITE_URL: "https://shop.example.test",
        },
      },
      fetch: async (url, options) => {
        requests.push({ url, options, body: JSON.parse(options.body) });
        return { ok: true, json: async () => ({ id: "email-id" }) };
      },
    },
  );
  for (const locale of Object.keys(config.SITE_LOCALES)) {
    const t = copy.salesCopy(locale);
    await mod.sendSalesEmail({
      key: "fixture-" + locale,
      to: "rep@example.test",
      locale,
      subject: t.inviteSubject,
      body: "<script>alert(1)</script>\n" + t.inviteBody,
      url: "https://shop.example.test/auth/comercial",
      button: t.setPassword,
    });
  }
  assert.equal(requests.length, 6);
  for (const r of requests) {
    assert.deepEqual(r.body.to, ["rep@example.test"]);
    assert.ok(!r.body.html.includes("<script>"));
    assert.ok(r.body.html.includes("&lt;script&gt;"));
    assert.equal(
      r.body.tags[1].value,
      r.options.headers["Idempotency-Key"].split("-")[1],
    );
    assert.match(r.body.text, /360 Smart Merch/);
  }
});

test("empty sales portfolio never creates a Stripe client or touches customer orders", async () => {
  const calls = [];
  const q = {
    select: () => q,
    eq: () => q,
    order: () => q,
    range: async () => ({ data: [], error: null }),
  };
  const mod = load("src/lib/sales/reconcile.ts", {
    "@/lib/supabase/admin": {
      createSupabaseAdminClient: () => ({
        from: (t) => {
          calls.push(t);
          return q;
        },
      }),
    },
    "@/lib/stripe/server": {
      createStripeServerClient: () => {
        throw Error("Unexpected Stripe access");
      },
    },
  });
  await mod.checkSalesRefunds(id);
  assert.deepEqual(calls, ["sales_order_attributions"]);
});
test("signed refund observation is restricted to an attributed order", async () => {
  const calls = [];
  const tables = {
    payments: { id, order_id: other },
    sales_order_attributions: null,
  };
  const admin = {
    from: (table) => {
      calls.push(table);
      const q = {
        select: () => q,
        eq: () => q,
        maybeSingle: async () => ({ data: tables[table], error: null }),
      };
      return q;
    },
    rpc: () => {
      throw Error("Unexpected mutation");
    },
  };
  const mod = load("src/lib/sales/reconcile.ts", {
    "@/lib/supabase/admin": { createSupabaseAdminClient: () => admin },
    "@/lib/stripe/server": {
      createStripeServerClient: () => {
        throw Error("Unexpected Stripe access");
      },
    },
  });
  await mod.observeSalesRefund(
    {
      payment_intent: "pi_fixture",
      amount: 10000,
      amount_refunded: 2000,
      currency: "eur",
    },
    "2026-09-14T00:00:00Z",
  );
  assert.deepEqual(calls, ["payments", "sales_order_attributions"]);
});
test("commission cron authenticates before database/provider work", async () => {
  const calls = [];
  const mod = load(
    "src/app/api/cron/sales-commissions/route.ts",
    {
      "node:crypto": crypto,
      "next/server": {
        NextResponse: {
          json: (body, init) => ({ body, status: init?.status || 200 }),
        },
      },
      "@/lib/sales/reconcile": {
        reconcileSalesNetwork: async (limit) => {
          calls.push(limit);
          return { processed: 0 };
        },
      },
    },
    { process: { env: { CRON_SECRET: "fixture" } } },
  );
  assert.equal((await mod.GET({ headers: new Headers() })).status, 401);
  assert.equal(calls.length, 0);
  assert.equal(
    (
      await mod.GET({
        headers: new Headers({ authorization: "Bearer fixture" }),
      })
    ).status,
    200,
  );
  assert.deepEqual(calls, [3]);
});

test("commercial creation form renders native accessible inputs with no assumed commission", () => {
  const action = async () => ({ success: false, message: "" });
  const Form = load("src/components/sales/ActionForm.tsx", {
    "react/jsx-runtime": jsx,
    react: React,
    "next/link": ({ children, ...props }) =>
      React.createElement("a", props, children),
  }).default;
  const Fields = load("src/components/sales/Fields.tsx", {
    "react/jsx-runtime": jsx,
  });
  const AgentForm = load("src/components/sales/AgentForm.tsx", {
    "react/jsx-runtime": jsx,
    "@/lib/i18n/config": config,
    "@/lib/sales/actions": { saveAgentAction: action },
    "@/lib/sales/i18n": copy,
    "./ActionForm": Form,
    "./Fields": Fields,
  }).default;
  // The CJS helper emulates transpiler default-import wrapping.
  const html = renderToStaticMarkup(React.createElement(AgentForm));
  assert.match(html, /name="supplier_rate"/);
  assert.match(html, /name="manual_rate"/);
  assert.match(html, /name="countries"/);
  assert.match(html, /value="draft" selected=""/);
  assert.doesNotMatch(html, /name="commission_enabled"[^>]*checked/);
  assert.equal((html.match(/<form/g) || []).length, 1);
});
