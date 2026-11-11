import { clamp, flight, fly, speedAt } from './content.ts';

export type Pattern = 'rise' | 'dive' | 'gate' | 'drift' | 'sway' | 'breather';
export interface Passage {
  id: number; leg: number; x: number; width: number; center: number; gap: number;
  pattern: Pattern; phase: number; motion: number; cleared: boolean;
}
export interface Route { seed: number; index: number; leg: number; slot: number; variation: number; mirrored: boolean; previous: Passage }

interface Leg { name: string; patterns: readonly Pattern[]; centers: readonly number[]; gap: number; width: number }
const legs: readonly Leg[] = [
  { name: 'Sunward Approach', patterns: ['rise', 'dive', 'gate', 'rise', 'dive'], centers: [270, 330, 260, 200, 400], gap: 254, width: 86 },
  { name: 'High / Low', patterns: ['gate', 'gate', 'drift', 'gate', 'rise', 'gate', 'drift'], centers: [180, 420, 170, 420, 180, 430, 170], gap: 208, width: 90 },
  { name: 'Crystal Steps', patterns: ['gate', 'gate', 'drift', 'gate', 'gate', 'gate'], centers: [160, 290, 440, 430, 300, 170], gap: 180, width: 104 },
  { name: 'Shifting Ruins', patterns: ['sway', 'gate', 'sway', 'drift', 'gate', 'sway'], centers: [210, 400, 210, 430, 170, 390], gap: 174, width: 116 },
  { name: 'Storm Weave', patterns: ['drift', 'sway', 'gate', 'drift', 'sway', 'gate'], centers: [160, 420, 170, 440, 180, 420], gap: 156, width: 124 },
  { name: 'Needle Thread', patterns: ['gate', 'sway', 'gate', 'gate', 'drift', 'sway'], centers: [190, 300, 410, 180, 440, 190], gap: 142, width: 132 },
];
/** Later legs remix different demands instead of repeating a single final leg. */
export function legAt(index: number) {
  const template = legs[index < legs.length ? index : 2 + (index - legs.length) % 4]!;
  const pressure = Math.max(0, index - 5);
  const pace = Math.floor((speedAt(index) - flight.startSpeed) / flight.speedStep);
  return { ...template, gap: Math.max(104, template.gap - pressure * 3),
    width: Math.min(150, template.width + pressure * 2), hazards: Math.min(15, 5 + index * 2) + pace };
}

export function createRoute(seed: number): Route {
  return { seed: seed >>> 0 || 1, index: 0, leg: 0, slot: 0, variation: 0, mirrored: (seed & 1) === 0,
    previous: { id: -1, leg: 0, x: 0, width: 0, center: 300, gap: 260, pattern: 'breather', phase: 0, motion: 0, cleared: true } };
}
function random(route: Route) {
  let value = route.seed;
  value ^= value << 13; value ^= value >>> 17; value ^= value << 5;
  route.seed = value >>> 0;
  return route.seed / 4294967296;
}

/** Braking-distance steering is a feasibility witness, never an in-game autopilot. */
export function steerTo(player: { y: number; vy: number }, target: number) {
  const brake = player.vy > 0 ? flight.lift + flight.braking : flight.gravity + flight.braking;
  return player.y + player.vy * Math.abs(player.vy) / (2 * brake) > target;
}
export const safeGap = (passage: Passage) => passage.gap - (passage.pattern === 'sway' ? passage.motion * 2 : 0);
export const passageCenter = (passage: Passage, elapsed: number) => passage.center
  + (passage.pattern === 'sway' ? Math.sin(elapsed * 1.25 + passage.phase) * passage.motion : 0);

/** Clearance at the leg's fastest speed, with reaction and the full obstacle
 * width. A moving opening reserves its complete swept envelope. Earlier wide
 * openings include all possible exit heights, not just their centers. */
export function reachable(previous: Passage, next: Passage): boolean {
  const dt = 1 / 60, inset = flight.radius + 14, speed = speedAt(next.leg);
  const free = next.x - (previous.x + previous.width) - 2 * flight.radius;
  const entry = free / speed;
  const crossing = (next.width + 2 * flight.radius) / speed;
  if (entry < flight.reaction || (flight.minimumView - flight.maxX - next.width) / speed < flight.reaction) return false;
  const spread = previous.gap / 2 + (previous.pattern === 'sway' ? previous.motion : 0) - inset;
  for (const start of [previous.center - spread, previous.center, previous.center + spread]) {
    for (const velocity of [-flight.upLimit, 0, flight.downLimit]) {
      for (const reactionHold of [false, true]) {
        const player = { y: clamp(start, flight.ceiling, flight.floor), vy: velocity };
        for (let time = 0; time < entry + crossing; time += dt) {
          fly(player, time < flight.reaction ? reactionHold : steerTo(player, next.center), dt);
          if (time >= entry && Math.abs(player.y - next.center) > safeGap(next) / 2 - inset) return false;
        }
      }
    }
  }
  return true;
}

export function nextPassage(route: Route): Passage {
  const id = route.index++, level = route.leg, slot = route.slot, leg = legAt(level);
  const pocket = slot === leg.hazards;
  if (level > 0 && !pocket && slot % leg.patterns.length === 0) {
    route.mirrored = random(route) < .5;
    route.variation = slot === 0 ? Math.floor(random(route) * leg.patterns.length)
      : (route.variation + 1 + Math.floor(random(route) * (leg.patterns.length - 1))) % leg.patterns.length;
  }
  const beat = (slot + route.variation) % leg.patterns.length;
  let pattern: Pattern = pocket ? 'breather' : leg.patterns[beat]!;
  if (route.mirrored) pattern = pattern === 'rise' ? 'dive' : pattern === 'dive' ? 'rise' : pattern;
  const target = pocket ? 300 : leg.centers[beat]! + (random(route) * 2 - 1) * (level === 0 ? 8 : 18);
  const rawCenter = clamp(route.mirrored ? flight.height - target : target, 140, 460);
  // Shorten height reversals as warning time shrinks. At high speed, tighter
  // openings test precision instead of demanding an unseen full-height dive.
  const turnScale = 1 - .6 * (speedAt(level) - flight.startSpeed) / (flight.maxSpeed - flight.startSpeed);
  const center = 300 + (rawCenter - 300) * turnScale;
  const motion = pattern === 'sway' ? Math.min(36, 24 + level) : pattern === 'drift' ? Math.min(76, 30 + level * 5) : 0;
  const gap = pocket ? 290 : pattern === 'sway' ? Math.max(124, leg.gap) + motion : leg.gap;
  // Scale travel and pocket clearance with speed. A faster route must not turn
  // its obstacle intervals into an unreadable stream or its lanterns into taps.
  const travel = speedAt(level) * (pocket || route.previous.pattern === 'breather' ? 2.1 : 1.12);
  const next: Passage = { id, leg: level, x: route.previous.x + route.previous.width + (id === 0 ? 780 : travel),
    width: pocket ? 86 : leg.width, center, gap, pattern, motion, phase: random(route) * Math.PI * 2, cleared: false };
  while (!reachable(route.previous, next)) next.x += 24;
  route.previous = next;
  if (pocket) { route.leg++; route.slot = 0; } else route.slot++;
  return next;
}

export function minePosition(passage: Passage, elapsed: number) {
  const side = passage.center < 300 ? 1 : -1;
  return { x: passage.x + passage.width / 2,
    y: passage.center + side * (passage.gap / 2 + flight.mineRadius + passage.motion + 12)
      + Math.sin(elapsed * 1.7 + passage.phase) * passage.motion };
}
