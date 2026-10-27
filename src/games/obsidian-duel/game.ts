import { arena, fighters, type FighterId, type AttackKind, type AttackDefinition } from './content.ts';
import { createBrain, cpuAction, type Brain } from './cpu.ts';
export interface Action { x: number; crouch: boolean; block: boolean; jump: boolean; light: boolean; heavy: boolean; special: boolean }
export const idle: Readonly<Action> = { x: 0, crouch: false, block: false, jump: false, light: false, heavy: false, special: false };
export type CombatState = 'idle' | 'move' | 'crouch' | 'jump' | 'block' | 'startup' | 'active' | 'recovery' | 'blockstun' | 'hitstun' | 'knockdown' | 'wakeup' | 'ko';
export interface Swing { id: number; kind: AttackKind; time: number; hits: number[]; sounded: boolean }
export interface Fighter {
  kind: FighterId; x: number; z: number; vz: number; vx: number; facing: 1 | -1; health: number;
  state: CombatState; stateTime: number; crouched: boolean; guarding: boolean; attack: Swing | null;
  immune: number; specialCooldown: number; buffer: { kind: AttackKind | 'jump'; ttl: number } | null;
}
export type EventType = 'swing' | 'heavySwing' | 'special' | 'hit' | 'heavyHit' | 'block' | 'knockdown' | 'count' | 'fight' | 'ko' | 'timeout' | 'victory' | 'defeat';
export interface DuelEvent { type: EventType; x: number; z: number; fighter: number; strength: number }
export interface Projectile { id: number; owner: number; x: number; z: number; facing: 1 | -1; life: number }
export interface Match {
  fighters: [Fighter, Fighter]; wins: [number, number]; phase: 'intro' | 'fight' | 'roundEnd' | 'complete';
  phaseTime: number; timer: number; round: number; elapsed: number; winner: number | null; reason: 'ko' | 'timeout' | 'draw';
  status: 'active' | 'paused' | 'victory' | 'defeat'; nextAttack: number; projectiles: Projectile[]; events: DuelEvent[]; brain: Brain;
}
function fighter(kind: FighterId, side: number): Fighter {
  return { kind, x: side === 0 ? 340 : 660, z: 0, vz: 0, vx: 0, facing: side === 0 ? 1 : -1, health: 100,
    state: 'idle', stateTime: 0, crouched: false, guarding: false, attack: null, immune: 0, specialCooldown: 0, buffer: null };
}
export function createMatch(selected: FighterId = 'nera', seed = 803): Match {
  return { fighters: [fighter(selected, 0), fighter(selected === 'nera' ? 'kael' : 'nera', 1)], wins: [0, 0],
    phase: 'intro', phaseTime: 3, timer: arena.roundTime, round: 1, elapsed: 0, winner: null, reason: 'ko',
    status: 'active', nextAttack: 1, projectiles: [], events: [], brain: createBrain(seed) };
}
export function takeEvents(m: Match) { return m.events.splice(0); }
export function pauseMatch(m: Match, paused: boolean) {
  if (m.status !== 'active' && m.status !== 'paused') return;
  m.status = paused ? 'paused' : 'active';
  if (paused) for (const f of m.fighters) f.buffer = null;
}
function emit(m: Match, type: EventType, index: number, strength = 1, height = 80) {
  const f = m.fighters[index]!; m.events.push({ type, x: f.x, z: f.z + height, fighter: index, strength });
}
export function attackPhase(s: Swing, d: AttackDefinition): 'startup' | 'active' | 'recovery' {
  return s.time < d.startup ? 'startup' : s.time < d.startup + d.active ? 'active' : 'recovery';
}
export function guards(target: Fighter, d: AttackDefinition): boolean {
  if (!target.guarding || target.z > 0 || !['block', 'blockstun'].includes(target.state)) return false;
  return d.height === 'mid' || d.height === 'low' && target.crouched || d.height === 'overhead' && !target.crouched;
}
export function canHit(source: Fighter, target: Fighter, d: AttackDefinition): boolean {
  const dx = (target.x - source.x) * source.facing, dz = target.z - source.z;
  return target.health > 0 && target.immune <= 0 && !['knockdown', 'wakeup', 'ko'].includes(target.state)
    && dx >= 0 && dx <= d.reach + arena.radius && dz >= d.minZ && dz <= d.maxZ
    && !(source.z > 0 && source.attack?.kind !== 'air');
}
function begin(m: Match, f: Fighter, kind: AttackKind) {
  f.attack = { id: m.nextAttack++, kind, time: 0, hits: [], sounded: false }; f.state = 'startup'; f.guarding = false;
  f.crouched = kind === 'sweep'; if (kind === 'special') f.specialCooldown = fighters[f.kind].cooldown;
}
function tick(f: Fighter, dt: number) {
  f.immune = Math.max(0, f.immune - dt); f.specialCooldown = Math.max(0, f.specialCooldown - dt);
  if (f.buffer) { f.buffer.ttl -= dt; if (f.buffer.ttl <= 0) f.buffer = null; }
  f.x += f.vx * dt; f.vx *= Math.exp(-12 * dt);
  if (f.z > 0 || f.vz > 0) {
    f.vz -= arena.gravity * dt; f.z = Math.max(0, f.z + f.vz * dt);
    if (f.z === 0) { f.vz = 0; if (f.attack?.kind === 'air') { f.attack = null; f.state = 'recovery'; f.stateTime = .12; } }
  }
  if (['blockstun', 'hitstun', 'knockdown', 'wakeup'].includes(f.state) || f.state === 'recovery' && !f.attack) {
    f.stateTime = Math.max(0, f.stateTime - dt);
    if (f.stateTime === 0) {
      if (f.state === 'knockdown') { f.state = 'wakeup'; f.stateTime = .30; f.immune = .50; }
      else { f.state = 'idle'; f.guarding = false; }
    }
  }
}
function command(m: Match, index: number, a: Action, dt: number) {
  const f = m.fighters[index]!, other = m.fighters[1 - index]!;
  if (a.special) f.buffer = { kind: 'special', ttl: .15 };
  else if (a.heavy || a.light) f.buffer = { kind: f.z > 0 || a.jump ? 'air' : a.crouch && a.light ? 'sweep' : a.heavy ? 'heavy' : 'light', ttl: .15 };
  else if (a.jump) f.buffer = { kind: 'jump', ttl: .13 };
  if (f.attack || ['blockstun', 'hitstun', 'knockdown', 'wakeup', 'ko'].includes(f.state) || f.stateTime > 0) return;
  f.facing = other.x >= f.x ? 1 : -1;
  f.crouched = a.crouch && f.z === 0; f.guarding = a.block && f.z === 0;
  if ((a.jump || f.buffer?.kind === 'jump') && f.z === 0 && !a.block) {
    f.vz = fighters[f.kind].jump; f.z = .1; f.crouched = false; f.guarding = false;
    if (f.buffer?.kind === 'jump') f.buffer = null;
  }
  if (f.buffer && !a.block) {
    const kind = f.buffer.kind;
    if (kind !== 'jump' && (kind !== 'special' || f.specialCooldown === 0 && f.z === 0)) {
      begin(m, f, f.z > 0 ? 'air' : kind === 'air' ? 'light' : kind); f.buffer = null; return;
    }
  }
  const x = Math.max(-1, Math.min(1, a.x));
  if (!f.crouched && !f.guarding) f.x += x * fighters[f.kind].speed * dt;
  f.state = f.guarding ? 'block' : f.z > 0 ? 'jump' : f.crouched ? 'crouch' : x ? 'move' : 'idle';
}
/** A fixed left/right order is intentional: jumps attack overhead but never cross up or swap bodies. */
function separate(m: Match) {
  const [a, b] = m.fighters, gap = arena.radius * 2;
  a.x = Math.max(arena.left, Math.min(arena.right, a.x)); b.x = Math.max(arena.left, Math.min(arena.right, b.x));
  if (b.x - a.x < gap) {
    const center = Math.max(arena.left + gap / 2, Math.min(arena.right - gap / 2, (a.x + b.x) / 2));
    a.x = center - gap / 2; b.x = center + gap / 2;
  }
}
interface Contact { source: number; target: number; attack: AttackDefinition; blocked: boolean }
function contact(m: Match, c: Contact) {
  const source = m.fighters[c.source]!, target = m.fighters[c.target]!, d = c.attack;
  target.attack = null; target.buffer = null; target.vx = source.facing * d.push * (c.blocked ? .6 : 1);
  if (c.blocked) { target.state = 'blockstun'; target.stateTime = .16; emit(m, 'block', c.target, .65, d.height === 'low' ? 22 : 92); return; }
  target.guarding = false; target.health = Math.max(0, target.health - d.damage);
  target.state = target.health <= 0 ? 'ko' : d.knockdown ? 'knockdown' : 'hitstun';
  target.stateTime = d.knockdown ? .65 : d.stun;
  // A short protected exit from stun breaks corner loops; knockdown has a longer protected wake-up.
  target.immune = d.knockdown ? .8 : d.stun + .10;
  emit(m, d.damage >= 15 ? 'heavyHit' : 'hit', c.target, d.damage / 23, d.height === 'low' ? 22 : 92);
  if (d.knockdown && target.health > 0) emit(m, 'knockdown', c.target);
}
function finishRound(m: Match, reason: 'ko' | 'timeout') {
  const [a, b] = m.fighters; m.winner = a.health === b.health ? null : a.health > b.health ? 0 : 1;
  m.reason = m.winner === null ? 'draw' : reason;
  if (m.winner !== null) m.wins[m.winner] = m.wins[m.winner]! + 1;
  m.phase = 'roundEnd'; m.phaseTime = 2.5; m.projectiles = [];
  for (const f of m.fighters) {
    f.attack = null; f.buffer = null; f.guarding = false; f.crouched = false; f.stateTime = 0;
    f.state = f.health <= 0 ? 'ko' : 'idle';
  }
  emit(m, reason, m.winner === null ? 0 : 1 - m.winner);
}
export function stepMatch(m: Match, action: Action, elapsed: number, cpuOverride?: Action) {
  if (m.status !== 'active' || !Number.isFinite(elapsed) || elapsed <= 0) return;
  const dt = Math.min(elapsed, 1 / 30); m.elapsed += dt;
  if (m.phase === 'intro') {
    if (m.phaseTime === 3) emit(m, 'count', 0);
    const before = Math.ceil(m.phaseTime); m.phaseTime = Math.max(0, m.phaseTime - dt);
    if (Math.ceil(m.phaseTime) < before) emit(m, m.phaseTime === 0 ? 'fight' : 'count', 0);
    if (m.phaseTime === 0) { m.phase = 'fight'; m.phaseTime = 0; }
    return;
  }
  if (m.phase === 'roundEnd') {
    m.phaseTime = Math.max(0, m.phaseTime - dt);
    // Round decisions are final, but airborne bodies still land before the next introduction.
    for (const f of m.fighters) { f.vx = 0; tick(f, dt); }
    if (m.phaseTime === 0) {
      if (m.wins.some(w => w >= 2)) {
        m.phase = 'complete'; m.status = m.wins[0] >= 2 ? 'victory' : 'defeat'; emit(m, m.status, 0);
      } else {
        m.round++; m.phase = 'intro'; m.phaseTime = 3; m.timer = arena.roundTime;
        m.fighters = [fighter(m.fighters[0].kind, 0), fighter(m.fighters[1].kind, 1)];
        m.brain = createBrain(m.brain.seed); m.winner = null;
      }
    }
    return;
  }
  if (m.phase !== 'fight') return;
  m.timer = Math.max(0, m.timer - dt);
  const cpu = cpuOverride ?? cpuAction(m, dt);
  for (const f of m.fighters) tick(f, dt);
  command(m, 0, action, dt); command(m, 1, cpu, dt);
  const contacts: Contact[] = [];
  // Advance both attacks before collecting contacts: equal timing can trade, independent of player index.
  for (let index = 0; index < 2; index++) {
    const f = m.fighters[index]!, s = f.attack; if (!s) continue;
    const d = fighters[f.kind].attacks[s.kind], previous = s.time; s.time += dt; f.state = attackPhase(s, d);
    if (s.time >= d.startup && previous < d.startup + d.active) {
      if (!s.sounded) {
        emit(m, s.kind === 'special' ? 'special' : s.kind === 'heavy' || s.kind === 'sweep' ? 'heavySwing' : 'swing', index);
        s.sounded = true;
        if (s.kind === 'special' && f.kind === 'nera') m.projectiles.push({ id: s.id, owner: index, x: f.x + f.facing * 40, z: 76, facing: f.facing, life: 1.7 });
      }
      f.x += f.facing * d.advance * Math.max(0, Math.min(s.time, d.startup + d.active) - Math.max(previous, d.startup));
    }
  }
  separate(m);
  for (let index = 0; index < 2; index++) {
    const f = m.fighters[index]!, s = f.attack, target = m.fighters[1 - index]!; if (!s) continue;
    const d = fighters[f.kind].attacks[s.kind];
    if (f.state === 'active' && !(s.kind === 'special' && f.kind === 'nera') && !s.hits.includes(1 - index) && canHit(f, target, d)) {
      s.hits.push(1 - index); contacts.push({ source: index, target: 1 - index, attack: d, blocked: guards(target, d) });
    }
    if (s.time >= d.startup + d.active + d.recovery) { f.attack = null; f.state = 'idle'; }
  }
  for (const s of m.projectiles) {
    const previous = s.x; s.x += s.facing * 480 * dt; s.life -= dt;
    const targetIndex = 1 - s.owner, target = m.fighters[targetIndex]!, source = m.fighters[s.owner]!;
    if (target.health > 0 && Math.min(previous, s.x) <= target.x + arena.radius && Math.max(previous, s.x) >= target.x - arena.radius
      && target.z < 85 && target.immune <= 0 && !['knockdown', 'wakeup', 'ko'].includes(target.state)) {
      const d = fighters[source.kind].attacks.special;
      contacts.push({ source: s.owner, target: targetIndex, attack: d, blocked: guards(target, d) }); s.life = 0;
    }
  }
  m.projectiles = m.projectiles.filter(s => s.life > 0 && s.x > 0 && s.x < arena.width);
  for (const c of contacts) contact(m, c);
  separate(m);
  if (m.fighters.some(f => f.health <= 0)) finishRound(m, 'ko');
  else if (m.timer === 0) finishRound(m, 'timeout');
}
