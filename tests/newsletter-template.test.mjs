import test from "node:test";
import assert from "node:assert/strict";
import { renderNewsletterPreview, renderNewsletterBroadcast, escapeNewsletterHtml } from "../src/lib/newsletter/campaign-template.ts";

const campaign = {
  subject: "Lançamento 360",
  preview_text: "A tua marca em toda a parte.",
  body_text: "Uma nova loja online.\n\nEscolhe. Personaliza. Encomenda.",
  locale: "pt",
};

test("newsletter escapes administrator-authored HTML", () => {
  const html = renderNewsletterPreview({
    ...campaign,
    body_text: '<script>alert("x")</script> & mais',
    subject: "<invalid>",
  });
  assert.equal(html.includes("<script>"), false);
  assert.equal(html.includes("&lt;script&gt;"), true);
  assert.equal(html.includes("&lt;invalid&gt;"), true);
});

test("preview is isolated from broadcast unsubscribes", () => {
  const preview = renderNewsletterPreview(campaign);
  const broadcast = renderNewsletterBroadcast(campaign);
  assert.match(preview, /Pré-visualização interna/);
  assert.doesNotMatch(preview, /RESEND_UNSUBSCRIBE_URL/);
  assert.doesNotMatch(broadcast, /Pré-visualização interna/);
  assert.match(broadcast, /\{\{\{RESEND_UNSUBSCRIBE_URL\}\}\}/);
});

test("newsletter template uses official palette and site", () => {
  const output = renderNewsletterBroadcast(campaign);
  assert.match(output, /#162334/);
  assert.match(output, /#ff6a00/i);
  assert.match(output, /https:\/\/360-merchandising\.com/);
  assert.equal(escapeNewsletterHtml("A&B"), "A&amp;B");
});

test("legacy escaped newlines become separate HTML paragraphs", () => {
  const html = renderNewsletterPreview({ ...campaign, body_text: String.raw`Primeiro bloco.\n\nSegundo bloco.` });
  assert.equal(html.includes(String.raw`\n`), false);
  assert.match(html, /Primeiro bloco/);
  assert.match(html, /Segundo bloco/);
  assert.match(html, /<h1[^>]*>Primeiro bloco/);
  assert.match(html, /<p[^>]*>Segundo bloco/);
});

test("official logo sits on a white high-contrast header", () => {
  const html = renderNewsletterPreview(campaign);
  assert.match(html, /background:#ffffff;padding:26px 30px/);
  assert.match(html, /\/brand\/360-merchandising\.png/);
});
