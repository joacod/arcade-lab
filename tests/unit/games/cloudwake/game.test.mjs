import test from 'node:test';
import assert from 'node:assert/strict';
import { flight, fly, multiplierAt, speedAt, slide } from '../../../../src/games/cloudwake/content.ts';
import { createRoute, nextPassage, reachable, minePosition, steerTo } from '../../../../src/games/cloudwake/route.ts';
import { continueRun, createRun, stepRun, pauseRun, takeEvents } from '../../../../src/games/cloudwake/game.ts';
import { cloudTiles } from '../../../../src/games/cloudwake/presentation.ts';
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
  const coast = createRun(3), moved = createRun(3);
  for (let i = 0; i < 30; i++) {
    stepRun(coast, { thrust: false }, dt);
    stepRun(moved, { thrust: false, strafe: 1 }, dt);
  }
  assert.equal(moved.distance, coast.distance);
  assert.equal(coast.player.x, flight.playerX);
  assert.ok(moved.player.x > flight.playerX && moved.player.x <= flight.maxX);
  for (let i = 0; i < 90 && moved.player.x > flight.minX; i++) stepRun(moved, { thrust: false, strafe: -1 }, dt);
  assert.equal(moved.player.x, flight.minX);
  assert.equal(moved.status, 'active');
  assert.ok(moved.distance > coast.distance);
  const dragged = { x: flight.playerX, y: 300, vx: 40, vy: 0 };
  slide(dragged, 1, 80, dt);
  assert.equal(dragged.x, flight.playerX + 80);
  assert.equal(dragged.vx, 0);
});

test('seeded route keeps traversable corridors, conservative spacing and moving hazards outside the route', () => {
  const seen = new Set();
  for (const seed of [1, 17, 42, 2026]) {
    const route = createRoute(seed), duplicate = createRoute(seed);
    const centerBlockers = [0, 0, 0, 0, 0];
    let widest = 0;
    for (let i = 0; i < 30; i++) {
      const previous = route.previous, next = nextPassage(route);
      assert.deepEqual(next, nextPassage(duplicate));
      assert.ok(reachable(previous, next), `${seed}/${i} unreachable`);
      assert.ok(next.x - previous.x - previous.width >= 390);
      assert.ok(next.gap > 2 * (flight.radius + flight.pickupRadius + 10)); seen.add(next.pattern);
      widest = Math.max(widest, next.width);
      if (next.pattern === 'gate' && Math.abs(next.center - 300) + flight.radius > next.gap / 2 + 5) centerBlockers[Math.floor(i / 6)]++;
      if (next.pattern === 'drift') {
        for (const t of [0, .4, 1, 2, 3]) assert.ok(Math.abs(minePosition(next, t).y - next.center) - 44 > next.gap / 2);
      }
    }
    assert.ok((flight.minimumView - flight.maxX - widest) / flight.maxSpeed >= flight.reaction, 'forward slide keeps a reaction margin');
    assert.equal(centerBlockers[0], 0, 'the approach remains forgiving');
    for (const count of centerBlockers.slice(1)) assert.ok(count >= 3, 'later legs cannot be solved by camping in the middle');
  }
  assert.equal(seen.size, 5);
  const previous = createRoute(1).previous;
  assert.equal(reachable(previous, { ...previous, x: 40, center: 415, width: 86, gap: 190 }), false);
});

test('pickups score once, pause freezes rules, three crashes end a run and restart is pristine', () => {
  const run = createRun(42);
  run.fragments = [{ x: flight.playerX, y: 300, collected: false }];
  stepRun(run, { thrust: true }, dt);
  assert.equal(run.pickups, 1); assert.equal(run.score, flight.fragmentPoints);
  assert.equal(takeEvents(run)[0].type, 'pickup');
  stepRun(run, { thrust: true }, dt); assert.equal(run.pickups, 1);
  pauseRun(run, true); const snapshot = structuredClone(run);
  stepRun(run, { thrust: true }, dt); assert.deepEqual(run, snapshot);
  pauseRun(run, false);
  assert.equal(continueRun(run), false);
  for (let lives = flight.lives - 1; lives >= 0; lives--) {
    run.passages = [{ ...run.route.previous, x: run.distance + flight.playerX, center: 100, gap: 100, pattern: 'rise', cleared: false }];
    stepRun(run, { thrust: false }, dt);
    assert.equal(run.status, lives > 0 ? 'crashed' : 'defeat');
    assert.equal(run.lives, lives); assert.equal(takeEvents(run)[0].type, 'crash');
    const frozen = structuredClone(run);
    pauseRun(run, true); pauseRun(run, false); stepRun(run, { thrust: true }, dt);
    assert.deepEqual(run, frozen);
    assert.equal(continueRun(run), lives > 0);
    if (lives > 0) {
      assert.equal(run.distance, 0); assert.equal(run.pickups, 0); assert.equal(run.score, 0);
      assert.equal(run.lives, lives);
    }
  }
  const end = structuredClone(run); stepRun(run, { thrust: true }, dt); assert.deepEqual(run, end);
  const fresh = createRun(42);
  assert.equal(fresh.elapsed, 0); assert.equal(fresh.score, 0); assert.equal(fresh.player.vy, 0);
  assert.equal(fresh.status, 'active'); assert.equal(fresh.lives, flight.lives); assert.equal(fresh.checkpoint.number, 0);
  assert.notEqual(fresh.passages, run.passages);
});

test('clear air saves a safe repeatable checkpoint without farming score, route changes or life refills', () => {
  const run = createRun(42);
  // Place the courier at the first real clear-air pocket, without a playthrough.
  while (!run.passages.some(p => p.pattern === 'breather')) run.passages.push(nextPassage(run.route));
  const pocket = run.passages.find(p => p.pattern === 'breather');
  run.player = { x: flight.maxX, y: 500, vx: 0, vy: 250 };
  run.distance = pocket.x + pocket.width + flight.radius - run.player.x;
  run.elapsed = 12; run.pickups = 7; run.pickupPoints = 225;
  run.chain = 7; run.shieldCharge = 7; run.passed = 5;
  run.passages.forEach(p => { if (p.id < pocket.id) p.cleared = true; });
  stepRun(run, { thrust: false }, dt);
  assert.equal(run.checkpoint.number, 1);
  assert.equal(takeEvents(run).filter(e => e.type === 'checkpoint').length, 1);
  const saved = structuredClone(run.checkpoint);
  assert.equal(saved.state.player.x, flight.playerX); assert.equal(saved.state.player.vx, 0);
  assert.equal(saved.state.player.y, pocket.center); assert.equal(saved.state.player.vy, 0);
  assert.ok(saved.state.passages.find(p => !p.cleared).x - (saved.state.distance + flight.playerX) > 300);
  assert.equal(run.lives, flight.lives);
  for (let attempt = 0; attempt < 2; attempt++) {
    run.pickups += 10; run.pickupPoints += 500; run.chain = 15; run.shieldCharge = 14; run.shieldUntil = run.elapsed;
    run.route.seed = 123; run.fragments.length = 0;
    run.passages = [{ ...pocket, x: run.distance + run.player.x, center: 100, gap: 100, pattern: 'rise', cleared: false }];
    stepRun(run, { thrust: false }, dt);
    assert.equal(continueRun(run), true);
    assert.equal(run.lives, flight.lives - attempt - 1);
    for (const key of Object.keys(saved.state)) assert.deepEqual(run[key], saved.state[key], key);
    assert.deepEqual(run.checkpoint, saved);
    // Both initial holds get clear air; advancing cannot mutate the stored snapshot.
    stepRun(run, { thrust: attempt === 0 }, dt);
    assert.equal(run.status, 'active'); assert.equal(run.checkpoint.number, 1);
    assert.deepEqual(run.checkpoint, saved);
  }
});

test('fragment streaks multiply points, near misses stay uncollected, and the light shield is a short window', () => {
  const run = createRun(17);
  for (let count = 1; count <= 16; count++) {
    run.fragments = [{ x: run.distance + run.player.x, y: run.player.y, collected: false }];
    stepRun(run, { thrust: false }, dt);
    const events = takeEvents(run);
    if (count < flight.shieldFragments) {
      assert.equal(run.chain, count);
      assert.equal(run.shieldCharge, count);
      assert.equal(events.some(event => event.type === 'shield-ready'), false);
    } else if (count === flight.shieldFragments) {
      assert.equal(run.chain, count);
      assert.equal(run.shieldCharge, 0);
      assert.equal(run.shieldUntil, run.elapsed + flight.shieldSeconds);
      assert.equal(events.some(event => event.type === 'shield-ready'), true);
    } else assert.equal(run.shieldCharge, count - flight.shieldFragments);
  }
  assert.equal(run.pickupPoints, 5 * 25 + 5 * 50 + 5 * 75 + 100);
  assert.equal(multiplierAt(run.chain), 4);
  const beside = run.player.y + flight.radius + flight.pickupRadius + 8;
  run.fragments = [{ x: run.distance + run.player.x, y: beside, collected: false }];
  stepRun(run, { thrust: false }, dt);
  assert.equal(run.pickups, 16, 'a gem beside the body is not collected');
  assert.equal(run.fragments.length, 1);
  run.fragments = [{ x: run.distance + flight.minX, y: beside, collected: false }];
  stepRun(run, { thrust: false }, dt);
  assert.equal(run.chain, 16, 'a gem still inside the flight window is not a miss');
  assert.equal(run.fragments.length, 1);
  run.fragments = [{ x: run.distance + flight.minX - flight.radius - flight.pickupRadius - 1, y: beside, collected: false }];
  stepRun(run, { thrust: false }, dt);
  assert.equal(run.chain, 0); assert.equal(run.fragments.length, 0);
  assert.equal(multiplierAt(run.chain), 1);
  run.passages = [{ ...run.route.previous, x: run.distance + run.player.x, center: 100, gap: 100, pattern: 'rise', cleared: false }];
  const until = run.shieldUntil;
  stepRun(run, { thrust: false }, dt);
  assert.equal(run.status, 'active'); assert.equal(run.lives, flight.lives); assert.equal(run.shieldUntil, until);
  assert.equal(takeEvents(run).some(event => event.type === 'shield-hit'), true);
  stepRun(run, { thrust: false }, dt);
  assert.equal(run.lives, flight.lives, 'hazards during the shield window do not cost a life');
  run.elapsed = run.shieldUntil;
  stepRun(run, { thrust: false }, dt);
  assert.equal(run.status, 'crashed'); assert.equal(run.lives, flight.lives - 1);
});

test('cloud identities preserve height and continuous travel across scroll wrapping, including the camera inset', () => {
  for (const scroll of [305, 610, 3050]) {
    const before = cloudTiles(scroll - .1, -180, 1100, 340, 305);
    const after = cloudTiles(scroll + .1, -180, 1100, 340, 305);
    for (const tile of before) {
      const match = after.find(candidate => candidate.id === tile.id);
      if (!match) continue;
      assert.equal(match.y, tile.y);
      assert.ok(Math.abs(tile.x - match.x - .2) < 1e-8);
    }
    assert.ok(after[0].x <= -180 && after.at(-1).x >= 1100);
    assert.ok(after.length < 10, 'offscreen cloud history does not accumulate');
  }
});

test('certified routes stay clear in the actual collision simulation across consecutive patterns', () => {
  for (const [seed, level] of [[17, 0], [42, 1], [17, 3]]) {
    const run = createRun(seed);
    if (level > 0) {
      run.route = createRoute(seed);
      for (let i = 0; i < level * 6; i++) nextPassage(run.route);
      const previous = run.route.previous;
      run.distance = previous.x + previous.width + flight.radius - flight.playerX + 1;
      run.player = { x: flight.playerX, y: previous.center, vx: 0, vy: 0 }; run.elapsed = flight.rampSeconds;
      run.passages = []; run.fragments = [];
      stepRun(run, { thrust: false }, dt);
    }
    let target = run.player.y, seenId = -1, observedAt = Infinity;
    // Three transitions per representative leg, including narrow-screen reveal
    // and reaction time. No automated full-run playthrough or checkpoint journey.
    for (let frame = 0; frame < 900 && run.passed < 3; frame++) {
      const next = run.passages.find(p => p.x + p.width >= run.distance + flight.playerX - flight.radius);
      if (next.id !== seenId && next.x - run.distance <= flight.minimumView) { seenId = next.id; observedAt = run.elapsed; }
      if (run.elapsed - observedAt >= flight.reaction) target = next.center;
      stepRun(run, { thrust: steerTo(run.player, target) }, dt);
      assert.equal(run.status, 'active', `collision on seed ${seed}, leg ${level}, frame ${frame}`);
      assert.ok(takeEvents(run).every(event => event.type !== 'shield-hit'), 'a shield cannot hide an unreachable transition');
    }
    assert.equal(run.passed, 3);
    assert.ok(run.passages.length < 8 && run.fragments.length < 40);
  }
});
