import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
const locales = ['pt', 'en', 'fr', 'es', 'de', 'it'];
const names = ['termos-e-condicoes', 'politica-de-privacidade', 'politica-de-cookies', 'reembolsos-e-devolucoes'];
function load(file, imports = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, process, JSON, require: (name) => { if (name in imports) return imports[name]; throw Error(name); },
  });
  return exports;
}
const config = load('src/lib/i18n/config.ts');
const reader = load('src/lib/legal/documents.ts', { 'node:fs/promises': { readFile: fs.promises.readFile }, 'node:path': { default: path }, '@/lib/i18n/config': config });
function texts(doc) { return doc.blocks.flatMap(b => b.type === 'table' ? b.rows.flat() : [b.text]); }
for (const name of names) {
  const pt = JSON.parse(fs.readFileSync(`public/legal/pt/${name}.json`, 'utf8'));
  const hash = crypto.createHash('sha256').update(fs.readFileSync(`public/legal/${name}.txt`)).digest('hex');
  for (const locale of locales) test(`${locale}/${name}: complete document, source revision, sections and protected data`, async () => {
    const doc = await reader.readLegalDocument(locale, `${name}.txt`);
    assert.equal(doc.sourceSha256, hash);
    assert.equal(doc.blocks.length, pt.blocks.length);
    assert.deepEqual(doc.blocks.map(b => b.type), pt.blocks.map(b => b.type));
    assert.deepEqual(doc.blocks.filter(b => b.type === 'heading').map(b => b.text.match(/^\d+(?:\.\d+)*\./)?.[0] || 'annex'), pt.blocks.filter(b => b.type === 'heading').map(b => b.text.match(/^\d+(?:\.\d+)*\./)?.[0] || 'annex'));
    const sourceTexts = texts(pt), targetTexts = texts(doc);
    assert.equal(targetTexts.length, sourceTexts.length);
    for (let i = 0; i < targetTexts.length; i++) {
      assert.ok(targetTexts[i].trim());
      assert.doesNotMatch(targetTexts[i], /ZXQ|TODO|TRANSLATE/);
      // Dates, legal references, deadlines, tax IDs and cookie identifiers must survive translation.
      assert.deepEqual([...targetTexts[i].matchAll(/\d+/g)].map(m => m[0]).sort(), [...sourceTexts[i].matchAll(/\d+/g)].map(m => m[0]).sort(), `Numbers changed in block text ${i}`);
      for (const token of ['CRIATIVALCANCE, UNIPESSOAL LDA', '360 Merchandising', 'info@360-merchandising.com', '+351 913 784 204', 'Meta', 'Stripe', 'Supabase', 'Vercel', 'Google', '__stripe_mid', '__stripe_sid', '_ga_<ID>', '_gcl_*', '_gcl_aw', '_fbp', '_fbc']) {
        assert.equal(targetTexts[i].split(token).length, sourceTexts[i].split(token).length, `Changed ${token} in block text ${i}`);
      }
    }
    for (const block of doc.blocks.filter(b => b.type === 'table')) {
      assert.ok(block.rows.length > 1);
      assert.ok(block.rows.every(row => row.length === block.rows[0].length && row.every(cell => cell.trim())));
    }
    if (locale !== 'pt') assert.notEqual(targetTexts.join(' '), sourceTexts.join(' '));
  });
}
test('document reader rejects traversal and unsupported locales', async () => {
  await assert.rejects(reader.readLegalDocument('en', '../../../package.json'));
  await assert.rejects(reader.readLegalDocument('../pt', 'termos-e-condicoes'));
  await assert.rejects(reader.readLegalDocument('xx', 'termos-e-condicoes'));
});
test('all legal titles, descriptions and related links use the selected locale', () => {
  const { getLegalCopy } = load('src/lib/i18n/legal.ts');
  for (const locale of locales) for (const name of names) {
    const copy = getLegalCopy(locale, name);
    assert.ok(copy.title && copy.description && copy.back);
    assert.doesNotMatch(copy.description, /currently available in Portuguese|disponible en portugais|disponível em português/i);
    assert.equal(config.localizePath(`/${name}`, locale), `${locale === 'pt' ? '' : `/${locale}`}/${name}`);
  }
});

test('withdrawal exceptions and statutory liability retain explicit limitations in every translation', async () => {
  const exceptionPhrases = {
    en: 'neither personalised nor covered by another statutory exception',
    fr: 'ni personnalisé ni couvert par une autre exception légale',
    es: 'no sea personalizado ni esté comprendido en otra excepción legal',
    de: 'weder personalisiert ist noch unter eine andere gesetzliche Ausnahme fällt',
    it: 'non è personalizzato e non rientra in un’altra eccezione prevista dalla legge',
  };
  for (const [locale, phrase] of Object.entries(exceptionPhrases)) {
    for (const name of ['termos-e-condicoes', 'reembolsos-e-devolucoes']) {
      const doc = await reader.readLegalDocument(locale, name);
      assert.ok(texts(doc).some(text => text.includes(phrase)), `${locale}/${name}: lost withdrawal exception`);
    }
  }
  const german = texts(await reader.readLegalDocument('de', 'termos-e-condicoes')).join(' ');
  assert.ok(german.includes('weder ausgeschlossen noch beschränkt'));
  assert.ok(german.includes('Angemessene Abweichungen'));
});
