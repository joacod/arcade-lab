import { nearest } from '../combat.ts';
import type { RunState, WeaponInstance } from '../game-state.ts';
import { shoot } from './projectile.ts';

export function fireSpark(run: RunState, slot: WeaponInstance): void {
  const target = nearest(run, run.player);
  if (!target) return; // Targetless cadence is consumed, never banked.
  const dx = target.x - run.player.x, dy = target.y - run.player.y, length = Math.hypot(dx, dy);
  shoot(run, slot, length > 0 ? dx / length : 1, length > 0 ? dy / length : 0);
}
