import test from 'node:test';
import assert from 'node:assert/strict';
import { flight, fly, multiplierAt, speedAt, slide, fragmentShape, pickupRear } from '../../../../src/games/cloudwake/content.ts';
import { createRoute, nextPassage, reachable, minePosition, steerTo, legAt, safeGap, passageCenter } from '../../../../src/games/cloudwake/route.ts';
import { continueRun, createRun, stepRun, pauseRun, takeEvents } from '../../../../src/games/cloudwake/game.ts';
import { touchesFragment } from '../../../../src/games/cloudwake/collection.ts';
import { cloudTiles, createPassageViews } from '../../../../src/games/cloudwake/presentation.ts';
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

test('seeded legs grow between checkpoints and certify varied static/moving corridors at their own speed', () => {
  const seen = new Set();
  for (const seed of [1, 17, 42, 2026]) {
    const lengths = [];
    for (const level of [0, 1, 3, 7, 14, 27]) {
      const route = createRoute(seed), duplicate = createRoute(seed);
      route.leg = duplicate.leg = level;
      let blockers = 0;
      const leg = legAt(level);
      for (let i = 0; i <= leg.hazards; i++) {
        const previous = route.previous, next = nextPassage(route);
        assert.deepEqual(next, nextPassage(duplicate));
        assert.equal(next.leg, level);
        assert.ok(reachable(previous, next), `${seed}/${level}/${i} unreachable`);
        assert.ok((next.x - previous.x - previous.width) / speedAt(level) >= flight.reaction);
        assert.ok(safeGap(next) > 2 * (flight.radius + 14));
        assert.equal(next.pattern === 'breather', i === leg.hazards);
        seen.add(next.pattern);
        if (['gate', 'sway'].includes(next.pattern) && Math.abs(next.center - 300) + flight.radius > safeGap(next) / 2 + 5) blockers++;
        if (next.pattern === 'sway') {
          const high = passageCenter(next, (Math.PI / 2 - next.phase) / 1.25);
          const low = passageCenter(next, (3 * Math.PI / 2 - next.phase) / 1.25);
          assert.ok(Math.abs(high - low - next.motion * 2) < 1e-8);
        }
        if (next.pattern === 'drift') {
          for (const t of [0, .4, 1, 2, 3]) assert.ok(Math.abs(minePosition(next, t).y - next.center) - flight.mineRadius > next.gap / 2);
        }
      }
      assert.ok((flight.minimumView - flight.maxX - leg.width) / speedAt(level) >= flight.reaction, 'forward slot keeps a reaction margin');
      if (level > 0) assert.ok(blockers >= 3, 'later legs require leaving the middle');
      lengths.push(route.previous.x + route.previous.width);
    }
    assert.ok(lengths[1] > lengths[0]);
    assert.ok(lengths.at(-1) > lengths[1] * 2, 'later lanterns are farther apart');
  }
  assert.equal(seen.size, 6);
  const previous = createRoute(1).previous;
  assert.equal(reachable(previous, { ...previous, x: 40, center: 415, width: 86, gap: 190 }), false);
});

test('speed increases at widening leg intervals and eases into the new pace', () => {
  for (const [leg, tier] of [[0, 0], [1, 0], [2, 1], [4, 1], [5, 2], [8, 2], [9, 3], [14, 4], [20, 5]]) {
    assert.equal(speedAt(leg), Math.min(flight.maxSpeed, flight.startSpeed + tier * flight.speedStep));
  }
  const run = createRun(42);
  run.checkpoint.number = 2;
  stepRun(run, { thrust: false }, dt);
  assert.ok(run.speed > flight.startSpeed && run.speed < speedAt(2));
  const before = run.speed;
  pauseRun(run, true); stepRun(run, { thrust: true }, dt);
  assert.equal(run.speed, before);
});

test('pickup contact follows the rider and hull, excludes empty corners, and sweeps fast crossings', () => {
  const center = { x: 100, y: 300 };
  for (const [x, y] of [[0, -38], [28, 10], [-37, 12], [0, 26]]) {
    assert.equal(touchesFragment(center, center, { x: center.x + x, y: center.y + y }), true, `body contact ${x}/${y}`);
  }
  for (const [x, y] of [[32, -31], [-45, -30], [0, -55], [0, 43], [-58, 12]]) {
    assert.equal(touchesFragment(center, center, { x: center.x + x, y: center.y + y }), false, `near miss ${x}/${y}`);
  }
  assert.equal(touchesFragment({ x: 0, y: 300 }, { x: 200, y: 300 }, center), true);
  assert.equal(touchesFragment({ x: 0, y: 240 }, { x: 200, y: 240 }, center), false);
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

test('fragment streaks multiply points, near misses stay uncollected, and a charged shield absorbs one contact', () => {
  const run = createRun(17);
  const collected = flight.shieldFragments + 1;
  for (let count = 1; count <= collected; count++) {
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
  assert.equal(run.pickupPoints, 5 * 25 + 5 * 50 + 5 * 75 + (collected - 15) * 100);
  assert.equal(multiplierAt(run.chain), 4);
  const beside = run.player.y + 60;
  run.fragments = [{ x: run.distance + run.player.x, y: beside, collected: false }];
  stepRun(run, { thrust: false }, dt);
  assert.equal(run.pickups, collected, 'a gem beside the body is not collected');
  assert.equal(run.fragments.length, 1);
  run.fragments = [{ x: run.distance + flight.minX, y: beside, collected: false }];
  stepRun(run, { thrust: false }, dt);
  assert.equal(run.chain, collected, 'a gem still inside the flight window is not a miss');
  assert.equal(run.fragments.length, 1);
  run.fragments = [{ x: run.distance + flight.minX + pickupRear - fragmentShape.halfWidth - 1, y: beside, collected: false }];
  stepRun(run, { thrust: false }, dt);
  assert.equal(run.chain, 0); assert.equal(run.fragments.length, 0);
  assert.equal(takeEvents(run).filter(e => e.type === 'fragment-missed').length, 1, 'a miss hands its image to presentation exactly once');
  assert.equal(multiplierAt(run.chain), 1);
  run.passages = [{ ...run.route.previous, x: run.distance + run.player.x, center: 100, gap: 100, pattern: 'rise', cleared: false }];
  const expired = structuredClone(run);
  expired.elapsed = expired.shieldUntil;
  stepRun(expired, { thrust: false }, dt);
  assert.equal(expired.status, 'crashed', 'an unused shield still expires');
  stepRun(run, { thrust: false }, dt);
  assert.equal(run.status, 'active'); assert.equal(run.lives, flight.lives);
  assert.equal(run.shieldUntil, 0, 'the first hit consumes all remaining shield time');
  assert.equal(run.shieldCharge, 1, 'the next shield retains its earned charge');
  assert.equal(takeEvents(run).filter(event => event.type === 'shield-hit').length, 1);
  stepRun(run, { thrust: false }, dt);
  assert.equal(run.status, 'active', 'the absorbed contact does not kill again on the next frame');
  assert.equal(takeEvents(run).some(event => event.type === 'shield-hit'), false);
  const other = structuredClone(run);
  other.passages[0].id++;
  stepRun(other, { thrust: false }, dt);
  assert.equal(other.status, 'crashed', 'another obstacle is dangerous immediately');
  const obstacle = run.passages[0];
  run.passages = [];
  stepRun(run, { thrust: false }, dt);
  assert.equal(run.shieldContact, null, 'separating ends protection from the spent contact');
  run.passages = [obstacle];
  stepRun(run, { thrust: false }, dt);
  assert.equal(run.status, 'crashed'); assert.equal(run.lives, flight.lives - 1);
});

test('retired passage artwork remains until fully clipped by the viewport, and reset releases the old route', () => {
  const views = createPassageViews();
  const base = { ...createRun(42).route.previous, x: 700, width: 60 };
  const lantern = { ...base, id: 10, pattern: 'breather', cleared: false };
  const pillar = { ...base, id: 11, pattern: 'gate' };
  const mine = { ...base, id: 12, pattern: 'drift' };
  const ids = entries => [...entries].map(passage => passage.id);
  assert.deepEqual(ids(views.update([lantern, pillar, mine], 1000, -300)), [10, 11, 12]);
  lantern.cleared = true;
  assert.equal([...views.update([], 1001, -300)][0].cleared, true, 'retain the final checkpoint state after simulation compaction');
  assert.deepEqual(ids(views.update([], 1100, -300)), [10], 'the lantern overhang remains visible after its pocket and nearby hazards leave');
  assert.deepEqual(ids(views.update([], 1200, -300)), [], 'fully clipped images release their history');
  views.update([lantern], 1000, -300);
  views.clear();
  assert.deepEqual(ids(views.update([], 1000, -300)), [], 'restart or checkpoint continuation cannot revive stale scenery');
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
  for (const [seed, level, slot = flight.playerX] of [[17, 0], [42, 1], [17, 3], [42, 14], [1, 20, flight.maxX]]) {
    const run = createRun(seed);
    if (level > 0) {
      run.route = createRoute(seed);
      run.route.leg = level - 1;
      do { nextPassage(run.route); } while (run.route.previous.pattern !== 'breather');
      run.checkpoint.number = level; run.speed = speedAt(level);
      const previous = run.route.previous;
      run.distance = previous.x + previous.width + flight.radius - slot + 1;
      run.player = { x: slot, y: previous.center, vx: 0, vy: 0 }; run.elapsed = 37;
      run.passages = []; run.fragments = [];
      stepRun(run, { thrust: false }, dt);
    }
    let target = run.player.y, seenId = -1, observedAt = Infinity;
    // Three transitions per representative leg, including narrow-screen reveal
    // and reaction time. No automated full-run playthrough or checkpoint journey.
    for (let frame = 0; frame < 900 && run.passed < 3; frame++) {
      const next = run.passages.find(p => p.x + p.width >= run.distance + run.player.x - flight.radius);
      if (next.id !== seenId && next.x - run.distance <= flight.minimumView) { seenId = next.id; observedAt = run.elapsed; }
      if (run.elapsed - observedAt >= flight.reaction) target = next.center;
      stepRun(run, { thrust: steerTo(run.player, target) }, dt);
      assert.equal(run.status, 'active', `collision on seed ${seed}, leg ${level}, frame ${frame}`);
      assert.ok(takeEvents(run).every(event => event.type !== 'shield-hit'), 'a shield cannot hide an unreachable transition');
    }
    assert.equal(run.passed, 3);
    assert.ok(run.passages.length < 10 && run.fragments.length < 50);
  }
});
