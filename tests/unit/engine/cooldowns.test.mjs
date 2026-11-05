import test from 'node:test';
import assert from 'node:assert/strict';
import { createCooldowns } from '../../../src/engine/cooldowns.ts';

test('cooldowns admit independent cues at their deadline and reset on a replaced audio clock', () => {
  const cooldowns = createCooldowns();
  cooldowns.advance(10); assert.equal(cooldowns.allows('hit'), true);
  cooldowns.record('hit', .5);
  assert.equal(cooldowns.allows('hit'), false); assert.equal(cooldowns.allows('jump'), true);
  cooldowns.advance(10.49); assert.equal(cooldowns.allows('hit'), false);
  cooldowns.advance(10.5); assert.equal(cooldowns.allows('hit'), true);
  cooldowns.record('hit', 1); cooldowns.advance(0); assert.equal(cooldowns.allows('hit'), true);
  cooldowns.record('hit', 1); cooldowns.clear(); assert.equal(cooldowns.allows('hit'), true);
});
