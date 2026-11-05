import { createImageResource, type ImageBundle } from '../../engine/browser/images.ts';
import { blastImages, validateBlastArt, operatorCel } from './sprite-art.ts';
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
  const artwork = createImageResource(blastImages, validateBlastArt);
  let theme = themes.normal;
  let assets: ImageBundle | undefined, animationTime = 0;
  const playerGait = createGroundGait(), enemyGaits = new Map<number, ReturnType<typeof createGroundGait>>();
  const images = () => assets ?? artwork.images;
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
    const running = assets && pose.moving && !airborne && !motion.matches;
    const image = running ? assets?.[operator === 'nova' ? 'novaRun' : 'boltRun'] : images().operators;
    if (!image) return;
    const {aim,state,runFrame} = operatorCel(airborne,pose.moving,pose.phase,motion.matches,aimX,aimY);
    const painted = theme.finish === 'painted';
    const row = painted ? (operator === 'bolt' ? 3 : 0) + (airborne ? 2 : firing && !motion.matches ? 1 : 0) : (operator === 'bolt' ? 4 : 0) + state;
    ctx.save(); ctx.translate(Math.round(x+9),Math.round(y+32)); ctx.scale(facing,1);
    const cell = painted ? 192 : assets ? 128 : 64;
    ctx.drawImage(image,(running ? runFrame : aim)*cell,(running ? aim : row)*cell,cell,cell,-20,-45,48,48);
    if (firing && !motion.matches) {
      const angle = Math.atan2(aimY,aimX*facing);
      if (assets) {
        ctx.save(); ctx.translate(Math.cos(angle)*19,-16+Math.sin(angle)*19); ctx.rotate(angle);
        object(13,0,-5,14,10); ctx.restore();
      } else rect(Math.cos(angle)*18-2,-11+Math.sin(angle)*18,5,3,'#fff0b4');
    }
    ctx.restore();
  }
  function object(frame: number,x: number,y: number,w: number,h: number,cells=1) {
    const image = images().objects;
    if (!image) return;
    const cell = theme.finish === 'painted' ? 192 : 128;
    if (assets) ctx.drawImage(image,frame%4*cell,Math.floor(frame/4)*cell,cell,cell,x,y,w,h);
    else ctx.drawImage(image,frame*64,0,64*cells,64,x,y,w,h);
  }

  function background(v: BlastView, run: Run, time: number) {
    const foundry = run.missionIndex > 0;
    if (assets?.backdrop) {
      const sourceWidth = assets.backdrop.naturalWidth, sourceHeight = assets.backdrop.naturalHeight / 2;
      const height = Math.max(512, 675 - v.y), width = Math.max(height * sourceWidth / sourceHeight, v.width), y = 675 - v.y - height;
      rect(0, 0, v.width, v.height, foundry ? theme.foundrySky[0] : theme.sky[0]);
      const travel = Math.max(1, run.mission.columns * TILE - v.width);
      const x = -clamp(v.x / travel, 0, 1) * (width - v.width);
      ctx.drawImage(assets.backdrop, 0, foundry ? sourceHeight : 0, sourceWidth, sourceHeight, Math.round(x), Math.round(y), width, height);
      return;
    }
    const gradient = ctx.createLinearGradient(0, 0, 0, v.height);
    const sky = foundry ? theme.foundrySky : theme.sky;
    gradient.addColorStop(0, sky[0]); gradient.addColorStop(.62, sky[1]); gradient.addColorStop(1, sky[2]);
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, v.width, v.height);
    const sunX = v.width * .78 - v.x * .025, sunY = v.height * .23;
    rect(sunX - 29, sunY - 24, 58, 48, theme.sun); rect(sunX - 24, sunY - 30, 48, 60, theme.sun);
    rect(sunX - 34, sunY + 9, 68, 3, foundry ? '#745649' : '#9b7d64');
    for (let layer = 0; layer < 3; layer++) {
      const factor = [.12, .28, .48][layer]!, spacing = [200, 290, 360][layer]!, base = 655 - v.y + layer * 8;
      const start = Math.floor(v.x * factor / spacing) - 1, end = start + Math.ceil(v.width / spacing) + 3;
      for (let i = start; i < end; i++) {
        const x = i * spacing - v.x * factor, h = (layer === 2 ? 105 : 140) + ((i * 37 + layer * 21) % 5 + 5) % 5 * 22;
        const facade = spacing * (layer === 2 ? .58 : .72);
        const color = theme.skyline[layer]!;
        rect(x, base - h, facade, h + v.height, color);
        if (layer > 0) {
          rect(x + 30, base - h - 90, 22, 100, color); rect(x + 27, base - h - 90, 28, 7, '#ba8c6b');
          rect(x + 85, base - h - 42, 12, 60, color);
          for (let row = 0; row < 3; row++) {
            rect(x + 8, base - h + 37 + row * 27, facade - 16, 2, '#8e9d7d22');
            for (let col = 0; col < 5; col++) rect(x + 14 + col * 28, base - h + 23 + row * 27, 9, 6, (i + row + col) % 4 ? '#b3aa7d22' : '#d4af7044');
          }
          rect(x + facade - 20, base - h + 23, 4, h - 25, '#82907933');
          line(x + facade - 23, base - h + 23, x + facade - 23, base - 10, '#172e3877', 2);
          // Blocky smoke ribbons, deterministic and cosmetic only.
          for (let puff = 0; puff < 5; puff++) {
            const drift = motion.matches ? 0 : Math.sin(time * .28 + i + puff) * 9;
            rect(x + 15 + puff * 11 + drift, base - h - 105 - puff * 15, 40 + puff * 7, 13, layer === 1 ? '#69706a44' : '#8c877044');
          }
          for (let j = 0; j < 5; j++) { rect(x + 12 + j * 28, base - 50, 12, 4, '#d5b37344'); rect(x + 12 + j * 28, base - 70, 12, 4, '#d5b37322'); }
          rect(x, base - h + 15, facade, 3, '#a5a67d22');
        }
        if (layer === 2 && i % 2 === 0) {
          rect(x + 190, base - 230, 7, 220, '#263b43'); rect(x + 122, base - 231, 142, 5, '#263b43');
          line(x + 125, base - 229, x + 194, base - 270, '#263b43', 3); line(x + 194, base - 270, x + 262, base - 229, '#263b43', 3);
          line(x + 135, base - 228, x + 135, base - 165, '#6b7668'); rect(x + 129, base - 165, 12, 8, '#b99b68');
        }
      }
    }
    // Long utility cables tie the industrial skyline together.
    for (let i = 0; i < 3; i++) line(0, 170 - v.y * .2 + i * 8, v.width, 195 - v.y * .2 + i * 8, '#1d373c66');
    for (let i = 0; i < 16; i++) {
      const x = ((i * 87 - v.x * .08 + (motion.matches ? 0 : time * (i % 2 ? 4 : -3))) % v.width + v.width) % v.width;
      const y = (i * 97 + (motion.matches ? 0 : time * (theme.weather === 'snow' ? 18 : 5))) % v.height;
      rect(x, y, 1, 1, theme.weather === 'snow' ? '#e5f5ffbb' : i % 3 === 0 ? '#ffd39088' : '#e1cc9633');
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
        object(structure ? 8 : armored ? damaged ? 12 : 10 : damaged ? 11 : 9, r.x, r.y, TILE, TILE);
        if (structure && Math.floor(i / t.columns) > 27) rect(r.x, r.y, TILE, TILE, '#10273766');
        if (i >= t.columns && !t.material[i - t.columns]) rect(r.x, r.y, TILE, 2, structure ? theme.ledge : '#e4bc7c');
        return;
      }
      rect(r.x, r.y, TILE, TILE, structure ? theme.structure[0] : armored ? theme.armor[0] : theme.masonry[0]);
      rect(r.x + 1, r.y + 2, TILE - 2, TILE - 3, structure ? theme.structure[1] : armored ? theme.armor[1] : theme.masonry[1]);
      rect(r.x + 2, r.y + TILE - 5, TILE - 4, 3, structure ? '#1c353e' : '#5d5e50');
      if (structure) { rect(r.x + 3, r.y + 4, 2, 2, '#748479'); rect(r.x + 19, r.y + 18, 2, 2, '#182b36'); line(r.x + 6, r.y + 6, r.x + 18, r.y + 18, '#3a5356'); }
      else {
        rect(r.x + 3, r.y + 5, 7, 2, '#d1b383'); rect(r.x + 14, r.y + 13, 6, 2, '#736c53');
        if (armored) { line(r.x + 4, r.y + 5, r.x + 19, r.y + 19, '#604e43', 3); line(r.x + 19, r.y + 5, r.x + 4, r.y + 19, '#604e43', 3); }
        if (t.health[i]! < materialHealth[m] * .75) { line(r.x + 11, r.y, r.x + 7, r.y + 12, '#302f30'); line(r.x + 7, r.y + 12, r.x + 16, r.y + 19, '#302f30'); }
      }
      if (i >= t.columns && !t.material[i - t.columns]) { rect(r.x, r.y, TILE, 3, structure ? theme.ledge : '#d5ba80'); if (structure && Math.floor(i / t.columns) >= 27) for (let j = 0; j < 3; j++) rect(r.x + j * 8, r.y + 3, 4, 3, '#d0ad63'); }
    });
    run.mission.checkpoints.forEach((cp, i) => {
      object(i <= run.checkpoint ? 4 : 3, cp.x-8,cp.y-25,42,58);
      text(i <= run.checkpoint ? 'SUPPLIED' : 'SUPPLY', cp.x + 10, cp.y - 28, '#c6ddb9', 6, 'center');
    });
    for (const r of run.relays) {
      object(r.health > 0 ? 0 : 1,r.x-8,r.y-8,43,42);
      text(r.health > 0 ? 'POWER RELAY' : 'OFFLINE',r.x+14,r.y-18,'#ffd58a',6,'center');
    }
    for (const b of run.barrels) if (!b.detonated && b.x > v.x - 40 && b.x < v.x + v.width + 40) {
      object(2,b.x-3,b.y-3,24,30);
    }
    const rescue = run.mission.rescue;
    if (rescue && !run.rescued) {
      human(rescue.x, rescue.y, 'bolt', -1, { phase: 0, moving: false }, false);
      object(5,rescue.x-8,rescue.y-10,38,42);
      text('BOLT', rescue.x + 10, rescue.y - 28, '#ffe09a', 8, 'center'); text('REACH TO RESCUE', rescue.x + 10, rescue.y - 17, '#d7c69c', 6, 'center');
    }
    const exit = run.mission.exit, ready = readyToExtract(run);
    rect(exit.x - 14, 648, exit.w + 28, 8, '#182f3a');
    for (let i = 0; i < 12; i++) rect(exit.x - 14 + i * 17, 649, 8, 4, ready ? '#b2e6b4' : '#bba269');
    const shipX = exit.x + exit.w / 2, shipY = 593 - (run.extraction > 0 ? Math.pow(run.extraction, 2) * 25 : Math.sin(time * 2) * 2);
    object(6,Math.round(shipX)-64,Math.round(shipY)-35,128,64,2);
    text(ready ? 'EXTRACT ↑' : 'EXTRACTION / LOCKED', shipX, 549, ready ? '#c8f7c0' : '#dabd8e', 8, 'center');
    for (const e of run.enemies) {
      if (e.health <= 0 || e.x < v.x - 90 || e.x > v.x + v.width + 90) continue;
      ctx.save(); ctx.translate(Math.round(e.x + e.w / 2), Math.round(e.y)); ctx.scale(e.facing, 1);
      const bastion = e.kind === 'bastion';
      const row = bastion ? 2 : e.kind === 'heavy' ? 1 : 0;
      let gait = enemyGaits.get(e.id);
      if (!gait) { gait = createGroundGait(); enemyGaits.set(e.id, gait); }
      const pose = gait.observe(e, dt);
      const frame = !motion.matches && pose.moving ? pose.phase < .5 ? 1 : 2 : 0;
      const image = images().enemies, cell = theme.finish === 'painted' ? 192 : assets ? 128 : 64;
      if (e.flash > 0 && !motion.matches) {ctx.shadowColor='#fff0b4';ctx.shadowBlur=6;}
      if (image) ctx.drawImage(image,frame*cell,row*cell,cell,cell,bastion?-36:-18,bastion?-10:-1,bastion?72:36,bastion?64:34);
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
        if (assets) object(7, shot.x - 5, shot.y - 5, 10, 10);
        else { rect(shot.x - 3, shot.y - 3, 6, 6, '#e4b470'); rect(shot.x - 1, shot.y - 5, 2, 2, '#fdedb4'); }
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
        if (assets) object(14, ring.x - fire, ring.y - fire, fire * 2, fire * 2);
        else {
          rect(ring.x - fire, ring.y - fire * .55, fire * 2, fire * 1.1, '#e78548');
          rect(ring.x - fire * .55, ring.y - fire, fire * 1.1, fire * 2, '#f7b55b');
          rect(ring.x - fire * .7, ring.y - fire * .7, fire * 1.4, fire * 1.4, '#f7b55b');
          rect(ring.x - fire * .38, ring.y - fire * .45, fire * .76, fire * .9, '#fff0ac');
        }
      }
      ctx.globalAlpha = ring.life / .38; ctx.strokeStyle = progress < .25 ? '#fff2b7' : '#f6b56b'; ctx.lineWidth = Math.max(1, 8 * (1 - progress));
      ctx.beginPath(); ctx.arc(ring.x, ring.y, r, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    }
    for (const p of particles) {
      ctx.globalAlpha = Math.min(1, p.life / p.max * 1.5);
      if (p.smoke && assets) { const size = 12 + (1 - p.life / p.max) * 18; object(15,p.x-size/2,p.y-size/2,size,size); }
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
      if (disposed) return;
      const dt = Math.max(0, Math.min(.05, last === undefined ? 0 : time - last)); last = time;
      const animate = playing && run.status === 'active';
      if (animate) {
        animationTime += dt;
        for (const p of particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.smoke ? -12 : 180) * dt; }
        particles = particles.filter(p => p.life > 0); rings.forEach(r => { r.life -= dt; }); rings = rings.filter(r => r.life > 0); shake *= Math.exp(-12 * dt);
      }
      const w = Math.round(host.width * host.ratio), h = Math.round(host.height * host.ratio);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; camera = undefined; }
      ctx.imageSmoothingEnabled = theme.finish === 'painted';
      ctx.imageSmoothingQuality = 'high';
      const target = blastView(host.width, host.height, run.mission, run.player);
      if (!camera) camera = target;
      else { const ease = 1 - Math.exp(-12 * dt); camera = { ...target, x: camera.x + (target.x - camera.x) * ease, y: camera.y + (target.y - camera.y) * ease }; }
      const v = camera;
      const sceneTime = motion.matches ? 0 : run.elapsed === 0 ? time : animationTime;
      ctx.setTransform(v.scale * host.ratio, 0, 0, v.scale * host.ratio, 0, 0); background(v, run, sceneTime);
      ctx.save(); ctx.translate(-Math.round(v.x) + (motion.matches ? 0 : Math.sin(sceneTime * 83) * shake), -Math.round(v.y) + (motion.matches ? 0 : Math.cos(sceneTime * 71) * shake * .5));
      world(run, v, sceneTime, playing, animate ? dt : 0); ctx.restore();
      if (run.collapse >= 0 && run.extraction === 0 && !motion.matches) { ctx.fillStyle = `rgba(221,94,57,${.018 + Math.max(0, Math.sin(sceneTime * 5)) * .025})`; ctx.fillRect(0, 0, v.width, v.height); }
      // Subtle scanline texture respects the pixel artwork without a postprocessing pass.
      if (theme.finish === 'pixel') {
        ctx.fillStyle = '#0719230b'; for (let y = 1; y < v.height; y += 3) ctx.fillRect(0, y, v.width, 1);
      }
    },
    dispose() { if (disposed) return; disposed = true; artwork.dispose(); particles = []; rings = []; canvas.remove(); canvas.width = canvas.height = 1; },
  };
}
