import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, stepRun, pauseRun, takeEvents } from '../../../../src/games/last-light-clearing/game.ts';
import { clearing, weapons, enemies } from '../../../../src/games/last-light-clearing/content.ts';
import { content, validateContent } from '../../../../src/games/last-light-clearing/content-validation.ts';
import { choiceLevel, equip, grantXP, pickupRadius, releaseChoice, selectUpgrade, xpThreshold } from '../../../../src/games/last-light-clearing/progression.ts';
import { hitEnemy, weaponDamage } from '../../../../src/games/last-light-clearing/combat.ts';
import { advanceHalo, orbitPosition } from '../../../../src/games/last-light-clearing/weapons/halo.ts';
import { firePulse } from '../../../../src/games/last-light-clearing/weapons/pulse.ts';
import { fireShard } from '../../../../src/games/last-light-clearing/weapons/shard.ts';

const idle = { x: 0, y: 0 }, dt = 1 / 60;
const enemy = (id, x, y, kind = 'crawler') => ({ id, x, y, kind, health: enemies[kind].maxHealth, entryDelay: 0 });
function isolated() { const run = createRun(123); run.enemies = []; run.gems = []; run.nextSpawn = Infinity; return run; }
function choose(run, id) { assert.ok(selectUpgrade(run, id), `${id} should be offered`); releaseChoice(run); }
function earn(run, id) { grantXP(run, xpThreshold(run) - run.progression.xp); choose(run, id); }
function autoChoose(run) {
  while (run.status === 'choosing') choose(run, run.progression.choices[0].id);
}

test('batched gems preserve excess XP, queue levels in order, and freeze until separate confirmation release', () => {
  const run = isolated();
  run.gems = [10, 50, 5].map(amount => ({ ...run.player, amount, attracted: false }));
  stepRun(run, idle, dt);
  assert.equal(run.stats.xpCollected, 65);
  assert.equal(run.progression.level, 4);
  assert.equal(run.progression.xp, 20);
  assert.equal(run.progression.pending, 3);
  assert.equal(choiceLevel(run), 2);
  assert.deepEqual(run.progression.choices.map(choice => choice.id), ['upgrade_halo', 'upgrade_spark', 'power']);
  assert.equal(run.gems.length, 0);
  const before = structuredClone(run);
  assert.equal(selectUpgrade(run, 'lens'), false); // Defined, but not offered at level 2.
  assert.equal(selectUpgrade(run, 'unrecognized'), false);
  assert.deepEqual(run, before);
  stepRun(run, { x: 1, y: 1 }, 60);
  pauseRun(run, true); pauseRun(run, false); // Manual pause cannot bypass a pending choice.
  assert.deepEqual(run, before);
  assert.ok(selectUpgrade(run, 'upgrade_spark'));
  const confirming = structuredClone(run);
  assert.equal(selectUpgrade(run, 'upgrade_halo'), false);
  grantXP(run, 500); stepRun(run, idle, 1);
  assert.deepEqual(run, confirming);
  assert.equal(run.status, 'choosing');
  releaseChoice(run);
  assert.equal(choiceLevel(run), 3);
  assert.deepEqual(run.progression.choices.map(choice => choice.id), ['upgrade_halo', 'upgrade_spark', 'lens']);
  choose(run, 'lens');
  choose(run, 'upgrade_spark');
  assert.equal(run.status, 'active');
  assert.equal(run.progression.pending, 0);
  assert.equal(run.progression.xp, 20);
  assert.equal(run.loadout[0].id, 'arc_spark');
});

test('evolution works in either order, preserves slot/rank/cadence and other attacks, and chains to distinct targets', () => {
  for (const lensFirst of [true, false]) {
    const run = isolated();
    earn(run, 'upgrade_spark');
    earn(run, lensFirst ? 'lens' : 'upgrade_spark');
    run.loadout.push(equip('shard'));
    run.loadout[0].cooldown = 0.23;
    run.projectiles = ['spark', 'shard'].map(weapon => ({ x: 100, y: 100, dx: 1, dy: 0, weapon, damage: 10, chainLimit: 1, hitTargets: [], remaining: 3 }));
    earn(run, lensFirst ? 'upgrade_spark' : 'lens');
    assert.deepEqual(run.loadout.map(slot => slot.id), ['arc_spark', 'shard']);
    assert.equal(run.loadout[0].rank, 3);
    assert.equal(run.loadout[0].cooldown, 0.23);
    assert.deepEqual(run.projectiles.map(shot => shot.weapon), ['shard']);
    assert.equal(run.events.filter(event => event.type === 'evolution').length, 1);
    // Evolved Spark cannot be ranked/unlocked again.
    grantXP(run, xpThreshold(run));
    assert.ok(!run.progression.choices.some(choice => choice.id === 'upgrade_spark'));
    choose(run, run.progression.choices[0].id);
    run.projectiles = [];
    run.enemies = [1, 2, 3, 4].map(id => enemy(id, run.player.x + id * 35, run.player.y));
    run.loadout = [run.loadout[0]];
    run.loadout[0].cooldown = 0;
    stepRun(run, idle, dt);
    run.loadout[0].cooldown = Infinity;
    for (let i = 0; i < 60; i++) stepRun(run, idle, dt);
    assert.equal(run.stats.damageDealt, 45);
    assert.equal(run.enemies.filter(enemy => enemy.health === 5).length, 3);
    assert.equal(run.enemies.filter(enemy => enemy.health === 20).length, 1);
    assert.equal(run.projectiles.length, 0);
  }
});

test('late choices remain three effective options, modifiers stack, and Recovery overflow shields contact', () => {
  const run = isolated();
  run.loadout = Object.keys(weapons).map(base => ({ ...equip(base), rank: 3 }));
  run.loadout[0].id = 'arc_spark'; run.modifiers.lens = true;
  run.player.health = 93;
  earn(run, 'recovery');
  assert.equal(run.player.health, 100); assert.equal(run.player.shield, 13);
  earn(run, 'recovery'); assert.equal(run.player.shield, 33);
  for (let i = 0; i < 2; i++) earn(run, 'power');
  assert.equal(weaponDamage(run, run.loadout[0]), 16);
  earn(run, 'reach'); assert.equal(pickupRadius(run), 88);
  grantXP(run, xpThreshold(run));
  assert.deepEqual(run.progression.choices.map(choice => choice.id), ['recovery', 'power', 'reach']);
  choose(run, 'reach');
  assert.equal(pickupRadius(run), 96);
  run.enemies = [enemy(99, run.player.x, run.player.y, 'elite_crawler')];
  run.loadout = [];
  stepRun(run, idle, dt);
  assert.equal(run.player.health, 100); assert.equal(run.player.shield, 13);
  stepRun(run, idle, dt); assert.equal(run.player.shield, 13);
  const reachFirst = isolated();
  reachFirst.modifiers.reach = 16;
  earn(reachFirst, 'upgrade_spark'); earn(reachFirst, 'lens');
  assert.equal(pickupRadius(reachFirst), 96);
});

test('gems drop once, retain attraction, collect once, and stay frozen during pause/outcome', () => {
  const run = isolated(), target = enemy(2, 700, 400, 'elite_crawler');
  hitEnemy(run, target, 1000); hitEnemy(run, target, 1000);
  assert.equal(run.gems.length, 1); assert.equal(run.gems[0].amount, 50);
  assert.equal(run.stats.eliteKills, 1);
  run.gems = [{ x: run.player.x + 47, y: run.player.y, amount: 5, attracted: false }];
  stepRun(run, idle, dt); assert.equal(run.gems[0].attracted, true);
  run.player.x -= 100;
  const beforeX = run.gems[0].x;
  stepRun(run, idle, dt); assert.ok(run.gems[0].x < beforeX);
  pauseRun(run, true); const frozen = structuredClone(run); stepRun(run, idle, 10); assert.deepEqual(run, frozen);
  pauseRun(run, false);
  for (let i = 0; i < 60; i++) stepRun(run, idle, dt);
  assert.equal(run.gems.length, 0); assert.equal(run.progression.xp, 5);
  stepRun(run, idle, dt); assert.equal(run.progression.xp, 5);
  run.elapsed = 180 - dt; run.gems.push({ ...run.player, amount: 50, attracted: true });
  stepRun(run, idle, dt);
  assert.equal(run.outcome, 'victory'); assert.deepEqual(run.gems, []); assert.equal(run.progression.xp, 5);
});

test('Halo keeps per-target windows through rank/power changes; Pulse samples once and Shard fires cardinal shots', () => {
  const run = isolated(), halo = equip('halo');
  run.loadout = [halo];
  const at = orbitPosition(run, halo);
  run.enemies = [enemy(7, at.x, at.y, 'elite_crawler')];
  advanceHalo(run, halo, 0); assert.equal(run.enemies[0].health, 234);
  halo.rank = 2; run.modifiers.power = 0.05;
  run.elapsed = 0.49; advanceHalo(run, halo, 0); assert.equal(run.enemies[0].health, 234);
  run.elapsed = 0.5; advanceHalo(run, halo, 0); assert.equal(run.enemies[0].health, 226);
  assert.equal(halo.nextHit.get(7), 1);
  run.enemies = [enemy(1, run.player.x + 80, run.player.y)];
  const pulse = equip('pulse'); firePulse(run, pulse);
  assert.equal(run.enemies[0].health, 5); // ceil(14 + 0.7)
  run.enemies.push(enemy(2, run.player.x, run.player.y));
  run.loadout = []; stepRun(run, idle, dt);
  assert.equal(run.enemies.find(enemy => enemy.id === 2).health, 20);
  fireShard(run, equip('shard'));
  assert.deepEqual(run.projectiles.map(shot => [Math.round(shot.dx) || 0, Math.round(shot.dy) || 0]), [[0, -1], [1, 0], [0, 1], [-1, 0]]);
  assert.ok(run.projectiles.every(shot => shot.damage === 9));
});

test('elite is independent of the ordinary cap, appears at deadline, and cannot interact during warning', () => {
  const run = isolated();
  run.elapsed = 120 - dt; run.nextSpawn = 120;
  run.enemies = Array.from({ length: 60 }, (_, i) => enemy(i + 10, 24, 24));
  stepRun(run, idle, dt);
  const elite = run.enemies.find(enemy => enemy.kind === 'elite_crawler');
  assert.ok(elite); assert.equal(elite.entryDelay, 0.7); assert.equal(elite.health, 240);
  assert.equal(run.enemies.length, 61); assert.equal(run.entries.length, 0);
  run.player.x = elite.x; run.player.y = elite.y; run.loadout = [];
  const hp = run.player.health;
  hitEnemy(run, elite, 500); assert.equal(elite.health, 240);
  for (let i = 0; i < 41; i++) stepRun(run, idle, dt);
  assert.equal(run.player.health, hp);
  stepRun(run, idle, dt); assert.equal(run.player.health, hp - 20);
  assert.equal(run.enemies.filter(enemy => enemy.kind === 'elite_crawler').length, 1);
  assert.ok(Math.abs(run.nextSpawn - 120.8) < 1e-9);
});

test('a complete progressed round wins, idle play can lose, and retry reconstructs all mutable state', () => {
  const snapshot = structuredClone(content), run = createRun(42);
  const waypoints = [[760, 200], [760, 440], [200, 440], [200, 200]];
  let next = 0, sawElite = false;
  for (let i = 0; i < 180 * 60 && !run.outcome; i++) {
    autoChoose(run);
    let [x, y] = waypoints[next];
    if (run.gems.length) { const gem = run.gems.reduce((a, b) => Math.hypot(a.x - run.player.x, a.y - run.player.y) < Math.hypot(b.x - run.player.x, b.y - run.player.y) ? a : b); x = gem.x; y = gem.y; }
    if (Math.hypot(x - run.player.x, y - run.player.y) < 3) { next = (next + 1) % 4; [x, y] = waypoints[next]; }
    const dx = x - run.player.x, dy = y - run.player.y, length = Math.max(1, Math.hypot(dx, dy));
    stepRun(run, { x: dx / length, y: dy / length }, dt); takeEvents(run);
    sawElite ||= run.enemies.some(enemy => enemy.kind === 'elite_crawler');
    assert.ok(run.enemies.filter(enemy => !enemies[enemy.kind].elite).length + run.entries.length <= 60);
  }
  assert.equal(run.outcome, 'victory'); assert.ok(sawElite);
  assert.ok(run.progression.level > 1); assert.ok(run.stats.upgrades > 0);
  const idleRun = createRun(42);
  for (let i = 0; i < 180 * 60 && !idleRun.outcome; i++) { autoChoose(idleRun); stepRun(idleRun, idle, dt); }
  assert.equal(idleRun.outcome, 'defeat');
  const fresh = createRun(42);
  assert.deepEqual(fresh, createRun(42));
  assert.deepEqual(content, snapshot);
  assert.equal(fresh.loadout.length, 1); assert.equal(fresh.loadout[0].id, 'spark');
  assert.equal(fresh.progression.level, 1); assert.equal(fresh.progression.pending, 0);
  assert.equal(fresh.player.shield, 0); assert.equal(fresh.eliteSpawned, false);
  assert.deepEqual(fresh.gems, [{ ...clearing.openingGem, attracted: false }]); assert.deepEqual(fresh.events, []);
  assert.notEqual(fresh.loadout[0].nextHit, run.loadout[0].nextHit);
});

test('content validation diagnoses broken values and references before a run starts', () => {
  assert.deepEqual(validateContent(), []);
  const invalid = structuredClone(content);
  invalid.weapons.spark.cadence = NaN;
  invalid.upgrades[0].weapon = 'missing';
  invalid.evolution.passive = 'missing';
  invalid.clearing.round.phases[1].start = 0;
  invalid.clearing.round.entryMinDistance = 530; // Beyond the farthest sampled edge from the center.
  const errors = validateContent(invalid);
  for (const field of ['weapons.spark.cadence', 'upgrades.upgrade_spark.weapon', 'evolution.passive', 'round.phases[1].start', 'round.entryMinDistance']) assert.ok(errors.some(error => error.includes(field)), field);
});
