import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, stepRun } from '../src/game.ts';
import { clearing } from '../src/content.ts';
import { createClock, FIXED_STEP } from '../src/browser/clock.ts';
import { createViewport, toWorld } from '../src/browser/viewport.ts';

test('normalized movement, analog strength, collision radius, and independent runs', () => {
  const run = createRun();
  const fresh = createRun();
  stepRun(run, { x: 1, y: -1 }, 1);
  assert.ok(Math.abs(Math.hypot(run.player.x - 480, run.player.y - 320) - 150) < 1e-9);
  assert.deepEqual(fresh.player, { x: 480, y: 320, health: 100, shield: 0, invulnerability: 0 });
  assert.equal(fresh.elapsed, 0);
  assert.notEqual(run.enemies, fresh.enemies);
  const analog = createRun();
  stepRun(analog, { x: 0.5, y: 0 }, 1);
  assert.equal(analog.player.x, 555);
  for (const direction of [-1, 1]) {
    const edgeRun = createRun();
    stepRun(edgeRun, { x: direction, y: direction }, 100);
    assert.deepEqual({ x: edgeRun.player.x, y: edgeRun.player.y }, direction < 0 ? { x: 10, y: 10 } : { x: 950, y: 630 });
  }
  assert.equal(clearing.keeper.radius, 10);
});

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

test('viewport uses one invertible transform at wide, narrow, and small sizes', () => {
  for (const [width, height] of [[1200, 700], [330, 420], [600, 200]]) {
    const view = createViewport(width, height);
    for (const [x, y] of [[0, 0], [480, 320], [960, 640]]) {
      const point = toWorld(view, view.x + x * view.scale, view.y + y * view.scale);
      assert.ok(Math.abs(point.x - x) < 1e-9);
      assert.ok(Math.abs(point.y - y) < 1e-9);
    }
  }
});
