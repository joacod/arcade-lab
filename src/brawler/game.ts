import { attacks, enemies, fighter, stages as campaign, type AttackKind, type EnemyKind, type Stage } from './content.ts';
export interface Action { x: number; lane: number; light: boolean; heavy: boolean; jump: boolean }
export const idle: Readonly<Action> = { x: 0, lane: 0, light: false, heavy: false, jump: false };
export interface Swing { id: number; kind: AttackKind; time: number; hits: number[]; sounded: boolean }
export interface Actor {
  id: number; kind: 'player' | EnemyKind; x: number; lane: number; elevation: number; vz: number;
  facing: -1 | 1; health: number; maxHealth: number; radius: number; vx: number; moving: boolean;
  stun: number; immune: number; flash: number; death: number; cooldown: number; attack: Swing | null; pattern: number;
}
export type EventType = 'swing' | 'miss' | 'hit' | 'damage' | 'ko' | 'jump' | 'pickup' | 'encounter' | 'clear' | 'stage' | 'boss' | 'victory' | 'gameover' | 'respawn';
export interface BrawlerEvent { type: EventType; x: number; lane: number; strength: number; attack?: AttackKind; player: boolean }
export interface Run {
  status: 'active' | 'paused' | 'interlude' | 'victory' | 'defeat'; stages: readonly Stage[]; stageIndex: number;
  player: Actor; enemies: Actor[]; pickups: { x: number; lane: number; health: number; collected: boolean }[];
  encounter: number; wave: number; gated: boolean; cleared: number; waveWait: number; attackWait: number;
  elapsed: number; score: number; lives: number; hits: number; bestCombo: number; combo: number; comboTime: number;
  chain: number; chainTime: number; buffer: { kind: 'light' | 'heavy'; ttl: number } | null;
  jumpBuffer: number; respawn: number; finale: number; nextId: number; nextSwing: number; events: BrawlerEvent[];
}
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
export const stageOf = (run: Run) => run.stages[run.stageIndex]!;
function actor(id: number, kind: Actor['kind'], x: number, lane: number): Actor {
  const data = kind === 'player' ? fighter : enemies[kind];
  return { id, kind, x, lane, elevation: 0, vz: 0, facing: kind === 'player' ? 1 : -1,
    health: data.health, maxHealth: data.health, radius: data.radius, vx: 0, moving: false,
    stun: 0, immune: 0, flash: 0, death: 0, cooldown: .7 + id % 3 * .15, attack: null, pattern: 0 };
}
export function createRun(stages: readonly Stage[] = campaign): Run {
  const stage = stages[0]!;
  return { status: 'active', stages, stageIndex: 0, player: actor(0, 'player', stage.start.x, stage.start.lane), enemies: [],
    pickups: stage.pickups.map(p => ({ ...p, collected: false })), encounter: 0, wave: -1, gated: false, cleared: 0,
    waveWait: 0, attackWait: 0, elapsed: 0, score: 0, lives: fighter.lives, hits: 0,
    bestCombo: 0, combo: 0, comboTime: 0, chain: 0, chainTime: 0, buffer: null, jumpBuffer: 0, respawn: 0, finale: 0, nextId: 1, nextSwing: 1, events: [] };
}
function emit(run: Run, type: EventType, a: Pick<Actor, 'x' | 'lane' | 'kind'>, strength = 1, attack?: AttackKind) {
  const event: BrawlerEvent = { type, x: a.x, lane: a.lane, strength, player: a.kind === 'player' };
  if (attack) event.attack = attack;
  run.events.push(event);
}
export function takeEvents(run: Run) { const events = run.events; run.events = []; return events; }
export function pauseRun(run: Run, paused: boolean) {
  if (paused && run.status === 'active') { run.status = 'paused'; run.buffer = null; run.jumpBuffer = 0; }
  else if (!paused && run.status === 'paused') run.status = 'active';
}
export function nextStage(run: Run) {
  if (run.status !== 'interlude') return;
  run.stageIndex++; const stage = stageOf(run);
  run.player = actor(0, 'player', stage.start.x, stage.start.lane);
  run.enemies = []; run.pickups = stage.pickups.map(p => ({ ...p, collected: false }));
  run.encounter = 0; run.wave = -1; run.gated = false; run.waveWait = 0;
  run.chain = 0; run.chainTime = 0; run.combo = 0; run.comboTime = 0; run.buffer = null; run.jumpBuffer = 0; run.attackWait = .8;
  run.status = 'active'; run.events = []; emit(run, 'stage', run.player);
}
export function attackPhase(swing: Swing): 'startup' | 'active' | 'recovery' {
  const d = attacks[swing.kind]; return swing.time < d.startup ? 'startup' : swing.time < d.startup + d.active ? 'active' : 'recovery';
}
/** Ground-depth and elevation eligibility are independent of rendered pose and camera. */
export function canHit(source: Actor, target: Actor, kind: AttackKind): boolean {
  if (source.health <= 0 || target.health <= 0 || target.immune > 0) return false;
  const d = attacks[kind], dx = (target.x - source.x) * source.facing;
  if (kind === 'quake') return Math.abs(target.x - (source.x + source.facing * 40)) <= d.reach + target.radius
    && Math.abs(source.lane - target.lane) <= d.lane && target.elevation < 30;
  if (kind === 'air' && (source.elevation < 8 || source.elevation > 150)) return false;
  return dx >= -target.radius * .35 && dx <= d.reach + target.radius
    && Math.abs(source.lane - target.lane) <= d.lane + target.radius * .2
    && target.elevation < (kind === 'charge' ? 72 : kind === 'air' ? 110 : 48);
}
function begin(run: Run, a: Actor, kind: AttackKind) {
  a.attack = { id: run.nextSwing++, kind, time: 0, hits: [], sounded: false }; a.moving = false;
  if (a.kind !== 'player') emit(run, a.kind === 'warden' ? 'boss' : 'swing', a, 1, kind);
}
function damage(run: Run, source: Actor, target: Actor, kind: AttackKind) {
  const d = attacks[kind];
  const armored = target.kind === 'warden' && target.attack && attackPhase(target.attack) !== 'recovery';
  const vulnerable = target.kind === 'warden' && target.attack && attackPhase(target.attack) === 'recovery';
  target.health = Math.max(0, target.health - Math.round(d.damage * (armored ? .65 : vulnerable ? 1.35 : 1)));
  target.flash = .12;
  if (!armored) {
    target.vx = source.facing * d.knockback * (target.kind === 'warden' ? .12 : 1);
    target.stun = target.kind === 'warden' ? .08 : d.stun;
    // The Warden retains its readable recovery window instead of replacing it with a new pattern.
    if (target.kind !== 'warden') target.attack = null;
  }
  if (target.kind === 'player') {
    target.immune = fighter.immunity; run.chain = 0; run.chainTime = 0; run.combo = 0; run.buffer = null; run.jumpBuffer = 0;
    emit(run, 'damage', target, d.damage / 20, kind);
  } else {
    run.hits++; run.combo++; run.comboTime = 2.2; run.bestCombo = Math.max(run.bestCombo, run.combo);
    run.score += 12 + Math.min(12, run.combo) * 3;
    emit(run, 'hit', target, d.damage / 25, kind);
  }
  if (target.health > 0) return;
  target.attack = null; target.stun = 0; target.death = .8;
  if (target.kind === 'player') {
    run.lives--; run.respawn = 1.1; emit(run, run.lives > 0 ? 'ko' : 'gameover', target);
    if (run.lives <= 0) run.status = 'defeat';
    // Cancel enemy windups on a lost life; there can be no attacks into the respawn.
    for (const enemy of run.enemies) { enemy.attack = null; enemy.cooldown = 1.3; }
  } else {
    run.score += enemies[target.kind].points; emit(run, 'ko', target, target.kind === 'warden' ? 3 : 1);
    if (target.kind === 'warden') { run.finale = 2.4; run.score += Math.round(run.player.health * 15) + run.lives * 500; }
  }
}
function swingStep(run: Run, a: Actor, dt: number) {
  const s = a.attack; if (!s) return;
  const d = attacks[s.kind], previous = s.time;
  s.time += dt;
  // Crossing an active window resolves even if a caller supplies a larger (bounded) step.
  if (s.time >= d.startup && previous < d.startup + d.active) {
    if (!s.sounded && a.kind === 'player') emit(run, 'swing', a, 1, s.kind);
    s.sounded = true;
    if (s.kind === 'charge') a.x += a.facing * 490 * Math.max(0, Math.min(s.time, d.startup + d.active) - Math.max(previous, d.startup));
    const targets = a.kind === 'player' ? run.enemies : [run.player];
    for (const target of targets) {
      if ((s.kind === 'jab' || s.kind === 'cross') && s.hits.length > 0) break;
      if (s.hits.includes(target.id) || !canHit(a, target, s.kind)) continue;
      s.hits.push(target.id); damage(run, a, target, s.kind);
      // Jabs isolate one opponent; finishers, aerial kicks and heavy strikes control crowds.
      if (s.kind === 'jab' || s.kind === 'cross') break;
    }
  }
  if (s.time >= d.startup + d.active + d.recovery) {
    if (a.kind === 'player' && !s.hits.length) emit(run, 'miss', a, .3, s.kind);
    a.attack = null; a.cooldown = a.kind === 'warden' ? .45 : .65;
    if (a.kind === 'player') run.chainTime = .38;
  }
}
function bounds(run: Run) {
  const stage = stageOf(run), encounter = stage.encounters[run.encounter];
  const previous = stage.encounters[run.encounter - 1];
  return { left: run.gated && encounter ? encounter.left + 24 : previous ? previous.left + 24 : 24,
    right: encounter ? run.gated ? encounter.right - 24 : encounter.trigger + 4 : stage.width - 40 };
}
function tickActor(a: Actor, dt: number) {
  a.immune = Math.max(0, a.immune - dt); a.stun = Math.max(0, a.stun - dt); a.flash = Math.max(0, a.flash - dt);
  a.cooldown = Math.max(0, a.cooldown - dt); a.death = Math.max(0, a.death - dt); a.moving = false;
  a.x += a.vx * dt; a.vx *= Math.exp(-10 * dt);
  if (Math.abs(a.vx) < 1) a.vx = 0;
  if (a.elevation > 0 || a.vz > 0) {
    a.vz -= fighter.gravity * dt; a.elevation = Math.max(0, a.elevation + a.vz * dt);
    if (a.elevation === 0) a.vz = 0;
  }
}
function playerStep(run: Run, action: Action, dt: number) {
  const p = run.player;
  if (action.jump) run.jumpBuffer = .18;
  else run.jumpBuffer = Math.max(0, run.jumpBuffer - dt);
  if (action.light || action.heavy) run.buffer = { kind: action.heavy ? 'heavy' : 'light', ttl: .28 };
  if (run.buffer) { run.buffer.ttl -= dt; if (run.buffer.ttl <= 0) run.buffer = null; }
  run.chainTime = Math.max(0, run.chainTime - dt);
  if (!p.attack && run.chainTime === 0) run.chain = 0;
  if (p.stun > 0 || p.health <= 0) return;
  const moveX = clamp(action.x, -1, 1), moveLane = clamp(action.lane, -1, 1);
  if (!p.attack && moveX) p.facing = moveX > 0 ? 1 : -1;
  if (!p.attack && run.jumpBuffer > 0 && p.elevation === 0) {
    p.vz = fighter.jump; p.elevation = .1; run.jumpBuffer = 0; emit(run, 'jump', p);
  }
  if (!p.attack && run.buffer) {
    const kind = run.buffer.kind;
    if (moveX) p.facing = moveX > 0 ? 1 : -1;
    if (p.elevation > 0) begin(run, p, 'air');
    else if (kind === 'heavy') { begin(run, p, 'heavy'); run.chain = 0; }
    else { begin(run, p, (['jab', 'cross', 'finisher'] as const)[run.chain % 3]!); run.chain = (run.chain + 1) % 3; }
    run.buffer = null;
  }
  const mobility = !p.attack ? 1 : p.elevation > 0 ? .7 : 0;
  const length = Math.max(1, Math.hypot(moveX, moveLane));
  p.x += moveX / length * fighter.speed * mobility * dt;
  p.lane += moveLane / length * fighter.laneSpeed * mobility * dt;
  p.moving = mobility > 0 && (moveX !== 0 || moveLane !== 0);
}
function enemyStep(run: Run, a: Actor, dt: number) {
  if (a.health <= 0 || a.stun > 0 || a.attack || run.player.health <= 0) return;
  const p = run.player, dx = p.x - a.x, dl = p.lane - a.lane, boss = a.kind === 'warden';
  a.facing = dx >= 0 ? 1 : -1;
  const data = enemies[a.kind as EnemyKind];
  // One attack token, followed by a breathing gap. Other actors continue positioning.
  const occupied = run.enemies.some(other => other.attack && attackPhase(other.attack) !== 'recovery');
  const desired = boss ? (a.pattern % 2 === 0 ? 255 : 115) : a.kind === 'bruiser' ? 65 : 46;
  if (Math.abs(dx) > desired + 5) { a.x += Math.sign(dx) * data.speed * dt; a.moving = true; }
  if (Math.abs(dl) > 8) { a.lane += Math.sign(dl) * data.laneSpeed * dt; a.moving = true; }
  if (!occupied && run.attackWait <= 0 && a.cooldown <= 0 && Math.abs(dx) < desired + 35 && Math.abs(dl) < (boss ? 26 : 18)) {
    begin(run, a, boss ? a.pattern++ % 2 === 0 ? 'charge' : 'quake' : a.kind === 'bruiser' ? 'smash' : 'strike');
    run.attackWait = boss ? 1 : .65;
  }
}
function spawnWave(run: Run) {
  const encounter = stageOf(run).encounters[run.encounter]!;
  run.wave++; run.waveWait = 0;
  for (const point of encounter.waves[run.wave]!) {
    const enemy = actor(run.nextId++, point.kind, point.x, point.lane);
    run.enemies.push(enemy);
  }
  emit(run, 'encounter', run.player);
}
function progress(run: Run, dt: number) {
  const stage = stageOf(run), encounter = stage.encounters[run.encounter];
  if (run.finale > 0) {
    run.finale = Math.max(0, run.finale - dt);
    if (run.finale === 0) { run.status = 'victory'; run.cleared++; emit(run, 'victory', run.player); }
    return;
  }
  if (encounter && !run.gated && run.player.x >= encounter.trigger) { run.gated = true; run.wave = -1; spawnWave(run); }
  if (run.gated && !run.enemies.some(a => a.health > 0)) {
    run.waveWait += dt;
    if (run.waveWait >= .95) {
      if (encounter && run.wave + 1 < encounter.waves.length) spawnWave(run);
      else {
        run.gated = false; run.encounter++; run.cleared++; run.waveWait = 0;
        run.score += 450; emit(run, 'clear', run.player);
        if (encounter?.repair) run.pickups.push({ x: Math.min(run.player.x + 90, encounter.right - 45), lane: run.player.lane, health: encounter.repair, collected: false });
      }
    }
  }
  for (const pickup of run.pickups) {
    if (pickup.collected || run.player.elevation > 18 || Math.abs(run.player.x - pickup.x) > 32 || Math.abs(run.player.lane - pickup.lane) > 26) continue;
    pickup.collected = true; run.player.health = Math.min(fighter.health, run.player.health + pickup.health); run.score += 75; emit(run, 'pickup', run.player);
  }
  if (!encounter && run.player.x >= stage.width - 130) {
    run.score += 1000;
    run.status = run.stageIndex + 1 < run.stages.length ? 'interlude' : 'victory';
    emit(run, run.status === 'interlude' ? 'stage' : 'victory', run.player);
  }
}
export function stepRun(run: Run, action: Action, elapsed: number) {
  if (run.status !== 'active' || !Number.isFinite(elapsed) || elapsed <= 0) return;
  const dt = Math.min(elapsed, 1 / 30), stage = stageOf(run);
  run.elapsed += dt; run.attackWait = Math.max(0, run.attackWait - dt);
  run.comboTime = Math.max(0, run.comboTime - dt); if (!run.comboTime) run.combo = 0;
  tickActor(run.player, dt);
  for (const enemy of run.enemies) tickActor(enemy, dt);
  if (run.respawn > 0) {
    run.respawn = Math.max(0, run.respawn - dt);
    if (!run.respawn) {
      const p = run.player; p.health = fighter.health; p.immune = 2; p.elevation = 0; p.vz = 0; p.vx = 0;
      p.attack = null; p.stun = 0; run.buffer = null; run.attackWait = 1.5; emit(run, 'respawn', p);
    }
  } else if (!run.finale) {
    playerStep(run, action, dt); swingStep(run, run.player, dt);
    for (const enemy of run.enemies) { enemyStep(run, enemy, dt); swingStep(run, enemy, dt); }
    // Soft local separation avoids unreadable stacks without a general physics system.
    for (let i = 0; i < run.enemies.length; i++) for (let j = i + 1; j < run.enemies.length; j++) {
      const a = run.enemies[i]!, b = run.enemies[j]!;
      if (a.health <= 0 || b.health <= 0 || a.attack || b.attack) continue;
      if (Math.abs(a.x - b.x) < 40 && Math.abs(a.lane - b.lane) < 27) {
        const push = a.lane <= b.lane ? -1 : 1; a.lane += push * 25 * dt; b.lane -= push * 25 * dt;
      }
    }
  }
  const limit = bounds(run);
  for (const a of [run.player, ...run.enemies]) {
    a.x = clamp(a.x, limit.left, limit.right); a.lane = clamp(a.lane, stage.laneMin, stage.laneMax);
  }
  run.enemies = run.enemies.filter(a => a.health > 0 || a.death > 0);
  if (run.status === 'active' && !run.respawn) progress(run, dt);
}
