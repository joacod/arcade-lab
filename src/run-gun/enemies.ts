import { body, TILE, enemyTypes } from './content.ts';
import { moveBody, solidAt } from './terrain.ts';
import { spawnProjectile, visible } from './combat.ts';
import { emit, type Enemy, type Run } from './state.ts';
export function stepEnemies(run: Run, dt: number) {
  for (const e of run.enemies) {
    if (e.health <= 0) continue;
    e.flash = Math.max(0, e.flash - dt); e.cooldown = Math.max(0, e.cooldown - dt);
    const d = enemyTypes[e.kind];
    const p = run.player, muzzle = { x: e.x + e.w / 2, y: e.y + (e.kind === 'bastion' ? 22 : 12) };
    const aim = { x: p.x + p.w / 2, y: p.y + 15 };
    const distance = Math.hypot(aim.x - muzzle.x, aim.y - muzzle.y);
    const sees = p.health > 0 && run.extraction === 0 && distance < d.sight && visible(run, muzzle, aim);
    if (sees) e.facing = aim.x > muzzle.x ? 1 : -1;
    e.vx = 0;
    if (!sees && e.kind === 'guard' && e.patrol > 0 && e.grounded) {
      if (e.x >= e.home + e.patrol) e.facing = -1;
      if (e.x <= e.home - e.patrol) e.facing = 1;
      if (solidAt(run.terrain, e.x + e.w / 2 + e.facing * 16, e.y + e.h + 3)) e.vx = e.facing * 32;
    }
    e.vy = Math.min(body.fall, e.vy + body.gravity * dt); moveBody(run.terrain, e, dt);
    if (e.y > run.mission.rows * TILE) { e.health = 0; continue; }
    if (e.warning > 0) {
      e.warning = Math.max(0, e.warning - dt);
      if (e.warning === 0) e.burst = d.burst;
    } else if (!e.burst && sees && e.cooldown === 0 && e.grounded) {
      e.warning = d.warning; e.target = aim;
    }
    if (e.burst && e.cooldown === 0) {
      // The warning marks a committed target. Movement can evade the whole burst.
      shoot(run, e, muzzle); e.burst--; e.cooldown = e.burst ? .18 : d.recovery;
    }
  }
}
function shoot(run: Run, e: Enemy, muzzle: { x: number; y: number }) {
  const dx = e.target.x - muzzle.x, dy = e.target.y - muzzle.y, length = Math.max(1, Math.hypot(dx, dy));
  const { speedShot: speed, radius } = enemyTypes[e.kind];
  spawnProjectile(run, { ...muzzle, vx: dx / length * speed, vy: dy / length * speed, life: 2.4, kind: e.kind === 'guard' ? 'enemy' : 'shell', friendly: false, damage: 1, tileDamage: 1, radius });
  emit(run, 'shot', muzzle, .6);
}
