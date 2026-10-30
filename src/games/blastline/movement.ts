import { body, operators } from './content.ts';
import { moveBody } from './terrain.ts';
import { emit, type Run, type Action, type Player } from './state.ts';
export function playerAt(at: { x: number; y: number }, operator: Player['operator'] = 'nova'): Player {
  return { ...at, w: body.w, h: body.h, vx: 0, vy: 0, grounded: false, operator, facing: 1, health: body.health, immune: 1.8,
    cooldown: 0, fireBuffer: 0, grenadeCooldown: 0, coyote: 0, buffer: 0, aimX: 1, aimY: 0 };
}
const approach = (v: number, target: number, amount: number) => v < target ? Math.min(target, v + amount) : Math.max(target, v - amount);
export function movePlayer(run: Run, action: Action, dt: number) {
  const p = run.player;
  const move = Number.isFinite(action.move) ? Math.max(-1, Math.min(1, action.move)) : 0;
  const aim = Number.isFinite(action.aim) ? Math.sign(action.aim) : 0;
  p.coyote = Math.max(0, p.coyote - dt); p.buffer = Math.max(0, p.buffer - dt);
  if (action.jumpPressed) p.buffer = .12;
  p.vx = approach(p.vx, move * operators[p.operator].speed, (p.grounded ? 2200 : 1400) * dt);
  if (move) p.facing = Math.sign(move);
  p.aimX = aim ? move ? p.facing * Math.SQRT1_2 : 0 : p.facing;
  p.aimY = aim * (move ? Math.SQRT1_2 : 1);
  function jump() { p.vy = -body.jump; p.buffer = 0; p.coyote = 0; p.grounded = false; emit(run, 'jump', p); }
  if (p.buffer > 0 && (p.grounded || p.coyote > 0)) jump();
  if (!action.jumpHeld && p.vy < -180) p.vy = -180;
  p.vy = Math.min(body.fall, p.vy + body.gravity * dt);
  moveBody(run.terrain, p, dt);
  if (p.grounded) { p.coyote = .09; if (p.buffer > 0) jump(); }
}
