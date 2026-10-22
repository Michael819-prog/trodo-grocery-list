import test from 'node:test';
import assert from 'node:assert/strict';
import { validateItem, ValidationError } from '../shared/validation.js';

test('validates prices as integer cents and preserves type-specific fields', () => {
  assert.deepEqual(validateItem({ name: ' Bread ', price: '2.35' }), {
    name: 'Bread', priceCents: 235, type: 'regular',
  });
  assert.deepEqual(validateItem({ name: 'Milk', price: '1.20', type: 'perishable', expirationDate: '2026-11-04', temperature: 4 }), {
    name: 'Milk', priceCents: 120, type: 'perishable', expirationDate: '2026-11-04', temperature: 4,
  });
  assert.equal(validateItem({ name: 'Soap', price: '5', type: 'consumer', pictureUrl: 'https://example.org/soap.png' }).pictureUrl, 'https://example.org/soap.png');
});

test('rejects invalid required fields, malformed dates and unsafe URLs', () => {
  for (const item of [
    { name: '', price: '1' },
    { name: 'Bread', price: '1.001' },
    { name: 'Bread', price: '-1' },
    { name: 'Milk', price: '1', type: 'perishable', expirationDate: '2026-02-30' },
    { name: 'Soap', price: '1', type: 'consumer', pictureUrl: 'javascript:alert(1)' },
  ]) assert.throws(() => validateItem(item), ValidationError);
});
