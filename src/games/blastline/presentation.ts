import { type ImageBundle } from '../../engine/browser/images.ts';
import { operatorFrame, type ObjectRole } from './sprite-art.ts';
import { themes, type BlastTheme } from './themes.ts';
import { TILE, limits, materialHealth, type Mission, type Operator } from './content.ts';
import { forTiles } from './terrain.ts';
import { readyToExtract } from './game.ts';
import type { BlastEvent, Player, Run } from './state.ts';
import { createGroundGait, type GroundPose } from './animation.ts';
export interface BlastView { x: number; y: number; width: number; height: number; scale: number }
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
export function blastView(width: number, height: number, mission: Mission, player: Pick<Player, 'x' | 'y' | 'vx'>): BlastView {
  const scale = Math.max(.05, Math.min(width / (width < 600 ? 480 : 620), height / 350)), w = width / scale, h = height / scale;
  return { scale, width: w, height: h,
    x: clamp(player.x + 9 + clamp(player.vx * .25, -50, 50) - w * .4, 0, Math.max(0, mission.columns * TILE - w)),
    y: h >= mission.rows * TILE ? (mission.rows * TILE - h) / 2 : clamp(player.y - h * .62, 0, mission.rows * TILE - h) };
}
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; smoke: boolean }
interface Ring { x: number; y: number; life: number; radius: number }
export function createPresentation(surface: HTMLElement) {
  const canvas = document.createElement('canvas'); canvas.className = 'blast-canvas'; canvas.setAttribute('aria-hidden', 'true');
  const context = canvas.getContext('2d', { alpha: false }); if (!context) throw new Error('Canvas 2D is unavailable.');
  const ctx = context; surface.prepend(canvas);
  let theme = themes.arcade;
  let assets: ImageBundle | undefined, animationTime = 0;
  const playerGait = createGroundGait(), enemyGaits = new Map<number, ReturnType<typeof createGroundGait>>();
  const images = () => assets ?? {};
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let particles: Particle[] = [], rings: Ring[] = [], camera: BlastView | undefined, last: number | undefined, shake = 0, disposed = false, sequence = 0;
  const rect = (x: number, y: number, w: number, h: number, color: string) => { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h)); };
  function line(x: number, y: number, x2: number, y2: number, color: string, width = 1) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(Math.round(x), Math.round(y)); ctx.lineTo(Math.round(x2), Math.round(y2)); ctx.stroke();
  }
  function text(value: string, x: number, y: number, color = '#e5d4b2', size = 7, align: CanvasTextAlign = 'left') {
    ctx.font = `bold ${size}px monospace`; ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(value, Math.round(x), Math.round(y)); ctx.textAlign = 'left';
  }
  function human(x: number, y: number, operator: Operator, facing: number, pose: GroundPose, airborne: boolean, aimX = 1, aimY = 0, firing = false) {
    const frame = operatorFrame(theme.art, operator, airborne, pose.moving, pose.phase, motion.matches, aimX, aimY, firing);
    const image = images()[frame.image];
    if (!image) return;
    const { origin, draw } = theme.art.operators;
    ctx.save(); ctx.translate(Math.round(x + origin[0]), Math.round(y + origin[1])); ctx.scale(facing, 1);
    ctx.drawImage(image, ...frame.rect, ...draw);
    if (firing && !motion.matches) {
      const angle = Math.atan2(aimY,aimX*facing);
      if (assets) {
        ctx.save(); ctx.translate(Math.cos(angle)*19,-16+Math.sin(angle)*19); ctx.rotate(angle);
        object('muzzle',0,-5,14,10); ctx.restore();
      }
    }
    ctx.restore();
  }
  function object(role: ObjectRole, x: number, y: number, w: number, h: number) {
    const image = images().objects, frame = theme.art.objects[role];
    if (image && frame) ctx.drawImage(image, ...frame, x, y, w, h);
  }

  function background(v: BlastView, run: Run) {
    const foundry = run.mission.environment === 'foundry';
    if (assets?.backdrop) {
      const source = theme.art.backdrops![run.mission.environment];
      const [, , sourceWidth, sourceHeight] = source;
      const height = Math.max(512, 675 - v.y), width = Math.max(height * sourceWidth / sourceHeight, v.width), y = 675 - v.y - height;
      rect(0, 0, v.width, v.height, foundry ? theme.foundrySky[0] : theme.sky[0]);
      const travel = Math.max(1, run.mission.columns * TILE - v.width);
      const x = -clamp(v.x / travel, 0, 1) * (width - v.width);
      ctx.drawImage(assets.backdrop, ...source, Math.round(x), Math.round(y), width, height);
      return;
    }
  }
  function world(run: Run, v: BlastView, time: number, playing: boolean, dt: number) {
    const t = run.terrain;
    for (const sign of run.mission.signs) {
      if (sign.x + 280 < v.x || sign.x > v.x + v.width) continue;
      rect(sign.x - 8, sign.y - 18, Math.max(170, sign.text.length * 6.2 + 16), 37, '#182e36d9');
      rect(sign.x - 8, sign.y - 18, 3, 37, '#f7b860');
      text(sign.text, sign.x, sign.y - 4, '#e6cba0', 9); text(sign.sub, sign.x, sign.y + 9, '#98b4ae', 6);
    }
    forTiles(t, { x: v.x - TILE, y: v.y - TILE, w: v.width + TILE * 2, h: v.height + TILE * 2 }, (i, r) => {
      const m = t.material[i]!, armored = m === 3, structure = m === 1;
      const damaged = t.health[i]! < materialHealth[m] * .75;
      if (assets) {
        rect(r.x, r.y, TILE, TILE, structure ? theme.structure[0] : armored ? theme.armor[0] : theme.masonry[0]);
        object(structure ? 'structure' : armored ? damaged ? 'damagedArmor' : 'armor' : damaged ? 'damagedBrick' : 'brick', r.x, r.y, TILE, TILE);
        if (structure && Math.floor(i / t.columns) > 27) rect(r.x, r.y, TILE, TILE, '#10273766');
        if (i >= t.columns && !t.material[i - t.columns]) rect(r.x, r.y, TILE, 2, structure ? theme.ledge : '#e4bc7c');
        return;
      }
    });
    run.mission.checkpoints.forEach((cp, i) => {
      object(i <= run.checkpoint ? 'supplied' : 'supply', cp.x-8,cp.y-25,42,58);
      text(i <= run.checkpoint ? 'SUPPLIED' : 'SUPPLY', cp.x + 10, cp.y - 28, '#c6ddb9', 6, 'center');
    });
    for (const r of run.relays) {
      object(r.health > 0 ? 'relay' : 'offlineRelay',r.x-8,r.y-8,43,42);
      text(r.health > 0 ? 'POWER RELAY' : 'OFFLINE',r.x+14,r.y-18,'#ffd58a',6,'center');
    }
    for (const b of run.barrels) if (!b.detonated && b.x > v.x - 40 && b.x < v.x + v.width + 40) {
      object('barrel',b.x-3,b.y-3,24,30);
    }
    const rescue = run.mission.rescue;
    if (rescue && !run.rescued) {
      human(rescue.x, rescue.y, 'bolt', -1, { phase: 0, moving: false }, false);
      object('rescue',rescue.x-8,rescue.y-10,38,42);
      text('BOLT', rescue.x + 10, rescue.y - 28, '#ffe09a', 8, 'center'); text('REACH TO RESCUE', rescue.x + 10, rescue.y - 17, '#d7c69c', 6, 'center');
    }
    const exit = run.mission.exit, ready = readyToExtract(run);
    rect(exit.x - 14, 648, exit.w + 28, 8, '#182f3a');
    for (let i = 0; i < 12; i++) rect(exit.x - 14 + i * 17, 649, 8, 4, ready ? '#b2e6b4' : '#bba269');
    const shipX = exit.x + exit.w / 2, shipY = 593 - (run.extraction > 0 ? Math.pow(run.extraction, 2) * 25 : Math.sin(time * 2) * 2);
    object('extraction',Math.round(shipX)-64,Math.round(shipY)-35,128,64);
    text(ready ? 'EXTRACT ↑' : 'EXTRACTION / LOCKED', shipX, 549, ready ? '#c8f7c0' : '#dabd8e', 8, 'center');
    for (const e of run.enemies) {
      if (e.health <= 0 || e.x < v.x - 90 || e.x > v.x + v.width + 90) continue;
      ctx.save(); ctx.translate(Math.round(e.x + e.w / 2), Math.round(e.y)); ctx.scale(e.facing, 1);
      const bastion = e.kind === 'bastion';
      const { cell, rows, draw } = theme.art.enemies;
      const row = rows[e.kind];
      let gait = enemyGaits.get(e.id);
      if (!gait) { gait = createGroundGait(); enemyGaits.set(e.id, gait); }
      const pose = gait.observe(e, dt);
      const frame = !motion.matches && pose.moving ? pose.phase < .5 ? 1 : 2 : 0;
      const image = images().enemies;
      if (e.flash > 0 && !motion.matches) {ctx.shadowColor='#fff0b4';ctx.shadowBlur=6;}
      if (image) ctx.drawImage(image,frame*cell,row*cell,cell,cell,...draw[e.kind]);
      ctx.restore();
      if (e.warning > 0) {
        const from = { x: e.x + e.w / 2, y: e.y + (bastion ? 22 : 12) };
        ctx.setLineDash([4, 5]); line(from.x, from.y, e.target.x, e.target.y, '#ffb56588'); ctx.setLineDash([]);
        text('!', e.x + e.w / 2, e.y - 10, '#ffe0a0', 12, 'center');
      }
      if (e.health < e.maxHealth || bastion) { rect(e.x, e.y - 7, e.w, 3, '#142a35'); rect(e.x, e.y - 7, e.w * e.health / e.maxHealth, 2, '#efaa6b'); }
    }
    for (const shot of run.projectiles) {
      if (shot.kind === 'grenade') {
        if (assets) object('grenade', shot.x - 5, shot.y - 5, 10, 10);
      }
      else {
        const length = shot.kind === 'rocket' || shot.kind === 'shell' ? 12 : 8, speed = Math.hypot(shot.vx, shot.vy);
        line(shot.x, shot.y, shot.x - shot.vx / speed * length, shot.y - shot.vy / speed * length, shot.friendly ? '#fff2b0' : '#ff9271', shot.radius ? 4 : 2);
        if (shot.radius) rect(shot.x - shot.vx / speed * 12 - 2, shot.y - shot.vy / speed * 12 - 2, 4, 4, '#ee8e59');
      }
    }
    const p = run.player;
    const pose = playerGait.observe(p, dt);
    if (p.health > 0 && run.extraction === 0 && (!playing || p.immune <= 0 || Math.floor(time * 12) % 2 === 0)) human(p.x, p.y, p.operator, p.facing, pose, !p.grounded, p.aimX, p.aimY, p.cooldown > (p.operator === 'nova' ? .055 : .55));
    if (p.health <= 0) text('REDEPLOYING…', p.x + p.w / 2, p.y - 18, '#ffe1ac', 9, 'center');
    for (const ring of rings) {
      const progress = 1 - ring.life / .38, r = ring.radius * (.3 + progress * .7);
      if (!motion.matches && progress < .5) {
        const fire = r * (1 - progress * .7);
        if (assets) object('explosion', ring.x - fire, ring.y - fire, fire * 2, fire * 2);
      }
      ctx.globalAlpha = ring.life / .38; ctx.strokeStyle = progress < .25 ? '#fff2b7' : '#f6b56b'; ctx.lineWidth = Math.max(1, 8 * (1 - progress));
      ctx.beginPath(); ctx.arc(ring.x, ring.y, r, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    }
    for (const p of particles) {
      ctx.globalAlpha = Math.min(1, p.life / p.max * 1.5);
      if (p.smoke && assets) { const size = 12 + (1 - p.life / p.max) * 18; object('smoke',p.x-size/2,p.y-size/2,size,size); }
      else rect(p.x, p.y, p.size + (p.smoke ? (1 - p.life / p.max) * 12 : 0), p.size, p.color);
    }
    ctx.globalAlpha = 1;
  }
  function consume(events: readonly BlastEvent[]) {
    for (const event of events) {
      const blast = event.type === 'explosion', debris = event.type === 'terrain', hit = ['kill', 'death', 'impact', 'hit', 'hurt'].includes(event.type);
      if (!blast && !debris && !hit && event.type !== 'rescue' && event.type !== 'checkpoint') continue;
      if (blast) { shake = Math.min(4, shake + event.strength * 1.6); if (rings.length < 16) rings.push({ x: event.x, y: event.y, life: .38, radius: event.strength * 60 }); }
      const count = motion.matches ? 2 : blast ? 22 : debris ? 5 : 8;
      for (let i = 0; i < count && particles.length < limits.particles; i++) {
        const seed = ++sequence, angle = seed * 2.39996, speed = blast ? 40 + seed % 110 : 20 + seed % 65, smoke = blast && i % 3 === 0;
        const life = smoke ? 1.1 : .3 + seed % 7 * .07;
        particles.push({ x: event.x, y: event.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 35,
          life, max: life, smoke, size: smoke ? 9 : blast ? 3 : 2, color: smoke ? '#58605b' : event.type === 'rescue' || event.type === 'checkpoint' ? '#c5f4b9' : debris ? '#b59e73' : i % 2 ? '#fbb568' : '#ffedaa' });
      }
    }
  }
  return { consume,
    replaceTheme(next: BlastTheme, nextImages?: ImageBundle) {
      const previousTheme = theme, previousImages = assets;
      theme = next; assets = nextImages;
      ctx.reset();
      return () => { theme = previousTheme; assets = previousImages; ctx.reset(); };
    },
    reset() { particles = []; rings = []; camera = undefined; last = undefined; shake = 0; sequence = 0; animationTime = 0; playerGait.reset(); enemyGaits.clear(); },
    draw(run: Run, host: { width: number; height: number; ratio: number }, playing: boolean, time: number) {
      if (disposed || !assets) return;
      const dt = Math.max(0, Math.min(.05, last === undefined ? 0 : time - last)); last = time;
      const animate = playing && run.status === 'active';
      if (animate) {
        animationTime += dt;
        for (const p of particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.smoke ? -12 : 180) * dt; }
        particles = particles.filter(p => p.life > 0); rings.forEach(r => { r.life -= dt; }); rings = rings.filter(r => r.life > 0); shake *= Math.exp(-12 * dt);
      }
      const w = Math.round(host.width * host.ratio), h = Math.round(host.height * host.ratio);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; camera = undefined; }
      ctx.imageSmoothingEnabled = theme.art.smooth;
      ctx.imageSmoothingQuality = 'high';
      const target = blastView(host.width, host.height, run.mission, run.player);
      if (!camera) camera = target;
      else { const ease = 1 - Math.exp(-12 * dt); camera = { ...target, x: camera.x + (target.x - camera.x) * ease, y: camera.y + (target.y - camera.y) * ease }; }
      const v = camera;
      const sceneTime = motion.matches ? 0 : run.elapsed === 0 ? time : animationTime;
      ctx.setTransform(v.scale * host.ratio, 0, 0, v.scale * host.ratio, 0, 0); background(v, run);
      ctx.save(); ctx.translate(-Math.round(v.x) + (motion.matches ? 0 : Math.sin(sceneTime * 83) * shake), -Math.round(v.y) + (motion.matches ? 0 : Math.cos(sceneTime * 71) * shake * .5));
      world(run, v, sceneTime, playing, animate ? dt : 0); ctx.restore();
      if (run.collapse >= 0 && run.extraction === 0 && !motion.matches) { ctx.fillStyle = `rgba(221,94,57,${.018 + Math.max(0, Math.sin(sceneTime * 5)) * .025})`; ctx.fillRect(0, 0, v.width, v.height); }
      // Subtle scanline texture respects the pixel artwork without a postprocessing pass.
      if (theme.finish === 'pixel') {
        ctx.fillStyle = '#0719230b'; for (let y = 1; y < v.height; y += 3) ctx.fillRect(0, y, v.width, 1);
      }
    },
    dispose() { if (disposed) return; disposed = true; particles = []; rings = []; canvas.remove(); canvas.width = canvas.height = 1; },
  };
}
