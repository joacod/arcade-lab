import test from 'node:test';
import assert from 'node:assert/strict';
import { createGroundGait } from '../../../../src/games/blastline/animation.ts';
import { operatorCel } from '../../../../src/games/blastline/sprite-art.ts';

const body = (x, extra = {}) => ({ x, y: 618, vx: 210, grounded: true, ...extra });

test('ground strides follow distance in either direction, independently of origin and render frequency', () => {
  function walk(origin, direction, samples) {
    const gait = createGroundGait(); gait.observe(body(origin), 0);
    let pose;
    for (let i = 1; i <= samples; i++) pose = gait.observe(body(origin + direction * 72 * i / samples, { vx: direction * 210 }), 1 / samples);
    return pose;
  }
  for (const samples of [15, 30, 60, 144]) {
    for (const pose of [walk(0, 1, samples), walk(3000, -1, samples)]) {
      assert.equal(pose.moving, true); assert.ok(Math.abs(pose.phase - .75) < 1e-10);
    }
  }
  const gait = createGroundGait(); gait.observe(body(100), 0);
  gait.observe(body(124), 1 / 60);
  assert.deepEqual(gait.observe(body(100, { vx: -210 }), 1 / 60), { phase: .5, moving: true });
});

test('pause freezes the stride; stops, jumps, landings, redeployment and reset start cleanly', () => {
  const gait = createGroundGait(); gait.observe(body(0), 0);
  assert.equal(gait.observe(body(24), 1 / 60).phase, .25);
  assert.equal(gait.observe(body(24), 0).phase, .25);
  assert.equal(gait.observe(body(48), 1 / 60).phase, .5);
  assert.deepEqual(gait.observe(body(48, { vx: 0 }), 1 / 60), { phase: 0, moving: false });
  assert.deepEqual(gait.observe(body(80, { grounded: false }), 1 / 60), { phase: 0, moving: false });
  assert.equal(gait.observe(body(100), 1 / 60).phase, 0);
  assert.equal(gait.observe(body(124), 1 / 60).phase, .25);
  assert.equal(gait.observe(body(4000), 1 / 60).phase, 0);
  assert.equal(gait.observe(body(4024), 1 / 60).phase, .25);
  gait.reset(); assert.equal(gait.observe(body(4024), 1 / 60).phase, 0);
});

test('moving clips cover the full stride without inserting idle, while aim, air and reduced motion keep priority', () => {
  const phases = [0, .18, .35, .51, .68, .85];
  assert.deepEqual(phases.map(p => operatorCel(false, true, p, false, 1, 0).runFrame), [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(phases.map(p => operatorCel(false, true, p, false, 1, 0).state), [1, 1, 1, 2, 2, 2]);
  assert.equal(operatorCel(false, false, .75, false, 1, 0).state, 0);
  assert.equal(operatorCel(false, true, .75, true, 1, 0).state, 0);
  assert.equal(operatorCel(true, true, .75, true, 1, 0).state, 3);
  assert.deepEqual([[0, -1], [1, -1], [1, 0], [1, 1], [0, 1]].map(([x, y]) => operatorCel(false, true, .5, false, x, y).aim), [0, 1, 2, 3, 4]);
});
