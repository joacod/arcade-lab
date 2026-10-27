import type { Mission, Operator, Point } from './content.ts';
import { limits } from './content.ts';
import type { Body, Terrain } from './terrain.ts';
export interface Action { move: number; aim: number; jumpPressed: boolean; jumpHeld: boolean; fire: boolean; grenade: boolean; switch: boolean }
export const idle: Readonly<Action> = { move: 0, aim: 0, jumpPressed: false, jumpHeld: false, fire: false, grenade: false, switch: false };
export interface Player extends Body { operator: Operator; facing: number; health: number; immune: number; cooldown: number; grenadeCooldown: number; coyote: number; buffer: number; aimX: number; aimY: number }
export interface Enemy extends Body { id: number; kind: 'guard' | 'heavy' | 'bastion'; health: number; maxHealth: number; home: number; patrol: number; facing: number; cooldown: number; warning: number; burst: number; flash: number; target: Point }
export interface Barrel extends Body { detonated: boolean; health: number }
export interface Relay extends Point { health: number }
export interface Projectile extends Point { vx: number; vy: number; life: number; kind: 'bullet' | 'rocket' | 'grenade' | 'enemy' | 'shell'; friendly: boolean; damage: number; tileDamage: number; radius: number }
export interface Explosion extends Point { radius: number; damage: number; tileDamage: number; source: 'player' | 'enemy' | 'barrel' }
export type EventType = 'shot' | 'launch' | 'throw' | 'impact' | 'terrain' | 'explosion' | 'chain' | 'hit' | 'kill' | 'hurt' | 'death' | 'rescue' | 'switch' | 'checkpoint' | 'alarm' | 'extract' | 'victory' | 'defeat' | 'jump';
export interface BlastEvent extends Point { type: EventType; strength: number }
export interface Run {
  missions: readonly Mission[]; mission: Mission; missionIndex: number; terrain: Terrain; player: Player;
  enemies: Enemy[]; barrels: Barrel[]; relays: Relay[]; projectiles: Projectile[]; explosions: Explosion[];
  events: BlastEvent[]; status: 'active' | 'paused' | 'interlude' | 'victory' | 'defeat';
  elapsed: number; lives: number; grenades: number; rescued: boolean; checkpoint: number;
  respawn: number; collapse: number; extraction: number; score: number; destroyed: number; kills: number;
}
export function emit(run: Run, type: EventType, at: Point, strength = 1) {
  if (run.events.length < limits.events) run.events.push({ type, x: at.x, y: at.y, strength });
}
export function hurtPlayer(run: Run, damage: number) {
  const p = run.player;
  if (p.health <= 0 || p.immune > 0 || run.extraction > 0) return;
  p.health = Math.max(0, p.health - damage); p.immune = .95;
  emit(run, 'hurt', p);
  if (!p.health) {
    run.lives--; run.respawn = 1.25; run.projectiles = []; p.vx = 0;
    emit(run, 'death', p);
    if (run.lives <= 0) { run.status = 'defeat'; emit(run, 'defeat', p); }
  }
}
export function damageEnemy(run: Run, enemy: Enemy, damage: number) {
  if (enemy.health <= 0) return;
  enemy.health = Math.max(0, enemy.health - damage); enemy.flash = .12;
  emit(run, enemy.health ? 'hit' : 'kill', { x: enemy.x + enemy.w / 2, y: enemy.y + enemy.h / 2 }, enemy.kind === 'bastion' ? 2 : 1);
  if (!enemy.health) { run.kills++; run.score += enemy.kind === 'bastion' ? 1500 : enemy.kind === 'heavy' ? 250 : 100; }
}
