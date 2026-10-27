import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, stepRun, pauseRun, takeEvents } from '../../../../src/games/last-light-clearing/game.ts';
import { clearing, enemies, weapons } from '../../../../src/games/last-light-clearing/content.ts';

const idle = { x: 0, y: 0 };
const dt = 1 / 60;
function advance(run, seconds, move = idle) {
  for (let i = 0; i < Math.round(seconds / dt); i++) stepRun(run, move, dt);
}
function isolated() {
  const run = createRun(123);
  run.enemies = [];
  run.nextSpawn = Infinity;
  return run;
}
const enemy = (id, x, y, health = enemies.crawler.maxHealth) => ({ id, kind: 'crawler', x, y, health, entryDelay: 0 });
const shot = (x, y, dx = 1, dy = 0) => ({ x, y, dx, dy, weapon: 'spark', damage: 10, chainLimit: 1, hitTargets: [], remaining: weapons.spark.lifetime });

test('swept radius hits the nearest intersection once, skips dead targets, and expires', () => {
  const run = isolated();
  run.player.y = 100;
  // Enemy order differs from spatial order. Endpoints miss both circles.
  run.enemies = [enemy(2, 140, 100), enemy(1, 115, 114), enemy(3, 105, 100, 0)];
  run.projectiles = [shot(80, 100)];
  stepRun(run, idle, 0.25);
  assert.equal(run.enemies.find(e => e.id === 1).health, 10);
  assert.equal(run.enemies.find(e => e.id === 2).health, 20);
  assert.equal(run.projectiles.length, 0);
  assert.equal(run.stats.damageDealt, 10);
  advance(run, 0.2);
  assert.equal(run.stats.damageDealt, 10);

  const expiry = isolated();
  expiry.enemies = [enemy(1, 200, 100)];
  expiry.projectiles = [{ ...shot(80, 100), remaining: 0.01 }];
  stepRun(expiry, idle, 0.5);
  assert.equal(expiry.stats.damageDealt, 0);
  assert.equal(expiry.projectiles.length, 0);
});

test('overlapping shots resolve one death, one kill and no dead-enemy contact', () => {
  const run = isolated();
  run.enemies = [enemy(1, run.player.x, run.player.y, 10)];
  run.projectiles = [shot(run.player.x, run.player.y), shot(run.player.x, run.player.y)];
  stepRun(run, idle, dt);
  assert.equal(run.stats.kills, 1);
  assert.equal(run.stats.damageDealt, 10);
  assert.equal(run.player.health, 100);
  assert.equal(run.enemies.length, 0);
  assert.equal(run.projectiles.length, 1);
  const events = takeEvents(run);
  assert.equal(events.filter(e => e.type === 'enemy-defeated').length, 1);
  assert.equal(events.filter(e => e.type === 'enemy-hit').length, 1);
  assert.deepEqual(takeEvents(run), []);
  advance(run, 0.2);
  assert.equal(run.stats.kills, 1);
});

test('Spark cadence chooses the nearest living enemy and does not bank targetless shots', () => {
  const run = isolated();
  advance(run, 2.1);
  assert.equal(run.stats.shots, 0);
  run.enemies = [enemy(1, 900, 320), enemy(2, 480, 500), enemy(3, 481, 320, 0)];
  stepRun(run, idle, dt);
  assert.equal(run.stats.shots, 0);
  advance(run, 0.7 - dt);
  assert.equal(run.stats.shots, 1);
  assert.equal(run.projectiles[0].dx, 0);
  assert.equal(run.projectiles[0].dy, 1);
});

test('contact immunity is shared and persistent contact can hurt again', () => {
  const run = isolated();
  run.loadout[0].cooldown = Infinity;
  run.enemies = [enemy(1, 480, 320), enemy(2, 480, 320)];
  stepRun(run, idle, dt);
  assert.equal(run.player.health, 90);
  advance(run, 0.7 - dt);
  assert.equal(run.player.health, 90);
  stepRun(run, idle, dt);
  assert.equal(run.player.health, 80);
  assert.equal(run.stats.damageTaken, 20);
});

test('lethal final-tick contact precedes victory and outcomes freeze all gameplay', () => {
  for (const lethal of [true, false]) {
    const run = isolated();
    run.elapsed = clearing.round.duration - dt;
    run.player.health = lethal ? 10 : 20;
    run.enemies = [enemy(1, 480, 320)];
    run.entries = [{ x: 24, y: 24, kind: 'crawler', remaining: dt }];
    run.nextSpawn = run.elapsed;
    stepRun(run, idle, dt);
    assert.equal(run.outcome, lethal ? 'defeat' : 'victory');
    assert.equal(run.player.health, lethal ? 0 : 10);
    assert.equal(run.elapsed, clearing.round.duration);
    assert.deepEqual(run.entries, []);
    assert.deepEqual(run.projectiles, []);
    assert.equal(run.events.filter(e => e.type === 'outcome').length, 1);
    const ended = structuredClone(run);
    advance(run, 10, { x: 1, y: 1 });
    assert.deepEqual(run, ended);
  }
});

test('pause freezes warning, attacks, immunity and active time; retry owns fresh state', () => {
  const run = createRun(321);
  advance(run, 1.2);
  assert.ok(run.entries.length > 0);
  assert.ok(run.events.length > 0);
  pauseRun(run, true);
  const frozen = structuredClone(run);
  advance(run, 60, { x: 1, y: 0 });
  assert.deepEqual(run, frozen);
  pauseRun(run, false);
  const previousShots = run.stats.shots;
  const previousSpawns = run.stats.spawned;
  stepRun(run, idle, dt);
  assert.equal(run.stats.shots, previousShots);
  assert.equal(run.stats.spawned, previousSpawns);
  assert.ok(Math.abs(run.elapsed - frozen.elapsed - dt) < 1e-9);
  const fresh = createRun(321);
  assert.deepEqual(fresh, createRun(321));
  assert.equal(fresh.player.health, 100);
  assert.equal(fresh.loadout[0].cooldown, weapons.spark.cadence);
  assert.equal(fresh.nextSpawn, 1);
  assert.equal(fresh.enemies.length, 1);
  assert.deepEqual(fresh.entries, []);
  assert.deepEqual(fresh.projectiles, []);
  assert.deepEqual(fresh.events, []);
  assert.equal(fresh.outcome, null);
  assert.notEqual(fresh.stats, run.stats);
  assert.notEqual(fresh.player, run.player);
});

test('spawn phases, warning safety, population cap and skipped slots stay bounded', () => {
  const run = createRun(456);
  advance(run, 1);
  assert.equal(run.entries.length, 1);
  const entry = run.entries[0];
  assert.ok(Math.hypot(entry.x - run.player.x, entry.y - run.player.y) >= clearing.round.entryMinDistance);
  assert.equal(entry.remaining, clearing.round.entryWarning);
  assert.equal(run.enemies.length, 1);
  advance(run, 0.7);
  assert.equal(run.entries.length, 0);
  assert.equal(run.stats.spawned, 2);

  for (const [boundary, interval] of [[60, 0.65], [120, 0.4]]) {
    run.elapsed = boundary - dt;
    run.nextSpawn = boundary;
    stepRun(run, idle, dt);
    assert.ok(Math.abs(run.nextSpawn - boundary - interval) < 1e-9);
  }
  const capped = isolated();
  capped.nextSpawn = 1;
  capped.loadout[0].cooldown = Infinity;
  capped.enemies = Array.from({ length: clearing.round.ordinaryCap - 1 }, (_, i) => enemy(i, 24, 24));
  capped.entries = [{ x: 24, y: 24, kind: 'crawler', remaining: 10 }];
  advance(capped, 2);
  assert.equal(capped.enemies.length + capped.entries.length, clearing.round.ordinaryCap);
  assert.equal(capped.nextSpawn, 3);
  capped.enemies = [];
  stepRun(capped, idle, dt);
  assert.equal(capped.entries.length, 1); // No refill backlog after capacity frees up.

  const a = createRun(987), b = createRun(987);
  advance(a, 5); takeEvents(a); advance(b, 5);
  assert.equal(a.randomState, b.randomState);
  assert.deepEqual(a.entries, b.entries);
});
