import { init, surface, effect, draw, frame, storage, uniforms, type Gpu, type Draw, type Effect } from 'vgpu';
import fieldShader from './field.wgsl';
import organismShader from './organisms.wgsl';
import { clearing, enemies, weapons } from '../content.ts';
import type { GameEvent } from '../game-state.ts';
import { createAnimationObservations } from '../animation.ts';
import { orbitPosition } from '../weapons/halo.ts';
import type { Theme } from '../themes.ts';
import { visualTiming } from '../themes.ts';
import type { DisplaySize, WorldPresentation } from '../world-presentation.ts';

/** Local artistic/performance tuning. Palette variations need no shader changes. */
export const bloomTuning = { flow: 0.65, veins: 0.8, glow: 0.65, dpr: 1.5, maxPixels: 2_400_000,
  instances: 4096, ripples: 12, particles: 192 } as const;
type Color = readonly number[];
interface Ripple { x: number; y: number; at: number; radius: number; strength: number; color: Color }
interface Particle { x: number; y: number; at: number; angle: number; speed: number; life: number; color: Color }
function rgba(hex: string): number[] {
  return [parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255, hex.length === 9 ? parseInt(hex.slice(7, 9), 16) / 255 : 1];
}

/** GPU ownership ends here. No rules, browser input, sound, scheduling or simulation mutations. */
export async function createBloom(theme: Theme, signal: AbortSignal, onFailure: () => void): Promise<WorldPresentation> {
  if (!navigator.gpu) throw new Error('WebGPU is unavailable in this browser');
  const canvas = document.createElement('canvas');
  canvas.className = 'world-canvas'; canvas.dataset.renderer = 'vgpu';
  let gpu: Gpu | undefined, environment: Effect | undefined, actors: Draw | undefined;
  let disposed = false, failed = false;
  let detachError: (() => void) | undefined;
  function dispose() {
    if (disposed) return;
    disposed = true; signal.removeEventListener('abort', dispose); detachError?.();
    actors?.dispose(); environment?.dispose(); gpu?.dispose();
    canvas.remove(); canvas.width = canvas.height = 1;
  }
  function assertReady() {
    if (disposed) throw new Error('Preparation cancelled');
    if (failed) throw new Error('WebGPU device unavailable');
  }
  try {
    gpu = await init({ powerPreference: 'low-power' });
    // init cannot be cancelled; an obsolete device is released as soon as it arrives.
    if (signal.aborted) throw new Error('Preparation cancelled');
    assertReady(); signal.addEventListener('abort', dispose, { once: true });
    void gpu.lost.then(() => { if (!disposed) { failed = true; onFailure(); } });
    detachError = gpu.onError(() => { if (!disposed && !failed) { failed = true; onFailure(); } });
    const output = surface(gpu, canvas, { autoResize: false, size: [1, 1], dpr: 1, alphaMode: 'opaque' });
    const sceneValues = { screen: [1, 1, 1, 1], view: [0, 0, 1, 0], world: [clearing.arena.width, clearing.arena.height, 0, 0],
      keeper: [0, 0, 0, 0], options: [bloomTuning.flow, bloomTuning.veins, 0, bloomTuning.glow] };
    const scene = uniforms(gpu, sceneValues);
    const colors = Object.fromEntries(Object.entries(theme.palette).map(([key, color]) => [key, rgba(color)]));
    const palette = uniforms(gpu, colors);
    const c = (key: keyof Theme['palette']) => colors[key]!;
    const entityData = new Float32Array(bloomTuning.instances * 16);
    const rippleData = new Float32Array(bloomTuning.ripples * 8);
    const entityBuffer = storage(gpu, entityData.byteLength, 'read');
    const rippleBuffer = storage(gpu, rippleData.byteLength, 'read');
    environment = effect(gpu, fieldShader, { label: 'Abyss living field', set: { scene, palette, ripples: rippleBuffer } });
    actors = draw(gpu, { label: 'Abyss organisms', shader: organismShader, vertices: 6, blend: 'alpha',
      set: { scene, palette, organisms: entityBuffer } });
    await Promise.all([environment.compile(output), actors.compile(output)]);
    await gpu.settled(); assertReady();
    if (signal.aborted) throw new Error('Preparation cancelled');
    signal.removeEventListener('abort', dispose);
    let size: DisplaySize = { width: 1, height: 1, ratio: 1 }, count = 0;
    const observations = createAnimationObservations();
    let ripples: Ripple[] = [], particles: Particle[] = [];
    let events: Extract<GameEvent, { x: number }>[] = [];
    let eliteId = -1, lastWake = -1;
    let player = { x: 0, y: 0 };
    function ripple(x: number, y: number, at: number, radius: number, strength: number, color: Color) {
      ripples.push({ x, y, at, radius, strength, color });
      if (ripples.length > bloomTuning.ripples) ripples.shift();
    }
    function burst(x: number, y: number, at: number, color: Color, elite: boolean) {
      for (let j = 0; j < (elite ? 36 : 6); j++) particles.push({ x, y, at, color,
        angle: j * 2.39996 + x, speed: (elite ? 90 : 30) + j % 7 * 9, life: elite ? 1.1 : 0.45 });
      if (particles.length > bloomTuning.particles) particles.splice(0, particles.length - bloomTuning.particles);
    }
    function add(x: number, y: number, rx: number, ry: number, kind: number, color: Color,
      alpha = 1, angle = 0, seed = 0, detail = 0, moving = 0, hit = 0) {
      if (count >= bloomTuning.instances) return;
      const i = count++ * 16;
      entityData[i] = x; entityData[i + 1] = y; entityData[i + 2] = rx; entityData[i + 3] = ry;
      entityData[i + 4] = color[0]!; entityData[i + 5] = color[1]!; entityData[i + 6] = color[2]!; entityData[i + 7] = alpha;
      entityData[i + 8] = kind; entityData[i + 9] = angle; entityData[i + 10] = seed; entityData[i + 11] = 0;
      entityData[i + 12] = detail; entityData[i + 13] = moving; entityData[i + 14] = hit; entityData[i + 15] = 0;
    }
    function ring(x: number, y: number, radius: number, color: Color, alpha: number, width = 1.5) {
      add(x, y, radius / 0.85, radius / 0.85, 7, color, alpha, 0, 0, width / radius);
    }
    return {
      canvas,
      resize(next) {
        assertReady(); size = next;
        const ratio = Math.min(next.ratio, bloomTuning.dpr, Math.sqrt(bloomTuning.maxPixels / (next.width * next.height)));
        output.resize([Math.max(1, Math.round(next.width * ratio)), Math.max(1, Math.round(next.height * ratio))]);
      },
      reset(run) {
        ripples = []; particles = []; events = []; lastWake = run.elapsed; eliteId = -1;
        observations.reset(run); player = { ...run.player };
        for (const enemy of run.enemies) if (enemies[enemy.kind].elite) eliteId = enemy.id;
      },
      observe(run) {
        observations.observe(run); player.x = run.player.x; player.y = run.player.y;
        for (const enemy of run.enemies) if (enemies[enemy.kind].elite) eliteId = enemy.id;
        if (observations.get('keeper').moving && run.elapsed - lastWake > 0.14) {
          lastWake = run.elapsed; ripple(player.x, player.y, run.elapsed, 16, 0.22, c('light'));
        }
      },
      consume(batch) {
        for (const event of batch) {
          if ('x' in event) {
            events.push(event);
            if (event.type === 'pulse') ripple(event.x, event.y, event.at, event.radius, 1.7, c('pulse'));
            if (event.type === 'shot') ripple(event.x, event.y, event.at, 18, 0.28, c('spark'));
            if (event.type === 'player-hit') ripple(event.x, event.y, event.at, 35, 1.1, c('damage'));
            if (event.type === 'enemy-defeated') {
              const elite = event.enemyId === eliteId;
              ripple(event.x, event.y, event.at, elite ? 200 : 28, elite ? 2.5 : 0.4, c(elite ? 'elite' : 'enemy'));
              burst(event.x, event.y, event.at, c(elite ? 'elite' : 'enemy'), elite);
            }
          } else if (event.type === 'upgrade' || event.type === 'evolution') {
            ripple(player.x, player.y, event.at, 80, 0.9, c('halo'));
            burst(player.x, player.y, event.at, c('light'), false);
          }
        }
        if (events.length > 128) events.splice(0, events.length - 128);
      },
      draw(run, view, frameInfo) {
        assertReady();
        const time = frameInfo?.titleTime ?? run.elapsed;
        sceneValues.screen[0] = size.width; sceneValues.screen[1] = size.height;
        sceneValues.screen[2] = canvas.width; sceneValues.screen[3] = canvas.height;
        sceneValues.view[0] = view.x; sceneValues.view[1] = view.y; sceneValues.view[2] = view.scale; sceneValues.view[3] = time;
        sceneValues.keeper[0] = run.player.x; sceneValues.keeper[1] = run.player.y;
        ripples = ripples.filter(e => run.elapsed - e.at < 2.2);
        let waveCount = 0;
        const writeWave = (x: number, y: number, age: number, radius: number, strength: number, color: Color) => {
          const i = waveCount++ * 8;
          rippleData[i] = x; rippleData[i + 1] = y; rippleData[i + 2] = age; rippleData[i + 3] = radius;
          rippleData[i + 4] = color[0]!; rippleData[i + 5] = color[1]!; rippleData[i + 6] = color[2]!; rippleData[i + 7] = strength;
        };
        // A newly started run wakes the field; switching into an older run never replays it.
        if (frameInfo?.titleTime === undefined && run.elapsed < 2.2) writeWave(run.player.x, run.player.y, run.elapsed, run.elapsed * 160, 0.7, c('light'));
        for (const wave of ripples) {
          if (waveCount === bloomTuning.ripples) break;
          const age = run.elapsed - wave.at;
          writeWave(wave.x, wave.y, age, wave.radius * Math.min(1, age / 0.3) + age * 40, wave.strength, wave.color);
        }
        sceneValues.options[2] = waveCount; scene.set(sceneValues);
        rippleBuffer.write(rippleData);
        count = 0;
        events = events.filter(e => run.elapsed - e.at < 1.2);
        for (const event of events) {
          const age = run.elapsed - event.at;
          if (event.type === 'pulse' && age < visualTiming.pulse) {
            const radius = event.radius * (0.15 + 0.85 * age / visualTiming.pulse);
            ring(event.x, event.y, radius, c('pulse'), 1 - age / visualTiming.pulse, 2.8);
            ring(event.x, event.y, radius * 0.94, c('light'), (1 - age / visualTiming.pulse) * 0.4);
          }
          if (event.type === 'enemy-defeated' && event.enemyId === eliteId && age < 0.85) {
            ring(event.x, event.y, 120 * (1 - age / 0.85) + 3, c('elite'), 1 - age / 0.85, 3);
          }
        }
        for (const slot of run.loadout) if (weapons[slot.base].behavior === 'orbit') {
          const at = orbitPosition(run, slot);
          ring(run.player.x, run.player.y, weapons[slot.base].radius, c('halo'), 0.14, 0.6);
          for (let j = 12; j >= 1; j--) {
            const angle = slot.orbitAngle - j * 0.065;
            add(run.player.x + Math.cos(angle) * weapons[slot.base].radius, run.player.y + Math.sin(angle) * weapons[slot.base].radius,
              3, 3, 8, c('halo'), (1 - j / 13) * 0.5);
          }
          add(at.x, at.y, 11, 11, 6, c('halo'), 1, time * 1.5);
        }
        for (const gem of run.gems) {
          const scale = gem.attracted ? 8 : gem.amount > 5 ? 7 : 5;
          add(gem.x, gem.y, scale, scale * 1.3, 5, c('gem'), gem.attracted ? 1 : 0.8, Math.sin(time + gem.x) * 0.2);
          if (gem.attracted) add(gem.x, gem.y, 14, 14, 8, c('gem'), 0.28);
        }
        for (const enemy of run.enemies) {
          const elite = enemies[enemy.kind].elite, observation = observations.get(enemy.id);
          const hit = events.some(e => e.type === 'enemy-hit' && e.enemyId === enemy.id && run.elapsed - e.at < visualTiming.hit);
          const color = c(elite ? 'elite' : 'enemy'); const radius = enemies[enemy.kind].radius;
          const scale = radius / (elite ? 0.55 : 0.46);
          // Velocity-aligned wakes are local shading, not histories that connect reused slots.
          for (let j = 3; j > 0; j--) add(enemy.x - Math.cos(observation.angle) * j * 7, enemy.y - Math.sin(observation.angle) * j * 7,
            radius, radius, 8, color, 0.045 * (4 - j));
          add(enemy.x, enemy.y, scale, scale, elite ? 2 : 1, color, enemy.entryDelay > 0 ? 0.4 : 1,
            observation.angle, enemy.id * 0.7, 0, 0, hit ? 1 : 0);
          if (enemy.health < enemies[enemy.kind].maxHealth) {
            add(enemy.x, enemy.y - radius - 10, radius, 2, 9, c('ground'), 0.9, 0, 0, 1);
            add(enemy.x, enemy.y - radius - 10, radius, 1, 9, color, 1, 0, 0, enemy.health / enemies[enemy.kind].maxHealth);
          }
        }
        for (const entry of run.entries) ring(entry.x, entry.y, 19 + (1 - entry.remaining / run.round.entryWarning) * 5,
          c(enemies[entry.kind].elite ? 'elite' : 'damage'), 0.8);
        for (const projectile of run.projectiles) {
          const shard = projectile.weapon === 'shard';
          add(projectile.x - (shard ? 0 : projectile.dx * 8), projectile.y - (shard ? 0 : projectile.dy * 8),
            shard ? 12 : 22, shard ? 5 : 7, shard ? 4 : 3, c(shard ? 'shard' : 'spark'), 1, Math.atan2(projectile.dy, projectile.dx));
        }
        particles = particles.filter(p => run.elapsed - p.at < p.life);
        for (const p of particles) {
          const age = run.elapsed - p.at, progress = age / p.life;
          add(p.x + Math.cos(p.angle) * age * p.speed, p.y + Math.sin(p.angle) * age * p.speed,
            3 * (1 - progress) + 1, 3 * (1 - progress) + 1, 8, p.color, 1 - progress);
        }
        const keeper = observations.get('keeper');
        const hit = events.some(e => e.type === 'player-hit' && run.elapsed - e.at < visualTiming.hit);
        if (run.player.shield > 0) ring(run.player.x, run.player.y, 23, c('shard'), 0.7);
        add(run.player.x, run.player.y, 35, 35, 0, c(hit ? 'damage' : 'light'), 1, keeper.angle, 0, 0, keeper.moving ? 1 : 0, hit ? 1 : 0);
        if (hit) ring(run.player.x, run.player.y, 20, c('damage'), 1, 3);
        if (count) entityBuffer.write(entityData.subarray(0, count * 16));
        frame(gpu!, f => f.pass(output, pass => { pass.draw(environment!); pass.draw(actors!, { instances: count }); }));
      },
      dispose,
    };
  } catch (error) { dispose(); throw error; }
}
