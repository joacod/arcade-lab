import { fighters } from './content.ts';
import type { Action, Match } from './game.ts';
export interface Observation { distance: number; side: number; attack: string; low: boolean; airborne: boolean; projectile: boolean }
export interface Brain { wait: number; sample: number; history: { at: number; view: Observation }[]; seen: Observation; held: Action; seed: number }
const neutral = (): Action => ({ x: 0, crouch: false, block: false, jump: false, light: false, heavy: false, special: false });
export function createBrain(seed: number): Brain {
  return { wait: .35, sample: 0, history: [], seen: { distance: 320, side: -1, attack: '', low: false, airborne: false, projectile: false }, held: neutral(), seed: seed >>> 0 };
}
function random(b: Brain) { b.seed = (Math.imul(b.seed, 1664525) + 1013904223) >>> 0; return b.seed / 4294967296; }
/** Only delayed, visible positions and telegraphs enter the decision function. No player input or buffer inspection. */
export function cpuAction(match: Match, dt: number): Action {
  const b = match.brain, p = match.fighters[0], self = match.fighters[1];
  b.sample -= dt; b.wait -= dt;
  if (b.sample <= 0) {
    b.sample = .09;
    b.history.push({ at: match.elapsed + .23, view: { distance: Math.abs(p.x - self.x), side: Math.sign(p.x - self.x),
      attack: p.state === 'startup' || p.state === 'active' || p.state === 'recovery' ? p.state : '',
      low: p.attack?.kind === 'sweep', airborne: p.z > 18,
      projectile: match.projectiles.some(s => s.owner === 0 && Math.abs(s.x - self.x) < 300) } });
  }
  while (b.history[0] && b.history[0].at <= match.elapsed) b.seen = b.history.shift()!.view;
  const action = { ...b.held, jump: false, light: false, heavy: false, special: false };
  if (b.wait > 0) return action;
  b.wait = .19 + random(b) * .23;
  const v = b.seen, r = random(b), def = fighters[self.kind];
  const next = neutral();
  if ((v.attack === 'startup' || v.attack === 'active' || v.projectile) && v.distance < (v.projectile ? 600 : 225) && r < .72) {
    next.block = true; next.crouch = v.low || !v.airborne && random(b) < .10;
  } else if (v.distance > 165) {
    next.x = v.side;
    if (v.distance > 260 && r < .20 && self.specialCooldown === 0) next.special = true;
    else if (v.projectile && random(b) < .4) next.jump = true;
  } else if (r < .12) { next.x = -v.side; next.block = true; }
  else if (r < .24) { next.block = true; next.crouch = random(b) < .45; }
  else if (v.attack === 'recovery' && v.distance < def.attacks.heavy.reach + 12) next.heavy = true;
  else if (v.distance < def.attacks.light.reach + 15) {
    if (r < .49) next.light = true;
    else if (r < .66) { next.crouch = true; next.light = true; }
    else if (r < .81) next.heavy = true;
    else if (r < .91) { next.jump = true; next.light = true; }
    else next.special = true;
  } else if (r < .48) next.x = v.side;
  else if (r < .70) next.heavy = true;
  else if (r < .88) next.special = true;
  // Decisions produce exactly the same held actions and press edges as the human adapter.
  b.held = { ...next, jump: false, light: false, heavy: false, special: false };
  return next;
}
