import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, stepRun, pauseRun, takeEvents, bossTargets, bossLanes, enemyCharge, idle } from '../../../../src/games/skybreak/game.ts';
import { aircraft, flight, fortress, supplies, waves, volleyWindup } from '../../../../src/games/skybreak/content.ts';
import { flightView } from '../../../../src/games/skybreak/presentation.ts';
import { sweptCircle } from '../../../../src/engine/collision.ts';
const dt = 1 / 60;
const isolated = () => { const run = createRun(); run.nextWave = waves.length; return run; };
const enemy = (id, y) => ({ id, pattern: 'straight', x: 240, y, originX: 240, originY: y, age: 0, side: 1, health: 1, fireIn: 99 });
const incoming = run => run.bullets.push({ x: run.player.x, y: run.player.y - 40, vx: 0, vy: 6000, radius: 5, owner: 'enemy' });

test('Skybreak sweeps fast bullets against moving targets, resolves nearest hit once, and culls escaped objects', () => {
  assert.notEqual(sweptCircle({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 30 }, { x: 50, y: -30 }, 5), undefined);
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

test('Skybreak dangerous volleys prepare visibly on entry and track current aim until release', () => {
  for (const pattern of ['swoop', 'interceptor']) {
    const run = isolated(); run.nextSupply = supplies.length;
    const e = { ...enemy(0, -40), pattern, health: 4, fireIn: 0 };
    run.enemies = [e];
    while (e.y <= 20) {
      assert.equal(enemyCharge(e, run.player), undefined);
      stepRun(run, idle, dt);
      assert.equal(run.bullets.length, 0);
    }
    assert.ok(e.fireIn >= volleyWindup[pattern] - dt - 1e-9);
    assert.ok(enemyCharge(e, run.player) < 0.1);
    const snapshot = structuredClone(run);
    enemyCharge(e, run.player); assert.deepEqual(run, snapshot);
    pauseRun(run, true); const charge = enemyCharge(e, run.player);
    stepRun(run, idle, 2); assert.equal(enemyCharge(e, run.player), charge);
    pauseRun(run, false);
    while (e.fireIn > dt) {
      stepRun(run, idle, dt);
      assert.equal(run.bullets.length, 0);
    }
    assert.ok(enemyCharge(e, run.player) > 0.9);
    run.player.x = 420;
    stepRun(run, idle, dt);
    assert.equal(run.bullets.length, pattern === 'swoop' ? 3 : 2);
    const direction = Math.atan2(run.bullets.reduce((sum, b) => sum + b.vx, 0), run.bullets.reduce((sum, b) => sum + b.vy, 0));
    assert.ok(Math.abs(direction - Math.atan2(run.player.x - e.x, run.player.y - e.y)) < 1e-9);
    assert.equal(enemyCharge(e, run.player), undefined);
    e.fireIn = 0.1;
    assert.equal(enemyCharge(e, { x: 240, y: e.y + 60 }), undefined);
    // Losing firing space resets preparation instead of storing an almost-fired volley.
    run.player.y = 40; stepRun(run, idle, dt);
    assert.equal(e.fireIn, volleyWindup[pattern]);
  }
  assert.equal(enemyCharge(enemy(0, 100), { x: 240, y: 660 }), undefined);
});

test('Skybreak schedules deterministic formations and supplies over a bounded full sortie', () => {
  const first = createRun(), second = createRun();
  for (let i = 0; i < Math.ceil(flight.duration / dt) + 2; i++) {
    for (const run of [first, second]) {
      // Protection isolates scheduling and object budgets from pilot skill.
      run.player.immunity = 10; stepRun(run, { ...idle, fire: true }, dt); takeEvents(run);
      assert.ok(run.enemies.length <= 16); assert.ok(run.bullets.length < 220); assert.ok(run.pickups.length <= 2);
    }
    if (i === 58) assert.equal(first.nextWave, 0);
    if (i === 61) assert.equal(first.nextWave, 1);
  }
  assert.deepEqual(first, second); assert.equal(first.nextWave, waves.length); assert.equal(first.nextSupply, supplies.length);
  assert.equal(first.status, 'victory'); assert.equal(first.boss.health, 0); assert.ok(first.elapsed <= flight.duration + dt);
  assert.ok(first.score > 0); assert.equal(first.enemies.length, 0); assert.ok(first.boss);
  assert.deepEqual(new Set(waves.map(w => w.pattern)), new Set(['straight', 'crossing', 'swoop', 'interceptor']));
});

function pickup(run, kind) { run.pickups.push({ x: run.player.x, y: run.player.y, kind, age: 0 }); stepRun(run, idle, dt); }
test('Skybreak pickups have distinct bounded effects, expire only in active time, and life loss reduces loadout', () => {
  const run = isolated(); run.nextSupply = supplies.length;
  pickup(run, 'power'); assert.equal(run.player.power, 1);
  stepRun(run, { ...idle, fire: true }, dt); assert.equal(run.bullets.length, 3);
  run.bullets = []; run.player.fireIn = 0;
  pickup(run, 'power'); pickup(run, 'power'); assert.equal(run.player.power, 2);
  pickup(run, 'spread'); stepRun(run, { ...idle, fire: true }, dt);
  assert.equal(run.bullets.length, 5); assert.equal(run.bullets.filter(b => b.vx !== 0).length, 2);
  pauseRun(run, true); const frozen = structuredClone(run); stepRun(run, idle, 30); assert.deepEqual(run, frozen); pauseRun(run, false);
  for (let i = 0; i < 1442; i++) { stepRun(run, idle, dt); takeEvents(run); }
  assert.equal(run.player.spread, 0);
  run.player.health = 1; pickup(run, 'repair'); assert.equal(run.player.health, 2);
  run.player.health = 1; run.player.immunity = 0; incoming(run); stepRun(run, idle, dt);
  assert.equal(run.player.power, 1); assert.equal(run.player.spread, 0); assert.equal(run.player.recharge, 0);
  assert.equal(run.stats.pickups, 5); assert.equal(createRun().player.power, 0);
});
function bossRun() {
  const run = isolated(); run.nextSupply = supplies.length; run.elapsed = fortress.at;
  stepRun(run, idle, dt); return run;
}
test('Skybreak fortress entrance, telegraphed patterns, phase change, and damage stay in simulation', () => {
  const run = bossRun(), b = run.boss;
  run.bullets.push({ x: b.x, y: b.y, vx: 0, vy: 0, radius: 3, owner: 'player' });
  stepRun(run, idle, dt); assert.equal(b.health, fortress.health); assert.equal(run.bullets.filter(x => x.owner === 'enemy').length, 0);
  while (b.age < fortress.entrance + 0.8) { stepRun(run, idle, dt); takeEvents(run); }
  assert.ok(b.charge > 0); assert.equal(run.bullets.filter(x => x.owner === 'enemy').length, 0);
  const attacks = new Set();
  for (let i = 0; i < 900; i++) { run.player.immunity = 10; stepRun(run, idle, dt); if (b.charge > 0) attacks.add(b.attack); takeEvents(run); }
  assert.deepEqual(attacks, new Set(['fan', 'aim', 'lanes'])); assert.equal(bossLanes(b).length, 3);
  takeEvents(run);
  b.attack = 'aim'; b.charge = dt / 2; b.aimX = 0; b.aimY = 700; run.player.x = 450; run.bullets = [];
  stepRun(run, idle, dt);
  assert.equal(takeEvents(run).filter(event => event.type === 'boss-shot').length, 1);
  assert.equal(run.bullets.length, 6); assert.ok(run.bullets.every(shot => shot.vx < 0)); // Target lock never follows a later player move.
  b.attack = 'aim'; b.charge = dt / 2; b.aimX = b.x; b.aimY = 40; run.bullets = [];
  stepRun(run, idle, dt); assert.ok(run.bullets.every(shot => shot.vy < 0)); // The warning remains accurate even above the fortress.
  b.health = 210; b.fireIn = 0;
  stepRun(run, idle, dt); assert.equal(b.phase, 2);
  run.bullets = [{ x: b.x, y: b.y + 130, vx: 0, vy: -10000, radius: 3, owner: 'player' }];
  stepRun(run, idle, dt); assert.equal(b.health, 209); assert.ok(takeEvents(run).some(event => event.type === 'hit' && event.target === 'boss'));
  assert.equal(bossTargets(b).length, 3);
});

test('Skybreak victory requires a fortress kill, destruction freezes on pause, and bonus is awarded once', () => {
  const timeout = isolated(); timeout.elapsed = flight.duration - dt / 2; timeout.player.immunity = 10;
  stepRun(timeout, idle, dt); assert.equal(timeout.status, 'defeat');
  const run = bossRun(), b = run.boss; b.age = fortress.entrance; b.y = 150; b.health = 1;
  run.bullets = [{ x: b.x, y: 280, vx: 0, vy: -10000, radius: 3, owner: 'player' }];
  stepRun(run, idle, dt); assert.equal(b.health, 0); assert.equal(run.status, 'active'); assert.equal(run.score, 5000);
  assert.equal(run.bullets.length, 0); assert.equal(takeEvents(run).filter(e => e.type === 'boss-break').length, 1);
  pauseRun(run, true); const frozen = structuredClone(run); stepRun(run, idle, 5); assert.deepEqual(run, frozen); pauseRun(run, false);
  for (let i = 0; i < 170; i++) stepRun(run, idle, dt);
  assert.equal(run.status, 'victory'); assert.equal(run.bonus, 3750); assert.equal(run.score, 8750);
  const result = structuredClone(run); stepRun(run, { ...idle, fire: true }, dt); assert.deepEqual(run, result);
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
