import { clearing, enemies, type EnemyId } from './content.ts';
import { validateContent } from './content-validation.ts';
import { advanceProjectiles, distanceSquared, targetable } from './combat.ts';
import { advanceWeapons } from './weapons.ts';
import { advanceGems, equip } from './progression.ts';
import type { GameEvent, MoveAction, Outcome, Point, RunState } from './game-state.ts';
export type { RunState, MoveAction, GameEvent } from './game-state.ts';

export function createRun(seed = Math.floor(Math.random() * 0x100000000)): RunState {
  const errors = validateContent();
  if (errors.length) throw new Error(`Cannot start Last Light Clearing:\n${errors.join('\n')}`);
  return {
    player: { x: clearing.arena.width / 2, y: clearing.arena.height / 2,
      health: clearing.keeper.maxHealth, shield: 0, invulnerability: 0 },
    enemies: [{ id: 1, kind: 'crawler', ...clearing.initialEnemy, health: enemies.crawler.maxHealth, entryDelay: 0 }],
    projectiles: [], gems: [], entries: [], loadout: [equip(clearing.startingWeapon)],
    progression: { level: 1, xp: 0, pending: 0, choices: [], confirming: false },
    modifiers: { lens: false, reach: 0, power: 0 }, elapsed: 0, status: 'active', outcome: null,
    nextSpawn: clearing.round.phases[0].interval, eliteSpawned: false,
    nextEnemyId: 2, randomState: (seed >>> 0) || 1,
    stats: { kills: 0, eliteKills: 0, shots: 0, damageDealt: 0, damageTaken: 0, spawned: 1, xpCollected: 0, upgrades: 0 }, events: [],
  };
}
export function pauseRun(run: RunState, paused: boolean): void {
  if (paused && run.status === 'active') run.status = 'paused';
  else if (!paused && run.status === 'paused') run.status = 'active';
}
/** Composition drains notifications once across all fixed steps in a frame. */
export function takeEvents(run: RunState): GameEvent[] { return run.events.splice(0); }

function random(run: RunState): number {
  let state = run.randomState;
  state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
  run.randomState = state >>> 0;
  return run.randomState / 0x100000000;
}
function finish(run: RunState, outcome: Outcome): void {
  if (run.outcome) return;
  run.outcome = outcome; run.status = 'finished';
  run.entries.length = 0; run.projectiles.length = 0; run.gems.length = 0;
  run.progression.pending = 0; run.progression.choices = []; run.progression.confirming = false;
  run.events.push({ type: 'outcome', outcome, at: run.elapsed });
}
function spawn(run: RunState, kind: EnemyId, at: Point, entryDelay = 0): void {
  run.enemies.push({ id: run.nextEnemyId++, kind, x: at.x, y: at.y, health: enemies[kind].maxHealth, entryDelay });
  run.stats.spawned++;
}
function requestEntry(run: RunState, kind: EnemyId): void {
  const { entryInset: inset, edgeDivisions, entryMinDistance } = clearing.round;
  const candidates: Point[] = [];
  for (let i = 1; i < edgeDivisions; i++) {
    const x = inset + (clearing.arena.width - inset * 2) * i / edgeDivisions;
    const y = inset + (clearing.arena.height - inset * 2) * i / edgeDivisions;
    candidates.push({ x: inset, y }, { x: clearing.arena.width - inset, y },
      { x, y: inset }, { x, y: clearing.arena.height - inset });
  }
  const safe = candidates.filter(point => distanceSquared(point, run.player) >= entryMinDistance ** 2);
  // All edges are visible. Preserve the existing farthest-edge fallback and seeded tie breaking.
  const farthest = Math.max(...safe.map(point => distanceSquared(point, run.player)));
  const choices = safe.filter(point => Math.abs(distanceSquared(point, run.player) - farthest) < 1e-9);
  const at = choices[Math.floor(random(run) * choices.length)]!;
  // The visible elite appears exactly at 120 seconds, invulnerable/harmless during its warning.
  if (enemies[kind].elite) spawn(run, kind, at, clearing.round.entryWarning);
  else run.entries.push({ ...at, kind, remaining: clearing.round.entryWarning });
}
function advanceSpawns(run: RunState, seconds: number): void {
  for (const entry of run.entries) {
    entry.remaining -= seconds;
    if (entry.remaining <= 1e-9) spawn(run, entry.kind, entry);
  }
  run.entries = run.entries.filter(entry => entry.remaining > 1e-9);
  if (!run.eliteSpawned && run.elapsed >= clearing.round.eliteAt - 1e-9) {
    run.eliteSpawned = true; requestEntry(run, 'elite_crawler');
  }
  while (run.nextSpawn <= run.elapsed + 1e-9) {
    const ordinaryCount = run.enemies.filter(enemy => !enemies[enemy.kind].elite).length + run.entries.length;
    if (ordinaryCount < clearing.round.ordinaryCap) requestEntry(run, 'crawler');
    let interval: number = clearing.round.phases[0].interval;
    for (const phase of clearing.round.phases) if (run.nextSpawn >= phase.start) interval = phase.interval;
    let following = run.nextSpawn + interval;
    for (const phase of clearing.round.phases) if (phase.start > run.nextSpawn && phase.start < following) following = phase.start;
    run.nextSpawn = following; // Capped slots are discarded, never banked.
  }
}
/** Advance active simulation time. The browser supplies fixed 60 Hz steps. */
export function stepRun(run: RunState, move: MoveAction, seconds: number): void {
  if (run.status !== 'active' || !Number.isFinite(seconds) || seconds <= 0) return;
  const dt = Math.min(seconds, clearing.round.duration - run.elapsed);
  const magnitude = Math.max(1, Math.hypot(move.x, move.y));
  const distance = clearing.keeper.speed * dt, { radius } = clearing.keeper;
  run.player.x = Math.max(radius, Math.min(clearing.arena.width - radius, run.player.x + move.x / magnitude * distance));
  run.player.y = Math.max(radius, Math.min(clearing.arena.height - radius, run.player.y + move.y / magnitude * distance));
  run.player.invulnerability = Math.max(0, run.player.invulnerability - dt);
  run.elapsed = Math.min(clearing.round.duration, run.elapsed + dt);
  for (const enemy of run.enemies) {
    if (enemy.entryDelay > 1e-9) { enemy.entryDelay = Math.max(0, enemy.entryDelay - dt); continue; }
    if (!targetable(enemy)) continue;
    const data = enemies[enemy.kind];
    const dx = run.player.x - enemy.x, dy = run.player.y - enemy.y, length = Math.hypot(dx, dy);
    const travel = Math.min(length, data.speed * dt);
    if (length > 0) {
      enemy.x = Math.max(data.radius, Math.min(clearing.arena.width - data.radius, enemy.x + dx / length * travel));
      enemy.y = Math.max(data.radius, Math.min(clearing.arena.height - data.radius, enemy.y + dy / length * travel));
    }
  }
  advanceWeapons(run, dt);
  advanceProjectiles(run, dt);
  run.enemies = run.enemies.filter(enemy => enemy.health > 0);
  for (const enemy of run.enemies) {
    if (run.player.invulnerability > 1e-9) break;
    if (!targetable(enemy)) continue;
    const data = enemies[enemy.kind];
    if (distanceSquared(enemy, run.player) <= (radius + data.radius) ** 2) {
      const absorbed = Math.min(run.player.shield, data.contactDamage);
      run.player.shield -= absorbed;
      const damage = Math.min(run.player.health, data.contactDamage - absorbed);
      run.player.health -= damage; run.stats.damageTaken += damage;
      run.player.invulnerability = clearing.keeper.contactCooldown;
      run.events.push({ type: 'player-hit', x: run.player.x, y: run.player.y, at: run.elapsed });
    }
  }
  // Outcome takes precedence over drops/choices/spawns on the final tick.
  if (run.player.health <= 0) finish(run, 'defeat');
  else if (run.elapsed >= clearing.round.duration - 1e-9) { run.elapsed = clearing.round.duration; finish(run, 'victory'); }
  else {
    advanceSpawns(run, dt);
    advanceGems(run, dt);
  }
}
