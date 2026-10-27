import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, stepRun, pauseRun, takeEvents, idle, retryRun, nextLevel, results, ventPhase } from '../../../../src/games/clockwork-hollow/game.ts';
import { hollow, journey, movement as m } from '../../../../src/games/clockwork-hollow/content.ts';
import { hollowView } from '../../../../src/games/clockwork-hollow/presentation.ts';
const dt = 1 / 60;
const level = (solids, extra = {}) => ([{ ...hollow, name: 'Fixture', width: 1200, height: 900, patrols: [], vents: [], checkpoints: [],
  start: { x: 100, y: 460 }, solids, hazards: [], motes: [], goal: { x: 1150, y: 0, w: 20, h: 20 }, ...extra }]);
const floor = { x: 0, y: 500, w: 1200, h: 200 };
function advance(run, frames, action = idle) { for (let i = 0; i < frames; i++) { stepRun(run, action, dt); takeEvents(run); } }
const press = { ...idle, jumpPressed: true, jumpHeld: true };

test('platformer remains grounded, stops promptly, blocks both walls and ceilings, and resolves the nearest surface', () => {
  const run = createRun(level([floor, { x: 230, y: 370, w: 40, h: 130 }, { x: 60, y: 370, w: 130, h: 20 }]));
  advance(run, 180); assert.equal(run.player.y, 460); assert.equal(run.player.grounded, true);
  advance(run, 90, { ...idle, move: 1 }); assert.equal(run.player.x, 230 - m.width); assert.equal(run.player.vx, 0);
  advance(run, 25, { ...idle, move: -1 });
  const released = run.player.x; advance(run, 20); assert.ok(released - run.player.x < 20); assert.equal(run.player.vx, 0);
  run.player.x = 100; stepRun(run, press, dt);
  for (let i = 0; i < 40; i++) { stepRun(run, { ...idle, jumpHeld: true }, dt); assert.ok(run.player.y >= 390); }
  advance(run, 180); assert.equal(run.player.y, 460);
  const fast = createRun(level([floor, { x: 0, y: 300, w: 1200, h: 12 }], { start: { x: 100, y: 250 } }));
  fast.player.vy = 900; advance(fast, 8); assert.equal(fast.player.y, 260); assert.equal(fast.player.grounded, true);
});

test('jump release changes height, coyote time expires, and buffered landing jumps never auto-repeat', () => {
  function height(hold) {
    const run = createRun(level([floor])); advance(run, 2); stepRun(run, press, dt);
    let highest = run.player.y;
    for (let i = 0; i < 90; i++) { stepRun(run, { ...idle, jumpHeld: i < hold }, dt); highest = Math.min(highest, run.player.y); }
    return 460 - highest;
  }
  assert.ok(height(50) > 120); assert.ok(height(0) < 65); assert.ok(height(50) > height(0) * 2);
  const edge = () => { const run = createRun(level([{ ...floor, w: 150 }])); advance(run, 2); run.player.x = 151; return run; };
  const late = edge(); advance(late, 3); stepRun(late, press, dt); assert.ok(late.player.vy < -600);
  const missed = edge(); advance(missed, 9); stepRun(missed, press, dt); assert.ok(missed.player.vy > 0);
  const buffer = createRun(level([floor], { start: { x: 100, y: 440 } })); buffer.player.vy = 200;
  stepRun(buffer, press, dt); // Press while falling; contact will consume it.
  for (let i = 0; i < 5; i++) stepRun(buffer, { ...idle, jumpHeld: true }, dt);
  assert.ok(buffer.player.vy < 0); assert.equal(takeEvents(buffer).filter(e => e.type === 'jump').length, 1);
  advance(buffer, 150, { ...idle, jumpHeld: true }); assert.equal(buffer.player.grounded, true); assert.equal(buffer.player.vy, 0);
});

test('motes collect once, hazards and pits end runs, completion freezes rules, and restart is independent', () => {
  const run = createRun(level([floor], { motes: [{ x: 113, y: 480 }], goal: { x: 140, y: 450, w: 40, h: 50 } }));
  stepRun(run, idle, dt); assert.deepEqual(run.collected, [true]); assert.equal(takeEvents(run).filter(e => e.type === 'interaction').length, 1);
  advance(run, 4); assert.equal(takeEvents(run).length, 0);
  pauseRun(run, true); const frozen = structuredClone(run); stepRun(run, press, 10); assert.deepEqual(run, frozen);
  pauseRun(run, false); advance(run, 12, { ...idle, move: 1 }); assert.equal(run.status, 'victory');
  const won = structuredClone(run); stepRun(run, press, dt); assert.deepEqual(run, won);
  for (const fixture of [level([], { start: { x: 0, y: 950 } }), level([floor], { hazards: [{ x: 100, y: 480, w: 30, h: 20 }], goal: { x: 100, y: 460, w: 50, h: 50 } })]) {
    const dead = createRun(fixture); stepRun(dead, idle, dt); assert.equal(dead.status, 'defeat'); assert.equal(dead.completed, 0); assert.equal(takeEvents(dead)[0].type, 'damage');
    const lost = structuredClone(dead); stepRun(dead, press, dt); assert.deepEqual(dead, lost);
  }
  const a = createRun(), b = createRun(); a.collected[0] = true; assert.equal(b.collected[0], false); assert.notEqual(a.player, b.player);
});

test('platformer camera uses uniform scaling and bounded tracking at desktop, phone and short sizes', () => {
  for (const [w, h] of [[1280, 800], [390, 620], [740, 230]]) {
    for (const player of [{ x: 0, y: 0 }, { x: 2200, y: 450 }, { x: hollow.width, y: hollow.height }]) {
      const view = hollowView(w, h, hollow, player);
      assert.ok(view.width >= 700 - 1e-8); assert.ok(Math.abs(view.width * view.scale - w) < 1e-8); assert.ok(Math.abs(view.height * view.scale - h) < 1e-8);
      assert.ok(view.x >= 0 && view.x <= Math.max(0, hollow.width - view.width));
      if (view.height < hollow.height) assert.ok(view.y >= 0 && view.y + view.height <= hollow.height + 1e-8);
      else assert.equal(view.y, (hollow.height - view.height) / 2);
    }
  }
});

test('all three authored routes reach the final bell using only movement, jumps and safe vent crossings', () => {
  const takeoffs = [
[320,620,860,1050,1260,1850,2290,2470,2870,3120,3340,3700,3870,
4140,4990,5220,5800,6000,6220,6460,6720,7040,7280,7540,7770,8480,8730,9010,9280,9470,9830,10070,10800,11030,11310,11600,11810],
[1030,1320,1600,2060,2390,2760,3010,3280,3580,3850,5080,5340,5630,5940,6580,6890,7160,7440,7760,8030,8300,9650,9930,10220,10600,10950,11480,11740,12040,12400,12880],
[700,950,1210,1490,1810,2340,2600,2850,3100,3400,3660,3930,5240,5490,5750,6040,6420,6930,7260,7510,7770,8080,8350,8610,10040,10300,10560,10850,11220,11640,11970,12230,12510,12830,13110]
];

  const run = createRun(); let next = 0, bells = 0, checkpoints = 0;
  for (let frame = 0; frame < 18000 && run.status !== 'victory'; frame++) {
    if (run.status === 'interlude') {
      const frozen = structuredClone(run); stepRun(run, press, dt); assert.deepEqual(run, frozen);
      nextLevel(run); next = 0;
    }
    assert.equal(run.status, 'active', `level ${run.levelIndex + 1}, x ${run.player.x}, next jump ${next}`);
    let move = 1;
    for (const vent of run.level.vents) {
      const distance = vent.x - (run.player.x + m.width), phase = ((run.levelTime + vent.offset) % vent.period) / vent.period;
      if (distance > 0 && distance < 100 && phase > 0.31) move = 0;
    }
    const landmark = run.player.x >= takeoffs[run.levelIndex][next];
    const danger = run.enemies.some(e => e.alive && e.x - run.player.x < 115 && e.x + e.w > run.player.x && Math.abs(e.y + e.h - (run.player.y + m.height)) < 10);
    const jump = run.player.grounded && (landmark || danger);
    if (jump && landmark) next++;
    stepRun(run, { move, jumpPressed: jump, jumpHeld: true }, dt);
    for (const event of takeEvents(run)) {
      if (event.type === 'level' || event.type === 'complete') bells++;
      if (event.type === 'checkpoint') checkpoints++;
    }
  }
  assert.equal(run.status, 'victory'); assert.equal(bells, 3); assert.equal(checkpoints, 6);
  assert.equal(run.deaths, 0); assert.equal(run.completed, 3);
  assert.ok(results(run).motes >= 55); assert.ok(run.elapsed > 135 && run.elapsed < 170);
  const score = results(run).score; nextLevel(run); retryRun(run); stepRun(run, press, dt);
  assert.equal(results(run).score, score); assert.equal(takeEvents(run).length, 0);
});

test('checkpoint retry preserves discoveries and totals, resets threats, and full restart discards the ledger', () => {
  const fixture = level([floor], { checkpoints: [{ x: 100, y: 460, name: 'Test lantern' }], motes: [{ x: 113, y: 480 }],
    patrols: [{ x: 600, y: 474, w: 36, h: 26, to: 800, speed: 90 }] });
  const run = createRun(fixture); stepRun(run, idle, dt);
  assert.equal(run.checkpoint, 0); assert.equal(run.collected[0], true);
  assert.equal(takeEvents(run).filter(e => e.type === 'checkpoint').length, 1);
  run.player.y = 1000; stepRun(run, idle, dt); assert.equal(run.deaths, 1);
  const elapsed = run.elapsed; retryRun(run);
  assert.equal(run.status, 'active'); assert.equal(run.player.x, 100); assert.equal(run.player.y, 460);
  assert.equal(run.player.vx, 0); assert.equal(run.player.buffer, 0); assert.equal(run.elapsed, elapsed);
  assert.equal(run.enemies[0].x, 600); assert.equal(run.collected[0], true);
  advance(run, 5); assert.equal(takeEvents(run).length, 0); assert.equal(results(run).motes, 1);
  const fresh = createRun(fixture); assert.equal(fresh.checkpoint, -1); assert.equal(fresh.elapsed, 0); assert.equal(fresh.deaths, 0); assert.equal(results(fresh).score, 0);
});

test('beetles reverse at authored bounds, stomp bounces once, and side contact ends an attempt', () => {
  const fixture = level([floor], { patrols: [{ x: 200, y: 474, w: 36, h: 26, to: 250, speed: 90 }] });
  const run = createRun(fixture); advance(run, 50);
  assert.ok(run.enemies[0].x >= 200 && run.enemies[0].x <= 250); assert.equal(run.enemies[0].direction, -1);
  run.player.x = run.enemies[0].x; run.player.y = 430; run.player.vy = 300;
  stepRun(run, idle, dt); assert.equal(run.enemies[0].alive, false); assert.ok(run.player.vy < 0);
  assert.equal(takeEvents(run).filter(e => e.type === 'stomp').length, 1);
  const hit = createRun(fixture); hit.player.x = 205; stepRun(hit, idle, dt);
  assert.equal(hit.status, 'defeat'); assert.equal(hit.deaths, 1);
});

test('vents telegraph before damage, freeze when paused, and emit only at the active edge', () => {
  const vent = { x: 100, y: 345, w: 64, h: 155, period: 4, offset: 0 };
  assert.equal(ventPhase(vent, 0), 'idle'); assert.equal(ventPhase(vent, 2.2), 'warning'); assert.equal(ventPhase(vent, 3), 'active');
  const run = createRun(level([floor], { vents: [vent] }));
  advance(run, 145); assert.equal(run.status, 'active'); assert.equal(run.vents[0], 'warning');
  pauseRun(run, true); const snapshot = structuredClone(run); advance(run, 1000); assert.deepEqual(run, snapshot);
  pauseRun(run, false);
  let starts = 0;
  for (let i = 0; i < 80; i++) { stepRun(run, idle, dt); starts += takeEvents(run).filter(e => e.type === 'vent').length; }
  assert.equal(run.status, 'defeat'); assert.equal(starts, 1);
});

test('authored checkpoints and patrol bounds have safe physical support independent of their art', () => {
  for (const level of journey) {
    assert.equal(level.checkpoints.length, 2);
    for (const checkpoint of level.checkpoints) {
      assert.ok(level.solids.some(s => checkpoint.x >= s.x && checkpoint.x + m.width <= s.x + s.w && checkpoint.y + m.height === s.y));
      assert.ok(!level.hazards.some(h => h.x < checkpoint.x + m.width && h.x + h.w > checkpoint.x));
    }
    for (const enemy of level.patrols) assert.ok(level.solids.some(s => enemy.x >= s.x && enemy.to + enemy.w <= s.x + s.w && enemy.y + enemy.h === s.y));
  }
});
