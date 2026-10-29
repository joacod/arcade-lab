import { weaponRanks, weapons, type WeaponId } from './content.ts';

/** Rank effects are gameplay data, also used for exact upgrade previews. */
export function cadence(base: WeaponId, rank: number): number {
  return base === 'spark' ? weaponRanks.sparkCadence[rank - 1]! : weapons[base].cadence;
}
export function damage(base: WeaponId, rank: number, power: number): number {
  return Math.ceil(weapons[base].damage[rank - 1]! + weapons[base].damage[0] * power);
}
export function pulseRadius(rank: number): number { return weaponRanks.pulseRadius[rank - 1]!; }
export function haloLights(rank: number): number { return weaponRanks.haloLights[rank - 1]!; }
export function shardShots(rank: number): number { return weaponRanks.shardShots[rank - 1]!; }
export function weaponSummary(base: WeaponId, rank: number, power: number): string {
  const hit = `${damage(base, rank, power)} damage`;
  switch (base) {
    case 'spark': return `${hit} · every ${cadence(base, rank).toFixed(1)}s`;
    case 'halo': return `${hit} · ${haloLights(rank)} orbiting ${rank === 1 ? 'light' : 'lights'}`;
    case 'pulse': return `${hit} · ${pulseRadius(rank)} radius · every 2s`;
    case 'shard': return `${hit} · ${shardShots(rank)} directions · every 1.4s`;
  }
}
