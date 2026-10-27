import { evolution, weapons } from '../content.ts';
import { weaponDamage } from '../combat.ts';
import type { RunState, WeaponInstance } from '../game-state.ts';

export function shoot(run: RunState, slot: WeaponInstance, dx: number, dy: number): void {
  run.projectiles.push({ x: run.player.x, y: run.player.y, weapon: slot.base, dx, dy,
    remaining: weapons[slot.base].lifetime, damage: weaponDamage(run, slot),
    chainLimit: slot.id === evolution.replacement ? evolution.chainLimit : 1, hitTargets: [] });
  run.stats.shots++;
  run.events.push({ type: 'shot', weapon: slot.id, x: run.player.x, y: run.player.y, at: run.elapsed });
}
