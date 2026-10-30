import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, stepRun, takeEvents, idle, pauseRun, nextMission, readyToExtract } from '../../../../src/games/blastline/game.ts';
import { missions, TILE, body, limits } from '../../../../src/games/blastline/content.ts';
import { bodyClear, createTerrain, damageTile, indexAt, moveBody, traceTerrain } from '../../../../src/games/blastline/terrain.ts';
import { queueExplosion, resolveExplosions, spawnProjectile, stepProjectiles, visible } from '../../../../src/games/blastline/combat.ts';
import { blastView } from '../../../../src/games/blastline/presentation.ts';
import { movePlayer } from '../../../../src/games/blastline/movement.ts';
const dt = 1 / 60;
function fixture(extra = {}) {
  const columns = 40, rows = 20, terrain = Array(columns * rows).fill(0);
  for (let r = 16; r < 20; r++) for (let c = 0; c < columns; c++) terrain[r * columns + c] = r < 18 ? 2 : 1;
  return { ...missions[0], columns, rows, terrain, start: { x: 48, y: 354 }, checkpoints: [], enemies: [], barrels: [], relays: [], rescue: null, exit: { x: 850, y: 300, w: 60, h: 84 }, signs: [], ...extra };
}
function advance(run, count, action = idle) { for (let i = 0; i < count; i++) { stepRun(run, action, dt); takeEvents(run); } }
const blast = (x, y, radius = 70) => ({ x, y, radius, damage: 1, tileDamage: 8, source: 'player' });
const shot = (extra = {}) => ({ x: 60, y: 366, vx: 30000, vy: 0, life: 2, kind: 'bullet', friendly: true, damage: 2, tileDamage: 1, radius: 0, ...extra });

for (const operator of ['nova', 'bolt']) test(`${operator} remembers a fresh fire tap near recovery once, but expires early taps and released holds`, () => {
  const make = () => {
    const run = createRun([fixture({ relays: [{ x: 850, y: 350 }] })]);
    run.player.operator = operator;
    return run;
  };
  const run = make(); run.player.cooldown = .08;
  stepRun(run, { ...idle, fire: true, firePressed: true }, dt);
  assert.equal(run.projectiles.length, 0);
  advance(run, 6);
  assert.equal(run.projectiles.length, 1, 'a released tap fires when recovery ends');
  takeEvents(run);
  for (let i = 0; i < 60; i++) {
    stepRun(run, idle, dt);
    assert.equal(takeEvents(run).filter(e => e.type === 'shot' || e.type === 'launch').length, 0, 'the tap never repeats');
  }

  const early = make(); early.player.cooldown = .3;
  stepRun(early, { ...idle, fire: true, firePressed: true }, dt);
  advance(early, 20);
  assert.equal(early.projectiles.length, 0, 'old intent must expire before a long recovery ends');

  const held = make(); held.player.cooldown = .08;
  stepRun(held, { ...idle, fire: true }, dt);
  advance(held, 6);
  assert.equal(held.projectiles.length, 0, 'releasing a hold does not queue a trailing shot');
});

test('pause, operator switches and death discard queued fire intent', () => {
  for (const interrupt of ['pause', 'switch', 'death']) {
    const run = createRun([fixture({ relays: [{ x: 850, y: 350 }] })]);
    run.player.cooldown = .08;
    stepRun(run, { ...idle, fire: true, firePressed: true }, dt);
    assert.ok(run.player.fireBuffer > 0);
    if (interrupt === 'pause') { pauseRun(run, true); pauseRun(run, false); }
    if (interrupt === 'switch') { run.rescued = true; stepRun(run, { ...idle, switch: true }, dt); }
    if (interrupt === 'death') { run.player.immune = 0; run.player.y = 600; stepRun(run, idle, dt); }
    assert.equal(run.player.fireBuffer, 0, interrupt);
    advance(run, 100);
    assert.equal(run.projectiles.length, 0, interrupt);
  }
});

test('jump buffering, release height and coyote time survive landing and removed support without repeat jumps', () => {
  function jumpHeight(held) {
    const run = createRun([fixture()]);
    movePlayer(run, idle, dt);
    const ground = run.player.y;
    movePlayer(run, { ...idle, jumpPressed: true, jumpHeld: held }, dt);
    let top = run.player.y, jumps = takeEvents(run).filter(e => e.type === 'jump').length;
    for (let i = 0; i < 80; i++) {
      movePlayer(run, { ...idle, jumpHeld: held }, dt);
      top = Math.min(top, run.player.y);
      jumps += takeEvents(run).filter(e => e.type === 'jump').length;
    }
    assert.equal(jumps, 1); assert.ok(run.player.grounded);
    return ground - top;
  }
  assert.ok(jumpHeight(true) > jumpHeight(false) * 3);
  const landing = createRun([fixture()]);
  Object.assign(landing.player, { y: 347, vy: 300 });
  movePlayer(landing, { ...idle, jumpPressed: true, jumpHeld: true }, dt);
  assert.ok(landing.player.buffer > 0);
  movePlayer(landing, { ...idle, jumpHeld: true }, dt);
  assert.equal(takeEvents(landing).filter(e => e.type === 'jump').length, 1);
  assert.ok(landing.player.vy < -400); assert.equal(landing.player.buffer, 0);

  for (const delay of [3, 10]) {
    const run = createRun([fixture()]); movePlayer(run, idle, dt);
    for (const r of [16, 17]) for (let c = 1; c < 6; c++) damageTile(run.terrain, indexAt(run.terrain, c, r), 9);
    for (let i = 0; i < delay; i++) movePlayer(run, idle, dt);
    takeEvents(run);
    movePlayer(run, { ...idle, jumpPressed: true, jumpHeld: true }, dt);
    assert.equal(takeEvents(run).filter(e => e.type === 'jump').length, delay === 3 ? 1 : 0);
  }
});

test('terrain damage is finite, bounded, idempotent and owned by each fresh run', () => {
  const m = fixture(), a = createRun([m]), b = createRun([m]);
  const i = indexAt(a.terrain, 4, 16), structural = indexAt(a.terrain, 4, 18);
  assert.equal(damageTile(a.terrain, i, 1), false); assert.equal(a.terrain.health[i], 2);
  assert.equal(damageTile(a.terrain, i, 2), true); assert.equal(a.terrain.material[i], 0);
  const revision = a.terrain.revision;
  for (const n of [-1, NaN, Infinity, 0, 1e9]) damageTile(a.terrain, i, n);
  assert.equal(a.terrain.revision, revision);
  for (const index of [-1, structural, 1e9]) assert.equal(damageTile(a.terrain, index, 99), false);
  assert.equal(a.terrain.material[structural], 1); assert.equal(b.terrain.material[i], 2); assert.equal(m.terrain[i], 2);
  assert.deepEqual(createRun([m]).terrain, b.terrain);
});

test('swept terrain contact blocks fast shots before actors and opens collision and sight after destruction', () => {
  const m = fixture({ enemies: [{ x: 310, y: 354, kind: 'guard', patrol: 0 }] });
  m.terrain[15 * m.columns + 10] = 2;
  const run = createRun([m]), from = { x: 70, y: 366 }, to = { x: 600, y: 366 };
  assert.equal(visible(run, from, to), false);
  assert.ok(Math.abs(traceTerrain(run.terrain, from, to).time - 170 / 530) < 1e-9);
  assert.equal(bodyClear(run.terrain, { x: 240, y: 360, w: 18, h: 20 }), false);
  for (let n = 0; n < 3; n++) { spawnProjectile(run, shot()); stepProjectiles(run, dt); }
  assert.equal(run.enemies[0].health, 3); assert.equal(run.terrain.material[15 * m.columns + 10], 0);
  assert.equal(visible(run, from, to), true); assert.equal(bodyClear(run.terrain, { x: 240, y: 360, w: 18, h: 20 }), true);
  spawnProjectile(run, shot()); stepProjectiles(run, dt); assert.equal(run.enemies[0].health, 1);
  const actor = { x: 200, y: 354, w: 18, h: 30, vx: 6000, vy: 0, grounded: false };
  moveBody(run.terrain, actor, dt); assert.equal(actor.x, 300);
  damageTile(run.terrain, 16 * m.columns + 6, 8);
  assert.equal(traceTerrain(run.terrain, { x: 144, y: 384 }, { x: 167, y: 384 }), undefined);
});

test('explosion geometry, cyclic barrel chains and repeated damage terminate exactly once', () => {
  const run = createRun([fixture({ barrels: [{ x: 210, y: 370 }, { x: 275, y: 370 }, { x: 340, y: 370 }, { x: 700, y: 370 }] })]);
  queueExplosion(run, blast(200, 370, 28)); resolveExplosions(run);
  assert.deepEqual(run.barrels.map(b => b.detonated), [true, true, true, false]);
  assert.equal(run.explosions.length, 0);
  const events = takeEvents(run); assert.equal(events.filter(e => e.type === 'chain').length, 3);
  assert.equal(events.filter(e => e.type === 'explosion').length, 4);
  const destroyed = run.destroyed;
  queueExplosion(run, blast(200, 370, 28)); resolveExplosions(run);
  assert.equal(takeEvents(run).filter(e => e.type === 'chain').length, 0); assert.equal(run.destroyed, destroyed);
  assert.equal(run.terrain.material[18 * run.terrain.columns + 10], 1);
  const outside = createRun([fixture({ enemies: [{ x: 300, y: 354, kind: 'guard', patrol: 0 }, { x: 361, y: 354, kind: 'guard', patrol: 0 }] })]);
  queueExplosion(outside, blast(300, 369, 60)); resolveExplosions(outside);
  assert.equal(outside.enemies[0].health, 2); assert.equal(outside.enemies[1].health, 3);
});

test('destroyed support causes both player and enemy to fall onto the structural route', () => {
  const run = createRun([fixture({ start: { x: 98, y: 354 }, enemies: [{ x: 148, y: 354, kind: 'heavy', patrol: 0 }], relays: [{ x: 800, y: 350 }] })]);
  advance(run, 5); assert.equal(run.player.grounded, true); assert.equal(run.enemies[0].grounded, true);
  queueExplosion(run, blast(135, 396, 52)); resolveExplosions(run);
  stepRun(run, idle, dt); assert.equal(run.player.grounded, false); assert.equal(run.enemies[0].grounded, false);
  advance(run, 60); assert.equal(run.player.y, 402); assert.equal(run.enemies[0].y, 402);
  assert.equal(run.player.grounded, true); assert.equal(run.enemies[0].grounded, true);
});

test('rescue unlocks demolition, exit requirements gate extraction, and transitions and pause freeze rules', () => {
  const m = fixture({ rescue: { x: 90, y: 354 }, relays: [{ x: 400, y: 352 }], checkpoints: [{ x: 450, y: 354 }] });
  const run = createRun([m, fixture()]);
  run.player.x = 870; advance(run, 5); assert.equal(run.extraction, 0); assert.equal(readyToExtract(run), false);
  run.player.x = 90; stepRun(run, idle, dt); assert.equal(run.rescued, true); assert.equal(run.player.operator, 'bolt');
  stepRun(run, { ...idle, switch: true }, dt); assert.equal(run.player.operator, 'nova');
  run.relays[0].health = 0; run.player.x = 870; stepRun(run, idle, dt); assert.ok(run.extraction > 0);
  pauseRun(run, true); const frozen = structuredClone(run); stepRun(run, idle, 60); assert.deepEqual(run, frozen);
  pauseRun(run, false); advance(run, 190); assert.equal(run.status, 'interlude');
  const between = structuredClone(run); stepRun(run, idle, dt); assert.deepEqual(run, between);
  nextMission(run); assert.equal(run.missionIndex, 1); assert.equal(run.player.operator, 'bolt');
  run.player.x = 870; advance(run, 190); assert.equal(run.status, 'victory');
  const won = structuredClone(run); stepRun(run, idle, dt); nextMission(run); assert.deepEqual(run, won);
});

test('checkpoints replenish once, death consumes lives and fresh runs restore the world and rescue', () => {
  const run = createRun([fixture({ checkpoints: [{ x: 100, y: 354 }], relays: [{ x: 800, y: 350 }] })]);
  run.player.x = 100; run.player.health = 2; run.grenades = 0; stepRun(run, idle, dt);
  assert.equal(run.checkpoint, 0); assert.equal(run.player.health, 5); assert.equal(run.grenades, 4);
  run.player.health = 3; run.grenades = 1; advance(run, 5); assert.equal(run.player.health, 3); assert.equal(run.grenades, 1);
  damageTile(run.terrain, 16 * run.terrain.columns + 20, 9); run.rescued = true;
  run.player.y = 600; run.player.immune = 0; stepRun(run, idle, dt); assert.equal(run.lives, 4); assert.equal(run.player.health, 0);
  advance(run, 80); assert.equal(run.player.x, 100); assert.equal(run.player.health, 5); assert.equal(run.terrain.material[16 * run.terrain.columns + 20], 0);
  const fresh = createRun([run.mission]); assert.equal(fresh.lives, 5); assert.equal(fresh.rescued, false); assert.equal(fresh.destroyed, 0);
  assert.equal(fresh.terrain.material[16 * fresh.terrain.columns + 20], 2);
});

test('weapon timing, explosive fuses and all transient populations remain bounded under sustained fire', () => {
  const run = createRun([fixture({ relays: [{ x: 850, y: 350 }] })]);
  advance(run, 60, { ...idle, fire: true });
  assert.ok(run.projectiles.length < 12); // finite shot life, even with no contact
  for (let i = 0; i < limits.projectiles * 3; i++) spawnProjectile(run, shot({ vx: 0 }));
  assert.equal(run.projectiles.length, limits.projectiles);
  for (let i = 0; i < limits.explosions * 3; i++) queueExplosion(run, blast(-100, -100, 1));
  assert.equal(run.explosions.length, limits.explosions); resolveExplosions(run); assert.equal(run.explosions.length, 0);
  assert.ok(run.events.length <= limits.events);
  run.projectiles = []; run.grenades = 4;
  stepRun(run, { ...idle, grenade: true }, dt); assert.equal(run.grenades, 3);
  advance(run, 80); assert.equal(run.projectiles.filter(p => p.kind === 'grenade').length, 0);
  run.player.operator = 'bolt'; run.player.cooldown = 0;
  stepRun(run, { ...idle, fire: true }, dt); const cooldown = run.player.cooldown;
  assert.ok(cooldown > .6); advance(run, 20, { ...idle, fire: true }); assert.ok(run.player.cooldown < cooldown);
});

test('authored critical objectives retain safe access even after every destructible tile is removed', () => {
  for (const m of missions) {
    const t = createTerrain(m);
    for (let i = 0; i < t.material.length; i++) damageTile(t, i, 999);
    for (const point of [...m.relays, ...m.checkpoints, ...(m.rescue ? [m.rescue] : []), m.exit]) {
      assert.ok(bodyClear(t, { x: point.x, y: point.y, w: body.w, h: body.h }));
      const a = { x: point.x, y: point.y, w: body.w, h: body.h, vx: 0, vy: 600, grounded: false };
      for (let i = 0; i < 40; i++) { a.vy = Math.min(640, a.vy + 1350 * dt); moveBody(t, a, dt); }
      assert.ok(a.grounded); assert.ok(a.y <= 666); // at most a two-tile drop; ordinary jump clears it
    }
    assert.ok(m.barrels.length + limits.projectiles < limits.explosions);
  }
});

test('camera uses a single bounded uniform transform for high and low positions', () => {
  for (const m of missions) for (const [w, h] of [[1280, 800], [390, 600], [740, 220]]) for (const [x, y] of [[24, 100], [3400, 400], [m.columns * TILE - 60, 660]]) {
    const v = blastView(w, h, m, { x, y, vx: 210 });
    assert.ok(v.width >= (w < 600 ? 480 : 620) - 1e-8); assert.ok(Math.abs(v.width * v.scale - w) < 1e-8); assert.ok(Math.abs(v.height * v.scale - h) < 1e-8);
    assert.ok(v.x >= 0 && v.x <= Math.max(0, m.columns * TILE - v.width));
    assert.ok(y + body.h >= v.y && y <= v.y + v.height);
  }
});

for (const destroyedWorld of [false, true]) test(`both missions complete through actions with ${destroyedWorld ? 'all destructible terrain already removed' : 'intact authored terrain'}`, async () => {
  const { solidAt } = await import('../../../../src/games/blastline/terrain.ts');
  const run = createRun();
  const erase = () => { if (destroyedWorld) for (let i = 0; i < run.terrain.material.length; i++) damageTile(run.terrain, i, 999); };
  erase();
  let rescues = 0, extractions = 0, usedNova = false, usedBolt = false, highest = 700;
  for (let frame = 0; frame < 18000 && run.status !== 'victory'; frame++) {
    if (run.status === 'interlude') { nextMission(run); erase(); }
    assert.equal(run.status, 'active', `mission ${run.missionIndex}, x ${run.player.x}`);
    const p = run.player, target = run.relays.find(r => r.health > 0) ?? run.enemies.find(e => e.kind === 'bastion' && e.health > 0);
    let move = 1;
    if (target) {
      const distance = target.x - p.x;
      if (distance < (target.y + 16 < p.y ? 20 : 220) && distance > 18) move = 0;
      else if (distance < 18) move = -1;
    }
    const obstacle = [3, 15, 27].some(y => solidAt(run.terrain, p.x + (move >= 0 ? 24 : -6), p.y + y));
    const jump = p.grounded && (obstacle || !!target && Math.abs(target.x - p.x) < 240 && frame % 130 === 0);
    stepRun(run, { ...idle, move, fire: true, jumpPressed: jump, jumpHeld: true,
      grenade: !!target && Math.abs(target.x - p.x) < 240 && p.grounded && run.grenades > 0 && frame % 150 === 0 }, dt);
    if (run.missionIndex === 1) highest = Math.min(highest, p.y);
    for (const e of takeEvents(run)) {
      if (e.type === 'rescue') rescues++;
      if (e.type === 'extract') extractions++;
      if (e.type === 'shot' && e.strength === 1) usedNova = true;
      if (e.type === 'launch') usedBolt = true;
    }
    assert.ok(run.projectiles.length <= limits.projectiles); assert.equal(run.explosions.length, 0);
  }
  assert.equal(run.status, 'victory'); assert.equal(rescues, 1); assert.equal(extractions, 3);
  assert.ok(usedNova && usedBolt); assert.ok(highest < 500); if (!destroyedWorld) assert.ok(run.destroyed > 100); assert.ok(run.kills > 20);
  assert.ok(run.lives > 0); assert.ok(run.elapsed > 110 && run.elapsed < 240);
  assert.ok(run.enemies.find(e => e.kind === 'bastion').health === 0);
});
