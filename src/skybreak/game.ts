import { aircraft, flight, waves, type Pattern, type Wave } from './content.ts';

export interface Point { x: number; y: number }
export interface Action extends Point { fire: boolean; evade: boolean }
export interface Enemy extends Point {
  id: number; pattern: Pattern; originX: number; originY: number; side: number;
  age: number; health: number; fireIn: number;
}
export interface Bullet extends Point { vx: number; vy: number; radius: number; owner: 'player' | 'enemy' }
export type Cue = 'shot' | 'warning' | 'hit' | 'explosion' | 'evade' | 'life' | 'victory' | 'defeat';
export interface FlightEvent extends Point { type: Cue }
export interface Run {
  elapsed: number; status: 'active' | 'paused' | 'victory' | 'defeat'; score: number;
  player: Point & { health: number; lives: number; immunity: number; roll: number; recharge: number; fireIn: number; bank: number };
  enemies: Enemy[]; bullets: Bullet[]; events: FlightEvent[]; nextWave: number; nextId: number;
}
export const idle: Readonly<Action> = { x: 0, y: 0, fire: false, evade: false };
export function createRun(): Run {
  return { elapsed: 0, status: 'active', score: 0, nextWave: 0, nextId: 0, enemies: [], bullets: [], events: [],
    player: { x: 240, y: 660, health: flight.player.health, lives: flight.player.lives,
      immunity: 0, roll: 0, recharge: 0, fireIn: 0, bank: 0 } };
}
export function pauseRun(run: Run, paused: boolean) {
  if (run.status === 'active' || run.status === 'paused') run.status = paused ? 'paused' : 'active';
}
export function takeEvents(run: Run) { return run.events.splice(0); }
function emit(run: Run, type: Cue, at: Point) { run.events.push({ type, x: at.x, y: at.y }); }
function spawn(run: Run, wave: Wave) {
  for (let i = 0; i < wave.count; i++) {
    const x = wave.pattern === 'crossing' ? (wave.side === 1 ? 60 : 420) : 65 + i * 350 / Math.max(1, wave.count - 1);
    const y = -40 - (wave.pattern === 'straight' ? Math.abs(i - (wave.count - 1) / 2) * 28 : i * 46);
    run.enemies.push({ id: run.nextId++, pattern: wave.pattern, originX: x, originY: y, x, y,
      side: wave.side, age: 0, health: aircraft[wave.pattern].health, fireIn: 1.7 + i * 0.22 });
  }
  emit(run, 'warning', { x: 240, y: 80 });
}
/** Swept relative segment/circle, including targets moving during the same step. */
export function sweptHit(from: Point, to: Point, targetFrom: Point, targetTo: Point, radius: number): number | undefined {
  const x = from.x - targetFrom.x, y = from.y - targetFrom.y;
  const dx = to.x - from.x - (targetTo.x - targetFrom.x), dy = to.y - from.y - (targetTo.y - targetFrom.y);
  const c = x * x + y * y - radius * radius;
  if (c <= 0) return 0;
  const a = dx * dx + dy * dy, b = 2 * (x * dx + y * dy), discriminant = b * b - 4 * a * c;
  if (!a || discriminant < 0) return undefined;
  const t = (-b - Math.sqrt(discriminant)) / (2 * a);
  return t >= 0 && t <= 1 ? t : undefined;
}
function damage(run: Run) {
  const p = run.player;
  if (p.immunity > 0 || p.roll > 0 || run.status !== 'active') return;
  p.health--; p.immunity = flight.damageImmunity; emit(run, 'hit', p);
  if (p.health > 0) return;
  p.lives--; emit(run, 'life', p);
  if (!p.lives) { run.status = 'defeat'; emit(run, 'defeat', p); return; }
  p.x = 240; p.y = 660; p.health = flight.player.health; p.immunity = flight.respawnImmunity;
  p.bank = 0; p.fireIn = 0;
  run.bullets = run.bullets.filter(b => b.owner === 'player');
}
const outside = (p: Point) => p.y < -360 || p.y > flight.height + 70 || p.x < -90 || p.x > flight.width + 90;

/** Bounded fixed steps only. No wall time, browser, or cosmetic randomness. */
export function stepRun(run: Run, action: Readonly<Action>, dt: number) {
  if (run.status !== 'active' || dt <= 0) return;
  const p = run.player, previousPlayer = { x: p.x, y: p.y };
  run.elapsed += dt;
  for (const key of ['immunity', 'roll', 'recharge', 'fireIn'] as const) p[key] = Math.max(0, p[key] - dt);
  if (action.evade && !p.recharge) {
    p.roll = flight.evade.duration; p.recharge = flight.evade.recharge; emit(run, 'evade', p);
  }
  const length = Math.max(1, Math.hypot(action.x, action.y));
  p.x = Math.max(24, Math.min(flight.width - 24, p.x + action.x / length * flight.player.speed * dt));
  p.y = Math.max(40, Math.min(flight.height - 32, p.y + action.y / length * flight.player.speed * dt));
  p.bank += (action.x / length - p.bank) * Math.min(1, dt * 12);
  if (action.fire && !p.fireIn) {
    for (const x of [-10, 10]) run.bullets.push({ x: p.x + x, y: p.y - 24, vx: 0, vy: -flight.player.bulletSpeed, radius: 3, owner: 'player' });
    p.fireIn = flight.player.fireInterval; emit(run, 'shot', p);
  }
  while (run.nextWave < waves.length && run.elapsed >= waves[run.nextWave]!.at) spawn(run, waves[run.nextWave++]!);
  const previousEnemies = new Map<number, Point>();
  for (const e of run.enemies) {
    previousEnemies.set(e.id, { x: e.x, y: e.y });
    const def = aircraft[e.pattern];
    e.age += dt; e.y = e.originY + e.age * def.speed;
    if (e.pattern === 'crossing') e.x = e.originX + e.side * e.age * 58;
    if (e.pattern === 'swoop') e.x = e.originX + e.side * Math.sin(e.age * 1.8) * 48;
    e.fireIn -= dt;
    if (e.fireIn <= 0 && e.y > 20 && e.y < p.y - 70 && e.x > 0 && e.x < flight.width) {
      const distance = Math.max(1, Math.hypot(p.x - e.x, p.y - e.y));
      run.bullets.push({ x: e.x, y: e.y + 16, vx: (p.x - e.x) / distance * def.bulletSpeed,
        vy: (p.y - e.y) / distance * def.bulletSpeed, radius: 5, owner: 'enemy' });
      e.fireIn = def.fireInterval; emit(run, 'warning', e);
    }
  }
  const remaining: Bullet[] = [], bullets = run.bullets, lives = p.lives;
  for (const b of bullets) {
    if (run.status !== 'active') break;
    if (b.owner === 'enemy' && p.lives !== lives) continue;
    const from = { x: b.x, y: b.y }; b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.owner === 'player') {
      let first: Enemy | undefined, earliest = Infinity;
      for (const e of run.enemies) {
        if (e.health <= 0) continue;
        const t = sweptHit(from, b, previousEnemies.get(e.id)!, e, aircraft[e.pattern].radius + b.radius);
        if (t !== undefined && t < earliest) { first = e; earliest = t; }
      }
      if (first) {
        first.health--; emit(run, 'hit', first);
        if (!first.health) { run.score += aircraft[first.pattern].score; emit(run, 'explosion', first); }
        continue;
      }
    } else if (sweptHit(from, b, previousPlayer, p, flight.player.radius + b.radius) !== undefined) {
      damage(run); continue;
    }
    if (!outside(b)) remaining.push(b);
  }
  run.bullets = remaining.filter(b => b.owner === 'player' || p.lives === lives);
  for (const e of run.enemies) {
    if (e.health <= 0) continue;
    if (sweptHit(previousEnemies.get(e.id)!, e, previousPlayer, p, aircraft[e.pattern].radius + flight.player.radius) !== undefined) damage(run);
  }
  run.enemies = run.enemies.filter(e => e.health > 0 && !outside(e));
  if (run.status === 'active' && run.elapsed >= flight.duration) { run.status = 'victory'; emit(run, 'victory', p); }
}
