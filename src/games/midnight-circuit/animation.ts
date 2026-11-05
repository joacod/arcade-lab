import { attacks } from './content.ts';
import type { Actor, Run } from './game.ts';

/** Every presentation supplies these complete cels, independently of its source-sheet layout. */
export const fighterCels = {
  idle: 0, contactLeft: 1, passingLeft: 2, contactRight: 3, passingRight: 4,
  anticipation: 5, punch: 6, kick: 7, rise: 8, fall: 9, hurt: 10, down: 11,
} as const;
export const fighterCelCount = 12;
interface Track { x: number; lane: number; phase: number; weight: number }
function recoveryWeight(a: Actor) {
  if (!a.attack) return 1;
  const d = attacks[a.attack.kind];
  return Math.max(0, Math.min(1, (a.attack.time - d.startup - d.active) / d.recovery));
}
/** A full left/right stride spans 96 world units. Observation never advances simulation. */
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
        if (walking) old.phase = (old.phase + distance / (96 * (a.kind === 'warden' ? 1.48 : a.kind === 'bruiser' ? 1.2 : 1)) * Math.PI * 2) % (Math.PI * 2);
        if (dt > 0) old.weight += ((walking ? 1 : 0) - old.weight) * (1 - Math.exp(-22 * dt));
        old.x = a.x; old.lane = a.lane; tracks.set(a.id, old);
      }
      for (const id of tracks.keys()) if (!ids.has(id)) tracks.delete(id);
    },
    get(id: number) { return tracks.get(id) ?? { phase: 0, weight: 0 }; },
  };
}
/** Combat owns attack cels. An ordinary jump never implies a kick or a hit. */
export function fighterFrame(a: Actor, gait: { phase: number; weight: number }) {
  const c = fighterCels;
  if (a.health <= 0) return c.down;
  if (a.stun > 0) return c.hurt;
  if (a.attack) {
    const d = attacks[a.attack.kind], time = a.attack.time;
    // Aerial startup/recovery return to the guarded jump, rather than a planted punch pose.
    const anticipation = a.elevation > 0 ? a.vz > 0 ? c.rise : c.fall : c.anticipation;
    if (time < d.startup) return anticipation;
    const contact = a.attack.kind === 'finisher' || a.attack.kind === 'air' ? c.kick : c.punch;
    if (time < d.startup + d.active) return contact;
    const recovery = (time - d.startup - d.active) / d.recovery;
    if (recovery < .45) return contact;
    if (recovery < .8) return anticipation;
  }
  if (a.elevation > 0 || a.vz > 0) return a.vz > 0 ? c.rise : c.fall;
  if (!a.moving || gait.weight < .05) return c.idle;
  // Locomotion cels communicate actual travel even with reduced decorative motion.
  return [c.contactLeft, c.passingLeft, c.contactRight, c.passingRight][Math.floor(gait.phase / (Math.PI / 2)) % 4]!;
}
