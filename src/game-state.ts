import type { EnemyId, EquippedId, WeaponId, RoundDefinition } from './content.ts';

export interface MoveAction { readonly x: number; readonly y: number }
export interface Point { x: number; y: number }
export interface Enemy extends Point { id: number; kind: EnemyId; health: number; entryDelay: number }
export interface Projectile extends Point {
  weapon: WeaponId; dx: number; dy: number; remaining: number; damage: number;
  chainLimit: number; hitTargets: number[];
}
export interface WeaponInstance {
  base: WeaponId; id: EquippedId; rank: number; cooldown: number;
  orbitAngle: number; nextHit: Map<number, number>;
}
export interface Gem extends Point { amount: number; attracted: boolean }
export interface UpgradeChoice { readonly id: string; readonly name: string; readonly description: string }
export type Outcome = 'victory' | 'defeat';
export type GameEvent =
  | { type: 'shot' | 'player-hit'; x: number; y: number; at: number }
  | { type: 'pulse'; x: number; y: number; radius: number; at: number }
  | { type: 'enemy-hit' | 'enemy-defeated'; x: number; y: number; enemyId: number; at: number }
  | { type: 'evolution'; at: number }
  | { type: 'pickup'; x: number; y: number; at: number }
  | { type: 'upgrade'; at: number }
  | { type: 'outcome'; outcome: Outcome; at: number };
export interface RunState {
  readonly round: RoundDefinition;
  player: Point & { health: number; shield: number; invulnerability: number };
  enemies: Enemy[];
  projectiles: Projectile[];
  gems: Gem[];
  entries: (Point & { kind: EnemyId; remaining: number })[];
  loadout: WeaponInstance[];
  progression: { level: number; xp: number; pending: number; choices: readonly UpgradeChoice[]; confirming: boolean };
  modifiers: { lens: boolean; reach: number; power: number };
  elapsed: number;
  status: 'active' | 'paused' | 'choosing' | 'finished';
  outcome: Outcome | null;
  nextSpawn: number;
  eliteSpawned: boolean;
  nextEnemyId: number;
  randomState: number;
  stats: { kills: number; eliteKills: number; shots: number; damageDealt: number; damageTaken: number; spawned: number; xpCollected: number; upgrades: number };
  events: GameEvent[];
}
