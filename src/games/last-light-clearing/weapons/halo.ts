import { enemies, weapons } from '../content.ts';
import { distanceSquared, hitEnemy, targetable, weaponDamage } from '../combat.ts';
import type { Point, RunState, WeaponInstance } from '../game-state.ts';
import { haloLights } from '../weapon-stats.ts';

export function orbitPosition(run: Readonly<RunState>, slot: WeaponInstance, index = 0): Point {
  const angle = slot.orbitAngle + index * Math.PI * 2 / haloLights(slot.rank);
  return { x: run.player.x + Math.cos(angle) * weapons[slot.base].radius,
    y: run.player.y + Math.sin(angle) * weapons[slot.base].radius };
}
export function advanceHalo(run: RunState, slot: WeaponInstance, dt: number): void {
  const data = weapons[slot.base];
  slot.orbitAngle = (slot.orbitAngle + Math.PI * 2 * dt / data.lifetime) % (Math.PI * 2);
  const positions = Array.from({ length: haloLights(slot.rank) }, (_, index) => orbitPosition(run, slot, index));
  const living = new Set(run.enemies.filter(targetable).map(enemy => enemy.id));
  let struck = false;
  for (const id of slot.nextHit.keys()) if (!living.has(id)) slot.nextHit.delete(id);
  for (const enemy of run.enemies) {
    if (targetable(enemy) && run.elapsed + 1e-9 >= (slot.nextHit.get(enemy.id) ?? 0)
      && positions.some(at => distanceSquared(at, enemy) <= (data.hitRadius + enemies[enemy.kind].radius) ** 2)) {
      slot.nextHit.set(enemy.id, run.elapsed + data.cadence);
      hitEnemy(run, enemy, weaponDamage(run, slot));
      struck = true;
    }
  }
  if (struck) run.events.push({ type: 'halo', at: run.elapsed });
}
