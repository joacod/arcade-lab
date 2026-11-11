import { overlaps, sweptCircle } from '../../engine/collision.ts';
import { flight, fly, multiplierAt, slide, speedAt, fragmentShape, pickupRear, type Flyer } from './content.ts';
import { touchesFragment } from './collection.ts';
import { createRoute, minePosition, nextPassage, passageCenter, safeGap, type Passage, type Route } from './route.ts';

export interface Fragment { x: number; y: number; collected: boolean }
export type FlightEvent = { x: number; y: number } & (
  { type: 'pickup'; points: number } | { type: 'crash' | 'checkpoint' | 'shield-ready' | 'shield-hit' | 'fragment-missed' }
);
interface Progress {
  elapsed: number; distance: number; speed: number; score: number; player: Flyer;
  passages: Passage[]; fragments: Fragment[]; pickups: number; pickupPoints: number; chain: number;
  shieldCharge: number; shieldUntil: number; shieldCue: number; passed: number; route: Route;
}
export interface Run extends Progress {
  status: 'active' | 'paused' | 'crashed' | 'defeat'; thrust: boolean; lives: number;
  checkpoint: { number: number; state: Progress }; events: FlightEvent[];
}
function copyProgress(state: Progress): Progress {
  return { elapsed: state.elapsed, distance: state.distance, speed: state.speed, score: state.score, player: { ...state.player },
    passages: state.passages.map(passage => ({ ...passage })), fragments: state.fragments.map(fragment => ({ ...fragment })),
    pickups: state.pickups, pickupPoints: state.pickupPoints, chain: state.chain,
    shieldCharge: state.shieldCharge, shieldUntil: state.shieldUntil, shieldCue: state.shieldCue,
    passed: state.passed, route: { ...state.route, previous: { ...state.route.previous } } };
}
export function createRun(seed = 1): Run {
  const state: Progress = { elapsed: 0, distance: 0, speed: flight.startSpeed, score: 0, player: { x: flight.playerX, y: 300, vx: 0, vy: 0 },
    passages: [], fragments: [], pickups: 0, pickupPoints: 0, chain: 0, shieldCharge: 0, shieldUntil: 0, shieldCue: 0,
    passed: 0, route: createRoute(seed) };
  populate(state);
  return { ...state, status: 'active', thrust: false, lives: flight.lives,
    checkpoint: { number: 0, state: copyProgress(state) }, events: [] };
}
function populate(run: Progress) {
  while (run.route.previous.x < run.distance + 1800) {
    const passage = nextPassage(run.route);
    run.passages.push(passage);
    // A small arc in the certified corridor rewards deliberate height control.
    for (let i = 0; i < 5; i++) run.fragments.push({ x: passage.x - 100 + i * 42,
      y: passage.center + Math.sin(i / 4 * Math.PI) * (passage.id % 2 ? 1 : -1) * Math.max(0, Math.min(32, safeGap(passage) / 2 - 65)), collected: false });
  }
}
export function pauseRun(run: Run, paused: boolean) {
  if (run.status === 'active' || run.status === 'paused') { run.status = paused ? 'paused' : 'active'; run.thrust = false; }
}
export function takeEvents(run: Run) { return run.events.splice(0); }
export function continueRun(run: Run): boolean {
  if (run.status !== 'crashed' || run.lives <= 0) return false;
  Object.assign(run, copyProgress(run.checkpoint.state));
  run.status = 'active'; run.thrust = false; run.events.length = 0;
  return true;
}

/** Simulation has no viewport, DOM, storage, rendering or audio dependencies. */
export function stepRun(run: Run, action: { thrust: boolean; strafe?: number; slide?: number }, dt: number) {
  if (run.status !== 'active') return;
  const old = { x: run.distance + run.player.x, y: run.player.y };
  run.speed = Math.min(speedAt(run.checkpoint.number), run.speed + flight.speedRise * dt);
  run.elapsed += dt; run.distance += run.speed * dt; run.thrust = action.thrust;
  run.score = Math.floor(run.distance / 10) + run.pickupPoints;
  slide(run.player, action.strafe ?? 0, action.slide ?? 0, dt);
  fly(run.player, action.thrust, dt);
  const point = { x: run.distance + run.player.x, y: run.player.y };
  const body = { x: point.x - flight.radius, y: point.y - flight.radius, w: flight.radius * 2, h: flight.radius * 2 };
  let checkpoint: Passage | undefined;
  for (const passage of run.passages) {
    if (passage.x > point.x + 140 || passage.x + passage.width < old.x - flight.radius) continue;
    let collision = false;
    if (passage.pattern === 'drift') {
      const before = minePosition(passage, run.elapsed - dt), after = minePosition(passage, run.elapsed);
      collision = sweptCircle(old, point, before, after, flight.radius + flight.mineRadius) !== undefined;
    } else if (passage.pattern !== 'breather') {
      const x = passage.x + 9, w = passage.width - 18, center = passageCenter(passage, run.elapsed);
      if (passage.pattern === 'dive' || passage.pattern === 'gate' || passage.pattern === 'sway') collision ||= overlaps(body, { x, y: 0, w, h: center - passage.gap / 2 - 5 });
      if (passage.pattern === 'rise' || passage.pattern === 'gate' || passage.pattern === 'sway') {
        const y = center + passage.gap / 2 + 5;
        collision ||= overlaps(body, { x, y, w, h: flight.height - y });
      }
    }
    const shielded = run.elapsed < run.shieldUntil;
    if (collision && shielded) {
      if (run.elapsed >= run.shieldCue) {
        run.shieldCue = run.elapsed + .45;
        run.events.push({ type: 'shield-hit', ...point });
      }
    } else if (collision) {
      run.lives--; run.status = run.lives > 0 ? 'crashed' : 'defeat'; run.thrust = false;
      run.events.push({ type: 'crash', x: point.x, y: point.y });
      return;
    }
    if (!passage.cleared && passage.x + passage.width < point.x - flight.radius) {
      passage.cleared = true;
      if (passage.pattern === 'breather') checkpoint = passage;
      else run.passed++;
    }
  }
  // A fragment is missed only once it slips behind the rear of the movement window.
  const missed = run.distance + flight.minX + pickupRear - fragmentShape.halfWidth;
  for (const fragment of run.fragments) {
    if (fragment.collected) continue;
    if (touchesFragment(old, point, fragment)) {
      const points = flight.fragmentPoints * multiplierAt(run.chain);
      fragment.collected = true; run.pickups++; run.pickupPoints += points; run.chain++;
      run.events.push({ type: 'pickup', x: fragment.x, y: fragment.y, points });
      if (++run.shieldCharge >= flight.shieldFragments) {
        run.shieldCharge = 0; run.shieldUntil = run.elapsed + flight.shieldSeconds;
        run.events.push({ type: 'shield-ready', ...point });
      }
    } else if (fragment.x < missed) {
      run.chain = 0;
      run.events.push({ type: 'fragment-missed', x: fragment.x, y: fragment.y });
    }
  }
  run.score = Math.floor(run.distance / 10) + run.pickupPoints;
  // Compact in place, keeping memory bounded without allocating new world arrays.
  let keep = 0;
  for (const passage of run.passages) if (passage.x + passage.width > run.distance - 160) run.passages[keep++] = passage;
  run.passages.length = keep; keep = 0;
  for (const fragment of run.fragments) if (!fragment.collected && fragment.x >= missed) run.fragments[keep++] = fragment;
  run.fragments.length = keep;
  populate(run);
  if (checkpoint) {
    const state = copyProgress(run);
    // Relaunch in clear air, centered and still, with the same route and mine clock.
    state.player = { x: flight.playerX, y: checkpoint.center, vx: 0, vy: 0 };
    run.checkpoint = { number: run.checkpoint.number + 1, state };
    run.events.push({ type: 'checkpoint', ...point });
  }
}
