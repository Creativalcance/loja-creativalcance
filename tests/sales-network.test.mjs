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
        if (name === "@/lib/auth/commercial-access")
          return load("src/lib/auth/commercial-access.ts");
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
test("commercial membership adds access without changing customer or admin permissions", () => {
  for (const locale of Object.keys(config.SITE_LOCALES)) {
    assert.equal(
      paths.canReturnTo(
        "customer",
        config.localizePath("/area-comercial", locale),
        true,
      ),
      true,
    );
    assert.equal(
      paths.canReturnTo(
        "admin",
        config.localizePath("/area-comercial", locale),
        true,
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
      paths.canReturnTo(
        "customer",
        config.localizePath("/area-cliente", locale),
        true,
      ),
      true,
    );
    assert.equal(
      paths.canReturnTo(
        "customer",
        config.localizePath("/admin", locale),
        true,
      ),
      false,
    );
  }
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
  role = "customer",
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
test("an active base account and matching commercial membership are both required", async () => {
  for (const args of [
    { role: "unknown" },
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
    "./AgentEditContext": { useAgentEdits: () => ({ setDirty: () => {} }) },
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

test("membership suspension preserves customer access and never elevates administration", () => {
  const { hasCommercialAccess } = load("src/lib/auth/commercial-access.ts");
  for (const role of ["customer", "admin"]) {
    assert.equal(
      hasCommercialAccess({ role, is_active: true }, { status: "active" }),
      true,
    );
    assert.equal(
      hasCommercialAccess({ role, is_active: true }, { status: "suspended" }),
      false,
    );
    assert.equal(
      hasCommercialAccess({ role, is_active: false }, { status: "active" }),
      false,
    );
    assert.equal(hasCommercialAccess({ role, is_active: true }, null), false);
  }
  assert.equal(
    paths.canReturnTo("customer", "/checkout?draft=retained", false),
    true,
  );
  assert.equal(
    paths.canReturnTo("customer", "/area-cliente/encomendas", false),
    true,
  );
  assert.equal(paths.canReturnTo("customer", "/admin", true), false);
});

function inviteHarness({
  confirmed = true,
  dirty = false,
  existing = true,
} = {}) {
  const events = [];
  const fixture = {
    ...agent,
    user_id: null,
    status: "draft",
    account_kind: "new_account",
    updated_at: "2026-09-14T15:00:00Z",
    invitation_sent_at: null,
  };
  const candidate = {
    id: other,
    email: fixture.email,
    role: "customer",
    is_active: true,
    confirmed,
    banned: false,
    linked_agent_id: null,
  };
  const accountModule = load("src/lib/sales/account.ts", {
    "@/lib/supabase/admin": { createSupabaseAdminClient: () => ({}) },
  });
  const db = {
    auth: {
      admin: {
        createUser: async () => {
          events.push("createUser");
          throw new Error("Unexpected identity creation");
        },
        deleteUser: async () => events.push("deleteUser"),
      },
    },
    from: () => {
      const q = {
        select: () => q,
        update: () => q,
        eq: () => q,
        single: async () => ({ data: fixture }),
        then: (resolve) => resolve({ error: null }),
      };
      return q;
    },
    rpc: async (name, data) => {
      events.push({ name, data });
      return { data: { id }, error: null };
    },
  };
  const mod = load("src/lib/sales/actions.ts", {
    "node:crypto": crypto,
    "next/cache": { revalidatePath: () => {} },
    "@/lib/auth/assert-admin": {
      assertAdminAccess: async () => ({ userId: id }),
    },
    "@/lib/supabase/admin": { createSupabaseAdminClient: () => db },
    "@/lib/i18n/config": config,
    "./validation": rules,
    "./account": {
      findSalesAccount: async () => (existing ? candidate : null),
      canLinkSalesAccount: accountModule.canLinkSalesAccount,
    },
    "./access": {},
    "./i18n": copy,
    "./reconcile": {},
    "./email": {
      sendSalesInvitation: async () => events.push("password-invite"),
      retrySalesEmails: async () => events.push("access-email"),
    },
  });
  const form = new FormData();
  for (const [k, v] of Object.entries({
    agent_id: id,
    expected_email: dirty ? "wrong@example.test" : fixture.email,
    expected_updated_at: fixture.updated_at,
    confirm_account: "on",
    account_mode: "existing",
    existing_user_id: other,
  }))
    form.set(k, v);
  return { mod, form, events };
}
test("existing customer activation never creates an identity or resets a password", async () => {
  const h = inviteHarness();
  assert.equal((await h.mod.inviteAgentAction({}, h.form)).success, true);
  assert.equal(h.events[0].data.p_action, "link_existing_account");
  assert.equal(h.events[0].data.p_data.user_id, other);
  assert.equal(h.events[1], "access-email");
  assert.equal(h.events.length, 2);
});
test("unconfirmed identities and stale saved-email confirmations cannot be linked", async () => {
  for (const opts of [
    { confirmed: false },
    { dirty: true },
    { existing: false },
  ]) {
    const h = inviteHarness(opts);
    assert.equal((await h.mod.inviteAgentAction({}, h.form)).success, false);
    assert.equal(h.events.length, 0);
  }
});

test("account association uses verified Auth identity and rejects profile email mismatch", async () => {
  for (const mismatch of [false, true]) {
    const reads = [];
    const db = {
      auth: {
        admin: {
          getUserById: async (userId) => {
            reads.push(userId);
            return {
              data: {
                user: {
                  id: userId,
                  email: mismatch ? "other@example.test" : agent.email,
                  email_confirmed_at: "confirmed",
                },
              },
              error: null,
            };
          },
        },
      },
      from: (table) => {
        let key;
        const q = {
          select: () => q,
          eq: (k, v) => {
            key = v;
            return q;
          },
          maybeSingle: async () => ({
            data:
              table === "sales_agents"
                ? null
                : key === id
                  ? { role: "admin", is_active: true }
                  : {
                      id: other,
                      email: agent.email,
                      full_name: "Existing",
                      role: "customer",
                      is_active: true,
                    },
          }),
        };
        return q;
      },
    };
    const mod = load("src/lib/sales/account.ts", {
      "@/lib/supabase/admin": { createSupabaseAdminClient: () => db },
    });
    if (mismatch)
      await assert.rejects(mod.findSalesAccount(id, agent.email), /difere/);
    else {
      const result = await mod.findSalesAccount(id, agent.email);
      assert.equal(result.id, other);
      assert.equal(result.confirmed, true);
    }
    assert.deepEqual(reads, [other]);
  }
});

for (const locale of Object.keys(config.SITE_LOCALES))
  test(`existing account activation email in ${locale} uses normal login without password token`, async () => {
    const notice = {
      id,
      agent_id: id,
      kind: "access",
      status: "pending",
      attempts: 0,
      locale,
      email_to: agent.email,
      payload: { name: "Existing <customer>", user_id: other },
    };
    const sends = [];
    const db = {
      auth: {
        admin: {
          getUserById: async () => ({
            data: {
              user: {
                id: other,
                email: agent.email,
                email_confirmed_at: "confirmed",
              },
            },
            error: null,
          }),
        },
      },
      from: (table) => {
        let update = null;
        const filters = [];
        const q = {
          select: () => q,
          update: (v) => {
            update = v;
            return q;
          },
          eq: (k, v) => {
            filters.push([k, v]);
            return q;
          },
          in: () => q,
          lt: () => q,
          order: () => q,
          limit: () => q,
          maybeSingle: async () => ({
            data:
              table === "sales_agents"
                ? { user_id: other, status: "active" }
                : table === "profiles"
                  ? { is_active: true }
                  : { id },
            error: null,
          }),
          then: (resolve) => {
            if (table === "sales_email_notifications" && !update)
              return resolve({ data: [notice], error: null });
            return resolve({ error: null });
          },
        };
        return q;
      },
    };
    const mod = load(
      "src/lib/sales/email.ts",
      {
        "@/lib/supabase/admin": { createSupabaseAdminClient: () => db },
        "@/lib/i18n/config": config,
        "./i18n": copy,
      },
      {
        process: {
          env: {
            RESEND_API_KEY: "test-fixture",
            NEXT_PUBLIC_SITE_URL: "https://shop.example.test",
          },
        },
        fetch: async (url, opts) => {
          sends.push(JSON.parse(opts.body));
          return { ok: true, json: async () => ({ id: "email-fixture" }) };
        },
      },
    );
    const result = await mod.retrySalesEmails(1, id);
    assert.equal(result.sent, 1);
    assert.equal(sends.length, 1);
    assert.equal(sends[0].subject, copy.salesCopy(locale).accessSubject);
    assert.equal(sends[0].to[0], agent.email);
    assert.ok(
      sends[0].text.includes(config.localizePath("/login", locale) + "?next="),
    );
    assert.doesNotMatch(
      sends[0].text,
      /token_hash|nova-password|auth\/comercial/,
    );
    assert.ok(sends[0].html.includes("Existing &lt;customer&gt;"));
    await assert.rejects(
      mod.sendSalesInvitation({ ...agent, account_kind: "existing_account" }),
      /não está disponível/,
    );
  });

test("unsaved commercial edits disable activation and identify the persisted account", () => {
  const Form = ({ disabled, children, submit }) =>
    React.createElement(
      "form",
      null,
      React.createElement(
        "fieldset",
        { disabled },
        children,
        React.createElement("button", null, submit),
      ),
    );
  const props = {
    agent: {
      ...agent,
      user_id: null,
      status: "draft",
      updated_at: "saved-version",
    },
    account: {
      id: other,
      email: agent.email,
      role: "customer",
      full_name: "Existing Customer",
      confirmed: true,
      is_active: true,
      banned: false,
      linked_agent_id: null,
    },
  };
  for (const dirty of [false, true]) {
    const Panel = load("src/components/sales/AccountAccessPanel.tsx", {
      "react/jsx-runtime": jsx,
      "@/lib/sales/actions": { inviteAgentAction: async () => {} },
      "./AgentEditContext": { useAgentEdits: () => ({ dirty }) },
      "./ActionForm": Form,
    }).default;
    const html = renderToStaticMarkup(React.createElement(Panel, props));
    assert.ok(html.includes(agent.email));
    assert.ok(html.includes("Existing Customer"));
    assert.equal(html.includes('<fieldset disabled="">'), dirty);
    const confirmation = html.match(/<input[^>]*name="confirm_account"[^>]*>/)?.[0] || "";
    assert.match(confirmation, /required=""/);
  }
});
