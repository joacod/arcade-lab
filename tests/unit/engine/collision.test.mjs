import test from 'node:test';
import assert from 'node:assert/strict';

test('shared circle sweep handles overlap, stationary, tangent, miss, endpoints and relative motion', async () => {
  const { sweptCircle } = await import('../../../src/engine/collision.ts');
  const origin = { x: 0, y: 0 }, center = { x: 5, y: 0 };
  assert.equal(sweptCircle(origin, origin, origin, origin, 2), 0);
  assert.equal(sweptCircle(origin, origin, center, center, 2), undefined);
  assert.equal(sweptCircle(origin, { x: 10, y: 0 }, { x: 5, y: 2 }, { x: 5, y: 2 }, 2), 0.5);
  assert.equal(sweptCircle(origin, { x: 10, y: 0 }, { x: 5, y: 3 }, { x: 5, y: 3 }, 2), undefined);
  assert.equal(sweptCircle(origin, { x: 3, y: 0 }, center, center, 2), 1);
  assert.equal(sweptCircle(origin, origin, center, { x: -5, y: 0 }, 1), 0.4);
});
