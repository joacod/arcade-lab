import { sweptCircle } from '../../engine/collision.ts';
import { aircraft, flight, fortress, supplies, waves, volleyWindup, type Pattern, type Wave, type PickupKind } from './content.ts';

export interface Point { x: number; y: number }
export interface Action extends Point { fire: boolean; evade: boolean }
export interface Enemy extends Point {
  id: number; pattern: Pattern; originX: number; originY: number; side: number;
  age: number; health: number; fireIn: number;
}
export interface Bullet extends Point { vx: number; vy: number; radius: number; owner: 'player' | 'enemy' }
export interface Pickup extends Point { kind: PickupKind; age: number }
export type BossAttack = 'fan' | 'aim' | 'lanes';
export interface Boss extends Point {
  age: number; health: number; phase: 1 | 2; attack: BossAttack; cycle: number;
  fireIn: number; charge: number; aimX: number; aimY: number; defeated: number;
}
export type Cue = 'shot' | 'warning' | 'hit' | 'explosion' | 'evade' | 'life' | 'victory' | 'defeat' | 'pickup' | 'boss-warning' | 'boss-shot' | 'boss-break' | 'damage';
export interface FlightEvent extends Point { type: Cue; target?: number | 'boss' }
export interface Run {
  elapsed: number; status: 'active' | 'paused' | 'victory' | 'defeat'; score: number;
  player: Point & { health: number; lives: number; immunity: number; roll: number; recharge: number; fireIn: number; bank: number; power: number; spread: number };
  enemies: Enemy[]; bullets: Bullet[]; pickups: Pickup[]; boss: Boss | undefined;
  events: FlightEvent[]; nextWave: number; nextSupply: number; nextId: number;
  stats: { kills: number; pickups: number; rolls: number }; bonus: number;
}
export const idle: Readonly<Action> = { x: 0, y: 0, fire: false, evade: false };
export function createRun(): Run {
  return { elapsed: 0, status: 'active', score: 0, nextWave: 0, nextSupply: 0, nextId: 0, enemies: [], bullets: [], pickups: [], boss: undefined, events: [],
    stats: { kills: 0, pickups: 0, rolls: 0 }, bonus: 0,
    player: { x: 240, y: 660, health: flight.player.health, lives: flight.player.lives,
      immunity: 0, roll: 0, recharge: 0, fireIn: 0, bank: 0, power: 0, spread: 0 } };
}
export function pauseRun(run: Run, paused: boolean) {
  if (run.status === 'active' || run.status === 'paused') run.status = paused ? 'paused' : 'active';
}
export function takeEvents(run: Run) { return run.events.splice(0); }
function emit(run: Run, type: Cue, at: Point, target?: number | 'boss') {
  const event: FlightEvent = { type, x: at.x, y: at.y };
  if (target !== undefined) event.target = target;
  run.events.push(event);
}
function spawn(run: Run, wave: Wave) {
  for (let i = 0; i < wave.count; i++) {
    const x = wave.pattern === 'crossing' ? (wave.side === 1 ? 60 : 420) : 65 + i * 350 / Math.max(1, wave.count - 1);
    const y = -40 - (wave.pattern === 'straight' ? Math.abs(i - (wave.count - 1) / 2) * 28 : i * 46);
    run.enemies.push({ id: run.nextId++, pattern: wave.pattern, originX: x, originY: y, x, y,
      side: wave.side, age: 0, health: aircraft[wave.pattern].health, fireIn: 1.7 + i * 0.22 });
  }
  emit(run, 'warning', { x: 240, y: 80 });
}
function damage(run: Run) {
  const p = run.player;
  if (p.immunity > 0 || p.roll > 0 || run.status !== 'active') return;
  p.health--; p.immunity = flight.damageImmunity; emit(run, 'damage', p);
  if (p.health > 0) return;
  p.lives--; emit(run, 'life', p);
  if (!p.lives) { run.status = 'defeat'; emit(run, 'defeat', p); return; }
  p.x = 240; p.y = 660; p.health = flight.player.health; p.immunity = flight.respawnImmunity;
  p.bank = 0; p.fireIn = 0; p.power = Math.max(0, p.power - 1); p.spread = 0; p.recharge = 0;
  run.bullets = run.bullets.filter(b => b.owner === 'player');
}
const outside = (p: Point) => p.y < -360 || p.y > flight.height + 70 || p.x < -90 || p.x > flight.width + 90;
function hostile(run: Run, x: number, y: number, angle: number, speed: number) {
  run.bullets.push({ x, y, vx: Math.sin(angle) * speed, vy: Math.cos(angle) * speed, radius: 5, owner: 'enemy' });
}
/** Three fixed lanes leave broad safe corridors; the next volley alternates them. */
export function bossLanes(boss: Boss): readonly number[] { return boss.cycle % 2 ? [60, 210, 360] : [120, 270, 420]; }
/** Explicit weak points move with the fortress. The decorative wings have no collision. */
export function bossTargets(boss: Boss) {
  return [{ x: boss.x, y: boss.y + 10, radius: fortress.radius },
    ...[-1, 1].map(side => ({ x: boss.x + side * 88, y: boss.y + 16 + Math.sin(boss.age * 2) * 8, radius: fortress.engineRadius }))];
}
function canEnemyFire(enemy: Enemy, player: Point) {
  return enemy.health > 0 && enemy.y > 20 && enemy.y < player.y - 70 && enemy.x > 0 && enemy.x < flight.width;
}
/** Read-only preparation progress; aim continues to track the player until release. */
export function enemyCharge(enemy: Enemy, player: Point): number | undefined {
  const duration = volleyWindup[enemy.pattern];
  if (!duration || !canEnemyFire(enemy, player) || enemy.fireIn > duration) return;
  return Math.max(0, Math.min(1, 1 - enemy.fireIn / duration));
}
function advanceBoss(run: Run, dt: number) {
  const b = run.boss!;
  b.age += dt;
  if (b.health <= 0) { b.defeated += dt; return; }
  b.y = -150 + Math.min(1, b.age / fortress.entrance) * 300;
  b.x = 240 + Math.sin(Math.max(0, b.age - fortress.entrance) * 0.65) * 92;
  if (b.age < fortress.entrance) return;
  b.phase = b.health <= fortress.health / 2 ? 2 : 1;
  if (b.charge > 0) {
    b.charge = Math.max(0, b.charge - dt);
    if (b.charge > 0) return;
    if (b.attack === 'fan') {
      const count = b.phase === 2 ? 9 : 7;
      for (let i = 0; i < count; i++) hostile(run, b.x, b.y + 45, (i - (count - 1) / 2) * 0.21, 185);
    } else if (b.attack === 'aim') {
      for (const side of [-1, 1]) {
        const x = b.x + side * 88, angle = Math.atan2(b.aimX - x, b.aimY - (b.y + 20));
        for (const offset of [-0.11, 0, 0.11]) hostile(run, x, b.y + 20, angle + offset, b.phase === 2 ? 245 : 215);
      }
    } else {
      for (const x of bossLanes(b)) for (let j = 0; j < 4; j++) hostile(run, x, b.y + 50 - j * 25, 0, 260);
    }
    b.fireIn = b.phase === 2 ? 1.1 : 1.7;
    emit(run, 'boss-shot', b);
  } else {
    b.fireIn -= dt;
    if (b.fireIn <= 0) {
      b.attack = (['fan', 'aim', 'lanes'] as const)[b.cycle++ % 3]!;
      b.aimX = run.player.x; b.aimY = run.player.y; b.charge = b.phase === 2 ? 0.9 : 1.1; emit(run, 'boss-warning', b);
    }
  }
}
function collect(run: Run, kind: PickupKind) {
  const p = run.player;
  if (kind === 'power') { if (p.power === 2) run.score += 250; p.power = Math.min(2, p.power + 1); }
  if (kind === 'spread') p.spread = flight.spreadDuration;
  if (kind === 'repair') { if (p.health === flight.player.health) run.score += 250; p.health = Math.min(flight.player.health, p.health + 1); }
  run.score += 100; run.stats.pickups++; emit(run, 'pickup', p);
}
/** Bounded fixed steps only. No wall time, browser, or cosmetic randomness. */
export function stepRun(run: Run, action: Readonly<Action>, dt: number) {
  if (run.status !== 'active' || dt <= 0) return;
  const p = run.player, previousPlayer = { x: p.x, y: p.y };
  run.elapsed += dt;
  for (const key of ['immunity', 'roll', 'recharge', 'fireIn', 'spread'] as const) p[key] = Math.max(0, p[key] - dt);
  if (action.evade && !p.recharge) {
    p.roll = flight.evade.duration; p.recharge = flight.evade.recharge; run.stats.rolls++; emit(run, 'evade', p);
  }
  const length = Math.max(1, Math.hypot(action.x, action.y));
  p.x = Math.max(24, Math.min(flight.width - 24, p.x + action.x / length * flight.player.speed * dt));
  p.y = Math.max(40, Math.min(flight.height - 32, p.y + action.y / length * flight.player.speed * dt));
  p.bank += (action.x / length - p.bank) * Math.min(1, dt * 12);
  const bossDead = run.boss !== undefined && run.boss.health <= 0;
  if (action.fire && !p.fireIn && !bossDead) {
    for (const x of (p.power > 0 ? [-10, 0, 10] : [-10, 10])) run.bullets.push({ x: p.x + x, y: p.y - 24, vx: 0, vy: -flight.player.bulletSpeed, radius: 3, owner: 'player' });
    if (p.spread > 0) for (const side of [-1, 1]) run.bullets.push({ x: p.x + side * 14, y: p.y - 16, vx: side * 240, vy: -680, radius: 3, owner: 'player' });
    p.fireIn = p.power === 2 ? 0.105 : flight.player.fireInterval; emit(run, 'shot', p);
  }
  while (run.nextWave < waves.length && run.elapsed >= waves[run.nextWave]!.at) spawn(run, waves[run.nextWave++]!);
  while (run.nextSupply < supplies.length && run.elapsed >= supplies[run.nextSupply]!.at) {
    const supply = supplies[run.nextSupply++]!; run.pickups.push({ x: supply.x, y: -24, kind: supply.kind, age: 0 });
  }
  if (!run.boss && run.elapsed >= fortress.at) {
    run.boss = { x: 240, y: -150, age: 0, health: fortress.health, phase: 1, attack: 'fan', cycle: 0,
      fireIn: 0.7, charge: 0, aimX: 240, aimY: 660, defeated: 0 };
    emit(run, 'boss-warning', { x: 240, y: 80 });
  }
  const previousBoss = run.boss ? bossTargets(run.boss) : [];
  if (run.boss) advanceBoss(run, dt);
  const previousEnemies = new Map<number, Point>();
  for (const e of run.enemies) {
    previousEnemies.set(e.id, { x: e.x, y: e.y });
    const def = aircraft[e.pattern];
    e.age += dt; e.y = e.originY + e.age * def.speed;
    if (e.pattern === 'crossing') e.x = e.originX + e.side * e.age * 58;
    if (e.pattern === 'swoop') e.x = e.originX + e.side * Math.sin(e.age * 1.8) * 48;
    if (e.pattern === 'interceptor') e.x = e.originX + Math.sin(e.age * 2.4) * e.side * 34;
    const eligible = canEnemyFire(e, p);
    e.fireIn = eligible ? e.fireIn - dt : Math.max(volleyWindup[e.pattern] ?? 0, e.fireIn - dt);
    if (e.fireIn <= 0 && eligible) {
      const angle = Math.atan2(p.x - e.x, p.y - e.y);
      // Broad slow tridents contrast with the interceptors' fast aimed pairs.
      const offsets = e.pattern === 'swoop' ? [-0.28, 0, 0.28] : e.pattern === 'interceptor' ? [-0.09, 0.09] : [0];
      for (const offset of offsets) hostile(run, e.x, e.y + 16, angle + offset, def.bulletSpeed);
      e.fireIn = def.fireInterval * (run.elapsed > 65 ? 0.85 : 1);
    }
  }
  const remaining: Bullet[] = [], bullets = run.bullets, lives = p.lives;
  for (const b of bullets) {
    if (run.status !== 'active') break;
    if (b.owner === 'enemy' && p.lives !== lives) continue;
    const from = { x: b.x, y: b.y }; b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.owner === 'player') {
      let first: Enemy | 'boss' | undefined, earliest = Infinity;
      for (const e of run.enemies) {
        if (e.health <= 0) continue;
        const t = sweptCircle(from, b, previousEnemies.get(e.id)!, e, aircraft[e.pattern].radius + b.radius);
        if (t !== undefined && t < earliest) { first = e; earliest = t; }
      }
      const boss = run.boss;
      if (boss && boss.health > 0 && boss.age >= fortress.entrance) {
        for (const [i, target] of bossTargets(boss).entries()) {
          const t = sweptCircle(from, b, previousBoss[i]!, target, target.radius + b.radius);
          if (t !== undefined && t < earliest) { first = 'boss'; earliest = t; }
        }
      }
      if (first === 'boss' && boss) {
        boss.health--; emit(run, 'hit', { x: from.x + (b.x - from.x) * earliest, y: from.y + (b.y - from.y) * earliest }, 'boss');
        if (!boss.health) { run.score += 5000; emit(run, 'boss-break', boss); }
        continue;
      }
      if (first && first !== 'boss') {
        first.health--; emit(run, 'hit', first, first.id);
        if (!first.health) { run.score += aircraft[first.pattern].score; run.stats.kills++; emit(run, 'explosion', first); }
        continue;
      }
    } else if (sweptCircle(from, b, previousPlayer, p, flight.player.radius + b.radius) !== undefined) {
      damage(run); continue;
    }
    if (!outside(b)) remaining.push(b);
  }
  run.bullets = remaining.filter(b => b.owner === 'player' || p.lives === lives);
  for (const e of run.enemies) {
    if (e.health <= 0) continue;
    if (sweptCircle(previousEnemies.get(e.id)!, e, previousPlayer, p, aircraft[e.pattern].radius + flight.player.radius) !== undefined) damage(run);
  }
  if (run.boss && run.boss.health > 0 && run.boss.age >= fortress.entrance) {
    for (const [i, target] of bossTargets(run.boss).entries()) {
      if (sweptCircle(previousBoss[i]!, target, previousPlayer, p, target.radius + flight.player.radius) !== undefined) damage(run);
    }
  }
  run.enemies = run.enemies.filter(e => e.health > 0 && !outside(e));
  run.pickups = run.pickups.filter(item => {
    const from = { x: item.x, y: item.y }; item.y += flight.pickupSpeed * dt; item.age += dt;
    if (run.status === 'active' && sweptCircle(from, item, p.lives === lives ? previousPlayer : p, p, flight.pickupRadius + flight.player.radius) !== undefined) { collect(run, item.kind); return false; }
    return item.y < flight.height + 30;
  });
  // Destruction remains a timed simulation state. No presentation callback changes rules.
  if (run.boss && run.boss.health <= 0) {
    run.bullets = []; run.enemies = [];
    if (run.status === 'active' && run.boss.defeated >= fortress.defeatDuration) {
      run.bonus = p.lives * 1000 + p.health * 250; run.score += run.bonus;
      run.status = 'victory'; emit(run, 'victory', p);
    }
  } else if (run.status === 'active' && run.elapsed >= flight.duration) { run.status = 'defeat'; emit(run, 'defeat', p); }
}
