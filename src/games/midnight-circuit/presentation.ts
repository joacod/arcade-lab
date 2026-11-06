import { createImageResource, type ImageBundle } from '../../engine/browser/images.ts';
import { normalSprites, validateCircuitSprites, drawCircuitFighter, type FighterAtlas } from './sprite-art.ts';
import { createGait, fighterFrame } from './animation.ts';
import { attacks } from './content.ts';
import { attackPhase, attackWarning, stageOf, type Actor, type BrawlerEvent, type Run } from './game.ts';
import type { Screen } from './ui.ts';
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export function circuitView(width: number, height: number, run: Run) {
  const scale = Math.min(width / 960, height / 560), w = width / scale, h = height / scale;
  const encounter = stageOf(run).encounters[run.encounter];
  const center = run.gated && encounter ? (encounter.left + encounter.right) / 2 : run.player.x + 160;
  return { scale, width: w, height: h, x: clamp(center - w / 2, 0, Math.max(0, stageOf(run).width - w)), ground: h * .58 };
}
/** Local artwork replaces visual roles while sharing projection, gait, warnings and event effects. */
export interface CircuitArtwork {
  readonly mode: 'assets' | 'quality';
  readonly fighterAtlas?: FighterAtlas;
  scenery(ctx: CanvasRenderingContext2D, view: ReturnType<typeof circuitView>, run: Run, time: number, reducedMotion: boolean): void;
  pickup(ctx: CanvasRenderingContext2D, pickup: Run['pickups'][number], ground: number, time: number): void;
}
interface Particle { x: number; lane: number; z: number; vx: number; vy: number; vz: number; life: number; max: number; color: string }
interface Ring { x: number; lane: number; life: number; strength: number; color: string }
export function createPresentation(surface: HTMLElement, artwork?: CircuitArtwork, images?: ImageBundle) {
  const canvas = document.createElement('canvas'); canvas.className = 'circuit-canvas';
  const context = canvas.getContext('2d'); if (!context) throw new Error('Canvas 2D is unavailable.');
  const ctx = context; surface.append(canvas);
  const baseline = images ? undefined : createImageResource(normalSprites, validateCircuitSprites);
  const sprites = () => images ?? baseline!.images;
  const gait = createGait(artwork?.fighterAtlas?.strides);
  canvas.dataset.renderer = artwork?.mode ?? 'canvas';
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let disposed = false, camera: number | undefined, last: number | undefined, shake = 0;
  let particles: Particle[] = [], rings: Ring[] = [];
  function rect(x: number, y: number, w: number, h: number, color: string | CanvasGradient, radius = 0) {
    ctx.fillStyle = color; if (!radius) ctx.fillRect(x, y, w, h);
    else { ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fill(); }
  }
  function line(points: readonly number[], color: string, width = 2) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
    for (let i = 0; i < points.length; i += 2) { if (i === 0) ctx.moveTo(points[i]!, points[i + 1]!); else ctx.lineTo(points[i]!, points[i + 1]!); }
    ctx.stroke();
  }
  function ellipse(x: number, y: number, rx: number, ry: number, color: string) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  }
  function glow(x: number, y: number, r: number, color: string) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, color); g.addColorStop(1, '#07132300');
    rect(x - r, y - r, r * 2, r * 2, g);
  }
  function text(value: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'left') {
    ctx.font = `bold ${size}px monospace`; ctx.textAlign = align; ctx.fillStyle = color; ctx.fillText(value, x, y); ctx.textAlign = 'left';
  }
  function neon(value: string, x: number, y: number, color: string, size = 22) {
    ctx.save(); ctx.shadowBlur = 12; ctx.shadowColor = color; text(value, x, y, size, color); ctx.restore();
  }
  function scenery(view: ReturnType<typeof circuitView>, run: Run, time: number) {
    const { width: w, height: h, ground: g, x: cam } = view, station = stageOf(run).environment === 'station';
    const online = run.finale > 0 || run.status === 'victory';
    if (artwork) artwork.scenery(ctx, view, run, time, motion.matches);
    else {
      rect(0, 0, w, h, '#172936');
      // A quiet, flat baseline: silhouette skyline, broad facades and an open road.
      for (let i = Math.floor(cam * .2 / 180) - 1; i * 180 - cam * .2 < w; i++) {
        const x = i * 180 - cam * .2, bh = 90 + ((i * 71) % 130 + 130) % 130;
        rect(x, g - 170 - bh, 163, bh + 170, '#213b47');
      }
      for (let i = Math.floor(cam / 420) - 1; i * 420 - cam < w; i++) {
        const x = i * 420 - cam;
        rect(x + 5, g - 220, 410, 220, '#2c454b');
        rect(x + 22, g - 198, 375, 30, '#19313c');
        text(station ? 'CENTRAL GRID' : 'NIGHT DISTRICT', x + 40, g - 177, 13, '#9eac9f');
        rect(x + 24, g - 150, 370, 138, '#213941');
        if (station) for (let j = 0; j < 3; j++) {
          rect(x + 49 + j * 112, g - 122, 74, 107, '#526963');
          line([x + 49 + j * 112, g - 87, x + 123 + j * 112, g - 87], '#849282', 3);
        } else for (let j = 0; j < 4; j++) {
          rect(x + 40 + j * 87, g - 132, 65, 90, online ? '#b9bd96' : '#506f70');
        }
      }
      rect(0, g, w, h - g, '#24383f');
      rect(0, g - 3, w, 6, '#6a8079');
      line([0, g + 181, w, g + 181], '#83908955', 2);
    }
    const encounter = stageOf(run).encounters[run.encounter];
    // Encounters hold the camera and movement limits, without fictional fences across the road.
    if (!run.gated && run.cleared > 0 && encounter && !run.finale) {
      text('GO →', w - 88, g + 82, 23, '#bcf4da', 'center');
    }
    if (!encounter && !run.finale && run.status !== 'victory') {
      const x = stageOf(run).width - 140 - cam; glow(x, g + 40, 160, '#78f8db33');
      neon('POWER STATION →', x - 80, g - 60, '#9afadf', 15);
    }
  }
  function body(a: Actor, time: number, reflection = false) {
    const frame = fighterFrame(a,gait.get(a.id),artwork?.fighterAtlas?.walk);
    drawCircuitFighter(ctx,sprites(),a,frame,time,reflection,motion.matches,artwork?.fighterAtlas);
    if (a.attack && attackPhase(a.attack) === 'active') {
      ctx.save();ctx.translate(0,-a.elevation);ctx.scale(a.facing,1);
      ctx.strokeStyle=a.kind==='player'?'#b5f7db':'#ffb784';ctx.lineWidth=3;
      ctx.beginPath();ctx.ellipse(30,-55,50,35,-.2,-.9,1);ctx.stroke();ctx.restore();
    }
    if (a.kind === 'warden' && a.attack && attackPhase(a.attack) === 'recovery') text('OPEN',0,-210,9,'#a3ffdc','center');
  }
  function telegraph(a: Actor, ground: number) {
    const s = a.attack, area = attackWarning(a); if (!s || !area || a.kind === 'player') return;
    const phase = attackPhase(s), d = attacks[s.kind];
    const active = phase === 'active', color = artwork ? active ? '#ffe7af' : '#ff9976' : active ? '#ffe7af' : '#f59a9f';
    const x = a.x, y = ground + a.lane;
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash(active ? [] : [8, 5]);
    ctx.globalAlpha = active ? .9 : .6 + .35 * Math.min(1, s.time / d.startup);
    if (area.shape === 'ellipse') {
      ellipse(area.x, y, area.width / 2, area.depth / 2, '#e86e8b1c');
      ctx.beginPath(); ctx.ellipse(area.x, y, area.width / 2, area.depth / 2, 0, 0, Math.PI * 2); ctx.stroke();
      text('JUMP / STEP OUT', area.x, y + area.depth / 2 + 17, 9, color, 'center');
    } else {
      const start = area.x - area.width / 2;
      rect(start, y - area.depth / 2, area.width, area.depth, '#e86e8b19'); ctx.strokeRect(start, y - area.depth / 2, area.width, area.depth);
      if (s.kind === 'charge') text(a.facing > 0 ? 'CHARGE →' : '← CHARGE', x + a.facing * 140, y - d.lane - 10, 9, color, 'center');
    }
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    if (phase === 'startup') {
      ellipse(x, y - (a.kind === 'warden' ? 216 : a.kind === 'bruiser' ? 171 : 146), 12, 12, '#302139');
      text('!', x, y - (a.kind === 'warden' ? 211 : a.kind === 'bruiser' ? 166 : 141), 18, '#ffd7bc', 'center');
    }
    ctx.restore();
  }
  return {
    prepare: () => baseline?.prepare() ?? Promise.resolve(),
    reset() { gait.reset(); particles = []; rings = []; camera = undefined; last = undefined; shake = 0; },
    consume(events: readonly BrawlerEvent[]) {
      for (const e of events) {
        const impact = e.type === 'hit' || e.type === 'damage' || e.type === 'ko';
        if (impact && !motion.matches) shake = Math.max(shake, Math.min(5, e.strength * 3));
        if (impact || e.type === 'pickup' || e.type === 'victory' || e.type === 'clear') {
          const color = e.type === 'damage' ? '#f797ac' : e.type === 'pickup' || e.type === 'victory' ? '#8effdb' : '#ffe6b1';
          if (rings.length < 12) rings.push({ x: e.x, lane: e.lane, life: .3, strength: e.strength, color });
          for (let i = 0; i < (motion.matches ? 0 : e.type === 'victory' || e.type === 'ko' && e.strength >= 3 ? 48 : impact ? 14 : 20) && particles.length < 150; i++) {
            const angle = i * 2.4, power = 60 + i % 5 * 32;
            particles.push({ x: e.x, lane: e.lane, z: impact ? 60 : 20, vx: Math.cos(angle) * power, vy: Math.sin(angle) * power * .3,
              vz: 60 + Math.abs(Math.sin(angle)) * power, life: .35 + i % 4 * .12, max: .72, color });
          }
        }
      }
    },
    draw(run: Run, size: { width: number; height: number; ratio: number }, screen: Screen, now: number) {
      if (disposed) return;
      const width = Math.max(1, Math.round(size.width * size.ratio)), height = Math.max(1, Math.round(size.height * size.ratio));
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; camera = undefined; }
      const dt = last === undefined || screen === 'paused' || screen === 'title' ? 0 : clamp(now - last, 0, .05); last = now;
      gait.observe(run);
      const view = circuitView(size.width, size.height, run);
      camera = camera === undefined ? view.x : camera + (view.x - camera) * (motion.matches ? 1 : 1 - Math.exp(-7 * dt)); view.x = camera;
      ctx.setTransform(size.ratio * view.scale, 0, 0, size.ratio * view.scale, 0, 0); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      scenery(view, run, run.elapsed);
      ctx.save(); ctx.translate(-view.x + (motion.matches ? 0 : Math.sin(run.elapsed * 83) * shake), motion.matches ? 0 : Math.cos(run.elapsed * 67) * shake * .5);
      shake = Math.max(0, shake - dt * 26);
      for (const a of run.enemies) telegraph(a, view.ground);
      for (const pickup of run.pickups) if (!pickup.collected) {
        const x = pickup.x, y = view.ground + pickup.lane;
        ellipse(x, y, 22, 6, '#071525aa'); glow(x, y - 12, 42, '#7bffd730');
        if (artwork) artwork.pickup(ctx, pickup, view.ground, run.elapsed);
        else if (sprites().repair) ctx.drawImage(sprites().repair!,x-21,y-38,42,42);
        text(`+${pickup.health}`, x, y - 33, 10, '#adffdb', 'center');
      }
      const actors = [run.player, ...run.enemies].filter(a => a.health > 0 || a.death > 0).sort((a, b) => a.lane - b.lane || a.id - b.id);
      // Reflections and shadows stay on the ground, independently of jump elevation.
      ctx.save(); ctx.beginPath(); ctx.rect(view.x, view.ground, view.width, view.height); ctx.clip();
      for (const a of artwork ? actors : []) {
        ctx.save(); ctx.globalAlpha = artwork?.mode === 'quality' ? .14 : .07; ctx.translate(a.x, view.ground + a.lane + 4); ctx.scale(1, -.45); body(a, run.elapsed, true); ctx.restore();
      }
      ctx.restore();
      for (const a of actors) {
        ellipse(a.x, view.ground + a.lane + 1, a.radius * 1.4, a.radius * .3, '#030e1b99');
        ctx.save(); ctx.translate(a.x, view.ground + a.lane); body(a, run.elapsed); ctx.restore();
        if (a.kind !== 'player' && a.kind !== 'warden' && a.health > 0 && a.health < a.maxHealth) {
          rect(a.x - 20, view.ground + a.lane - (a.kind === 'bruiser' ? 159 : 135), 40, 3, '#0a1525');
          rect(a.x - 20, view.ground + a.lane - (a.kind === 'bruiser' ? 159 : 135), 40 * a.health / a.maxHealth, 3, '#e2a5aa');
        }
      }
      for (const ring of rings) {
        ring.life -= dt; ctx.save(); ctx.globalAlpha = Math.max(0, ring.life / .3); ctx.strokeStyle = ring.color; ctx.lineWidth = 2;
        const radius = 10 + (1 - ring.life / .3) * 45 * ring.strength;
        ctx.beginPath(); ctx.ellipse(ring.x, view.ground + ring.lane - 55, radius, radius * .7, -.2, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      }
      rings = rings.filter(r => r.life > 0);
      for (const p of particles) {
        p.life -= dt; p.x += p.vx * dt; p.lane += p.vy * dt; p.z += p.vz * dt; p.vz -= 430 * dt;
        ctx.globalAlpha = Math.max(0, p.life / p.max); line([p.x, view.ground + p.lane - p.z, p.x - p.vx * .025, view.ground + p.lane - p.z + p.vz * .025], p.color, 2.5);
      }
      ctx.globalAlpha = 1; particles = particles.filter(p => p.life > 0); ctx.restore();
      if (run.respawn > 0) { text('GET UP, ROOK.', view.width / 2, view.ground - 150, 23, '#adffe0', 'center'); }
      if (run.finale > 0 || run.status === 'victory') {
        glow(view.width * .65, view.ground * .4, 450, '#a1ffe32b');
        text('GRID ONLINE', view.width / 2, view.ground - 205, 28, '#bcffe5', 'center');
        text('THE CITY REMEMBERS THE LIGHT.', view.width / 2, view.ground - 174, 10, '#f8ddb5', 'center');
      }
      if (screen === 'title' && size.width > 850) {
        ctx.save(); ctx.translate(view.width * .77, view.ground + 85); ctx.scale(2.55, 2.55);
        glow(0, -65, 120, '#5dedd62b'); body({ ...run.player, x: 0, lane: 0, facing: -1 }, 0); ctx.restore();
        text('ROOK / STREET CIRCUIT', view.width * .77, view.ground + 125, 11, '#9de5da', 'center');
      }
      // A subtle border treatment gives the rain-soaked scene a printed arcade-poster finish.
      const shade = ctx.createLinearGradient(0, 0, 0, view.height); shade.addColorStop(0, '#060d1b55'); shade.addColorStop(.3, '#060d1b00'); shade.addColorStop(1, '#060d1b55'); rect(0, 0, view.width, view.height, shade);
    },
    dispose() { baseline?.dispose(); if (disposed) return; disposed = true; particles = []; rings = []; canvas.remove(); canvas.width = canvas.height = 1; },
  };
}
