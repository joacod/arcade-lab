import { clearing } from './content.ts';

export interface MoveAction { readonly x: number; readonly y: number }
interface Point { x: number; y: number }
export interface Enemy extends Point { id: number; health: number }
export interface Projectile extends Point { dx: number; dy: number; remaining: number }
export type Outcome = 'victory' | 'defeat';
export type GameEvent =
  | { type: 'shot' | 'player-hit'; x: number; y: number; at: number }
  | { type: 'enemy-hit' | 'enemy-defeated'; x: number; y: number; enemyId: number; at: number }
  | { type: 'outcome'; outcome: Outcome; at: number };
export interface RunState {
  player: Point & { health: number; invulnerability: number };
  enemies: Enemy[];
  projectiles: Projectile[];
  entries: (Point & { remaining: number })[];
  elapsed: number;
  paused: boolean;
  outcome: Outcome | null;
  shotCooldown: number;
  nextSpawn: number;
  nextEnemyId: number;
  randomState: number;
  stats: { kills: number; shots: number; damageDealt: number; damageTaken: number; spawned: number };
  events: GameEvent[];
}

export function createRun(seed = Math.floor(Math.random() * 0x100000000)): RunState {
  return {
    player: { x: clearing.arena.width / 2, y: clearing.arena.height / 2,
      health: clearing.keeper.maxHealth, invulnerability: 0 },
    enemies: [{ id: 1, ...clearing.crawler.initial, health: clearing.crawler.maxHealth }],
    projectiles: [], entries: [], elapsed: 0, paused: false, outcome: null,
    shotCooldown: clearing.spark.cadence, nextSpawn: clearing.round.phases[0].interval,
    nextEnemyId: 2, randomState: (seed >>> 0) || 1,
    stats: { kills: 0, shots: 0, damageDealt: 0, damageTaken: 0, spawned: 1 }, events: [],
  };
}

export function pauseRun(run: RunState, paused: boolean): void { run.paused = paused; }

/** Composition drains notifications once, including when several simulation steps share a frame. */
export function takeEvents(run: RunState): GameEvent[] { return run.events.splice(0); }

function random(run: RunState): number {
  // Run-owned gameplay stream. Presentation never reads or advances it.
  let state = run.randomState;
  state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
  run.randomState = state >>> 0;
  return run.randomState / 0x100000000;
}

function distanceSquared(a: Point, b: Point): number { return (a.x - b.x) ** 2 + (a.y - b.y) ** 2; }

/** Earliest intersection along a segment with a circle, including initial overlap. */
function sweep(start: Point, end: Point, center: Point, radius: number): number | null {
  const x = start.x - center.x, y = start.y - center.y;
  const dx = end.x - start.x, dy = end.y - start.y;
  const c = x * x + y * y - radius * radius;
  if (c <= 0) return 0;
  const a = dx * dx + dy * dy;
  if (a === 0) return null;
  const b = x * dx + y * dy;
  const discriminant = b * b - a * c;
  if (discriminant < 0) return null;
  const t = (-b - Math.sqrt(discriminant)) / a;
  return t >= 0 && t <= 1 ? t : null;
}

function notify(run: RunState, type: 'enemy-hit' | 'enemy-defeated', at: Enemy): void;
function notify(run: RunState, type: 'shot' | 'player-hit', at: Point): void;
function notify(run: RunState, type: 'shot' | 'enemy-hit' | 'enemy-defeated' | 'player-hit', at: Point) {
  if (type === 'enemy-hit' || type === 'enemy-defeated') {
    run.events.push({ type, x: at.x, y: at.y, enemyId: (at as Enemy).id, at: run.elapsed });
  } else run.events.push({ type, x: at.x, y: at.y, at: run.elapsed });
}

function finish(run: RunState, outcome: Outcome) {
  if (run.outcome) return;
  run.outcome = outcome;
  run.entries.length = 0;
  run.projectiles.length = 0;
  run.events.push({ type: 'outcome', outcome, at: run.elapsed });
}

function requestEntry(run: RunState) {
  const { entryInset: inset, edgeDivisions, entryMinDistance } = clearing.round;
  const candidates: Point[] = [];
  for (let i = 1; i < edgeDivisions; i++) {
    const x = inset + (clearing.arena.width - inset * 2) * i / edgeDivisions;
    const y = inset + (clearing.arena.height - inset * 2) * i / edgeDivisions;
    candidates.push({ x: inset, y }, { x: clearing.arena.width - inset, y },
      { x, y: inset }, { x, y: clearing.arena.height - inset });
  }
  const safe = candidates.filter(point => distanceSquared(point, run.player) >= entryMinDistance ** 2);
  // The full-arena view makes every edge visible: use the reference's farthest-edge fallback.
  const farthest = Math.max(...safe.map(point => distanceSquared(point, run.player)));
  const choices = safe.filter(point => Math.abs(distanceSquared(point, run.player) - farthest) < 1e-9);
  const at = choices[Math.floor(random(run) * choices.length)]!;
  run.entries.push({ ...at, remaining: clearing.round.entryWarning });
}

function advanceSpawns(run: RunState, seconds: number) {
  for (const entry of run.entries) {
    entry.remaining -= seconds;
    if (entry.remaining <= 1e-9) {
      run.enemies.push({ id: run.nextEnemyId++, x: entry.x, y: entry.y, health: clearing.crawler.maxHealth });
      run.stats.spawned++;
    }
  }
  run.entries = run.entries.filter(entry => entry.remaining > 1e-9);
  while (run.nextSpawn <= run.elapsed + 1e-9) {
    if (run.enemies.length + run.entries.length < clearing.round.ordinaryCap) requestEntry(run);
    let interval: number = clearing.round.phases[0].interval;
    for (const phase of clearing.round.phases) if (run.nextSpawn >= phase.start) interval = phase.interval;
    let following = run.nextSpawn + interval;
    for (const phase of clearing.round.phases) {
      if (phase.start > run.nextSpawn && phase.start < following) following = phase.start;
    }
    // Slots skipped at the cap are discarded, never saved for later.
    run.nextSpawn = following;
  }
}

/** Advance active simulation time. The browser supplies fixed 60 Hz steps. */
export function stepRun(run: RunState, move: MoveAction, seconds: number): void {
  if (run.paused || run.outcome || !Number.isFinite(seconds) || seconds <= 0) return;
  const dt = Math.min(seconds, clearing.round.duration - run.elapsed);
  const magnitude = Math.max(1, Math.hypot(move.x, move.y));
  const distance = clearing.keeper.speed * dt;
  const { radius } = clearing.keeper;
  run.player.x = Math.max(radius, Math.min(clearing.arena.width - radius, run.player.x + move.x / magnitude * distance));
  run.player.y = Math.max(radius, Math.min(clearing.arena.height - radius, run.player.y + move.y / magnitude * distance));
  run.player.invulnerability = Math.max(0, run.player.invulnerability - dt);
  run.elapsed = Math.min(clearing.round.duration, run.elapsed + dt);

  for (const enemy of run.enemies) {
    if (enemy.health <= 0) continue;
    const dx = run.player.x - enemy.x, dy = run.player.y - enemy.y;
    const length = Math.hypot(dx, dy);
    const travel = Math.min(length, clearing.crawler.speed * dt);
    if (length > 0) { enemy.x += dx / length * travel; enemy.y += dy / length * travel; }
  }

  run.shotCooldown -= dt;
  if (run.shotCooldown <= 1e-9) {
    // No target still consumes this cadence; no banked attacks.
    run.shotCooldown += clearing.spark.cadence;
    let nearest: Enemy | undefined;
    let distance = Infinity;
    for (const enemy of run.enemies) {
      const candidate = distanceSquared(run.player, enemy);
      if (enemy.health > 0 && candidate < distance) { nearest = enemy; distance = candidate; }
    }
    if (nearest) {
      const length = Math.sqrt(distance);
      run.projectiles.push({ x: run.player.x, y: run.player.y,
        dx: length > 0 ? (nearest.x - run.player.x) / length : 1,
        dy: length > 0 ? (nearest.y - run.player.y) / length : 0, remaining: clearing.spark.lifetime });
      run.stats.shots++;
      notify(run, 'shot', run.player);
    }
  }

  run.projectiles = run.projectiles.filter(projectile => {
    const travel = clearing.spark.speed * Math.min(dt, projectile.remaining);
    const end = { x: projectile.x + projectile.dx * travel, y: projectile.y + projectile.dy * travel };
    let hit: Enemy | undefined;
    let earliest = Infinity;
    for (const enemy of run.enemies) {
      if (enemy.health <= 0) continue;
      const t = sweep(projectile, end, enemy, clearing.spark.radius + clearing.crawler.radius);
      if (t !== null && t < earliest) { earliest = t; hit = enemy; }
    }
    if (hit) {
      const damage = Math.min(hit.health, Math.ceil(clearing.spark.damage));
      hit.health -= damage;
      run.stats.damageDealt += damage;
      notify(run, 'enemy-hit', hit);
      if (hit.health === 0) { run.stats.kills++; notify(run, 'enemy-defeated', hit); }
      return false; // Consumed immediately; a shot never hits a second enemy.
    }
    projectile.x = end.x; projectile.y = end.y; projectile.remaining -= dt;
    return projectile.remaining > 1e-9;
  });
  run.enemies = run.enemies.filter(enemy => enemy.health > 0);

  for (const enemy of run.enemies) {
    if (run.player.invulnerability > 1e-9) break;
    if (distanceSquared(enemy, run.player) <= (clearing.keeper.radius + clearing.crawler.radius) ** 2) {
      const damage = Math.min(run.player.health, clearing.crawler.contactDamage);
      run.player.health -= damage;
      run.stats.damageTaken += damage;
      run.player.invulnerability = clearing.keeper.contactCooldown;
      notify(run, 'player-hit', run.player);
    }
  }
  // Combat resolves before the deadline. Lethal final-tick contact wins precedence.
  if (run.player.health <= 0) finish(run, 'defeat');
  else if (run.elapsed >= clearing.round.duration - 1e-9) { run.elapsed = clearing.round.duration; finish(run, 'victory'); }
  else advanceSpawns(run, dt);
}
