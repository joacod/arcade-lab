import { attacks } from './content.ts';
import type { Actor, Run } from './game.ts';
interface Track { x: number; lane: number; phase: number; weight: number }
function recoveryWeight(a: Actor) {
  if (!a.attack) return 1;
  const d = attacks[a.attack.kind];
  return Math.max(0, Math.min(1, (a.attack.time - d.startup - d.active) / d.recovery));
}
/** Distance advances the gait, never wall time. Blocked input, hit pushes and jumps cannot walk. */
export function createGait() {
  const tracks = new Map<number, Track>();
  let elapsed = 0;
  return {
    reset() { tracks.clear(); elapsed = 0; },
    observe(run: Run) {
      const dt = Math.max(0, Math.min(.1, run.elapsed - elapsed)); elapsed = run.elapsed;
      const ids = new Set<number>();
      for (const a of [run.player, ...run.enemies]) {
        ids.add(a.id);
        const old = tracks.get(a.id) ?? { x: a.x, lane: a.lane, phase: 0, weight: 0 };
        const distance = Math.hypot(a.x - old.x, a.lane - old.lane);
        const walking = a.moving && recoveryWeight(a) > 0 && a.elevation === 0 && a.stun === 0 && a.health > 0 && distance > .01 && distance < 70;
        if (walking) old.phase += distance / (53.333 * (a.kind === 'warden' ? 1.48 : a.kind === 'bruiser' ? 1.2 : 1)) * Math.PI * 2;
        if (dt > 0) old.weight += ((walking ? 1 : 0) - old.weight) * (1 - Math.exp(-22 * dt));
        old.x = a.x; old.lane = a.lane; tracks.set(a.id, old);
      }
      for (const id of tracks.keys()) if (!ids.has(id)) tracks.delete(id);
    },
    get(id: number) { return tracks.get(id) ?? { phase: 0, weight: 0 }; },
  };
}
/** Complete-cel selection follows semantic combat windows and observed travel. */
export function fighterFrame(a: Actor, gait: { phase: number; weight: number }, reduced = false) {
  if (a.health <= 0) return 7;
  if (a.stun > 0) return 6;
  if (a.attack) {
    const d = attacks[a.attack.kind], time = a.attack.time;
    if (time < d.startup) return 3;
    const contact = a.attack.kind === 'finisher' || a.attack.kind === 'air' ? 5 : 4;
    if (time < d.startup + d.active) return contact;
    const recovery = (time - d.startup - d.active) / d.recovery;
    if (recovery < .45) return contact;
    if (recovery < .8) return 3;
  }
  if (a.elevation > 0) return 5;
  if (reduced || !a.moving || gait.weight < .05) return 0;
  return Math.sin(gait.phase) >= 0 ? 1 : 2;
}
