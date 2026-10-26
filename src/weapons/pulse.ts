import { enemies, weapons } from '../content.ts';
import { distanceSquared, hitEnemy, weaponDamage } from '../combat.ts';
import type { RunState, WeaponInstance } from '../game-state.ts';

export function firePulse(run: RunState, slot: WeaponInstance): void {
  const radius = weapons[slot.base].radius, damage = weaponDamage(run, slot);
  // One sample at activation. Later arrivals cannot be hit by the lingering visual.
  for (const enemy of run.enemies) {
    if (distanceSquared(enemy, run.player) <= (radius + enemies[enemy.kind].radius) ** 2) hitEnemy(run, enemy, damage);
  }
  run.events.push({ type: 'pulse', x: run.player.x, y: run.player.y, radius, at: run.elapsed });
}
