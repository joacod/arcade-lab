import { clamp, flight, fly, type Flyer } from './content.ts';

export type Pattern = 'rise' | 'dive' | 'gate' | 'drift' | 'breather';
export interface Passage {
  id: number; x: number; width: number; center: number; gap: number;
  pattern: Pattern; phase: number; cleared: boolean;
}
export interface Route { seed: number; index: number; previous: Passage }

export function createRoute(seed: number): Route {
  return { seed: seed >>> 0 || 1, index: 0,
    previous: { id: -1, x: 0, width: 0, center: 300, gap: 260, pattern: 'breather', phase: 0, cleared: true } };
}
function random(route: Route) {
  let value = route.seed;
  value ^= value << 13; value ^= value >>> 17; value ^= value << 5;
  route.seed = value >>> 0;
  return route.seed / 4294967296;
}

/** Braking-distance steering is a feasibility witness, never an in-game autopilot. */
export function steerTo(player: Flyer, target: number) {
  const brake = player.vy > 0 ? flight.lift + flight.braking : flight.gravity + flight.braking;
  return player.y + player.vy * Math.abs(player.vy) / (2 * brake) > target;
}

/** Conservative clearance at maximum scroll speed, including reaction and the
 * full obstacle width. Test both edges of the previous corridor and extreme
 * entry velocities. A minimum-size viewport also has to reveal it in time. */
export function reachable(previous: Passage, next: Passage): boolean {
  const dt = 1 / 60, inset = flight.radius + 14;
  const free = next.x - (previous.x + previous.width) - 2 * flight.radius;
  const entry = free / flight.maxSpeed;
  const crossing = (next.width + 2 * flight.radius) / flight.maxSpeed;
  if (entry < flight.reaction || (flight.minimumView - flight.playerX - next.width) / flight.maxSpeed < flight.reaction) return false;
  for (const start of [previous.center - previous.gap / 2 + inset, previous.center, previous.center + previous.gap / 2 - inset]) {
    for (const velocity of [-flight.upLimit, 0, flight.downLimit]) {
      for (const reactionHold of [false, true]) {
        const player = { y: start, vy: velocity };
        for (let time = 0; time < entry + crossing; time += dt) {
          fly(player, time < flight.reaction ? reactionHold : steerTo(player, next.center), dt);
          if (time >= entry && Math.abs(player.y - next.center) > next.gap / 2 - inset) return false;
        }
      }
    }
  }
  return true;
}

export function nextPassage(route: Route, elapsed: number): Passage {
  const difficulty = Math.min(1, elapsed / flight.rampSeconds);
  const id = route.index++;
  const pattern: Pattern = id % 6 === 5 ? 'breather' : id < 2 ? (id === 0 ? 'rise' : 'dive')
    : (['gate', 'rise', 'dive', ...(id > 5 ? ['drift'] as const : [])] as const)[Math.floor(random(route) * (id > 5 ? 4 : 3))]!;
  const gap = pattern === 'breather' ? 290 : 280 - difficulty * 90;
  const center = clamp(route.previous.center + (random(route) * 2 - 1) * (70 + difficulty * 35), 185, 415);
  const next: Passage = { id, x: route.previous.x + route.previous.width + (id === 0 ? 780 : 460 - difficulty * 70),
    width: pattern === 'drift' ? 102 : 86, center, gap, pattern, phase: random(route) * Math.PI * 2, cleared: false };
  // Increase empty travel rather than accepting an unreachable random pattern.
  while (!reachable(route.previous, next)) next.x += 32;
  route.previous = next;
  return next;
}

export function minePosition(passage: Passage, elapsed: number) {
  const side = passage.center < 300 ? 1 : -1;
  return { x: passage.x + passage.width / 2,
    y: passage.center + side * (passage.gap / 2 + 68) + Math.sin(elapsed * 1.7 + passage.phase) * 18 };
}
