import { lobPoint, lobVelocity } from './ballistics.ts';
import { body, TILE, enemyGrenade, enemyTypes, type Point } from './content.ts';
import { bodyClear, circleTouchesRect, moveBody, segmentRect, solidAt, traceTerrain } from './terrain.ts';
import { spawnProjectile, visible } from './combat.ts';
import { emit, type Enemy, type Run } from './state.ts';

export function enemyOrigin(e: Enemy): Point {
  return { x: e.x + e.w / 2, y: e.y + (e.kind === 'bastion' ? 22 : 12) };
}
/** Check the whole committed shot, including what it can hit if the player dodges.
 * Barrels stay vulnerable to every projectile; enemies choose not to ignite them. */
export function safeEnemyShot(run: Run, e: Enemy, target: Point): boolean {
  const from = enemyOrigin(e), dx = target.x - from.x, dy = target.y - from.y;
  const distance = Math.hypot(dx, dy), d = enemyTypes[e.kind];
  if (distance < 1) return false;
  if (enemyTypes[e.kind].trajectory === 'lob') {
    // A short conservative sweep catches cover, teammates and fuel across the arc.
    // The landing splash must also be safe for the thrower and nearby allies.
    if (run.enemies.some(ally => ally.health > 0 && circleTouchesRect(target, d.radius + 4, ally))
      || run.barrels.some(b => !b.detonated && circleTouchesRect(target, d.radius + 4, b))) return false;
    let previous = from;
    for (let sample = 1; sample <= 18; sample++) {
      const point = lobPoint(from, target, enemyGrenade.flight * sample / 18);
      if (traceTerrain(run.terrain, previous, point, 3)
        || run.barrels.some(b => !b.detonated && segmentRect(previous, point, b, 3) !== undefined)
        || run.enemies.some(ally => ally !== e && ally.health > 0 && segmentRect(previous, point, ally, 3) !== undefined)) return false;
      previous = point;
    }
    return true;
  }
  const reach = d.speedShot * 2.4;
  const end = { x: from.x + dx / distance * reach, y: from.y + dy / distance * reach };
  const wall = traceTerrain(run.terrain, from, end, 1);
  const contact = wall ? { x: from.x + (end.x - from.x) * wall.time, y: from.y + (end.y - from.y) * wall.time } : end;
  if (wall && wall.time * reach < distance - 10) return false;
  if (run.barrels.some(b => !b.detonated && (segmentRect(from, contact, b, 2) !== undefined
    || d.radius > 0 && (circleTouchesRect(contact, d.radius + 4, b) || circleTouchesRect(target, d.radius + 4, b))))) return false;
  if (run.enemies.some(ally => ally !== e && ally.health > 0 && (segmentRect(from, contact, ally, 2) !== undefined
    || d.radius > 0 && (circleTouchesRect(contact, d.radius + 4, ally) || circleTouchesRect(target, d.radius + 4, ally))))) return false;
  // A shell striking the player or cover at arm's length must not kill its shooter.
  return !d.radius || !circleTouchesRect(target, d.radius + 4, e) && !circleTouchesRect(contact, d.radius + 4, e);
}
function canStep(run: Run, e: Enemy, direction: number, distance: number) {
  const x = e.x + direction * distance;
  return x >= TILE && x + e.w < (run.mission.columns - 1) * TILE
    && bodyClear(run.terrain, { ...e, x })
    && solidAt(run.terrain, x + (direction > 0 ? e.w : 0), e.y + e.h + 3);
}
export function stepEnemies(run: Run, dt: number) {
  for (const e of run.enemies) {
    if (e.health <= 0) continue;
    e.flash = Math.max(0, e.flash - dt); e.firing = Math.max(0, e.firing - dt);
    e.cooldown = Math.max(0, e.cooldown - dt);
    const d = enemyTypes[e.kind], p = run.player;
    const aim = { x: p.x + p.w / 2, y: p.y + 15 };
    const origin = enemyOrigin(e), distance = Math.hypot(aim.x - origin.x, aim.y - origin.y);
    const alert = p.health > 0 && run.extraction === 0 && distance < d.sight;
    const committed = e.warning > 0 || e.burst > 0;
    const sees = alert && (d.trajectory === 'lob' ? safeEnemyShot(run, e, aim) : visible(run, origin, aim));
    e.vx = 0;
    if (!committed) {
      if (alert) e.facing = aim.x >= origin.x ? 1 : -1;
      if (e.grounded && alert && (!sees || !safeEnemyShot(run, e, aim))) {
        // Bounded local repositioning: walk past obstructing fuel, never off a shelf.
        const direction = d.radius && distance < d.radius + e.w + 20 ? -e.facing : e.facing;
        if (Math.abs(e.x + direction * 8 - e.home) <= Math.max(96, e.patrol)
          && canStep(run, e, direction, 8)) e.vx = direction * (e.kind === 'guard' ? 48 : 28);
      } else if (!alert && e.kind === 'guard' && e.patrol > 0 && e.grounded) {
        if (e.x >= e.home + e.patrol) e.facing = -1;
        if (e.x <= e.home - e.patrol) e.facing = 1;
        if (!canStep(run, e, e.facing, 8)) e.facing *= -1;
        if (canStep(run, e, e.facing, 8)) e.vx = e.facing * 32;
      }
    }
    e.vy = Math.min(body.fall, e.vy + body.gravity * dt); moveBody(run.terrain, e, dt);
    if (e.y > run.mission.rows * TILE) { e.health = 0; continue; }
    if (!alert || !e.grounded || committed && !safeEnemyShot(run, e, e.target)) {
      e.warning = 0; e.burst = 0;
      if (committed) e.cooldown = Math.max(e.cooldown, .25);
      continue;
    }
    if (e.warning > 0) {
      e.warning = Math.max(0, e.warning - dt);
      if (e.warning === 0) e.burst = d.burst;
    } else if (!e.burst && sees && e.cooldown === 0 && safeEnemyShot(run, e, aim)) {
      e.vx = 0; e.warning = d.warning; e.target = aim;
      e.facing = aim.x >= enemyOrigin(e).x ? 1 : -1;
    }
    if (e.burst && e.cooldown === 0) {
      // Both facing and target remain committed until recovery. Every round rechecks safety.
      shoot(run, e); e.burst--; e.cooldown = e.burst ? .18 : d.recovery;
    }
  }
}
function shoot(run: Run, e: Enemy) {
  const muzzle = enemyOrigin(e);
  const dx = e.target.x - muzzle.x, dy = e.target.y - muzzle.y, length = Math.max(1, Math.hypot(dx, dy));
  const { speedShot: speed, radius } = enemyTypes[e.kind];
  e.firing = .08;
  const launch = { ...muzzle, actor: { x: e.x, y: e.y, w: e.w, kind: e.kind, facing: e.facing }, origin: 'enemy' as const };
  if (enemyTypes[e.kind].trajectory === 'lob') {
    spawnProjectile(run, { ...muzzle, ...lobVelocity(muzzle, e.target), life: enemyGrenade.flight, kind: 'lob',
      friendly: false, damage: body.health, tileDamage: 2, radius, launch });
    emit(run, 'throw', muzzle, .8); return;
  }
  spawnProjectile(run, { ...muzzle, vx: dx / length * speed, vy: dy / length * speed, life: 2.4,
    kind: e.kind === 'guard' ? 'enemy' : 'shell', friendly: false, damage: 1, tileDamage: 1, radius,
    launch });
  emit(run, 'shot', muzzle, .6);
}
