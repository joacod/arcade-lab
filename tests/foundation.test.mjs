import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, stepRun } from '../src/game.ts';
import { clearing } from '../src/content.ts';
import { createClock, FIXED_STEP } from '../src/browser/clock.ts';
import { createViewport, toWorld, toScreen, edgeCue, framing } from '../src/view.ts';

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
    const view = createViewport(clearing.arena, { width, height }, { x: 480, y: 320 }, 'close');
    for (const [x, y] of [[0, 0], [480, 320], [960, 640]]) {
      const screen = toScreen(view, { x, y });
      const point = toWorld(view, screen.x, screen.y);
      assert.ok(Math.abs(point.x - x) < 1e-9);
      assert.ok(Math.abs(point.y - y) < 1e-9);
    }
  }
});

test('camera clamps padded edges, centers oversized axes, and resets from fresh-run position', () => {
  const surface = { width: 390, height: 740 }, bounds = clearing.arena;
  const left = createViewport(bounds, surface, { x: 10, y: 10 }, 'close');
  const right = createViewport(bounds, surface, { x: 950, y: 630 }, 'close');
  assert.equal(left.scale, 1);
  assert.equal(toScreen(left, { x: 0, y: 0 }).x, framing.boundaryPadding);
  assert.equal(toScreen(right, { x: 960, y: 640 }).x, surface.width - framing.boundaryPadding);
  assert.equal(left.y, right.y); // The whole vertical span fits, so follow only horizontally.
  assert.equal(toScreen(left, { x: 480, y: 320 }).y, surface.height / 2);
  const largeSurface = { width: 2200, height: 1600 };
  assert.deepEqual(createViewport(bounds, largeSurface, { x: 0, y: 0 }, 'close'),
    createViewport(bounds, largeSurface, { x: 960, y: 640 }, 'close'));
  assert.ok(createViewport(bounds, largeSurface, { x: 0, y: 0 }, 'close').scale > framing.closeScale);
  for (const mode of ['close', 'arena']) {
    const fresh = createRun();
    const initial = createViewport(bounds, surface, fresh.player, mode);
    const moved = createViewport(bounds, surface, { x: 950, y: 320 }, mode);
    assert.deepEqual(createViewport(bounds, surface, createRun().player, mode), initial);
    if (mode === 'close') assert.notEqual(initial.x, moved.x);
    else {
      assert.deepEqual(initial, moved);
      assert.ok(toScreen(initial, { x: 0, y: 0 }).x >= 0);
      assert.ok(toScreen(initial, { x: 960, y: 640 }).y <= surface.height);
    }
    const a = toScreen(initial, { x: 20, y: 20 }), b = toScreen(initial, { x: 30, y: 30 });
    assert.ok(Math.abs((b.x - a.x) - (b.y - a.y)) < 1e-9);
  }
});

test('offscreen warnings get inset directional cues; visible warnings remain in world space', () => {
  const surface = { width: 390, height: 740 };
  const view = createViewport(clearing.arena, surface, { x: 480, y: 320 }, 'close');
  assert.equal(edgeCue(view, surface, { x: 480, y: 320 }), undefined);
  for (const point of [{ x: 0, y: 0 }, { x: 960, y: 640 }]) {
    const cue = edgeCue(view, surface, point);
    assert.ok(cue);
    assert.ok(cue.x >= framing.cueInset && cue.x <= surface.width - framing.cueInset);
    assert.ok(cue.y >= framing.cueInset && cue.y <= surface.height - framing.cueInset);
  }
});


test('shared circle sweep handles overlap, stationary, tangent, miss, endpoints and relative motion', async () => {
  const { sweptCircle } = await import('../src/collision.ts');
  const origin = { x: 0, y: 0 }, center = { x: 5, y: 0 };
  assert.equal(sweptCircle(origin, origin, origin, origin, 2), 0);
  assert.equal(sweptCircle(origin, origin, center, center, 2), undefined);
  assert.equal(sweptCircle(origin, { x: 10, y: 0 }, { x: 5, y: 2 }, { x: 5, y: 2 }, 2), 0.5);
  assert.equal(sweptCircle(origin, { x: 10, y: 0 }, { x: 5, y: 3 }, { x: 5, y: 3 }, 2), undefined);
  assert.equal(sweptCircle(origin, { x: 3, y: 0 }, center, center, 2), 1);
  assert.equal(sweptCircle(origin, origin, center, { x: -5, y: 0 }, 1), 0.4);
});
