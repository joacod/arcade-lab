import { sweptCircle } from '../../engine/collision.ts';
import { clearing, encounters, enemies } from './content.ts';
import { distanceSquared, hurtKeeper, targetable } from './combat.ts';
import type { Enemy, Point, RunState } from './game-state.ts';

interface ChargePath { id: number; from: Point; to: Point }
export function chargeDestination(origin: Point, direction: Point): Point {
  const radius = enemies.charger.radius;
  let distance = encounters.charger.speed * encounters.charger.strike;
  for (const [axis, size] of [['x', clearing.arena.width], ['y', clearing.arena.height]] as const) {
    if (direction[axis] > 0) distance = Math.min(distance, (size - radius - origin[axis]) / direction[axis]);
    else if (direction[axis] < 0) distance = Math.min(distance, (radius - origin[axis]) / direction[axis]);
  }
  return { x: origin.x + direction.x * distance, y: origin.y + direction.y * distance };
}
export function prepareAttack(enemy: Enemy): void {
  if (enemy.kind === 'crawler') return;
  enemy.attack = { phase: 'approach', remaining: 1.8, origin: { x: enemy.x, y: enemy.y }, direction: { x: 1, y: 0 } };
}
function move(enemy: Enemy, direction: Point, distance: number): void {
  const radius = enemies[enemy.kind].radius;
  enemy.x = Math.max(radius, Math.min(clearing.arena.width - radius, enemy.x + direction.x * distance));
  enemy.y = Math.max(radius, Math.min(clearing.arena.height - radius, enemy.y + direction.y * distance));
}
/** Attack commitments and recovery belong to simulation; renderers read the same state. */
export function advanceEnemies(run: RunState, dt: number): ChargePath[] {
  const charges: ChargePath[] = [];
  for (const enemy of run.enemies) {
    if (enemy.entryDelay > 1e-9) { enemy.entryDelay = Math.max(0, enemy.entryDelay - dt); continue; }
    if (!targetable(enemy)) continue;
    const dx = run.player.x - enemy.x, dy = run.player.y - enemy.y, distance = Math.hypot(dx, dy);
    const direction = { x: distance ? dx / distance : 1, y: distance ? dy / distance : 0 };
    const attack = enemy.attack;
    if (!attack) { move(enemy, direction, Math.min(distance, enemies[enemy.kind].speed * dt)); continue; }
    const tuning = enemy.kind === 'charger' ? encounters.charger : encounters.elite;
    attack.remaining = Math.max(0, attack.remaining - dt);
    switch (attack.phase) {
      case 'approach': {
        // A single committed special attack at a time leaves readable escape routes.
        const busy = run.enemies.some(other => other !== enemy && targetable(other)
          && (other.attack?.phase === 'windup' || other.attack?.phase === 'strike'));
        if (attack.remaining === 0 && distance <= tuning.range && !busy) {
          attack.phase = 'windup'; attack.remaining = tuning.windup;
          attack.origin = { x: enemy.x, y: enemy.y }; attack.direction = direction;
        } else move(enemy, direction, Math.min(distance, enemies[enemy.kind].speed * dt));
        break;
      }
      case 'windup':
        if (attack.remaining === 0) { attack.phase = 'strike'; attack.remaining = tuning.strike; }
        break;
      case 'strike':
        if (enemy.kind === 'charger') {
          const from = { x: enemy.x, y: enemy.y };
          const end = chargeDestination(attack.origin, attack.direction);
          const travel = encounters.charger.speed * dt;
          if (Math.hypot(end.x - enemy.x, end.y - enemy.y) <= travel) {
            enemy.x = end.x; enemy.y = end.y;
          } else move(enemy, attack.direction, travel);
          charges.push({ id: enemy.id, from, to: { x: enemy.x, y: enemy.y } });
        }
        if (attack.remaining === 0) { attack.phase = 'recover'; attack.remaining = tuning.recovery; }
        break;
      case 'recover':
        if (attack.remaining === 0) { attack.phase = 'approach'; attack.remaining = tuning.cooldown; }
        break;
    }
  }
  return charges;
}
/** Resolve after weapons: a creature killed this tick cannot deliver its attack. */
export function resolveAttacks(run: RunState, charges: readonly ChargePath[]): void {
  for (const path of charges) {
    const enemy = run.enemies.find(enemy => enemy.id === path.id);
    if (enemy && targetable(enemy) && sweptCircle(path.from, path.to, run.player, run.player,
      clearing.keeper.radius + enemies[enemy.kind].radius) !== undefined) hurtKeeper(run, enemies[enemy.kind].contactDamage);
  }
  for (const enemy of run.enemies) {
    if (targetable(enemy) && enemy.kind === 'elite_crawler' && enemy.attack?.phase === 'strike'
      && distanceSquared(enemy.attack.origin, run.player) <= (encounters.elite.radius + clearing.keeper.radius) ** 2) {
      hurtKeeper(run, encounters.elite.damage);
    }
  }
}
