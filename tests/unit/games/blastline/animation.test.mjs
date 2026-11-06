import { emberSheets } from '../../../../src/games/blastline/assets.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGroundGait } from '../../../../src/games/blastline/animation.ts';
import { operatorCel, operatorFrame, blastLayouts, validateBlastLayout } from '../../../../src/games/blastline/sprite-art.ts';

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
  assert.deepEqual(phases.map(p => operatorFrame(blastLayouts.arcade, 'nova', false, true, p, false, 1, 0, false).rect[0] / 128), [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(phases.map(p => operatorCel(false, true, p, false, 1, 0).state), [1, 1, 1, 2, 2, 2]);
  assert.equal(operatorCel(false, false, .75, false, 1, 0).state, 0);
  assert.equal(operatorCel(false, true, .75, true, 1, 0).state, 0);
  assert.equal(operatorCel(true, true, .75, true, 1, 0).state, 3);
  assert.deepEqual([[0, -1], [1, -1], [1, 0], [1, 1], [0, 1]].map(([x, y]) => operatorCel(false, true, .5, false, x, y).aim), [0, 1, 2, 3, 4]);
});


test('operator layouts keep each actor recoil, jump and run roles independent of sheet resolution', () => {
  for (const [actor, row] of [['nova', 1], ['bolt', 4]]) {
    assert.deepEqual(operatorFrame(blastLayouts.deluxe, actor, false, false, 0, false, 1, 0, true),
      { image: 'operators', rect: [384, row * 192, 192, 192] });
  }
  const custom = { ...blastLayouts.arcade, operators: { ...blastLayouts.arcade.operators, cell: 32,
    rows: { ...blastLayouts.arcade.operators.rows, nova: { idle: 8, stepA: 9, stepB: 10, airborne: 11 } },
    run: { images: { nova: 'newNova', bolt: 'newBolt' }, frames: 4 } } };
  assert.deepEqual(operatorFrame(custom, 'nova', true, true, .75, false, 0, -1, false),
    { image: 'operators', rect: [0, 352, 32, 32] });
  assert.deepEqual(operatorFrame(custom, 'nova', false, true, .75, false, 1, 0, false),
    { image: 'newNova', rect: [96, 64, 32, 32] });
});


test('atlas validation rejects missing role images and mappings outside the decoded sheet', () => {
  const dimensions = Object.fromEntries(Object.entries(emberSheets).map(([name, [width, height]]) => [name, { width, height }]));
  assert.deepEqual(validateBlastLayout(blastLayouts.arcade, dimensions), []);
  const shifted = { ...blastLayouts.arcade, objects: { ...blastLayouts.arcade.objects, relay: [500, 0, 128, 128] } };
  assert.ok(validateBlastLayout(shifted, dimensions).includes('Invalid objects frame'));
  delete dimensions.operators;
  assert.ok(validateBlastLayout(blastLayouts.arcade, dimensions).includes('Invalid operators frame'));
});
