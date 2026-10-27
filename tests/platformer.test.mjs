import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, stepRun, pauseRun, takeEvents, idle } from '../src/platformer/game.ts';
import { hollow, movement as m } from '../src/platformer/content.ts';
import { hollowView } from '../src/platformer/presentation.ts';
const dt = 1 / 60;
const level = (solids, extra = {}) => ({ name: 'Fixture', width: 1200, height: 900,
  start: { x: 100, y: 460 }, solids, hazards: [], motes: [], goal: { x: 1150, y: 0, w: 20, h: 20 }, ...extra });
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
  for (const fixture of [level([], { start: { x: 0, y: 950 } }), level([floor], { hazards: [{ x: 100, y: 480, w: 30, h: 20 }] })]) {
    const dead = createRun(fixture); stepRun(dead, idle, dt); assert.equal(dead.status, 'defeat'); assert.equal(takeEvents(dead)[0].type, 'damage');
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

test('the authored aqueduct can be completed by ordinary movement and jumps with no state overrides', () => {
  const run = createRun();
  // Takeoff landmarks cover every required gap, both thorn patches and the final staircase.
  const takeoffs = [320, 620, 860, 1050, 1260, 1850, 2290, 2470, 2870, 3120, 3340, 3700, 3870];
  let next = 0, completions = 0;
  for (let frame = 0; frame < 1800 && run.status === 'active'; frame++) {
    const jump = next < takeoffs.length && run.player.grounded && run.player.x >= takeoffs[next];
    if (jump) next++;
    stepRun(run, { move: 1, jumpPressed: jump, jumpHeld: true }, dt);
    completions += takeEvents(run).filter(event => event.type === 'complete').length;
  }
  assert.equal(run.status, 'victory'); assert.equal(completions, 1); assert.equal(next, takeoffs.length);
  assert.ok(run.collected.filter(Boolean).length >= 8); assert.ok(run.elapsed < 30);
});
