export type WeaponId = 'spark' | 'halo' | 'pulse' | 'shard';
export type EquippedId = WeaponId | 'arc_spark';
export type EnemyId = 'crawler' | 'charger' | 'elite_crawler';
export interface RoundDefinition {
  readonly duration: number; readonly ordinaryCap: number; readonly eliteAt: number;
  readonly entryWarning: number; readonly entryInset: number; readonly entryMinDistance: number;
  readonly edgeDivisions: number; readonly phases: readonly { readonly start: number; readonly interval: number }[];
}
export interface WeaponDefinition {
  readonly name: string;
  readonly behavior: 'nearest-shot' | 'orbit' | 'pulse' | 'cardinal-burst';
  readonly damage: readonly [number, number, number];
  readonly cadence: number;
  readonly speed: number;
  readonly lifetime: number;
  readonly radius: number;
  readonly hitRadius: number;
}
export interface EnemyDefinition {
  readonly name: string; readonly speed: number; readonly radius: number;
  readonly maxHealth: number; readonly contactDamage: number; readonly xp: number; readonly elite: boolean;
}
interface UpgradeText { readonly id: string; readonly name: string; readonly description: string }
export type UpgradeDefinition = UpgradeText & (
  | { readonly kind: 'weapon'; readonly weapon: WeaponId; readonly maxRank: number }
  | { readonly kind: 'lens' | 'recovery' | 'power' | 'reach'; readonly amount: number }
);

export const weapons: Readonly<Record<WeaponId, WeaponDefinition>> = {
  spark: { name: 'Spark', behavior: 'nearest-shot', damage: [10, 12.5, 15], cadence: 0.7, speed: 300, lifetime: 3, radius: 0, hitRadius: 4 },
  halo: { name: 'Halo', behavior: 'orbit', damage: [6, 7.5, 9], cadence: 0.5, speed: 0, lifetime: 3, radius: 36, hitRadius: 8 },
  pulse: { name: 'Pulse', behavior: 'pulse', damage: [14, 17.5, 21], cadence: 2, speed: 0, lifetime: 3, radius: 72, hitRadius: 72 },
  shard: { name: 'Shard', behavior: 'cardinal-burst', damage: [8, 10, 12], cadence: 1.4, speed: 240, lifetime: 3, radius: 0, hitRadius: 4 },
};
export const enemies: Readonly<Record<EnemyId, EnemyDefinition>> = {
  crawler: { name: 'Crawler', speed: 45, radius: 11, maxHealth: 20, contactDamage: 10, xp: 5, elite: false },
  charger: { name: 'Briar charger', speed: 52, radius: 12, maxHealth: 32, contactDamage: 14, xp: 10, elite: false },
  elite_crawler: { name: 'Elite crawler', speed: 38, radius: 18, maxHealth: 240, contactDamage: 20, xp: 50, elite: true },
};
export const encounters = {
  charger: { windup: 0.9, strike: 0.65, recovery: 1.2, cooldown: 3.2, range: 245, speed: 310 },
  elite: { windup: 1.15, strike: 0.2, recovery: 1.45, cooldown: 3.4, range: 155, radius: 90, damage: 24 },
  // Introduce the lane attack alone, then combine it with denser pursuit.
  chargerAtFraction: 0.18, chargerEvery: [7, 5, 4],
} as const;
export const weaponRanks = {
  sparkCadence: [0.7, 0.6, 0.5], haloLights: [1, 2, 3],
  pulseRadius: [72, 88, 104], shardShots: [4, 6, 8],
} as const;
// Authored order provides the acquisition and fallback order; progression reserves support.
export const upgrades: readonly UpgradeDefinition[] = [
  { id: 'upgrade_spark', name: 'Spark', description: 'Improve the nearest-target shot.', kind: 'weapon', weapon: 'spark', maxRank: 3 },
  { id: 'upgrade_halo', name: 'Halo', description: 'Unlock or improve an orbiting light.', kind: 'weapon', weapon: 'halo', maxRank: 3 },
  { id: 'upgrade_pulse', name: 'Pulse', description: 'Unlock or improve a radial burst.', kind: 'weapon', weapon: 'pulse', maxRank: 3 },
  { id: 'upgrade_shard', name: 'Shard', description: 'Unlock or improve four cardinal shots.', kind: 'weapon', weapon: 'shard', maxRank: 3 },
  { id: 'lens', name: 'Lens', description: 'Set base pickup radius to 80. Enables Arc Spark with rank-3 Spark.', kind: 'lens', amount: 80 },
  { id: 'recovery', name: 'Recovery', description: 'Heal 20 HP. Unused healing becomes shield.', kind: 'recovery', amount: 20 },
  { id: 'power', name: 'Power', description: 'Add 5% of base weapon damage. Repeatable.', kind: 'power', amount: 0.05 },
  { id: 'reach', name: 'Reach', description: 'Add 8 to pickup radius. Repeatable.', kind: 'reach', amount: 8 },
];
export const evolution = {
  weapon: 'spark', rank: 3, passive: 'lens', replacement: 'arc_spark', name: 'Arc Spark', chainLimit: 3,
} as const;

export const clearing = {
  arena: { width: 960, height: 640 },
  keeper: { speed: 150, radius: 10, maxHealth: 100, contactCooldown: 0.7 },
  initialEnemy: { x: 680, y: 320 },
  openingGem: { x: 540, y: 320, amount: 3 },
  startingWeapon: 'spark' as WeaponId,
  progression: { firstCost: 10, increment: 5, pickupRadius: 48, gemSpeed: 240, collectRadius: 12, choiceCount: 3, lensPriorityLevel: 3 },
  round: {
    duration: 180, ordinaryCap: 60, eliteAt: 120, entryWarning: 0.7, entryInset: 24,
    entryMinDistance: 160, edgeDivisions: 10,
    phases: [{ start: 0, interval: 1 }, { start: 60, interval: 0.65 }, { start: 120, interval: 0.4 }],
  },
} as const;

export const configurations = {
  clearing: { name: 'Until dawn', description: 'The original clearing · 3 minutes', round: clearing.round },
  dusk: { name: 'Brief dusk', description: 'A gentler opening · 90 seconds · elite at 60s', round: {
    ...clearing.round, duration: 90, eliteAt: 60, ordinaryCap: 40,
    phases: [{ start: 0, interval: 1.3 }, { start: 30, interval: 0.9 }, { start: 60, interval: 0.6 }],
  } },
} as const satisfies Record<string, { name: string; description: string; round: RoundDefinition }>;
export type ConfigurationId = keyof typeof configurations;
