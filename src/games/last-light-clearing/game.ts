import { clearing, encounters, enemies, type EnemyId, type RoundDefinition } from './content.ts';
import { content, validateContent } from './content-validation.ts';
import { advanceProjectiles, distanceSquared, hurtKeeper, targetable } from './combat.ts';
import { advanceEnemies, prepareAttack, resolveAttacks } from './encounters.ts';
import { advanceWeapons } from './weapons.ts';
import { advanceGems, equip } from './progression.ts';
import type { GameEvent, MoveAction, Outcome, Point, RunState } from './game-state.ts';
export type { RunState, MoveAction, GameEvent } from './game-state.ts';

export function createRun(seed = Math.floor(Math.random() * 0x100000000), round: RoundDefinition = clearing.round): RunState {
  const errors = validateContent({ ...content, clearing: { ...clearing, round } });
  if (errors.length) throw new Error(`Cannot start Last Light Clearing:\n${errors.join('\n')}`);
  return {
    round,
    player: { x: clearing.arena.width / 2, y: clearing.arena.height / 2,
      health: clearing.keeper.maxHealth, shield: 0, invulnerability: 0 },
    enemies: [{ id: 1, kind: 'crawler', ...clearing.initialEnemy, health: enemies.crawler.maxHealth, entryDelay: 0 }],
    projectiles: [], gems: [{ ...clearing.openingGem, attracted: false }], entries: [], loadout: [equip(clearing.startingWeapon)],
    progression: { level: 1, xp: 0, pending: 0, choices: [], confirming: false },
    modifiers: { lens: false, reach: 0, power: 0 }, elapsed: 0, status: 'active', outcome: null,
    nextSpawn: round.phases[0]!.interval, eliteSpawned: false,
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
  const enemy = { id: run.nextEnemyId++, kind, x: at.x, y: at.y, health: enemies[kind].maxHealth, entryDelay };
  prepareAttack(enemy); run.enemies.push(enemy);
  run.stats.spawned++;
}
function requestEntry(run: RunState, kind: EnemyId): void {
  const { entryInset: inset, edgeDivisions, entryMinDistance } = run.round;
  const candidates: Point[] = [];
  for (let i = 1; i < edgeDivisions; i++) {
    const x = inset + (clearing.arena.width - inset * 2) * i / edgeDivisions;
    const y = inset + (clearing.arena.height - inset * 2) * i / edgeDivisions;
    candidates.push({ x: inset, y }, { x: clearing.arena.width - inset, y },
      { x, y: inset }, { x, y: clearing.arena.height - inset });
  }
  const safe = candidates.filter(point => distanceSquared(point, run.player) >= entryMinDistance ** 2);
  // Choose safe world edges independently of the camera. Presentation cues mark offscreen entries.
  // Vary approach angles without placing a new body beside the Keeper.
  const choices = safe;
  const at = choices[Math.floor(random(run) * choices.length)]!;
  // The elite appears at the profile's deadline, invulnerable/harmless during its warning.
  if (enemies[kind].elite) spawn(run, kind, at, run.round.entryWarning);
  else run.entries.push({ ...at, kind, remaining: run.round.entryWarning });
}
function advanceSpawns(run: RunState, seconds: number): void {
  for (const entry of run.entries) {
    entry.remaining -= seconds;
    if (entry.remaining <= 1e-9) spawn(run, entry.kind, entry);
  }
  run.entries = run.entries.filter(entry => entry.remaining > 1e-9);
  if (!run.eliteSpawned && run.elapsed >= run.round.eliteAt - 1e-9) {
    run.eliteSpawned = true; requestEntry(run, 'elite_crawler');
    run.events.push({ type: 'elite', at: run.elapsed });
  }
  while (run.nextSpawn <= run.elapsed + 1e-9) {
    const ordinaryCount = run.enemies.filter(enemy => !enemies[enemy.kind].elite).length + run.entries.length;
    let phaseIndex = 0;
    for (let index = 0; index < run.round.phases.length; index++) if (run.nextSpawn >= run.round.phases[index]!.start) phaseIndex = index;
    const chargerEvery = encounters.chargerEvery[Math.min(phaseIndex, encounters.chargerEvery.length - 1)]!;
    const specialCount = run.enemies.filter(enemy => enemy.kind === 'charger').length + run.entries.filter(entry => entry.kind === 'charger').length;
    const charger = run.elapsed >= run.round.duration * encounters.chargerAtFraction
      && run.stats.spawned % chargerEvery === 0 && specialCount < 4;
    if (ordinaryCount < run.round.ordinaryCap) requestEntry(run, charger ? 'charger' : 'crawler');
    let interval: number = run.round.phases[0]!.interval;
    for (const phase of run.round.phases) if (run.nextSpawn >= phase.start) interval = phase.interval;
    let following = run.nextSpawn + interval;
    for (const phase of run.round.phases) if (phase.start > run.nextSpawn && phase.start < following) following = phase.start;
    run.nextSpawn = following; // Capped slots are discarded, never banked.
  }
}
/** Advance active simulation time. The browser supplies fixed 60 Hz steps. */
export function stepRun(run: RunState, move: MoveAction, seconds: number): void {
  if (run.status !== 'active' || !Number.isFinite(seconds) || seconds <= 0) return;
  const dt = Math.min(seconds, run.round.duration - run.elapsed);
  const magnitude = Math.max(1, Math.hypot(move.x, move.y));
  const distance = clearing.keeper.speed * dt, { radius } = clearing.keeper;
  run.player.x = Math.max(radius, Math.min(clearing.arena.width - radius, run.player.x + move.x / magnitude * distance));
  run.player.y = Math.max(radius, Math.min(clearing.arena.height - radius, run.player.y + move.y / magnitude * distance));
  run.player.invulnerability = Math.max(0, run.player.invulnerability - dt);
  run.elapsed = Math.min(run.round.duration, run.elapsed + dt);
  const charges = advanceEnemies(run, dt);
  advanceWeapons(run, dt);
  advanceProjectiles(run, dt);
  run.enemies = run.enemies.filter(enemy => enemy.health > 0);
  resolveAttacks(run, charges);
  for (const enemy of run.enemies) {
    if (run.player.invulnerability > 1e-9) break;
    if (!targetable(enemy)) continue;
    if (enemy.attack && enemy.attack.phase !== 'approach') continue;
    const data = enemies[enemy.kind];
    if (distanceSquared(enemy, run.player) <= (radius + data.radius) ** 2) {
      hurtKeeper(run, data.contactDamage);
    }
  }
  // Outcome takes precedence over drops/choices/spawns on the final tick.
  if (run.player.health <= 0) finish(run, 'defeat');
  else if (run.elapsed >= run.round.duration - 1e-9) { run.elapsed = run.round.duration; finish(run, 'victory'); }
  else {
    advanceSpawns(run, dt);
    advanceGems(run, dt);
  }
}
