import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, stepRun, takeEvents, pauseRun, nextStage, stageOf, canHit, attackPhase, idle } from '../../../../src/games/midnight-circuit/game.ts';
import { attacks, stages, fighter } from '../../../../src/games/midnight-circuit/content.ts';
import { circuitView } from '../../../../src/games/midnight-circuit/presentation.ts';
const dt = 1 / 60;
function advance(run, frames, action = idle) {
  const events = []; for (let i = 0; i < frames; i++) { stepRun(run, action, dt); events.push(...takeEvents(run)); } return events;
}
function arena(kinds = ['striker'], waves) {
  const fixture = { ...stages[0], width: 1200, start: { x: 200, lane: 90 }, pickups: [],
    encounters: [{ name: 'Test fight', trigger: 200, left: 0, right: 900, repair: 20,
      waves: waves ?? [kinds.map((kind, i) => ({ kind, x: 250 + i * 8, lane: 90 }))] }] };
  const run = createRun([fixture]); advance(run, 1);
  for (const enemy of run.enemies) enemy.cooldown = 999;
  return run;
}
function swing(run, a, kind, time = 0) { a.attack = { id: run.nextSwing++, kind, time, hits: [], sounded: false }; }

test('brawler attack phases own contact timing, each swing hits once, and a buffered combo advances', () => {
  const run = arena(), e = run.enemies[0]; e.health = e.maxHealth = 500;
  stepRun(run, { ...idle, light: true }, dt);
  assert.equal(attackPhase(run.player.attack), 'startup'); assert.equal(e.health, 500);
  advance(run, 2); assert.equal(e.health, 500);
  advance(run, 1); assert.equal(attackPhase(run.player.attack), 'active'); assert.equal(e.health, 485);
  advance(run, 5); assert.equal(e.health, 485);
  assert.equal(run.player.attack.hits.length, 1);
  stepRun(run, { ...idle, light: true }, dt); // During recovery, retain one press for the next swing.
  advance(run, 12); assert.equal(run.player.attack.kind, 'cross');
  e.x = run.player.x + 45; e.vx = 0;
  advance(run, 9); assert.equal(e.health, 466);
  const id = run.player.attack.id;
  advance(run, 20); stepRun(run, { ...idle, light: true }, dt);
  assert.equal(run.player.attack.kind, 'finisher'); assert.ok(run.player.attack.id > id);
  e.x = run.player.x + 45; e.vx = 0; advance(run, 10); assert.equal(e.health, 436);
  advance(run, 60); stepRun(run, { ...idle, light: true }, dt); assert.equal(run.player.attack.kind, 'jab');
});

test('brawler targeting uses facing, authored reach, lane depth and airborne eligibility', () => {
  const run = arena(), p = run.player, e = run.enemies[0];
  assert.equal(canHit(p, e, 'jab'), true);
  p.facing = -1; assert.equal(canHit(p, e, 'jab'), false); e.x = p.x - 45; assert.equal(canHit(p, e, 'jab'), true);
  p.facing = 1; e.x = p.x + attacks.jab.reach + e.radius + 1; assert.equal(canHit(p, e, 'jab'), false);
  e.x = p.x + 45; e.lane = p.lane + 40; assert.equal(canHit(p, e, 'jab'), false); assert.equal(canHit(p, e, 'heavy'), true);
  e.lane = p.lane; e.elevation = 55; assert.equal(canHit(p, e, 'jab'), false);
  p.elevation = 70; assert.equal(canHit(p, e, 'air'), true); p.elevation = 160; assert.equal(canHit(p, e, 'air'), false);
  e.elevation = 0; p.elevation = 70; assert.equal(canHit(e, p, 'quake'), false);
  p.elevation = 0; assert.equal(canHit(e, p, 'quake'), true); p.lane += 100; assert.equal(canHit(e, p, 'quake'), false);
  e.immune = 1; assert.equal(canHit(p, e, 'heavy'), false);
});

test('jabs isolate one target while heavy attacks control crowds; hitstun cancels windups and knockback recovers', () => {
  const run = arena(['striker', 'striker']);
  stepRun(run, { ...idle, light: true }, dt); advance(run, 10);
  assert.equal(run.enemies.filter(e => e.health < e.maxHealth).length, 1);
  assert.equal(run.hits, 1);
  advance(run, 20);
  for (const e of run.enemies) { e.x = 265; e.vx = 0; e.lane = 90; swing(run, e, 'strike'); }
  stepRun(run, { ...idle, heavy: true }, dt); advance(run, 17);
  for (const e of run.enemies) { assert.equal(e.attack, null); assert.ok(e.stun > .6); assert.ok(e.vx > 200); }
  const x = run.enemies[0].x; advance(run, 12); assert.ok(run.enemies[0].x > x + 10);
  advance(run, 60, { ...idle, x: -1 }); assert.equal(run.player.attack, null); assert.ok(run.player.x < 190);
});

test('player immunity, lost lives and respawn prevent repeated contact; defeat freezes and fresh runs are independent', () => {
  const run = arena(['bruiser', 'striker']), p = run.player;
  for (const e of run.enemies) { e.x = p.x + 40; e.facing = -1; swing(run, e, 'smash', attacks.smash.startup - dt); }
  advance(run, 1); assert.equal(p.health, 83); assert.ok(p.stun > 0); assert.ok(p.immune > .8);
  for (const e of run.enemies) swing(run, e, 'smash', attacks.smash.startup - dt);
  advance(run, 1); assert.equal(p.health, 83);
  while (run.lives > 0) {
    p.immune = 0; p.health = 1; const e = run.enemies[0]; e.x = p.x + 35; e.lane = p.lane; e.facing = -1;
    swing(run, e, 'smash', attacks.smash.startup - dt); advance(run, 1);
    if (run.lives > 0) { assert.equal(p.health, 0); assert.ok(run.enemies.every(e => e.attack === null)); advance(run, 70); assert.equal(p.health, 100); assert.ok(p.immune > 1.8); }
  }
  assert.equal(run.status, 'defeat'); const lost = structuredClone(run); advance(run, 120); assert.deepEqual(run, lost);
  const a = createRun(), b = createRun(); a.player.health = 1; a.pickups[0].collected = true; a.score = 99;
  assert.equal(b.player.health, 100); assert.equal(b.pickups[0].collected, false); assert.equal(b.score, 0);
  assert.equal(b.lives, 3); assert.equal(b.elapsed, 0); assert.equal(b.enemies.length, 0);
});

test('gates bound enemies and players, defeat clears each wave, and repairs collect once before stage transitions', () => {
  const run = arena([], [[{ kind: 'striker', x: 250, lane: 90 }], [{ kind: 'bruiser', x: 300, lane: 90 }]]);
  advance(run, 300, { ...idle, x: 1 }); assert.ok(run.player.x <= 876); assert.equal(run.encounter, 0); assert.equal(run.gated, true);
  for (let wave = 0; wave < 2; wave++) {
    run.player.x = 600;
    const e = run.enemies.find(e => e.health > 0); e.health = 1; e.cooldown = 999; e.x = run.player.x - 60; e.lane = run.player.lane;
    stepRun(run, { ...idle, x: -1, heavy: true }, dt); advance(run, 20);
    assert.equal(e.health, 0); assert.equal(e.attack, null);
    advance(run, 65);
  }
  assert.equal(run.gated, false); assert.equal(run.encounter, 1); assert.equal(run.cleared, 1); assert.equal(run.enemies.length, 0);
  assert.equal(run.pickups.length, 1); const pickup = run.pickups[0]; run.player.health = 50;
  run.player.x = pickup.x; run.player.lane = pickup.lane; advance(run, 1); assert.equal(run.player.health, 70);
  const score = run.score; advance(run, 10); assert.equal(run.score, score);
  advance(run, 120, { ...idle, x: 1 }); assert.equal(run.status, 'victory');
});

test('boss attacks telegraph distinct volumes, recover vulnerably, and defeat resolves a bounded finale once', () => {
  const run = arena(['warden']), boss = run.enemies[0], p = run.player;
  boss.x = p.x + 150; boss.facing = -1; swing(run, boss, 'quake');
  advance(run, 60); assert.equal(p.health, 100); assert.equal(attackPhase(boss.attack), 'startup');
  advance(run, 7); assert.equal(p.health, 77); assert.equal(attackPhase(boss.attack), 'active');
  advance(run, 12); assert.equal(attackPhase(boss.attack), 'recovery');
  p.immune = 0; p.stun = 0; boss.x = p.x + 60; boss.vx = 0;
  const health = boss.health; stepRun(run, { ...idle, heavy: true }, dt); advance(run, 18);
  assert.equal(boss.health, health - Math.round(attacks.heavy.damage * 1.35));
  advance(run, 60); p.x = 250; p.lane = 90; p.immune = 0; boss.x = 600; boss.lane = 90; boss.facing = -1;
  swing(run, boss, 'charge'); const start = boss.x;
  advance(run, 50); assert.equal(boss.x, start);
  const events = advance(run, 45); assert.ok(boss.x < start - 200); assert.equal(events.filter(e => e.type === 'damage').length, 1);
  advance(run, 80); p.stun = 0; p.immune = 10; boss.attack = null; boss.cooldown = 999; boss.health = 1; boss.x = p.x + 45; boss.lane = p.lane;
  stepRun(run, { ...idle, heavy: true }, dt); advance(run, 20); assert.equal(boss.health, 0); assert.ok(run.finale > 0);
  assert.equal(run.status, 'active'); const finaleScore = run.score;
  pauseRun(run, true); const frozen = structuredClone(run); advance(run, 100); assert.deepEqual(run, frozen);
  pauseRun(run, false); const end = advance(run, 160); assert.equal(run.status, 'victory'); assert.equal(end.filter(e => e.type === 'victory').length, 1);
  assert.equal(run.score, finaleScore); const won = structuredClone(run); advance(run, 60); assert.deepEqual(run, won);
});

test('pause freezes every timer and buffered action, simultaneous jump and attack works, and projection stays uniform', () => {
  const run = arena(); stepRun(run, { ...idle, jump: true, light: true }, dt);
  assert.equal(run.player.attack.kind, 'air'); assert.ok(run.player.vz > 0);
  advance(run, 5); pauseRun(run, true); const snapshot = structuredClone(run);
  stepRun(run, { x: 1, lane: 1, light: true, heavy: true, jump: true }, 10); assert.deepEqual(run, snapshot);
  pauseRun(run, false); advance(run, 90); assert.equal(run.player.elevation, 0); assert.equal(run.player.attack, null);
  for (const [w, h] of [[1280, 800], [390, 670], [844, 300]]) {
    const v = circuitView(w, h, run); assert.equal(v.scale * v.width, w); assert.equal(v.scale * v.height, h);
    assert.ok(v.width >= 960); assert.ok(v.x >= 0); assert.ok(v.ground + stageOf(run).laneMax < v.height);
    assert.ok(run.player.x >= v.x && run.player.x <= v.x + v.width);
  }
});

test('the authored campaign is winnable through actions alone, with bounded crowds and both boss patterns', () => {
  const run = createRun(); let lastAttack = -1, lastJump = -1, stageChanges = 0, peak = 0;
  const patterns = new Set(), encounters = new Set();
  for (let frame = 0; frame < 60 * 360 && run.status !== 'victory' && run.status !== 'defeat'; frame++) {
    if (run.status === 'interlude') {
      const score = run.score, lives = run.lives, time = run.elapsed;
      nextStage(run); stageChanges++; assert.equal(run.score, score); assert.equal(run.lives, lives); assert.equal(run.elapsed, time); assert.equal(run.player.health, fighter.health);
    }
    const p = run.player, action = { ...idle };
    const target = run.enemies.filter(e => e.health > 0).sort((a, b) => Math.abs(a.x - p.x) + Math.abs(a.lane - p.lane) * 2 - Math.abs(b.x - p.x) - Math.abs(b.lane - p.lane) * 2)[0];
    if (target) {
      const dx = target.x - p.x, dl = target.lane - p.lane;
      action.x = Math.abs(dx) > 65 ? Math.sign(dx) : Math.sign(dx) * .02; action.lane = Math.abs(dl) > 10 ? Math.sign(dl) : 0;
      const s = target.attack;
      if (target.kind === 'warden' && s) {
        patterns.add(s.kind);
        if (attackPhase(s) === 'startup') {
          if (s.kind === 'quake') { if (s.time > .75 && frame - lastJump > 40) { action.jump = true; lastJump = frame; } }
          else action.lane = target.lane > 90 ? -1 : 1;
        }
      }
      if (Math.abs(dx) < 100 && Math.abs(dl) < 26 && frame - lastAttack >= 22) { action.light = true; lastAttack = frame; }
    } else { action.x = 1; action.lane = Math.abs(p.lane - 100) > 10 ? Math.sign(100 - p.lane) : 0; }
    stepRun(run, action, dt); takeEvents(run); peak = Math.max(peak, run.enemies.length);
    if (run.gated) encounters.add(`${run.stageIndex}/${run.encounter}`);
    const combatants = run.enemies.filter(e => e.attack && attackPhase(e.attack) !== 'recovery'); assert.ok(combatants.length <= 1);
    const stage = stageOf(run), gate = stage.encounters[run.encounter];
    if (gate && run.gated) for (const a of [p, ...run.enemies]) { assert.ok(a.x >= gate.left && a.x <= gate.right); assert.ok(a.lane >= stage.laneMin && a.lane <= stage.laneMax); }
  }
  assert.equal(run.status, 'victory'); assert.equal(stageChanges, 1); assert.equal(encounters.size, 6);
  assert.deepEqual([...patterns].sort(), ['charge', 'quake']); assert.ok(peak <= 6); assert.equal(run.cleared, 6);
  assert.ok(run.hits > 100); assert.ok(run.elapsed > 90 && run.elapsed < 360); assert.ok(run.score > 10000);
});
