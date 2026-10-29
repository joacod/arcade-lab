import test from 'node:test';
import assert from 'node:assert/strict';
import { clearing, encounters, enemies } from '../../../../src/games/last-light-clearing/content.ts';
import { createRun, pauseRun, stepRun, takeEvents } from '../../../../src/games/last-light-clearing/game.ts';
import { chargeDestination, prepareAttack } from '../../../../src/games/last-light-clearing/encounters.ts';
import { equip, grantXP, releaseChoice, selectUpgrade, xpThreshold } from '../../../../src/games/last-light-clearing/progression.ts';
import { hurtKeeper } from '../../../../src/games/last-light-clearing/combat.ts';
import { clearingCue } from '../../../../src/games/last-light-clearing/sound.ts';
import { advanceHalo } from '../../../../src/games/last-light-clearing/weapons/halo.ts';
import { firePulse } from '../../../../src/games/last-light-clearing/weapons/pulse.ts';
import { fireShard } from '../../../../src/games/last-light-clearing/weapons/shard.ts';
import { cadence } from '../../../../src/games/last-light-clearing/weapon-stats.ts';

const dt = 1 / 60, idle = { x: 0, y: 0 };
function isolated() {
  const run = createRun(42); run.enemies = []; run.gems = []; run.nextSpawn = Infinity; run.loadout = [];
  return run;
}
function creature(kind, x, y, id = 10) {
  const enemy = { id, kind, x, y, health: enemies[kind].maxHealth, entryDelay: 0 };
  prepareAttack(enemy); return enemy;
}
function advance(run, seconds, move = idle) {
  for (let tick = 0; tick < Math.round(seconds / dt); tick++) stepRun(run, move, dt);
}

test('early offers reserve support, explain effective rank changes, and prioritize recovery when injured', () => {
  const run = createRun(1);
  grantXP(run, xpThreshold(run));
  assert.deepEqual(run.progression.choices.map(choice => choice.id), ['upgrade_halo', 'upgrade_spark', 'power']);
  assert.match(run.progression.choices.find(choice => choice.id === 'upgrade_spark').description, /10 damage · every 0.7s → 13 damage · every 0.6s/);
  assert.match(run.progression.choices.find(choice => choice.id === 'power').description, /Spark 10 → 11 damage/);
  selectUpgrade(run, 'upgrade_halo'); releaseChoice(run);
  run.player.health = 50;
  grantXP(run, xpThreshold(run));
  assert.equal(run.progression.choices[0].id, 'recovery');
  assert.match(run.progression.choices[0].description, /Restore 20 HP/);
  assert.equal(new Set(run.progression.choices.map(choice => choice.id)).size, 3);
  selectUpgrade(run, 'recovery'); releaseChoice(run);
  assert.equal(run.player.health, 70);
});

test('ranks change coverage while Halo retains shared per-target hit windows', () => {
  const run = isolated(), halo = { ...equip('halo'), rank: 2 };
  run.enemies = [creature('crawler', 516, 320, 1), creature('crawler', 444, 320, 2)];
  advanceHalo(run, halo, 0);
  assert.deepEqual(run.enemies.map(enemy => enemy.health), [12, 12]);
  advanceHalo(run, halo, 0);
  assert.deepEqual(run.enemies.map(enemy => enemy.health), [12, 12]);
  run.enemies = [creature('crawler', 578, 320)];
  firePulse(run, equip('pulse')); assert.equal(run.enemies[0].health, 20);
  firePulse(run, { ...equip('pulse'), rank: 2 }); assert.equal(run.enemies[0].health, 2);
  for (const [rank, count] of [[1, 4], [2, 6], [3, 8]]) {
    run.projectiles = []; fireShard(run, { ...equip('shard'), rank });
    assert.equal(run.projectiles.length, count);
    assert.ok(run.projectiles.every(shot => Math.abs(Math.hypot(shot.dx, shot.dy) - 1) < 1e-9));
  }
  assert.ok(cadence('spark', 3) < cadence('spark', 2));
});

test('charger locks a lane, allows a sideways dodge and exposes a harmless recovery window', () => {
  const run = isolated(), charger = creature('charger', 300, 320);
  charger.attack.remaining = 0; run.enemies = [charger];
  stepRun(run, idle, dt);
  assert.equal(charger.attack.phase, 'windup');
  const locked = structuredClone(charger.attack);
  pauseRun(run, true); advance(run, 3);
  assert.deepEqual(charger.attack, locked);
  pauseRun(run, false);
  advance(run, 0.8, { x: 0, y: 1 });
  assert.deepEqual(charger.attack.direction, { x: 1, y: 0 });
  advance(run, 0.9);
  assert.equal(charger.y, 320); assert.equal(run.player.health, 100);
  assert.equal(charger.attack.phase, 'recover');
  run.player.x = charger.x; run.player.y = charger.y;
  stepRun(run, idle, dt); assert.equal(run.player.health, 100);
  const struck = isolated(), other = creature('charger', 300, 320);
  other.attack.remaining = 0; struck.enemies = [other];
  advance(struck, 1.6);
  assert.equal(struck.player.health, 86);
});

test('elite slam commits to its warning circle, shares immunity and is cancelled by a killing shot', () => {
  const run = isolated(), elite = creature('elite_crawler', 420, 320);
  elite.attack.remaining = 0; run.enemies = [elite];
  stepRun(run, idle, dt); assert.equal(elite.attack.phase, 'windup');
  const origin = { ...elite.attack.origin };
  advance(run, 1.2, { x: 0, y: 1 });
  assert.deepEqual(elite.attack.origin, origin); assert.equal(run.player.health, 100);
  const hit = isolated(), attacker = creature('elite_crawler', 420, 320);
  attacker.attack.phase = 'strike'; attacker.attack.remaining = encounters.elite.strike;
  hit.enemies = [attacker]; hit.player.shield = 30;
  stepRun(hit, idle, dt);
  assert.equal(hit.player.health, 100); assert.equal(hit.player.shield, 6);
  advance(hit, 0.1); assert.equal(hit.player.shield, 6);
  const event = takeEvents(hit).find(event => event.type === 'player-hit');
  assert.equal(event.absorbed, 24); assert.equal(event.damage, 0); assert.equal(clearingCue(event), 'halo');
  const killed = isolated(), doomed = creature('elite_crawler', 420, 320);
  doomed.attack.phase = 'windup'; doomed.attack.remaining = dt; doomed.health = 1;
  killed.enemies = [doomed];
  killed.projectiles = [{ x: 420, y: 320, weapon: 'spark', dx: 1, dy: 0, remaining: 1, damage: 10, chainLimit: 1, hitTargets: [] }];
  stepRun(killed, idle, dt); assert.equal(killed.player.health, 100); assert.equal(killed.stats.eliteKills, 1);
});

test('charge warnings and movement stop on the same line at a physical boundary', () => {
  const run = isolated(), charger = creature('charger', 900, 600);
  charger.attack.phase = 'strike'; charger.attack.remaining = encounters.charger.strike;
  charger.attack.direction = { x: 0.6, y: 0.8 };
  const end = chargeDestination(charger.attack.origin, charger.attack.direction);
  run.enemies = [charger];
  advance(run, 0.7);
  assert.ok(Math.hypot(charger.x - end.x, charger.y - end.y) < 1e-9);
  assert.equal(end.y, clearing.arena.height - enemies.charger.radius);
  assert.ok(Math.abs((end.x - 900) / (end.y - 600) - 0.75) < 1e-9);
});

test('special attacks admit one commitment at a time and partial shielding reports actual health loss', () => {
  const run = isolated();
  run.enemies = [creature('charger', 300, 320, 1), creature('elite_crawler', 420, 320, 2)];
  for (const enemy of run.enemies) enemy.attack.remaining = 0;
  stepRun(run, idle, dt);
  assert.equal(run.enemies.filter(enemy => enemy.attack.phase === 'windup').length, 1);
  run.player.shield = 4; hurtKeeper(run, 10);
  const event = takeEvents(run).find(event => event.type === 'player-hit');
  assert.equal(event.absorbed, 4); assert.equal(event.damage, 6); assert.equal(clearingCue(event), 'player-hit');
  assert.equal(run.player.invulnerability, clearing.keeper.contactCooldown);
});
