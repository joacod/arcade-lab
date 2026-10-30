import { overlaps } from '../../engine/collision.ts';
import { body, missions, TILE, enemyTypes, fuel, relay, inputTiming, type Mission } from './content.ts';
import { createTerrain, moveBody } from './terrain.ts';
import { playerAt, movePlayer } from './movement.ts';
import { firePlayer, stepProjectiles, resolveExplosions } from './combat.ts';
import { stepEnemies } from './enemies.ts';
import { emit, hurtPlayer, type Action, type Run } from './state.ts';
export { idle } from './state.ts';
export type { Run, Action, BlastEvent } from './state.ts';
function prepareMission(run: Run) {
  const m = run.mission;
  run.terrain = createTerrain(m);
  run.player = playerAt(m.start, run.rescued ? 'bolt' : 'nova');
  run.enemies = m.enemies.map((e, id) => {
    const { health, w, h } = enemyTypes[e.kind];
    return { ...e, y: e.y + body.h - h, id, w, h, vx: 0, vy: 0, grounded: false, health, maxHealth: health,
      home: e.x, facing: -1, cooldown: .6 + id % 3 * .2, warning: 0, burst: 0, flash: 0, target: { x: 0, y: 0 } };
  });
  run.barrels = m.barrels.map(p => ({ x: p.x - fuel.w / 2, y: p.y - fuel.h / 2, w: fuel.w, h: fuel.h, vx: 0, vy: 0, grounded: false, detonated: false, health: fuel.health }));
  run.relays = m.relays.map(p => ({ ...p, health: relay.health }));
  run.projectiles = []; run.explosions = []; run.events = []; run.checkpoint = -1;
  run.respawn = 0; run.collapse = -1; run.extraction = 0; run.grenades = body.grenades;
}
export function createRun(content: readonly Mission[] = missions): Run {
  if (!content[0]) throw new Error('Blastline needs an authored mission.');
  const run: Run = { missions: content, mission: content[0], missionIndex: 0, player: playerAt(content[0].start), terrain: createTerrain(content[0]),
    enemies: [], barrels: [], relays: [], projectiles: [], explosions: [], events: [], status: 'active', elapsed: 0, lives: body.lives,
    grenades: body.grenades, rescued: false, checkpoint: -1, respawn: 0, collapse: -1, extraction: 0, score: 0, destroyed: 0, kills: 0 };
  prepareMission(run); return run;
}
export function nextMission(run: Run) {
  if (run.status !== 'interlude') return;
  run.missionIndex++; run.mission = run.missions[run.missionIndex]!;
  run.lives = Math.min(body.lives, run.lives + 1); run.status = 'active'; prepareMission(run);
}
export function pauseRun(run: Run, paused: boolean) {
  if (paused && run.status === 'active') { run.status = 'paused'; run.player.buffer = 0; run.player.fireBuffer = 0; }
  else if (!paused && run.status === 'paused') run.status = 'active';
}
export function takeEvents(run: Run) { const events = run.events; run.events = []; return events; }
export function readyToExtract(run: Run): boolean {
  return run.relays.every(r => r.health <= 0) && (!run.mission.rescue || run.rescued) && !run.enemies.some(e => e.kind === 'bastion' && e.health > 0);
}
export function objectiveText(run: Run): string {
  if (run.extraction > 0) return 'HOLD TIGHT. YOU’RE GOING HOME.';
  const bearing = (x: number) => `${x >= run.player.x ? '→' : '←'} ${Math.ceil(Math.abs(x - run.player.x) / TILE)}m`;
  if (readyToExtract(run)) return `EXTRACT ${bearing(run.mission.exit.x + run.mission.exit.w / 2)} • COLLAPSE ${Math.max(0, Math.ceil(run.collapse))}s`;
  const remaining = run.relays.filter(r => r.health > 0).length;
  const parts = remaining ? [`BREAK ${remaining} POWER RELAY${remaining === 1 ? '' : 'S'}`] : [];
  if (run.mission.rescue && !run.rescued) parts.push('RESCUE BOLT');
  if (run.enemies.some(e => e.kind === 'bastion' && e.health > 0)) parts.push('DEFEAT THE BASTION');
  const targets = run.relays.filter(r => r.health > 0).map(r => ({ x: r.x, label: 'RELAY' }));
  if (run.mission.rescue && !run.rescued) targets.push({ x: run.mission.rescue.x, label: 'BOLT' });
  const bastion = run.enemies.find(e => e.kind === 'bastion' && e.health > 0);
  if (bastion) targets.push({ x: bastion.x, label: 'BASTION' });
  const target = targets.reduce<typeof targets[number] | undefined>((nearest, item) => !nearest || Math.abs(item.x - run.player.x) < Math.abs(nearest.x - run.player.x) ? item : nearest, undefined);
  return `${parts.join(' • ')}${target ? ` / ${target.label} ${bearing(target.x)}` : ''}`;
}
function objectives(run: Run, dt: number) {
  const p = run.player, m = run.mission;
  if (m.rescue && !run.rescued && overlaps(p, { x: m.rescue.x - 24, y: m.rescue.y - 18, w: 70, h: 54 })) {
    run.rescued = true; p.operator = 'bolt'; p.cooldown = .3; p.fireBuffer = 0; p.health = body.health; run.grenades = body.grenades;
    run.score += 1000; emit(run, 'rescue', p);
  }
  m.checkpoints.forEach((point, i) => {
    if (i > run.checkpoint && overlaps(p, { x: point.x - 12, y: point.y - 25, w: 48, h: 70 })) {
      run.checkpoint = i; p.health = body.health; run.grenades = body.grenades; emit(run, 'checkpoint', point);
    }
  });
  if (readyToExtract(run)) {
    if (run.collapse < 0) { run.collapse = 70; emit(run, 'alarm', p); }
    run.collapse = Math.max(0, run.collapse - dt);
    if (overlaps(p, m.exit)) { run.extraction = .001; run.projectiles = []; emit(run, 'extract', p); }
    else if (!run.collapse) { run.status = 'defeat'; emit(run, 'defeat', p); }
  }
}
export function stepRun(run: Run, action: Action, dt: number) {
  if (run.status !== 'active' || !Number.isFinite(dt) || dt <= 0) return;
  dt = Math.min(dt, 1 / 60); run.elapsed += dt;
  if (run.extraction > 0) {
    run.extraction += dt;
    if (run.extraction >= 3) {
      run.score += 1000 + run.lives * 100;
      run.status = run.missionIndex === run.missions.length - 1 ? 'victory' : 'interlude';
      emit(run, run.status === 'victory' ? 'victory' : 'extract', run.player);
    }
    return;
  }
  if (run.player.health <= 0) {
    run.respawn = Math.max(0, run.respawn - dt);
    if (run.collapse >= 0) {
      run.collapse = Math.max(0, run.collapse - dt);
      if (!run.collapse) { run.status = 'defeat'; emit(run, 'defeat', run.player); return; }
    }
    if (!run.respawn) {
      run.player = playerAt(run.mission.checkpoints[run.checkpoint] ?? run.mission.start, run.player.operator);
      run.grenades = Math.max(2, run.grenades); emit(run, 'checkpoint', run.player);
    }
    return;
  }
  const p = run.player;
  p.immune = Math.max(0, p.immune - dt); p.cooldown = Math.max(0, p.cooldown - dt); p.grenadeCooldown = Math.max(0, p.grenadeCooldown - dt);
  p.fireBuffer = Math.max(0, p.fireBuffer - dt);
  if (action.switch && run.rescued) { p.operator = p.operator === 'nova' ? 'bolt' : 'nova'; p.cooldown = Math.max(.25, p.cooldown); p.fireBuffer = 0; emit(run, 'switch', p); }
  // Only fresh presses survive release. Holding fire keeps its normal cadence without queuing a trailing shot.
  if (action.firePressed) p.fireBuffer = inputTiming.fireBuffer;
  movePlayer(run, action, dt);
  if (action.fire || p.fireBuffer > 0) firePlayer(run, false);
  if (action.grenade) firePlayer(run, true);
  stepEnemies(run, dt);
  for (const b of run.barrels) if (!b.detonated) { b.vy = Math.min(body.fall, b.vy + body.gravity * dt); moveBody(run.terrain, b, dt); }
  stepProjectiles(run, dt); resolveExplosions(run);
  // Destruction removes support immediately; gravity resolves the resulting fall next step.
  if (p.y > run.mission.rows * TILE) hurtPlayer(run, body.health);
  for (const e of run.enemies) if (e.health > 0 && overlaps(p, e)) hurtPlayer(run, 1);
  if (p.health > 0 && run.status === 'active') objectives(run, dt);
}
