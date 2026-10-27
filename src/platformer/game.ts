import { hollow, movement as m, type Level, type Rect } from './content.ts';

export interface Action { move: number; jumpPressed: boolean; jumpHeld: boolean }
export const idle: Action = { move: 0, jumpPressed: false, jumpHeld: false };
export interface Player {
  x: number; y: number; vx: number; vy: number; grounded: boolean;
  facing: number; coyote: number; buffer: number; jumpCut: boolean;
}
export interface HollowEvent { type: 'jump' | 'land' | 'damage' | 'interaction' | 'complete'; x: number; y: number; strength: number }
export interface Run {
  readonly level: Level;
  player: Player;
  status: 'active' | 'paused' | 'defeat' | 'victory';
  elapsed: number;
  collected: boolean[];
  events: HollowEvent[];
}
export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
export function createRun(level: Level = hollow): Run {
  return { level, status: 'active', elapsed: 0, collected: level.motes.map(() => false), events: [],
    player: { ...level.start, vx: 0, vy: 0, grounded: false, facing: 1, coyote: 0, buffer: 0, jumpCut: false } };
}
export function pauseRun(run: Run, paused: boolean) {
  if (run.status === 'active' && paused) run.status = 'paused';
  else if (run.status === 'paused' && !paused) run.status = 'active';
}
export function takeEvents(run: Run): HollowEvent[] { const events = run.events; run.events = []; return events; }
function approach(value: number, target: number, amount: number) {
  return value < target ? Math.min(target, value + amount) : Math.max(target, value - amount);
}
function emit(run: Run, type: HollowEvent['type'], strength = 1) {
  const p = run.player;
  run.events.push({ type, x: p.x + m.width / 2, y: p.y + m.height, strength });
}
function jump(run: Run) {
  const p = run.player;
  p.vy = -m.jumpSpeed; p.grounded = false; p.coyote = 0; p.buffer = 0; p.jumpCut = false;
  emit(run, 'jump');
}
/** Axis-separated swept edge tests against static solids. No renderer or browser state. */
function movePlayer(run: Run, dt: number) {
  const p = run.player, solids = run.level.solids;
  let x = Math.max(0, Math.min(run.level.width - m.width, p.x + p.vx * dt));
  for (const s of solids) {
    if (p.y + m.height <= s.y || p.y >= s.y + s.h) continue;
    if (p.vx > 0 && p.x + m.width <= s.x && x + m.width >= s.x) x = Math.min(x, s.x - m.width);
    else if (p.vx < 0 && p.x >= s.x + s.w && x <= s.x + s.w) x = Math.max(x, s.x + s.w);
  }
  if (x !== p.x + p.vx * dt) p.vx = 0;
  p.x = x;
  let y = p.y + p.vy * dt;
  const wasGrounded = p.grounded, speed = p.vy;
  p.grounded = false;
  for (const s of solids) {
    if (p.x + m.width <= s.x || p.x >= s.x + s.w) continue;
    if (speed >= 0 && p.y + m.height <= s.y + 1e-7 && y + m.height >= s.y) {
      y = Math.min(y, s.y - m.height); p.grounded = true;
    } else if (speed < 0 && p.y >= s.y + s.h - 1e-7 && y <= s.y + s.h) {
      y = Math.max(y, s.y + s.h); p.vy = 0;
    }
  }
  p.y = y;
  if (p.grounded) {
    p.vy = 0; p.coyote = m.coyote;
    if (!wasGrounded && speed > 140) emit(run, 'land', Math.min(1, speed / m.maxFall));
  }
}
export function stepRun(run: Run, action: Action, dt: number) {
  if (run.status !== 'active' || !Number.isFinite(dt) || dt <= 0) return;
  // Callers use the shared fixed-step clock. Bound accidental large steps as well.
  dt = Math.min(dt, 1 / 60);
  const p = run.player;
  run.elapsed += dt;
  p.coyote = Math.max(0, p.coyote - dt); p.buffer = Math.max(0, p.buffer - dt);
  if (action.jumpPressed) p.buffer = m.buffer;
  const move = Number.isFinite(action.move) ? Math.max(-1, Math.min(1, action.move)) : 0;
  p.vx = approach(p.vx, move * m.speed, (p.grounded ? move === 0 ? m.braking : m.acceleration : m.airAcceleration) * dt);
  if (move) p.facing = Math.sign(move);
  if (p.buffer > 0 && (p.grounded || p.coyote > 0)) jump(run);
  if (!action.jumpHeld && p.vy < 0 && !p.jumpCut) { p.vy *= m.jumpCut; p.jumpCut = true; }
  p.vy = Math.min(m.maxFall, p.vy + m.gravity * dt);
  movePlayer(run, dt);
  // A press shortly before landing takes effect on that contact, not one frame later.
  if (p.grounded && p.buffer > 0) {
    jump(run);
    if (!action.jumpHeld) { p.vy *= m.jumpCut; p.jumpCut = true; }
  }
  const body = { x: p.x, y: p.y, w: m.width, h: m.height };
  if (p.y > run.level.height + 40 || run.level.hazards.some(h => overlaps(body, h))) {
    run.status = 'defeat'; emit(run, 'damage'); return;
  }
  run.level.motes.forEach((mote, i) => {
    if (!run.collected[i] && overlaps(body, { x: mote.x - 13, y: mote.y - 13, w: 26, h: 26 })) {
      run.collected[i] = true;
      run.events.push({ type: 'interaction', x: mote.x, y: mote.y, strength: 1 });
    }
  });
  if (overlaps(body, run.level.goal)) { run.status = 'victory'; emit(run, 'complete'); }
}
