import { attacks } from './content.ts';
import type { Actor, Run } from './game.ts';
export type Point = [number, number];
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
function foot(phase: number, side: number, weight: number): Point {
  const cycle = ((phase / (Math.PI * 2) + side) % 1 + 1) % 1;
  // Stance moves backward at constant speed; swing lifts the toe and returns it forward.
  const x = cycle < .6 ? 16 - cycle / .6 * 32 : -16 + (cycle - .6) / .4 * 32;
  const lift = cycle < .6 ? 0 : Math.sin((cycle - .6) / .4 * Math.PI) * 12;
  return [x * weight + (side ? -11 : 11) * (1 - weight), -4 - lift * weight];
}
function knee(hip: Point, ankle: Point): Point {
  const dx = ankle[0] - hip[0], dy = ankle[1] - hip[1], distance = Math.max(1, Math.hypot(dx, dy));
  const bend = Math.sqrt(Math.max(0, 24 * 24 - distance * distance / 4));
  return [(hip[0] + ankle[0]) / 2 + dy / distance * bend, (hip[1] + ankle[1]) / 2 - dx / distance * bend];
}
export function fighterPose(a: Actor, gait: { phase: number; weight: number }) {
  const recovery = recoveryWeight(a);
  const weight = a.elevation > 0 || a.stun > 0 || a.health <= 0 ? 0 : gait.weight * recovery;
  let backFoot = foot(gait.phase, .5, weight), frontFoot = foot(gait.phase, 0, weight);
  let backKnee = knee([-8, -43], backFoot), frontKnee = knee([8, -43], frontFoot);
  let rearElbow: Point = [-26, -59], rearHand: Point = [-17, -73];
  let elbow: Point = [28, -64], hand: Point = [33, -79];
  const s = a.attack, kind = s?.kind;
  let extension = 0;
  if (s) {
    const d = attacks[s.kind];
    extension = s.time < d.startup ? -Math.sin(s.time / d.startup * Math.PI / 2) * .45
      : s.time < d.startup + d.active ? 1 : Math.max(0, 1 - (s.time - d.startup - d.active) / d.recovery);
  }
  const kick = kind === 'finisher' || kind === 'air';
  const heavy = kind === 'heavy' || kind === 'smash' || kind === 'quake';
  if (a.elevation > 0) { backFoot = [-24, -28]; backKnee = [-20, -37]; frontFoot = [24, -14]; frontKnee = [24, -32]; }
  if (kick && extension > 0) {
    frontKnee = [(13 + extension * 20) * (1 - recovery) + frontKnee[0] * recovery, (-25 - extension * 23) * (1 - recovery) + frontKnee[1] * recovery];
    frontFoot = [(17 + extension * 60) * (1 - recovery) + frontFoot[0] * recovery, (-4 - extension * 47) * (1 - recovery) + frontFoot[1] * recovery];
  }
  if (kind === 'charge' && extension > 0) { backFoot = [-36, -4]; frontFoot = [35, -8]; }
  if (s && !kick) {
    if (extension < 0 && heavy) { elbow = [10, -85]; hand = [-6, -108]; }
    else { elbow = [28 + extension * 12, -64 - extension * 5]; hand = [33 + extension * 43, -79 + extension * (heavy ? kind === 'quake' ? 75 : 39 : 10)]; }
    if (kind === 'cross' && extension > 0) { rearElbow = elbow; rearHand = hand; hand = [10, -63]; }
  } else if (!kick) {
    const swing = Math.sin(gait.phase) * weight;
    elbow = [24 - swing * 7, -61]; hand = [27 - swing * 11, -68];
    rearElbow = [-22 + swing * 7, -61]; rearHand = [-14 + swing * 11, -69];
  }
  if (kick) { elbow = [-6, -60]; hand = [-16, -57]; rearElbow = [-24, -70]; rearHand = [-15, -86]; }
  if (a.stun > 0) { hand = [35, -45]; rearHand = [-35, -61]; }
  return { backFoot, frontFoot, backKnee, frontKnee, rearElbow, rearHand, elbow, hand,
    bob: -Math.cos(gait.phase * 2) * weight * 1.3, lean: a.stun > 0 ? -8 : extension * 6, stride: Math.sin(gait.phase) * weight * 12 };
}
