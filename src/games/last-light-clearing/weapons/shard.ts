import type { RunState, WeaponInstance } from '../game-state.ts';
import { shoot } from './projectile.ts';

export function fireShard(run: RunState, slot: WeaponInstance): void {
  for (const [x, y] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) shoot(run, slot, x, y);
}
