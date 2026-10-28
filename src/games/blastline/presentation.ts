import { TILE, limits, materialHealth, type Mission, type Operator } from './content.ts';
import { forTiles } from './terrain.ts';
import { readyToExtract } from './game.ts';
import type { BlastEvent, Player, Run } from './state.ts';
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
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let particles: Particle[] = [], rings: Ring[] = [], camera: BlastView | undefined, last: number | undefined, shake = 0, disposed = false, sequence = 0;
  const rect = (x: number, y: number, w: number, h: number, color: string) => { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h)); };
  function line(x: number, y: number, x2: number, y2: number, color: string, width = 1) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(Math.round(x), Math.round(y)); ctx.lineTo(Math.round(x2), Math.round(y2)); ctx.stroke();
  }
  function text(value: string, x: number, y: number, color = '#e5d4b2', size = 7, align: CanvasTextAlign = 'left') {
    ctx.font = `bold ${size}px monospace`; ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(value, Math.round(x), Math.round(y)); ctx.textAlign = 'left';
  }
  function human(x: number, y: number, operator: Operator, facing: number, stride: number, airborne: boolean, aimX = 1, aimY = 0, firing = false) {
    const bolt = operator === 'bolt', suit = bolt ? '#dca54c' : '#6cc7b4', dark = bolt ? '#6d654c' : '#325861';
    ctx.save(); ctx.translate(Math.round(x + 9), Math.round(y + 15)); ctx.scale(facing, 1);
    const step = airborne ? 3 : Math.round(Math.sin(stride) * 3);
    rect(-7, 8, 6, 8 + step, '#152c37'); rect(2, 8, 6, 8 - step, '#152c37');
    rect(-9 - step, 14 + step, 9, 3, '#0b1c28'); rect(1 + step, 14 - step, 10, 3, '#0b1c28');
    rect(-9, -2, 17, 12, dark); rect(-6, -3, 14, 10, suit); rect(-5, 3, 4, 5, '#d9e1c0');
    rect(-11, -1, 4, 11, '#243f46'); rect(-12, 1, 2, 6, '#f2ac62'); // pack
    rect(-7, -13, 15, 11, '#202e36'); rect(-6, -11, 14, 7, '#d6a186');
    rect(-9, -15, 17, 5, dark); rect(-7, -15, 13, 2, suit); rect(1, -10, 9, 3, bolt ? '#ffdb8b' : '#b1fff0');
    rect(-11, -7, 4, 2, '#f37768'); rect(-14, -7 + Math.sin(stride) * 2, 6, 2, '#e98069');
    ctx.save(); ctx.translate(2, 0); ctx.rotate(Math.atan2(aimY, aimX * facing));
    rect(0, -2, 8, 5, suit); rect(5, -2, 5, 5, '#e6b79a');
    rect(7, bolt ? -6 : -3, bolt ? 18 : 19, bolt ? 9 : 5, '#1c303b');
    rect(10, bolt ? -6 : -3, bolt ? 13 : 14, 2, '#8b9c91'); rect(12, 2, 4, 4, dark);
    if (bolt) { rect(23, -6, 3, 9, '#cfc99a'); rect(9, -4, 4, 5, '#ee9c51'); }
    else { rect(14, 1, 4, 5, '#212f35'); rect(24, -2, 4, 2, '#b1bfac'); }
    if (firing) { rect(27, -4, 7, 6, '#ffeaa3'); rect(30, -2, 10, 2, '#fff5ce'); }
    ctx.restore(); ctx.restore();
  }
  function background(v: BlastView, run: Run, time: number) {
    const foundry = run.missionIndex > 0;
    const gradient = ctx.createLinearGradient(0, 0, 0, v.height);
    gradient.addColorStop(0, foundry ? '#202b3a' : '#253f4b'); gradient.addColorStop(.62, foundry ? '#765447' : '#ad8465'); gradient.addColorStop(1, '#293e42');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, v.width, v.height);
    const sunX = v.width * .78 - v.x * .025, sunY = v.height * .23;
    rect(sunX - 29, sunY - 24, 58, 48, '#eccd8c'); rect(sunX - 24, sunY - 30, 48, 60, '#eccd8c');
    rect(sunX - 34, sunY + 9, 68, 3, foundry ? '#745649' : '#9b7d64');
    for (let layer = 0; layer < 3; layer++) {
      const factor = [.12, .28, .48][layer]!, spacing = [200, 290, 360][layer]!, base = 655 - v.y + layer * 8;
      const start = Math.floor(v.x * factor / spacing) - 1, end = start + Math.ceil(v.width / spacing) + 3;
      for (let i = start; i < end; i++) {
        const x = i * spacing - v.x * factor, h = (layer === 2 ? 105 : 140) + ((i * 37 + layer * 21) % 5 + 5) % 5 * 22;
        const facade = spacing * (layer === 2 ? .58 : .72);
        const color = ['#394a50', '#2b4248', '#263c42'][layer]!;
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
      const y = (i * 97 + (motion.matches ? 0 : time * 5)) % v.height;
      rect(x, y, 1, 1, i % 3 === 0 ? '#ffd39088' : '#e1cc9633');
    }
  }
  function world(run: Run, v: BlastView, time: number, playing: boolean) {
    const t = run.terrain;
    for (const sign of run.mission.signs) {
      if (sign.x + 280 < v.x || sign.x > v.x + v.width) continue;
      rect(sign.x - 8, sign.y - 18, Math.max(170, sign.text.length * 6.2 + 16), 37, '#182e36d9');
      rect(sign.x - 8, sign.y - 18, 3, 37, '#f7b860');
      text(sign.text, sign.x, sign.y - 4, '#e6cba0', 9); text(sign.sub, sign.x, sign.y + 9, '#98b4ae', 6);
    }
    forTiles(t, { x: v.x - TILE, y: v.y - TILE, w: v.width + TILE * 2, h: v.height + TILE * 2 }, (i, r) => {
      const m = t.material[i]!, armored = m === 3, structure = m === 1;
      rect(r.x, r.y, TILE, TILE, structure ? '#1a323d' : armored ? '#71594e' : '#776f57');
      rect(r.x + 1, r.y + 2, TILE - 2, TILE - 3, structure ? '#2e4850' : armored ? '#92705a' : '#a1906d');
      rect(r.x + 2, r.y + TILE - 5, TILE - 4, 3, structure ? '#1c353e' : '#5d5e50');
      if (structure) { rect(r.x + 3, r.y + 4, 2, 2, '#748479'); rect(r.x + 19, r.y + 18, 2, 2, '#182b36'); line(r.x + 6, r.y + 6, r.x + 18, r.y + 18, '#3a5356'); }
      else {
        rect(r.x + 3, r.y + 5, 7, 2, '#d1b383'); rect(r.x + 14, r.y + 13, 6, 2, '#736c53');
        if (armored) { line(r.x + 4, r.y + 5, r.x + 19, r.y + 19, '#604e43', 3); line(r.x + 19, r.y + 5, r.x + 4, r.y + 19, '#604e43', 3); }
        if (t.health[i]! < materialHealth[m] * .75) { line(r.x + 11, r.y, r.x + 7, r.y + 12, '#302f30'); line(r.x + 7, r.y + 12, r.x + 16, r.y + 19, '#302f30'); }
      }
      if (i >= t.columns && !t.material[i - t.columns]) { rect(r.x, r.y, TILE, 3, structure ? '#77918a' : '#d5ba80'); if (structure && Math.floor(i / t.columns) >= 27) for (let j = 0; j < 3; j++) rect(r.x + j * 8, r.y + 3, 4, 3, '#d0ad63'); }
    });
    run.mission.checkpoints.forEach((cp, i) => {
      rect(cp.x + 2, cp.y - 20, 3, 49, '#7e9485'); rect(cp.x + 5, cp.y - 20, 22, 13, i <= run.checkpoint ? '#a1e6bc' : '#4e6a61');
      rect(cp.x - 3, cp.y + 16, 25, 13, '#31565a'); text('+', cp.x + 4, cp.y + 26, '#bee5ba', 12);
      text(i <= run.checkpoint ? 'SUPPLIED' : 'SUPPLY', cp.x + 10, cp.y - 28, '#c6ddb9', 6, 'center');
    });
    for (const r of run.relays) {
      rect(r.x - 3, r.y - 6, 34, 38, '#152c38'); rect(r.x, r.y - 4, 28, 32, r.health > 0 ? '#48676c' : '#30474b');
      rect(r.x + 4, r.y + 2, 20, 14, r.health > 0 ? '#f0bb69' : '#27393d');
      if (r.health > 0) { rect(r.x + 8, r.y + 5, 4, 8, '#fff0ad'); rect(r.x + 16, r.y + 5, 4, 8, '#d66d4b'); text('POWER RELAY', r.x + 14, r.y - 18, '#ffd58a', 6, 'center'); }
      else { line(r.x + 5, r.y, r.x + 22, r.y + 19, '#151f2b', 3); text('OFFLINE', r.x + 14, r.y - 13, '#a1b8aa', 6, 'center'); }
    }
    for (const b of run.barrels) if (!b.detonated && b.x > v.x - 40 && b.x < v.x + v.width + 40) {
      rect(b.x, b.y + 2, 18, 24, '#723d35'); rect(b.x + 2, b.y, 14, 26, '#d26b48');
      rect(b.x, b.y + 5, 18, 3, '#593c39'); rect(b.x, b.y + 19, 18, 3, '#593c39');
      text('×', b.x + 5, b.y + 17, '#ffe2a2', 10); rect(b.x + 2, b.y + 1, 3, 4, '#e7985e');
    }
    const rescue = run.mission.rescue;
    if (rescue && !run.rescued) {
      human(rescue.x, rescue.y, 'bolt', -1, 0, false);
      rect(rescue.x - 8, rescue.y - 10, 38, 3, '#b2b09a'); rect(rescue.x - 8, rescue.y + 29, 38, 3, '#b2b09a');
      for (let i = 0; i < 4; i++) rect(rescue.x - 7 + i * 12, rescue.y - 10, 2, 40, '#899a8b');
      text('BOLT', rescue.x + 10, rescue.y - 28, '#ffe09a', 8, 'center'); text('REACH TO RESCUE', rescue.x + 10, rescue.y - 17, '#d7c69c', 6, 'center');
    }
    const exit = run.mission.exit, ready = readyToExtract(run);
    rect(exit.x - 14, 648, exit.w + 28, 8, '#182f3a');
    for (let i = 0; i < 12; i++) rect(exit.x - 14 + i * 17, 649, 8, 4, ready ? '#b2e6b4' : '#bba269');
    const shipX = exit.x + exit.w / 2, shipY = 593 - (run.extraction > 0 ? Math.pow(run.extraction, 2) * 25 : Math.sin(time * 2) * 2);
    ctx.save(); ctx.translate(Math.round(shipX), Math.round(shipY));
    rect(-45, -18, 74, 25, '#28434c'); rect(-35, -24, 54, 8, '#55756e'); rect(18, -13, 30, 16, '#32535b');
    rect(-30, -17, 21, 9, '#b9e5cd'); rect(-6, -17, 15, 9, '#6fb6b0'); rect(-38, 9, 69, 3, '#91a99a');
    rect(-36, 1, 6, 10, '#476066'); rect(23, 1, 6, 10, '#476066');
    rect(-52, -26, 14, 4, '#d49f65'); rect(-45, -31, 3, 15, '#53726b'); rect(24, -29, 3, 11, '#53726b');
    const rotor = motion.matches ? 32 : 15 + Math.abs(Math.sin(time * 34)) * 24;
    rect(-43 - rotor, -33, rotor * 2, 2, '#aac2ad'); rect(25 - rotor, -31, rotor * 2, 2, '#aac2ad');
    if (run.extraction > 0) { rect(-25, 9, 7, 15 + Math.sin(time * 60) * 8, '#f4bd70'); rect(13, 9, 7, 15 + Math.sin(time * 60) * 8, '#f4bd70'); }
    ctx.restore();
    text(ready ? 'EXTRACT ↑' : 'EXTRACTION / LOCKED', shipX, 549, ready ? '#c8f7c0' : '#dabd8e', 8, 'center');
    for (const e of run.enemies) {
      if (e.health <= 0 || e.x < v.x - 90 || e.x > v.x + v.width + 90) continue;
      ctx.save(); ctx.translate(Math.round(e.x + e.w / 2), Math.round(e.y)); ctx.scale(e.facing, 1);
      const heavy = e.kind !== 'guard', bastion = e.kind === 'bastion', suit = e.flash ? '#fff0b4' : heavy ? '#846e62' : '#687b74';
      if (bastion) {
        rect(-32, 33, 64, 17, '#1c2e36'); for (let j = 0; j < 8; j++) rect(-29 + j * 8, 37, 4, 8, '#526261');
        rect(-26, 13, 52, 24, suit); rect(-22, 10, 44, 5, '#b2a182'); rect(-17, 0, 34, 17, '#42585c');
        rect(-15, 4, 30, 5, e.warning > 0 ? '#fff2a2' : '#f68b60'); rect(13, 19, 35, 12, '#273e46'); rect(43, 17, 7, 16, '#baa783');
      } else {
        const s = Math.sin(time * 10 + e.id) * (e.vx ? 3 : 0);
        rect(-8, 21, 6, 9 + s, '#253940'); rect(3, 21, 6, 9 - s, '#253940');
        rect(heavy ? -14 : -10, 7, heavy ? 28 : 20, 17, suit); rect(-7, 0, 17, 11, '#293d45');
        rect(1, 3, 10, 4, '#ffb17b'); rect(-8, 11, 8, 4, '#a5a88b'); rect(5, 12, heavy ? 27 : 20, heavy ? 8 : 4, '#20363f');
        if (heavy) { rect(-14, 8, 5, 8, '#c29c70'); rect(27, 11, 3, 10, '#c29c70'); }
      }
      ctx.restore();
      if (e.warning > 0) {
        const from = { x: e.x + e.w / 2, y: e.y + (bastion ? 22 : 12) };
        ctx.setLineDash([4, 5]); line(from.x, from.y, e.target.x, e.target.y, '#ffb56588'); ctx.setLineDash([]);
        text('!', e.x + e.w / 2, e.y - 10, '#ffe0a0', 12, 'center');
      }
      if (e.health < e.maxHealth || bastion) { rect(e.x, e.y - 7, e.w, 3, '#142a35'); rect(e.x, e.y - 7, e.w * e.health / e.maxHealth, 2, '#efaa6b'); }
    }
    for (const shot of run.projectiles) {
      if (shot.kind === 'grenade') { rect(shot.x - 3, shot.y - 3, 6, 6, '#e4b470'); rect(shot.x - 1, shot.y - 5, 2, 2, '#fdedb4'); }
      else {
        const length = shot.kind === 'rocket' || shot.kind === 'shell' ? 12 : 8, speed = Math.hypot(shot.vx, shot.vy);
        line(shot.x, shot.y, shot.x - shot.vx / speed * length, shot.y - shot.vy / speed * length, shot.friendly ? '#fff2b0' : '#ff9271', shot.radius ? 4 : 2);
        if (shot.radius) rect(shot.x - shot.vx / speed * 12 - 2, shot.y - shot.vy / speed * 12 - 2, 4, 4, '#ee8e59');
      }
    }
    const p = run.player;
    if (p.health > 0 && run.extraction === 0 && (!playing || p.immune <= 0 || Math.floor(time * 12) % 2 === 0)) human(p.x, p.y, p.operator, p.facing, p.x * .15, !p.grounded, p.aimX, p.aimY, p.cooldown > (p.operator === 'nova' ? .055 : .55));
    if (p.health <= 0) text('REDEPLOYING…', p.x + p.w / 2, p.y - 18, '#ffe1ac', 9, 'center');
    for (const ring of rings) {
      const progress = 1 - ring.life / .38, r = ring.radius * (.3 + progress * .7);
      if (!motion.matches && progress < .5) {
        const fire = r * (1 - progress * .7);
        rect(ring.x - fire, ring.y - fire * .55, fire * 2, fire * 1.1, '#e78548');
        rect(ring.x - fire * .55, ring.y - fire, fire * 1.1, fire * 2, '#f7b55b');
        rect(ring.x - fire * .7, ring.y - fire * .7, fire * 1.4, fire * 1.4, '#f7b55b');
        rect(ring.x - fire * .38, ring.y - fire * .45, fire * .76, fire * .9, '#fff0ac');
      }
      ctx.globalAlpha = ring.life / .38; ctx.strokeStyle = progress < .25 ? '#fff2b7' : '#f6b56b'; ctx.lineWidth = Math.max(1, 8 * (1 - progress));
      ctx.beginPath(); ctx.arc(ring.x, ring.y, r, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    }
    for (const p of particles) { ctx.globalAlpha = Math.min(1, p.life / p.max * 1.5); rect(p.x, p.y, p.size + (p.smoke ? (1 - p.life / p.max) * 12 : 0), p.size, p.color); }
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
    reset() { particles = []; rings = []; camera = undefined; last = undefined; shake = 0; sequence = 0; },
    draw(run: Run, host: { width: number; height: number; ratio: number }, playing: boolean, time: number) {
      if (disposed) return;
      const dt = Math.max(0, Math.min(.05, last === undefined ? 0 : time - last)); last = time;
      const animate = playing && run.status === 'active';
      if (animate) {
        for (const p of particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.smoke ? -12 : 180) * dt; }
        particles = particles.filter(p => p.life > 0); rings.forEach(r => { r.life -= dt; }); rings = rings.filter(r => r.life > 0); shake *= Math.exp(-12 * dt);
      }
      const w = Math.round(host.width * host.ratio), h = Math.round(host.height * host.ratio);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; camera = undefined; }
      ctx.imageSmoothingEnabled = false;
      const target = blastView(host.width, host.height, run.mission, run.player);
      if (!camera) camera = target;
      else { const ease = 1 - Math.exp(-12 * dt); camera = { ...target, x: camera.x + (target.x - camera.x) * ease, y: camera.y + (target.y - camera.y) * ease }; }
      const v = camera;
      ctx.setTransform(v.scale * host.ratio, 0, 0, v.scale * host.ratio, 0, 0); background(v, run, motion.matches ? 0 : time);
      ctx.save(); ctx.translate(-Math.round(v.x) + (motion.matches ? 0 : Math.sin(time * 83) * shake), -Math.round(v.y) + (motion.matches ? 0 : Math.cos(time * 71) * shake * .5));
      world(run, v, motion.matches ? 0 : time, playing); ctx.restore();
      if (run.collapse >= 0 && run.extraction === 0 && !motion.matches) { ctx.fillStyle = `rgba(221,94,57,${.018 + Math.max(0, Math.sin(time * 5)) * .025})`; ctx.fillRect(0, 0, v.width, v.height); }
      // Subtle scanline texture respects the pixel artwork without a postprocessing pass.
      ctx.fillStyle = '#0719230b'; for (let y = 1; y < v.height; y += 3) ctx.fillRect(0, y, v.width, 1);
    },
    dispose() { if (disposed) return; disposed = true; particles = []; rings = []; canvas.remove(); canvas.width = canvas.height = 1; },
  };
}
