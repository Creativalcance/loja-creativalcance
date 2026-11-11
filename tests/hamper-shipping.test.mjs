import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { calculateCartShipping, hasConfirmedHamperAccess } from '../src/lib/checkout/shipping-pricing.ts';
import * as minimum from '../src/lib/commerce/minimum-order-quantity.ts';

const pricing = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/pricing/calculate-cart-item.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: pricing, require: () => minimum });
const line = (quantity, rate, total) => ({ quantity, total,
  shipping_product: { shipping_profile: 'christmas_hamper_2026', delivery_unit_price: rate } });

test('minimum one applies only to explicitly selected hampers', () => {
  const prices = [{ quantity_min: 1, quantity_max: null, final_price: 19.98, currency: 'EUR' }];
  for (const profile of [null, 'standard', 'unknown']) {
    const minimumQuantity = minimum.getEffectiveMinimumOrderQuantity(1, profile);
    assert.equal(minimumQuantity, 10);
    assert.equal(pricing.calculateCartItemPricing({ quantity: 1, minimumQuantity, prices }).total, 0);
  }
  const minimumQuantity = minimum.getEffectiveMinimumOrderQuantity(1, 'christmas_hamper_2026');
  assert.equal(minimumQuantity, 1);
  assert.equal(pricing.calculateCartItemPricing({ quantity: 1, minimumQuantity, prices }).total, 19.98);
  assert.equal(pricing.calculateCartItemPricing({ quantity: 1.5, minimumQuantity, prices }).total, 0);
  assert.equal(pricing.calculateCartItemPricing({ quantity: 1, prices }).total, 0);
});

test('different hamper rates combine per unit below ten and share the quantity tier', () => {
  assert.equal(calculateCartShipping(200, [line(3, 9.5, 150), line(6, 6, 50)]).total, 64.5);
  assert.equal(calculateCartShipping(250, [line(4, 9.5, 200), line(6, 6, 50)]).total, 40);
  assert.equal(calculateCartShipping(600, [line(12, 9.5, 400), line(13, 6, 200)]).total, 0);
});

test('ordinary merchandise retains the existing free-delivery threshold', () => {
  for (const [total, expected] of [[49.99, 4.9], [50, 0], [100, 0]]) {
    const ordinary = { quantity: 10, total, shipping_product: { shipping_profile: 'standard', delivery_unit_price: null } };
    assert.equal(calculateCartShipping(total, [ordinary]).total, expected);
    assert.equal(calculateCartShipping(total + 150, [ordinary, line(1, 9.5, 150)]).total, expected + 9.5);
  }
});

test('access confirmation belongs to the selected delivery address', () => {
  assert.equal(hasConfirmedHamperAccess(null, 'address'), false);
  const metadata = { hamperDelivery: { groundFloorAccess: true, addressId: 'address' } };
  assert.equal(hasConfirmedHamperAccess(metadata, 'address'), true);
  assert.equal(hasConfirmedHamperAccess(metadata, 'other'), false);
});
