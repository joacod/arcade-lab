import { overlaps } from '../collision.ts';
import { journey, movement as m, type Level, type Rect, type Vent } from './content.ts';

export interface Action { move: number; jumpPressed: boolean; jumpHeld: boolean }
export const idle: Action = { move: 0, jumpPressed: false, jumpHeld: false };
export interface Player {
  x: number; y: number; vx: number; vy: number; grounded: boolean;
  facing: number; coyote: number; buffer: number; jumpCut: boolean;
}
export interface HollowEvent { type: 'jump' | 'land' | 'damage' | 'interaction' | 'stomp' | 'checkpoint' | 'vent' | 'level' | 'complete'; x: number; y: number; strength: number }
export interface Enemy extends Rect { x: number; direction: number; alive: boolean }
export interface Run {
  readonly levels: readonly Level[];
  level: Level;
  levelIndex: number;
  player: Player;
  status: 'active' | 'paused' | 'defeat' | 'interlude' | 'victory';
  elapsed: number;
  levelTime: number;
  deaths: number;
  bankedMotes: number;
  completed: number;
  checkpoint: number;
  collected: boolean[];
  enemies: Enemy[];
  vents: ('idle' | 'warning' | 'active')[];
  events: HollowEvent[];
}
function playerAt(at: { x: number; y: number }): Player {
  return { x: at.x, y: at.y, vx: 0, vy: 0, grounded: false, facing: 1, coyote: 0, buffer: 0, jumpCut: false };
}
export function ventPhase(vent: Vent, time: number): 'idle' | 'warning' | 'active' {
  const phase = ((time + vent.offset) % vent.period) / vent.period;
  return phase < 0.5 ? 'idle' : phase < 0.72 ? 'warning' : 'active';
}
function resetThreats(run: Run) {
  run.levelTime = 0;
  run.enemies = run.level.patrols.map(enemy => ({ ...enemy, direction: 1, alive: true }));
  run.vents = run.level.vents.map(vent => ventPhase(vent, 0));
}
export function createRun(levels: readonly Level[] = journey): Run {
  const level = levels[0];
  if (!level) throw new Error('A journey needs at least one level.');
  const run: Run = { levels, level, levelIndex: 0, status: 'active', elapsed: 0, levelTime: 0, deaths: 0,
    bankedMotes: 0, completed: 0, checkpoint: -1, collected: level.motes.map(() => false), enemies: [], vents: [], events: [], player: playerAt(level.start) };
  resetThreats(run); return run;
}
/** Retry retains discoveries and the attempt ledger, so neither motes nor score can be farmed. */
export function retryRun(run: Run) {
  if (run.status !== 'defeat') return;
  run.player = playerAt(run.level.checkpoints[run.checkpoint] ?? run.level.start);
  run.status = 'active'; run.events = []; resetThreats(run);
}
export function nextLevel(run: Run) {
  if (run.status !== 'interlude') return;
  run.levelIndex++; run.level = run.levels[run.levelIndex]!;
  run.player = playerAt(run.level.start); run.checkpoint = -1;
  run.collected = run.level.motes.map(() => false); run.events = []; run.status = 'active'; resetThreats(run);
}
export function results(run: Run) {
  const motes = run.bankedMotes + (run.status === 'interlude' || run.status === 'victory' ? 0 : run.collected.filter(Boolean).length);
  const total = run.levels.reduce((sum, level) => sum + level.motes.length, 0);
  return { motes, total, score: Math.max(0, motes * 100 + run.completed * 500 - run.deaths * 50),
    title: motes === total ? 'Keeper of every spark' : run.deaths === 0 ? 'A perfectly wound journey' : 'The hollow remembers you' };
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
  const p = run.player, previousBottom = p.y + m.height;
  run.elapsed += dt; run.levelTime += dt;
  run.enemies.forEach((enemy, i) => {
    if (!enemy.alive) return;
    const content = run.level.patrols[i]!;
    enemy.x += enemy.direction * content.speed * dt;
    if (enemy.x >= content.to) { enemy.x = content.to; enemy.direction = -1; }
    else if (enemy.x <= content.x) { enemy.x = content.x; enemy.direction = 1; }
  });
  run.level.vents.forEach((vent, i) => {
    const phase = ventPhase(vent, run.levelTime);
    if (phase === 'active' && run.vents[i] !== 'active') run.events.push({ type: 'vent', x: vent.x + vent.w / 2, y: vent.y + vent.h, strength: 1 });
    run.vents[i] = phase;
  });
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
  function die() { run.status = 'defeat'; run.deaths++; emit(run, 'damage'); }
  if (p.y > run.level.height + 40 || run.level.hazards.some(h => overlaps(body, h))
    || run.level.vents.some((vent, i) => run.vents[i] === 'active' && overlaps(body, vent))) {
    die(); return;
  }
  for (const enemy of run.enemies) {
    if (!enemy.alive || !overlaps(body, enemy)) continue;
    if (p.vy > 0 && previousBottom <= enemy.y + 8) {
      enemy.alive = false; p.y = enemy.y - m.height; p.vy = -m.jumpSpeed * 0.68;
      p.grounded = false; p.coyote = 0; p.jumpCut = true;
      run.events.push({ type: 'stomp', x: enemy.x + enemy.w / 2, y: enemy.y, strength: 1 });
    } else { die(); return; }
  }
  run.level.checkpoints.forEach((checkpoint, i) => {
    if (i > run.checkpoint && overlaps(body, { x: checkpoint.x - 20, y: checkpoint.y - 35, w: 66, h: 80 })) {
      run.checkpoint = i;
      run.events.push({ type: 'checkpoint', x: checkpoint.x + 13, y: checkpoint.y, strength: 1 });
    }
  });
  run.level.motes.forEach((mote, i) => {
    if (!run.collected[i] && overlaps(body, { x: mote.x - 13, y: mote.y - 13, w: 26, h: 26 })) {
      run.collected[i] = true;
      run.events.push({ type: 'interaction', x: mote.x, y: mote.y, strength: 1 });
    }
  });
  if (overlaps(body, run.level.goal)) {
    run.completed++; run.bankedMotes += run.collected.filter(Boolean).length;
    run.status = run.levelIndex === run.levels.length - 1 ? 'victory' : 'interlude';
    emit(run, run.status === 'victory' ? 'complete' : 'level');
  }
}
