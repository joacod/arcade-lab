import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, stepRun, pauseRun, takeEvents, sweptHit, idle } from '../src/skybreak/game.ts';
import { aircraft, flight, waves } from '../src/skybreak/content.ts';
import { flightView } from '../src/skybreak/presentation.ts';
const dt = 1 / 60;
const isolated = () => { const run = createRun(); run.nextWave = waves.length; return run; };
const enemy = (id, y) => ({ id, pattern: 'straight', x: 240, y, originX: 240, originY: y, age: 0, side: 1, health: 1, fireIn: 99 });
const incoming = run => run.bullets.push({ x: run.player.x, y: run.player.y - 40, vx: 0, vy: 6000, radius: 5, owner: 'enemy' });

test('Skybreak sweeps fast bullets against moving targets, resolves nearest hit once, and culls escaped objects', () => {
  assert.notEqual(sweptHit({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 30 }, { x: 50, y: -30 }, 5), undefined);
  const run = isolated(); run.enemies = [enemy(0, 450), enemy(1, 550)];
  run.bullets.push({ x: 240, y: 600, vx: 0, vy: -12000, radius: 3, owner: 'player' });
  stepRun(run, idle, dt);
  assert.deepEqual(run.enemies.map(e => e.id), [0]); assert.equal(run.score, aircraft.straight.score);
  assert.equal(run.bullets.length, 0); assert.equal(takeEvents(run).filter(e => e.type === 'explosion').length, 1);
  stepRun(run, idle, dt); assert.equal(run.score, 100);
  run.bullets.push({ x: 0, y: 900, vx: 0, vy: 1, radius: 3, owner: 'enemy' });
  run.enemies[0].originY = 900; stepRun(run, idle, dt);
  assert.equal(run.bullets.length, 0); assert.equal(run.enemies.length, 0);
});

test('Skybreak damage grants immunity, life loss respawns safely, evade is limited, and defeat freezes rules', () => {
  const run = isolated(); incoming(run); incoming(run); stepRun(run, idle, dt);
  assert.equal(run.player.health, 2); assert.ok(run.player.immunity > 0);
  incoming(run); stepRun(run, idle, dt); assert.equal(run.player.health, 2);
  run.player.immunity = 0; incoming(run); stepRun(run, { ...idle, evade: true }, dt);
  assert.equal(run.player.health, 2); assert.ok(run.player.roll > 0);
  const recharge = run.player.recharge;
  stepRun(run, { ...idle, evade: true }, dt); assert.ok(run.player.recharge < recharge);
  run.player.roll = 0; run.player.immunity = 0; run.player.health = 1; run.player.x = 120;
  incoming(run); run.bullets.push({ x: 100, y: 200, vx: 0, vy: 100, radius: 5, owner: 'enemy' });
  stepRun(run, idle, dt);
  assert.equal(run.player.lives, 2); assert.equal(run.player.health, 3);
  assert.equal(run.player.x, 240); assert.equal(run.player.y, 660); assert.ok(run.player.immunity > 2);
  assert.equal(run.bullets.length, 0);
  run.player.lives = 1; run.player.health = 1; run.player.immunity = 0;
  incoming(run); stepRun(run, idle, dt); assert.equal(run.status, 'defeat'); assert.equal(run.player.lives, 0);
  const frozen = structuredClone(run); stepRun(run, { ...idle, fire: true }, 1); assert.deepEqual(run, frozen);
});

test('Skybreak schedules deterministic formations in active time and completes a bounded sortie', () => {
  const first = createRun(), second = createRun();
  for (let i = 0; i < Math.ceil(flight.duration / dt) + 1; i++) {
    // Invulnerability isolates authored scheduling from survivability in this invariant.
    for (const run of [first, second]) {
      run.player.immunity = 10; stepRun(run, { ...idle, fire: true }, dt); takeEvents(run);
      assert.ok(run.enemies.length <= 15); assert.ok(run.bullets.length < 180);
    }
    if (i === 58) assert.equal(first.nextWave, 0);
    if (i === 61) assert.equal(first.nextWave, 1);
  }
  assert.deepEqual(first, second); assert.equal(first.nextWave, waves.length); assert.equal(first.status, 'victory');
  assert.ok(first.score > 0); assert.equal(first.enemies.length, 0);
  assert.deepEqual(new Set(waves.map(w => w.pattern)), new Set(['straight', 'crossing', 'swoop']));
});

test('Skybreak pauses every timer and action, and restart constructs independent pristine state', () => {
  const run = createRun(); stepRun(run, { ...idle, x: 1, y: -1, fire: true, evade: true }, dt);
  assert.ok(Math.abs(Math.hypot(run.player.x - 240, run.player.y - 660) - 300 * dt) < 1e-9);
  pauseRun(run, true); const frozen = structuredClone(run);
  stepRun(run, { ...idle, fire: true, evade: true }, 60); assert.deepEqual(run, frozen);
  pauseRun(run, false); stepRun(run, idle, dt); assert.ok(run.elapsed < 0.1);
  const fresh = createRun(); assert.deepEqual(fresh, createRun()); assert.notEqual(fresh.bullets, run.bullets);
  assert.equal(fresh.elapsed, 0); assert.equal(fresh.player.recharge, 0); assert.equal(fresh.player.lives, 3);
});

test('Skybreak portrait projection stays uniformly scaled at desktop, narrow, and short sizes', () => {
  for (const [w, h] of [[1280, 800], [390, 690], [740, 230]]) {
    const view = flightView(w, h);
    assert.ok(view.scale > 0); assert.ok(view.x >= 0); assert.ok(view.y >= 0);
    assert.ok(view.x + flight.width * view.scale <= w + 1e-9);
    assert.ok(view.y + flight.height * view.scale <= h + 1e-9);
    assert.equal(view.x + 240 * view.scale, w / 2);
  }
});
