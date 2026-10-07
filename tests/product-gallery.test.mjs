import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const exports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/catalog/product-gallery.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports, URL });
const { buildProductGallery, selectGalleryImages, getGalleryColorKey } = exports;
const cdn = 'https://cdn.hideacontent.com/public/products/1000x1000/';
const variants = [
  { id: 'black-s', color_code: '103', color_name: 'Preto', optional_image_1_url: cdn + '30102_103.jpg' },
  { id: 'black-m', color_code: '103', color_name: 'Preto', optional_image_1_url: cdn + '30102_103.jpg' },
  { id: 'blue', color_code: '104', color_name: 'Azul', optional_image_1_url: cdn + '30102_104.jpg' },
];
const list = '30102_set.jpg, 30102_103.jpg, 30102_103-b.jpg, 30102_104.jpg, 30102_104-logo.jpg, 30102_amb.jpg';

test('supplier list adds real angles and shared photos, deduplicating sizes and CDN resolutions', () => {
  const input = { sku: '30102', allImageList: list, variants, images: [
    { external_url: cdn.replace('1000x1000', '500x500') + '30102_103.jpg', storage_url: null, variant_id: 'black-s', image_type: 'variant' },
  ] };
  const before = JSON.stringify(input);
  const images = buildProductGallery(input);
  assert.equal(images.length, 6);
  assert.equal(images.filter(image => image.id.endsWith('30102_103.jpg')).length, 1);
  assert.equal(images[0].url, cdn + '30102_103.jpg');
  assert.equal(images[0].zoomUrl, 'https://cdn.hideacontent.com/public/products_hr/30102_103.jpg');
  assert.equal(JSON.stringify(input), before);
  const black = selectGalleryImages(images, getGalleryColorKey(variants[0]), variants[0].optional_image_1_url, false);
  assert.equal(black.length, 4);
  assert.equal(black[0].url, variants[0].optional_image_1_url);
  assert.ok(!black.some(image => image.url.includes('_104')));
  assert.equal(getGalleryColorKey(variants[0]), getGalleryColorKey(variants[1]));
  const blue = selectGalleryImages(images, getGalleryColorKey(variants[2]), variants[2].optional_image_1_url, false);
  assert.equal(blue.length, 4);
  assert.ok(blue.at(-1).personalizationExample);
  assert.equal(selectGalleryImages(images, 'code:103', variants[0].optional_image_1_url, true).length, 6);
});

test('the gallery rejects unrelated products, arbitrary list URLs, traversal and printing diagrams', () => {
  const images = buildProductGallery({ sku: '30102', variants: [], images: [
    { storage_url: null, external_url: 'https://cdn.hideacontent.com/public/printings/locations/500x500/30102_103.jpg', image_type: 'main' },
    { storage_url: 'javascript:alert(1)', external_url: null },
  ], allImageList: [
    '30102_103.jpg', '99999_103.jpg', '../30102_104.jpg', '30102_104.svg',
    'https://example.invalid/30102_105.jpg', 'https://cdn.hideacontent.com.evil.invalid/30102_106.jpg',
    'https://cdn.hideacontent.com/public/printings/components/500x500/30102_107.jpg',
    'https://cdn.hideacontent.com/public/products/1000x1000/30102_108.jpg',
  ].join(',') });
  assert.equal(images.length, 2);
  assert.ok(images.every(image => image.url.startsWith(cdn)));
});

test('manual uploads keep their URLs and variant association without invented supplier images', () => {
  const source = 'https://store.example.invalid/manual-red.png?version=1';
  const images = buildProductGallery({ sku: '360-001', allImageList: null,
    variants: [{ id: 'red', color_name: 'Vermelho' }, { id: 'blue', color_name: 'Azul' }],
    images: [
      { external_url: null, storage_url: source, variant_id: 'red', image_type: 'main' },
      { external_url: null, storage_url: '/general.png', image_type: 'gallery' },
    ] });
  assert.equal(images[0].url, source);
  assert.equal(images[0].zoomUrl, source);
  assert.equal(selectGalleryImages(images, 'name:azul', null, false).length, 1);
  assert.equal(selectGalleryImages(images, 'name:vermelho', source, false).length, 2);
});

test('empty/single-image products and missing-colour images have safe fallbacks', () => {
  assert.equal(buildProductGallery({ sku: '1', allImageList: null, images: [], variants: [] }).length, 0);
  const images = buildProductGallery({ sku: '1', allImageList: '1_set.jpg', images: [], variants: [] });
  assert.equal(selectGalleryImages(images, 'code:999', null, false).length, 1);
  assert.equal(buildProductGallery({ sku: '1', allImageList: {}, images: [], variants: [] }).length, 0);
});
