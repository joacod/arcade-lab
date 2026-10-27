import test from 'node:test';
import assert from 'node:assert/strict';
import { createMatch, stepMatch, takeEvents, pauseMatch, idle, canHit, guards, attackPhase } from '../src/fighter/game.ts';
import { arena, fighters } from '../src/fighter/content.ts';
import { cpuAction } from '../src/fighter/cpu.ts';
import { duelView } from '../src/fighter/presentation.ts';
const dt = 1 / 60;
function arenaMatch(selected = 'nera', distance = 80) {
  const m = createMatch(selected); m.phase = 'fight'; m.fighters[0].x = 400; m.fighters[1].x = 400 + distance; return m;
}
function advance(m, count, action = idle, cpu = idle) {
  const events = []; for (let i = 0; i < count; i++) { stepMatch(m, action, dt, cpu); events.push(...takeEvents(m)); } return events;
}
function attack(m, kind = 'light', side = 0, time = 0) {
  const f = m.fighters[side]; f.attack = { id: m.nextAttack++, kind, time, hits: [], sounded: false }; f.state = 'startup';
}

test('authored windows and attack ownership gate hits; buffered presses wait for recovery', () => {
  const m = arenaMatch(), p = m.fighters[0], target = m.fighters[1];
  stepMatch(m, { ...idle, light: true }, dt, idle);
  assert.equal(p.state, 'startup'); assert.equal(target.health, 100);
  advance(m, 4); assert.equal(target.health, 100);
  advance(m, 1); assert.equal(p.state, 'active'); assert.equal(target.health, 93);
  assert.deepEqual(p.attack.hits, [1]); advance(m, 4); assert.equal(target.health, 93);
  assert.equal(attackPhase(p.attack, fighters.nera.attacks.light), 'recovery');
  advance(m, 6); stepMatch(m, { ...idle, heavy: true }, dt, idle);
  const id = p.attack.id; assert.equal(p.buffer.kind, 'heavy');
  advance(m, 9); assert.equal(p.attack.kind, 'heavy'); assert.ok(p.attack.id > id);
  assert.equal(target.health, 93);
});

test('blocking is high/low/overhead aware, prevents damage and owns blockstun', () => {
  for (const [kind, crouch, blocked] of [['light', false, true], ['light', true, true], ['sweep', false, false], ['sweep', true, true], ['air', true, false], ['air', false, true]]) {
    const m = arenaMatch(), p = m.fighters[0], target = m.fighters[1];
    if (kind === 'air') { p.z = 55; p.vz = 0; }
    attack(m, kind, 0, fighters.nera.attacks[kind].startup - dt);
    const events = advance(m, 1, idle, { ...idle, block: true, crouch });
    assert.equal(target.health === 100, blocked, `${kind} / crouch ${crouch}`);
    if (blocked) {
      assert.equal(target.state, 'blockstun'); assert.ok(target.stateTime > 0); assert.ok(events.some(e => e.type === 'block'));
      const x = target.x; advance(m, 3, idle, { ...idle, x: -1, heavy: true });
      assert.equal(target.attack, null); assert.ok(target.x >= x);
    }
  }
  const m = arenaMatch(), target = m.fighters[1]; target.guarding = true; target.state = 'block'; target.z = 20;
  assert.equal(guards(target, fighters.nera.attacks.light), false);
});

test('hitstun interrupts attacks; knockdown and wake-up release with protected control', () => {
  const m = arenaMatch(), p = m.fighters[0], target = m.fighters[1];
  attack(m, 'heavy', 1); attack(m, 'light', 0, fighters.nera.attacks.light.startup - dt);
  advance(m, 1); assert.equal(target.state, 'hitstun'); assert.equal(target.attack, null);
  advance(m, 2, idle, { ...idle, heavy: true }); assert.equal(target.attack, null);
  advance(m, 22); assert.equal(target.state, 'idle');
  p.attack = null; p.state = 'idle'; target.x = p.x + 80; target.vx = 0;
  attack(m, 'sweep', 0, fighters.nera.attacks.sweep.startup - dt); advance(m, 1);
  assert.equal(target.state, 'knockdown');
  advance(m, 39, idle, { ...idle, light: true }); assert.equal(target.state, 'wakeup'); assert.ok(target.immune > .4);
  p.attack = null; p.state = 'idle'; advance(m, 19);
  assert.equal(target.state, 'idle'); assert.ok(target.immune > .1);
  stepMatch(m, idle, dt, { ...idle, block: true }); assert.equal(target.state, 'block');
});

test('facing, jump height and arena bodies are independent of animation and never cross', () => {
  const m = arenaMatch(); const [p, e] = m.fighters, d = fighters.nera.attacks.light;
  assert.equal(canHit(p, e, d), true); p.facing = -1; assert.equal(canHit(p, e, d), false);
  advance(m, 1); assert.equal(p.facing, 1); assert.equal(e.facing, -1);
  e.z = 150; assert.equal(canHit(p, e, d), false); e.z = 0;
  stepMatch(m, { ...idle, jump: true, x: 1 }, dt, { ...idle, x: -1 });
  advance(m, 180, { ...idle, x: 1 }, { ...idle, x: -1 });
  assert.ok(e.x - p.x >= arena.radius * 2 - 1e-8); assert.equal(p.z, 0);
  advance(m, 600, { ...idle, x: -1 }, { ...idle, x: -1 });
  assert.equal(p.x, arena.left); assert.ok(e.x >= arena.left + arena.radius * 2);
  advance(m, 600, { ...idle, x: 1 }, { ...idle, x: 1 });
  assert.equal(e.x, arena.right); assert.ok(p.x <= arena.right - arena.radius * 2);
});

test('jump attack is overhead, sweep misses airborne opponents, and committed attacks restrict movement', () => {
  const m = arenaMatch(), p = m.fighters[0];
  stepMatch(m, { ...idle, jump: true, light: true, x: 1 }, dt, idle);
  assert.equal(p.attack.kind, 'air'); assert.ok(p.z > 0); const x = p.x;
  advance(m, 8, { ...idle, x: 1 }); assert.equal(p.x, x);
  const airborne = { ...m.fighters[1], z: 70, immune: 0 };
  assert.equal(canHit({ ...p, z: 0, attack: null }, airborne, fighters.nera.attacks.sweep), false);
  const f = fighters; assert.ok(f.nera.speed > f.kael.speed); assert.ok(f.nera.attacks.light.recovery < f.kael.attacks.light.recovery);
  assert.ok(f.kael.attacks.heavy.damage > f.nera.attacks.heavy.damage);
});

test('Nera projectile can be blocked or jumped, hits once, and has a cooldown; Kael advances inside body bounds', () => {
  for (const defense of ['idle', 'block', 'jump']) {
    const m = arenaMatch('nera', 310), target = m.fighters[1];
    stepMatch(m, { ...idle, special: true }, dt, idle); advance(m, 22);
    assert.equal(m.projectiles.length, 1); assert.ok(m.fighters[0].specialCooldown > 1);
    if (defense === 'jump') { target.z = 135; target.vz = 360; }
    advance(m, 32, idle, defense === 'block' ? { ...idle, block: true } : idle);
    assert.equal(target.health, defense === 'idle' ? 88 : 100);
    advance(m, 110); assert.equal(m.projectiles.length, 0); assert.equal(target.health, defense === 'idle' ? 88 : 100);
  }
  const m = arenaMatch('kael', 240), start = m.fighters[0].x;
  stepMatch(m, { ...idle, special: true }, dt, idle); advance(m, 39);
  assert.ok(m.fighters[0].x > start + 90); assert.equal(m.fighters[1].health, 77);
  assert.ok(m.fighters[1].x - m.fighters[0].x >= arena.radius * 2);
});

test('simultaneous active attacks trade without player-index priority, including double KO', () => {
  const m = arenaMatch(); m.fighters.forEach(f => { f.health = 7; });
  attack(m, 'light', 0, fighters.nera.attacks.light.startup - dt);
  attack(m, 'light', 1, fighters.kael.attacks.light.startup - dt);
  advance(m, 1); assert.deepEqual(m.fighters.map(f => f.health), [0,0]);
  assert.equal(m.reason, 'draw'); assert.equal(m.winner, null); assert.deepEqual(m.wins, [0,0]);
  advance(m, 151); assert.equal(m.phase, 'intro'); assert.equal(m.round, 2);
});

test('rounds own countdown, timer, KO and best-of-three outcomes; pause and results freeze gameplay', () => {
  for (const side of [0, 1]) {
    const m = createMatch(); advance(m, 170, { ...idle, light: true });
    assert.equal(m.phase, 'intro'); assert.equal(m.timer, 75); assert.ok(m.fighters.every(f => !f.attack));
    const cues = advance(m, 12); assert.ok(cues.some(e => e.type === 'fight')); assert.equal(m.phase, 'fight');
    pauseMatch(m, true); const before = structuredClone(m); advance(m, 100); assert.deepEqual(m, before); pauseMatch(m, false);
    for (let round = 0; round < 2; round++) {
      const target = m.fighters[1-side], source = m.fighters[side]; source.x = side === 0 ? 400 : 480; target.x = side === 0 ? 480 : 400;
      target.health = 1; attack(m, 'light', side, fighters[source.kind].attacks.light.startup - dt);
      advance(m, 1); assert.equal(m.phase, 'roundEnd'); assert.equal(m.wins[side], round+1);
      const health = m.fighters.map(f => f.health); advance(m, 50); assert.deepEqual(m.fighters.map(f => f.health), health);
      advance(m, 101);
      if (!round) { assert.equal(m.timer, 75); assert.ok(m.fighters.every(f => f.health === 100 && !f.buffer)); advance(m, 181); }
    }
    assert.equal(m.status, side === 0 ? 'victory' : 'defeat');
    const final = structuredClone(m); advance(m, 300); assert.deepEqual(m, final);
  }
});

test('timeout compares health, ties replay without wins, and the next round resets all combat ownership', () => {
  const m = arenaMatch(); m.timer = dt; m.fighters[0].health = 73; m.fighters[1].health = 50;
  advance(m,1); assert.equal(m.reason,'timeout'); assert.equal(m.winner,0); assert.deepEqual(m.wins,[1,0]);
  advance(m,151); assert.equal(m.phase,'intro'); assert.equal(m.timer,75); assert.equal(m.projectiles.length,0);
  advance(m,181); m.timer = dt; advance(m,1); assert.equal(m.reason,'draw'); assert.deepEqual(m.wins,[1,0]);
});

test('CPU observes telegraphs with delay and cannot inspect hidden player commands', () => {
  const a = arenaMatch(), b = structuredClone(a);
  b.fighters[0].buffer = { kind: 'heavy', ttl: .15 };
  assert.deepEqual(cpuAction(a,dt),cpuAction(b,dt));
  assert.equal(a.brain.seen.attack,''); assert.ok(a.brain.history[0].at >= .23);
  const m = arenaMatch(); attack(m,'heavy'); cpuAction(m,dt);
  assert.equal(m.brain.seen.attack,''); m.elapsed=.24; cpuAction(m,dt); assert.equal(m.brain.seen.attack,'startup');
  m.brain.wait=0; m.brain.seen={distance:80,side:-1,attack:'recovery',low:false,airborne:false,projectile:false};
  m.brain.sample=1; m.brain.history=[];
  // Any decision still goes through the shared attack lock and hitstun rules.
  m.fighters[1].state='hitstun';m.fighters[1].stateTime=1;
  for(let i=0;i<20;i++)stepMatch(m,idle,dt);assert.equal(m.fighters[1].attack,null);
});

test('real CPU completes matches against idle players with valid combat and bounded state', () => {
  for(const selected of ['nera','kael'])for(const seed of [1,42,803]){
    const m=createMatch(selected,seed);let contacts=0,swings=0;
    for(let i=0;i<18000&&m.status==='active';i++){
      stepMatch(m,idle,dt);for(const e of takeEvents(m)){if(e.type==='hit'||e.type==='heavyHit')contacts++;if(e.type==='swing'||e.type==='heavySwing')swings++;}
      assert.ok(m.fighters[1].x-m.fighters[0].x>=arena.radius*2-1e-7);
      assert.ok(m.projectiles.length<=2);assert.ok(m.brain.history.length<=5);
      assert.ok(m.fighters.every(f=>Number.isFinite(f.x)&&f.health>=0&&f.health<=100&&f.z>=0));
    }
    assert.equal(m.status,'defeat',`${selected}/${seed}`);assert.ok(contacts>6);assert.ok(swings>4);
  }
});

test('viewport fits the entire fixed arena with the same scale on both axes', () => {
  for(const [w,h] of [[1280,800],[390,620],[900,250]]){
    const v=duelView(w,h);assert.ok(v.left>=0&&v.top>=0);assert.ok(v.scale*arena.width<=w+1e-8);assert.ok(v.scale*arena.height<=h+1e-8);
  }
});

test('a round-ending aerial KO still lands, while health and the round decision stay final', () => {
  const m=arenaMatch(), target=m.fighters[1];target.z=55;target.vz=100;target.health=1;
  attack(m,'light',0,fighters.nera.attacks.light.startup-dt);advance(m,1);
  assert.equal(m.phase,'roundEnd');assert.equal(target.state,'ko');assert.ok(target.z>0);
  advance(m,60);assert.equal(target.z,0);assert.equal(target.health,0);assert.deepEqual(m.wins,[1,0]);
});

test('both fighters can win complete CPU matches using movement, visible guard reads and timed attacks', () => {
  for(const selected of ['nera','kael']) {
    const m=createMatch(selected,42);let press=0;
    for(let frame=0;frame<12000&&m.status==='active';frame++) {
      const [p,e]=m.fighters, distance=e.x-p.x, action={...idle};
      if(m.phase==='fight') {
        if(e.state==='startup'&&distance<210){action.block=true;action.crouch=e.attack?.kind==='sweep';}
        else if(distance>100)action.x=1;
        if(frame%26===0&&!action.block){action.light=true;action.crouch=press++%3===0;}
        if(e.state==='recovery'&&distance<135&&frame%15===0){action.light=false;action.heavy=true;}
        if(distance>300&&frame%100===0)action.special=true;
      }
      stepMatch(m,action,dt);takeEvents(m);
    }
    assert.equal(m.status,'victory',selected);assert.equal(m.wins[0],2);
  }
});

test('pausing discards buffered presses so resuming cannot start a stale attack or jump', () => {
  const m=arenaMatch();m.fighters[0].buffer={kind:'special',ttl:.15};m.fighters[1].buffer={kind:'jump',ttl:.13};
  pauseMatch(m,true);assert.ok(m.fighters.every(f=>f.buffer===null));
  const paused=structuredClone(m);advance(m,90);assert.deepEqual(m,paused);
  pauseMatch(m,false);advance(m,1);assert.ok(m.fighters.every(f=>f.attack===null&&f.z===0));
});
