import test from 'node:test';
import assert from 'node:assert/strict';
import { flight, fly, speedAt } from '../../../../src/games/cloudwake/content.ts';
import { createRoute, nextPassage, reachable, minePosition, steerTo } from '../../../../src/games/cloudwake/route.ts';
import { createRun, stepRun, pauseRun, takeEvents } from '../../../../src/games/cloudwake/game.ts';
const dt = 1 / 60;

test('hold gives continuous lift, release brakes then falls, speed and cloud boundaries are bounded', () => {
  const player = { y: 300, vy: 0 };
  fly(player, true, dt); assert.ok(player.vy < 0);
  for (let i = 0; i < 20; i++) fly(player, true, dt);
  assert.equal(player.vy, -flight.upLimit);
  const high = player.y;
  for (let i = 0; i < 45; i++) fly(player, false, dt);
  assert.ok(player.y > high); assert.equal(player.vy, flight.downLimit);
  for (let i = 0; i < 180; i++) fly(player, false, dt);
  assert.equal(player.y, flight.floor); assert.equal(player.vy, 0);
  for (let i = 0; i < 180; i++) fly(player, true, dt);
  assert.equal(player.y, flight.ceiling); assert.equal(player.vy, 0);
  assert.equal(speedAt(900), flight.maxSpeed);
});

test('seeded route keeps traversable corridors, conservative spacing and moving hazards outside the route', () => {
  const seen = new Set();
  for (const seed of [1, 17, 42, 2026]) {
    const route = createRoute(seed), duplicate = createRoute(seed);
    for (let i = 0; i < 30; i++) {
      const previous = route.previous, next = nextPassage(route, i * 4);
      assert.deepEqual(next, nextPassage(duplicate, i * 4));
      assert.ok(reachable(previous, next), `${seed}/${i} unreachable`);
      assert.ok(next.x - previous.x - previous.width >= 390);
      assert.ok(next.gap >= 190); seen.add(next.pattern);
      if (next.pattern === 'drift') {
        for (const t of [0, .4, 1, 2, 3]) assert.ok(Math.abs(minePosition(next, t).y - next.center) - 44 > next.gap / 2);
      }
    }
  }
  assert.equal(seen.size, 5);
  const previous = createRoute(1).previous;
  assert.equal(reachable(previous, { ...previous, x: 40, center: 415, width: 86, gap: 190 }), false);
});

test('pickups score once, hazard impact ends a run, pause freezes rules and restart is pristine', () => {
  const run = createRun(42);
  run.fragments = [{ x: flight.playerX, y: 300, collected: false }];
  stepRun(run, { thrust: true }, dt);
  assert.equal(run.pickups, 1); assert.equal(run.score, flight.fragmentPoints);
  assert.equal(takeEvents(run)[0].type, 'pickup');
  stepRun(run, { thrust: true }, dt); assert.equal(run.pickups, 1);
  pauseRun(run, true); const snapshot = structuredClone(run);
  stepRun(run, { thrust: true }, dt); assert.deepEqual(run, snapshot);
  pauseRun(run, false);
  run.passages = [{ ...run.route.previous, x: run.distance + flight.playerX, center: 100, gap: 100, pattern: 'rise', cleared: false }];
  stepRun(run, { thrust: false }, dt);
  assert.equal(run.status, 'defeat'); assert.equal(takeEvents(run)[0].type, 'crash');
  const end = structuredClone(run); stepRun(run, { thrust: true }, dt); assert.deepEqual(run, end);
  const fresh = createRun(42);
  assert.equal(fresh.elapsed, 0); assert.equal(fresh.score, 0); assert.equal(fresh.player.vy, 0);
  assert.equal(fresh.status, 'active'); assert.notEqual(fresh.passages, run.passages);
});

test('certified routes stay clear in the actual collision simulation across consecutive patterns', () => {
  for (const seed of [17, 42]) {
    const run = createRun(seed);
    // Bounded transition check: four hazards, no automated full-run playthrough.
    for (let frame = 0; frame < 900 && run.passed < 4; frame++) {
      const next = run.passages.find(p => p.x + p.width >= run.distance + flight.playerX - flight.radius);
      stepRun(run, { thrust: steerTo(run.player, next.center) }, dt);
      assert.equal(run.status, 'active', `collision on seed ${seed}, frame ${frame}`);
      takeEvents(run);
    }
    assert.equal(run.passed, 4);
    assert.ok(run.passages.length < 8 && run.fragments.length < 40);
  }
});
