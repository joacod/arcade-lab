import { sweptCircle } from '../../engine/collision.ts';
import { clearing, enemies, weapons } from './content.ts';
import type { Enemy, Point, RunState, WeaponInstance } from './game-state.ts';
import { damage } from './weapon-stats.ts';

export const distanceSquared = (a: Point, b: Point): number => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
export const targetable = (enemy: Enemy): boolean => enemy.health > 0 && enemy.entryDelay <= 1e-9;
export function nearest(run: RunState, point: Point, exclude: readonly number[] = []): Enemy | undefined {
  let found: Enemy | undefined, distance = Infinity;
  for (const enemy of run.enemies) {
    const candidate = distanceSquared(point, enemy);
    if (targetable(enemy) && !exclude.includes(enemy.id) && candidate < distance) { found = enemy; distance = candidate; }
  }
  return found;
}
export function weaponDamage(run: RunState, slot: WeaponInstance): number {
  return damage(slot.base, slot.rank, run.modifiers.power);
}
export function hurtKeeper(run: RunState, amount: number): void {
  if (run.player.invulnerability > 1e-9) return;
  const absorbed = Math.min(run.player.shield, amount);
  run.player.shield -= absorbed;
  const damage = Math.min(run.player.health, amount - absorbed);
  run.player.health -= damage; run.stats.damageTaken += damage;
  run.player.invulnerability = clearing.keeper.contactCooldown;
  run.events.push({ type: 'player-hit', x: run.player.x, y: run.player.y, at: run.elapsed, absorbed, damage });
}
export function hitEnemy(run: RunState, enemy: Enemy, amount: number): void {
  if (!targetable(enemy)) return;
  const damage = Math.min(enemy.health, amount);
  enemy.health -= damage;
  run.stats.damageDealt += damage;
  run.events.push({ type: 'enemy-hit', x: enemy.x, y: enemy.y, enemyId: enemy.id, at: run.elapsed });
  if (enemy.health > 0) return;
  run.stats.kills++;
  if (enemies[enemy.kind].elite) run.stats.eliteKills++;
  run.events.push({ type: 'enemy-defeated', x: enemy.x, y: enemy.y, enemyId: enemy.id, at: run.elapsed });
  run.gems.push({ x: enemy.x, y: enemy.y, amount: enemies[enemy.kind].xp, attracted: false });
}
export function advanceProjectiles(run: RunState, dt: number): void {
  run.projectiles = run.projectiles.filter(projectile => {
    const data = weapons[projectile.weapon];
    const travel = data.speed * Math.min(dt, projectile.remaining);
    const end = { x: projectile.x + projectile.dx * travel, y: projectile.y + projectile.dy * travel };
    let hit: Enemy | undefined, earliest = Infinity;
    for (const enemy of run.enemies) {
      if (!targetable(enemy) || projectile.hitTargets.includes(enemy.id)) continue;
      const t = sweptCircle(projectile, end, enemy, enemy, data.hitRadius + enemies[enemy.kind].radius);
      if (t !== undefined && t < earliest) { earliest = t; hit = enemy; }
    }
    projectile.remaining -= dt;
    if (hit) {
      projectile.x += (end.x - projectile.x) * earliest;
      projectile.y += (end.y - projectile.y) * earliest;
      projectile.hitTargets.push(hit.id);
      hitEnemy(run, hit, projectile.damage);
      if (projectile.hitTargets.length >= projectile.chainLimit) return false;
      const next = nearest(run, projectile, projectile.hitTargets);
      if (!next) return false;
      const dx = next.x - projectile.x, dy = next.y - projectile.y, length = Math.hypot(dx, dy);
      projectile.dx = length > 0 ? dx / length : 1;
      projectile.dy = length > 0 ? dy / length : 0;
    } else { projectile.x = end.x; projectile.y = end.y; }
    return projectile.remaining > 1e-9;
  });
}
