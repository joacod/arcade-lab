import { TILE, limits, operators, fuel, relay, grenade as grenadeDefinition, type Point } from './content.ts';
import { circleTouchesRect, damageTile, forTiles, segmentRect, traceTerrain } from './terrain.ts';
import { damageEnemy, emit, hurtPlayer, type Explosion, type Projectile, type Run } from './state.ts';
export function spawnProjectile(run: Run, shot: Projectile) {
  if (run.projectiles.length < limits.projectiles) run.projectiles.push(shot);
}
export function queueExplosion(run: Run, explosion: Explosion) {
  if (run.explosions.length < limits.explosions) run.explosions.push(explosion);
}
export function firePlayer(run: Run, grenade: boolean) {
  const p = run.player;
  if (grenade) {
    if (!run.grenades || p.grenadeCooldown > 0) return;
    run.grenades--; p.grenadeCooldown = .5;
    spawnProjectile(run, { x: p.x + p.w / 2, y: p.y + 8, vx: p.facing * 250 + p.vx * .3, vy: -360, life: grenadeDefinition.fuse, kind: 'grenade', friendly: true, damage: grenadeDefinition.damage, tileDamage: grenadeDefinition.tileDamage, radius: grenadeDefinition.radius });
    emit(run, 'throw', p); return;
  }
  if (p.cooldown > 0) return;
  const d = operators[p.operator]; p.cooldown = d.interval;
  // Start inside the physical body; tracing includes the muzzle path and cannot skip adjacent cover.
  spawnProjectile(run, { x: p.x + p.w / 2, y: p.y + 12, vx: p.aimX * d.speedShot, vy: p.aimY * d.speedShot, life: 1.2,
    kind: p.operator === 'nova' ? 'bullet' : 'rocket', friendly: true, damage: d.damage, tileDamage: d.tileDamage, radius: d.radius });
  emit(run, p.operator === 'nova' ? 'shot' : 'launch', { x: p.x + p.w / 2 + p.aimX * 17, y: p.y + 12 + p.aimY * 17 });
}
function breakTile(run: Run, i: number, amount: number) {
  if (damageTile(run.terrain, i, amount)) {
    run.destroyed++; run.score += 5;
    emit(run, 'terrain', { x: i % run.terrain.columns * TILE + TILE / 2, y: Math.floor(i / run.terrain.columns) * TILE + TILE / 2 });
  }
}
function detonateBarrel(run: Run, index: number) {
  const b = run.barrels[index]!;
  if (b.detonated) return;
  b.detonated = true; b.health = 0;
  queueExplosion(run, { x: b.x + b.w / 2, y: b.y + b.h / 2, radius: fuel.radius, damage: fuel.damage, tileDamage: fuel.tileDamage, source: 'barrel' });
  emit(run, 'chain', b);
}
function damageRelay(run: Run, index: number, damage: number) {
  const r = run.relays[index]!;
  if (r.health <= 0) return;
  r.health = Math.max(0, r.health - damage);
  if (!r.health) { run.score += 500; emit(run, 'explosion', r, 1.2); }
  else emit(run, 'impact', r);
}
/** Iterative worklist: a barrel is marked before enqueue, so cycles terminate deterministically.
 * A step can enqueue at most the finite projectile cap plus the authored barrel count. */
export function resolveExplosions(run: Run) {
  for (let n = 0; n < run.explosions.length; n++) {
    const blast = run.explosions[n]!;
    emit(run, 'explosion', blast, blast.radius / 83);
    forTiles(run.terrain, { x: blast.x - blast.radius, y: blast.y - blast.radius, w: blast.radius * 2, h: blast.radius * 2 }, (i, rect) => {
      if (circleTouchesRect(blast, blast.radius, rect)) breakTile(run, i, blast.tileDamage);
    });
    for (const enemy of run.enemies) if (enemy.health > 0 && circleTouchesRect(blast, blast.radius, enemy)) damageEnemy(run, enemy, blast.damage);
    run.barrels.forEach((b, i) => { if (!b.detonated && circleTouchesRect(blast, blast.radius, b)) detonateBarrel(run, i); });
    run.relays.forEach((r, i) => { if (r.health > 0 && circleTouchesRect(blast, blast.radius, { ...r, w: relay.w, h: relay.h })) damageRelay(run, i, blast.damage); });
    // Operator explosives are safe to use at close quarters. Machine shells and volatile fuel hurt.
    if (blast.source !== 'player' && circleTouchesRect(blast, blast.radius, run.player)) hurtPlayer(run, 1);
  }
  run.explosions.length = 0;
}
export function stepProjectiles(run: Run, dt: number) {
  // No projectile is spawned by an impact, so this pass has a fixed upper bound.
  for (const shot of run.projectiles) {
    if (shot.life <= 0) continue;
    shot.life -= dt;
    if (shot.kind === 'grenade') shot.vy += 780 * dt;
    const from = { x: shot.x, y: shot.y }, to = { x: shot.x + shot.vx * dt, y: shot.y + shot.vy * dt };
    const terrain = traceTerrain(run.terrain, from, to, shot.kind === 'grenade' ? 3 : 1);
    let time = terrain?.time ?? 1.001;
    let target: { type: 'enemy' | 'player' | 'barrel' | 'relay'; index: number } | undefined;
    const consider = (rect: { x: number; y: number; w: number; h: number }, type: NonNullable<typeof target>['type'], index: number) => {
      const t = segmentRect(from, to, rect, 1);
      if (t !== undefined && t < time) { time = t; target = { type, index }; }
    };
    if (shot.kind !== 'grenade') {
      if (shot.friendly) {
        run.enemies.forEach((e, i) => { if (e.health > 0) consider(e, 'enemy', i); });
        run.relays.forEach((r, i) => { if (r.health > 0) consider({ ...r, w: relay.w, h: relay.h }, 'relay', i); });
      } else if (run.player.health > 0) consider(run.player, 'player', 0);
      run.barrels.forEach((b, i) => { if (!b.detonated) consider(b, 'barrel', i); });
    }
    const hit = time <= 1;
    shot.x = from.x + (to.x - from.x) * Math.min(1, time);
    shot.y = from.y + (to.y - from.y) * Math.min(1, time);
    if (shot.kind === 'grenade') {
      if (hit) {
        // Bounded contact bounce; the fuse always expires even if wedged against a corner.
        const horizontal = traceTerrain(run.terrain, from, { x: to.x, y: from.y }, 3);
        if (horizontal) shot.vx *= -.45; else shot.vy *= -.4;
        shot.x = from.x; shot.y = from.y; shot.vx *= .7;
      }
    } else if (hit) {
      shot.life = 0;
      if (!shot.radius) {
        if (target?.type === 'enemy') damageEnemy(run, run.enemies[target.index]!, shot.damage);
        else if (target?.type === 'player') hurtPlayer(run, shot.damage);
        else if (target?.type === 'relay') damageRelay(run, target.index, shot.damage);
        else if (target?.type === 'barrel') {
          const b = run.barrels[target.index]!; b.health -= shot.damage;
          if (b.health <= 0) detonateBarrel(run, target.index);
        } else if (terrain) breakTile(run, terrain.index, shot.tileDamage);
        emit(run, 'impact', shot);
      }
    }
    if (shot.life <= 0 && shot.radius) queueExplosion(run, { ...shot, source: shot.friendly ? 'player' : 'enemy' });
    if (shot.x < 0 || shot.x > run.mission.columns * TILE || shot.y < -TILE || shot.y > run.mission.rows * TILE) shot.life = 0;
  }
  run.projectiles = run.projectiles.filter(s => s.life > 0);
}
export function visible(run: Run, from: Point, to: Point) { return traceTerrain(run.terrain, from, to) === undefined; }
