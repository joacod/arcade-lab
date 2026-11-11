import { overlaps, sweptCircle } from '../../engine/collision.ts';
import { flight, fly, speedAt, type Flyer } from './content.ts';
import { createRoute, minePosition, nextPassage, type Passage, type Route } from './route.ts';

export interface Fragment { x: number; y: number; collected: boolean }
export interface FlightEvent { type: 'pickup' | 'crash' | 'reward'; x: number; y: number }
export interface Run {
  status: 'active' | 'paused' | 'defeat'; elapsed: number; distance: number; score: number;
  player: Flyer; thrust: boolean; passages: Passage[]; fragments: Fragment[];
  pickups: number; passed: number; route: Route; events: FlightEvent[];
}
export function createRun(seed = 1): Run {
  const run: Run = { status: 'active', elapsed: 0, distance: 0, score: 0, player: { y: 300, vy: 0 },
    thrust: false, passages: [], fragments: [], pickups: 0, passed: 0, route: createRoute(seed), events: [] };
  populate(run);
  return run;
}
function populate(run: Run) {
  while (run.route.previous.x < run.distance + 1800) {
    const passage = nextPassage(run.route, run.elapsed);
    run.passages.push(passage);
    // A small arc in the certified corridor rewards deliberate height control.
    for (let i = 0; i < 5; i++) run.fragments.push({ x: passage.x - 100 + i * 42,
      y: passage.center - Math.sin(i / 4 * Math.PI) * 24, collected: false });
  }
}
export function pauseRun(run: Run, paused: boolean) {
  if (run.status !== 'defeat') { run.status = paused ? 'paused' : 'active'; run.thrust = false; }
}
export function takeEvents(run: Run) { return run.events.splice(0); }

/** Simulation has no viewport, DOM, storage, rendering or audio dependencies. */
export function stepRun(run: Run, action: { thrust: boolean }, dt: number) {
  if (run.status !== 'active') return;
  const old = { x: run.distance + flight.playerX, y: run.player.y };
  run.elapsed += dt; run.distance += speedAt(run.elapsed) * dt; run.thrust = action.thrust;
  run.score = Math.floor(run.distance / 10) + run.pickups * flight.fragmentPoints;
  fly(run.player, action.thrust, dt);
  const point = { x: run.distance + flight.playerX, y: run.player.y };
  const body = { x: point.x - flight.radius, y: point.y - flight.radius, w: flight.radius * 2, h: flight.radius * 2 };
  for (const passage of run.passages) {
    if (passage.x > point.x + 140 || passage.x + passage.width < old.x - flight.radius) continue;
    let collision = false;
    if (passage.pattern === 'drift') {
      const before = minePosition(passage, run.elapsed - dt), after = minePosition(passage, run.elapsed);
      collision = sweptCircle(old, point, before, after, flight.radius + 35) !== undefined;
    } else if (passage.pattern !== 'breather') {
      const x = passage.x + 9, w = passage.width - 18;
      if (passage.pattern === 'dive' || passage.pattern === 'gate') collision ||= overlaps(body, { x, y: 0, w, h: passage.center - passage.gap / 2 - 5 });
      if (passage.pattern === 'rise' || passage.pattern === 'gate') {
        const y = passage.center + passage.gap / 2 + 5;
        collision ||= overlaps(body, { x, y, w, h: flight.height - y });
      }
    }
    if (collision) {
      run.status = 'defeat'; run.thrust = false;
      run.events.push({ type: 'crash', x: point.x, y: point.y });
      return;
    }
    if (!passage.cleared && passage.x + passage.width < point.x - flight.radius) {
      passage.cleared = true;
      if (passage.pattern !== 'breather' && ++run.passed % 5 === 0) run.events.push({ type: 'reward', ...point });
    }
  }
  for (const fragment of run.fragments) {
    if (!fragment.collected && sweptCircle(old, point, fragment, fragment, flight.radius + flight.pickupRadius) !== undefined) {
      fragment.collected = true; run.pickups++;
      run.events.push({ type: 'pickup', x: fragment.x, y: fragment.y });
    }
  }
  run.score = Math.floor(run.distance / 10) + run.pickups * flight.fragmentPoints;
  // Compact in place, keeping memory bounded without allocating new world arrays.
  let keep = 0;
  for (const passage of run.passages) if (passage.x + passage.width > run.distance - 160) run.passages[keep++] = passage;
  run.passages.length = keep; keep = 0;
  for (const fragment of run.fragments) if (!fragment.collected && fragment.x > run.distance - 80) run.fragments[keep++] = fragment;
  run.fragments.length = keep;
  populate(run);
}
