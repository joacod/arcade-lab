import test from 'node:test';
import assert from 'node:assert/strict';
import { createClock, FIXED_STEP } from '../../../src/engine/clock.ts';

test('fixed clock bounds catch-up, retains fractions, and resets suspension time', () => {
  const clock = createClock();
  assert.equal(clock.advance(0), 0);
  assert.equal(clock.advance(10), 0);
  assert.equal(clock.advance(20), 1);
  assert.equal(clock.advance(600000), 5);
  assert.ok(clock.advance(600001) <= 1);
  clock.reset();
  assert.equal(clock.advance(1000000), 0);
  assert.equal(clock.advance(1000000 + FIXED_STEP * 1000), 1);
});
