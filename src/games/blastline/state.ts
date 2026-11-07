import type { EnemyKind, Mission, Operator, Point } from './content.ts';
import { limits } from './content.ts';
import type { Body, Terrain } from './terrain.ts';
export interface Action { move: number; aim: number; jumpPressed: boolean; jumpHeld: boolean; fire: boolean; firePressed: boolean; grenade: boolean; switch: boolean }
export const idle: Readonly<Action> = { move: 0, aim: 0, jumpPressed: false, jumpHeld: false, fire: false, firePressed: false, grenade: false, switch: false };
export interface Player extends Body { operator: Operator; facing: number; health: number; immune: number; spawnImmune: number; cooldown: number; firing: number; fireBuffer: number; grenadeCooldown: number; coyote: number; buffer: number; aimX: number; aimY: number }
export interface Enemy extends Body { id: number; kind: EnemyKind; health: number; maxHealth: number; home: number; patrol: number; facing: number; cooldown: number; warning: number; burst: number; firing: number; flash: number; target: Point }
export interface Barrel extends Body { detonated: boolean; health: number }
export interface Relay extends Point { health: number }
export type Launch = Point & ({ origin: 'player'; actor: Pick<Player, 'x' | 'y' | 'operator' | 'grounded' | 'vx' | 'facing' | 'aimX' | 'aimY'> }
  | { origin: 'enemy'; actor: Pick<Enemy, 'x' | 'y' | 'w' | 'kind' | 'facing'> });
export interface Projectile extends Point { vx: number; vy: number; life: number; kind: 'bullet' | 'rocket' | 'grenade' | 'enemy' | 'shell' | 'lob'; friendly: boolean; damage: number; tileDamage: number; radius: number; launch?: Launch }
export interface Explosion extends Point { radius: number; damage: number; tileDamage: number; source: 'player' | 'enemy' | 'barrel' }
export type EventType = 'shot' | 'launch' | 'throw' | 'impact' | 'terrain' | 'explosion' | 'chain' | 'hit' | 'kill' | 'hurt' | 'death' | 'rescue' | 'switch' | 'checkpoint' | 'alarm' | 'extract' | 'victory' | 'defeat' | 'jump' | 'relay' | 'redeploy';
export type DamageCause = 'bullet' | 'blast' | 'contact' | 'fall';
export interface BlastEvent extends Point { type: EventType; strength: number; cause?: DamageCause }
export interface Run {
  missions: readonly Mission[]; mission: Mission; missionIndex: number; terrain: Terrain; player: Player;
  enemies: Enemy[]; barrels: Barrel[]; relays: Relay[]; projectiles: Projectile[]; explosions: Explosion[];
  events: BlastEvent[]; status: 'active' | 'paused' | 'interlude' | 'victory' | 'defeat';
  elapsed: number; lives: number; grenades: number; rescued: boolean; checkpoint: number;
  respawn: number; collapse: number; extraction: number; score: number; destroyed: number; kills: number;
}
export function emit(run: Run, type: EventType, at: Point, strength = 1, cause?: DamageCause) {
  if (run.events.length < limits.events) run.events.push({ type, x: at.x, y: at.y, strength, ...(cause ? { cause } : {}) });
}
export function hurtPlayer(run: Run, damage: number, cause: DamageCause = 'bullet') {
  const p = run.player;
  if (p.health <= 0 || run.extraction > 0 || cause !== 'fall' && (p.spawnImmune > 0 || cause !== 'blast' && p.immune > 0)) return;
  p.health = Math.max(0, p.health - damage); p.immune = .95;
  emit(run, 'hurt', p, 1, cause);
  if (!p.health) {
    run.lives--; run.respawn = 1.25; run.projectiles = []; p.vx = 0; p.fireBuffer = 0; p.buffer = 0;
    for (const enemy of run.enemies) {
      enemy.warning = 0; enemy.burst = 0; enemy.firing = 0; enemy.cooldown = Math.max(.6, enemy.cooldown);
    }
    emit(run, 'death', p, 1, cause);
    if (run.lives <= 0) { run.status = 'defeat'; emit(run, 'defeat', p); }
  }
}
export function damageEnemy(run: Run, enemy: Enemy, damage: number) {
  if (enemy.health <= 0) return;
  enemy.health = Math.max(0, enemy.health - damage); enemy.flash = .12;
  emit(run, enemy.health ? 'hit' : 'kill', { x: enemy.x + enemy.w / 2, y: enemy.y + enemy.h / 2 }, enemy.kind === 'bastion' ? 2 : 1);
  if (!enemy.health) { run.kills++; run.score += enemy.kind === 'bastion' ? 1500 : enemy.kind === 'heavy' ? 250 : 100; }
}
