import type { RunState, WeaponInstance } from '../game-state.ts';
import { shoot } from './projectile.ts';
import { shardShots } from '../weapon-stats.ts';

export function fireShard(run: RunState, slot: WeaponInstance): void {
  const count = shardShots(slot.rank);
  for (let index = 0; index < count; index++) {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / count;
    shoot(run, slot, Math.cos(angle), Math.sin(angle));
  }
}
