import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

function load(path, imports) {
  const exports = {};
  const output = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText;
  vm.runInNewContext(output, { exports, React, require: name => {
    assert.ok(name in imports, name); return imports[name];
  } });
  return exports;
}
const copy = load('src/components/catalog/navigation-copy.ts', {});
for (const locale of ['pt','en','fr','es','de','it']) {
  test(`category loading and retry UI work in ${locale} without data requests`, async () => {
    const shared = { '@/components/catalog/navigation-copy': copy };
    const loading = load('src/app/(public)/categorias/loading.tsx', {
      ...shared, '@/lib/i18n/server': { getCurrentLocale: async () => locale },
    });
    const html = renderToStaticMarkup(await loading.default());
    assert.ok(html.includes(copy.catalogNavigationCopy[locale].loading));
    assert.match(html, /role="status"/);
    let retried = 0;
    const error = load('src/app/(public)/categorias/error.tsx', {
      ...shared, 'next/link': { default: 'a' }, 'next/navigation': { usePathname: () => `/${locale}/categorias` },
      '@/lib/i18n/config': { getSiteLocale: value => value, localizePath: () => `/${locale}` },
    });
    const tree = error.default({ error: new Error('private diagnostic'), retry: () => retried++ });
    const errorHtml = renderToStaticMarkup(tree);
    assert.ok(errorHtml.includes(copy.catalogNavigationCopy[locale].retry));
    assert.doesNotMatch(errorHtml, /private diagnostic/);
    tree.props.children[1].props.children[0].props.onClick();
    assert.equal(retried, 1);
  });
}
