import { movement as m, type Level, type Rect } from './content.ts';
import type { Run, HollowEvent, Player } from './game.ts';
import type { Screen } from './ui.ts';

export interface HollowView { scale: number; width: number; height: number; x: number; y: number }
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
/** One uniform world transform. A minimum visible width keeps the next landing visible on phones. */
export function hollowView(width: number, height: number, level: Level, player: Pick<Player, 'x' | 'y'> & Partial<Pick<Player, 'vx'>>): HollowView {
  const scale = Math.max(0.05, Math.min(width / 700, height / 780));
  const w = width / scale, h = height / scale;
  return { scale, width: w, height: h,
    x: clamp(player.x + clamp((player.vx ?? 0) * 0.22, -66, 66) - w * 0.40, 0, Math.max(0, level.width - w)),
    y: h > level.height ? (level.height - h) / 2 : clamp(player.y - h * 0.62, 0, level.height - h) };
}
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string }
export function createPresentation(surface: HTMLElement) {
  const canvas = document.createElement('canvas'); canvas.className = 'hollow-canvas'; canvas.setAttribute('aria-hidden', 'true');
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('Canvas 2D is unavailable.');
  const ctx = context;
  surface.prepend(canvas);
  let particles: Particle[] = [], lastFrame: number | undefined, landing = 0, camera: HollowView | undefined, disposed = false;
  let palette: Level['palette'];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function circle(x: number, y: number, r: number, fill: string | CanvasGradient) {
    ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  function line(x: number, y: number, x2: number, y2: number, color: string, width = 2) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
  }
  function glow(x: number, y: number, r: number, color: string) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r); gradient.addColorStop(0, color); gradient.addColorStop(1, '#8fe6d000');
    circle(x, y, r, gradient);
  }
  function gear(x: number, y: number, r: number, angle: number, color: string) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.fillStyle = color; ctx.beginPath();
    for (let i = 0; i < 64; i++) {
      const a = i / 64 * Math.PI * 2, radius = r * (i % 4 < 2 ? 1 : 0.89);
      const px = Math.cos(a) * radius, py = Math.sin(a) * radius;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#0b282b'; ctx.lineWidth = r * 0.14;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.63, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 6; i++) { ctx.rotate(Math.PI / 3); line(r * 0.18, 0, r * 0.6, 0, color, r * 0.14); }
    circle(0, 0, r * 0.14, '#0b282b'); ctx.restore();
  }
  function leaf(x: number, y: number, length: number, angle: number, color: string) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.fillStyle = color; ctx.beginPath();
    ctx.moveTo(0, 0); ctx.quadraticCurveTo(length * 0.8, -length * 0.55, length, 0); ctx.quadraticCurveTo(length * 0.55, length * 0.4, 0, 0); ctx.fill(); ctx.restore();
  }
  function vine(x: number, y: number, length: number, seed: number) {
    ctx.strokeStyle = '#417466'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + 25, y + length * 0.3, x - 28, y + length * 0.7, x + 4, y + length); ctx.stroke();
    for (let i = 10; i < length; i += 22) {
      const px = x + Math.sin(i / length * Math.PI * 2) * 8;
      leaf(px, y + i, 15 + seed % 8, i % 44 === 10 ? -0.6 : -2.8, i % 44 === 10 ? '#548b72' : '#376956');
    }
  }
  function scenery(view: HollowView, time: number, level: Level) {
    const { width: w, height: h } = view;
    const sky = ctx.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, palette.sky); sky.addColorStop(0.48, palette.middle); sky.addColorStop(1, palette.deep);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    // Distant light and aqueducts drift more slowly than physical geometry.
    glow(w * 0.74 - view.x * 0.03, h * 0.18, 340, `${palette.light}36`);
    if (level.environment === 'belfry') {
      for (let i = 0; i < 65; i++) {
        const x = ((i * 137.7 - view.x * 0.08) % w + w) % w, y = (i * 73.3) % (h * 0.65);
        circle(x, y, i % 4 === 0 ? 2 : 1, '#e1dfff99');
      }
      circle(w * 0.8 - view.x * 0.015, h * 0.18, 42, '#e6e2c0');
    }
    if (level.environment === 'foundry') {
      for (let i = 0; i < 8; i++) {
        const x = ((i * 260 - view.x * 0.27) % (w + 260) + w + 260) % (w + 260);
        line(x, 0, x, h, '#916b5c55', 16); line(x - 5, 0, x - 5, h, '#d1a27822', 3);
        gear(x, h * 0.35, 46, reducedMotion ? 0 : time * 0.1, '#bd8b5e33');
        glow(x, h * 0.76, 150, '#ff94532b');
      }
    }
    ctx.fillStyle = '#c8d6a309';
    ctx.beginPath(); ctx.moveTo(w * 0.65, 0); ctx.lineTo(w * 0.95, 0); ctx.lineTo(w * 0.5, h); ctx.lineTo(w * 0.2, h); ctx.fill();
    for (let layer = 0; layer < 2; layer++) {
      const factor = layer === 0 ? 0.18 : 0.4, spacing = layer === 0 ? 330 : 470;
      const baseY = 810 - view.y * factor;
      ctx.fillStyle = layer === 0 ? `${palette.stone}77` : `${palette.deep}bb`;
      for (let i = -1; i < Math.ceil((w + level.width * factor) / spacing) + 1; i++) {
        const x = i * spacing - view.x * factor, top = baseY - (layer === 0 ? 600 : 490);
        if (x > w + spacing || x < -spacing) continue;
        // The open arch is a path, leaving the distant layers visible through it.
        ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x, top); ctx.lineTo(x + spacing - 38, top); ctx.lineTo(x + spacing - 38, h);
        ctx.lineTo(x + spacing - 95, h); ctx.lineTo(x + spacing - 95, top + 180);
        ctx.bezierCurveTo(x + spacing - 95, top + 65, x + 58, top + 65, x + 58, top + 180);
        ctx.lineTo(x + 58, h); ctx.closePath(); ctx.fill();
        line(x, top + 25, x + spacing - 38, top + 25, '#48715b35', 7);
        if (layer === 1) { if (level.environment === 'garden') vine(x + 35, top, 160 + i % 3 * 35, i); gear(x + 190, top + 115, 55, reducedMotion ? 0 : time * 0.025, '#42675a'); }
      }
    }
    // Low fog and hanging canopy give depth without obscuring landing edges.
    for (let i = 0; i < 35; i++) {
      const x = ((i * 137.7 - view.x * 0.66) % (w + 150) + w + 150) % (w + 150) - 50;
      const y = h * 0.65 + Math.sin(i * 37) * 130 + Math.sin(time * 0.6 + i) * (reducedMotion ? 0 : 10);
      circle(x, y, i % 3 === 0 ? 2 : 1, i % 3 === 0 ? '#c7e5aa65' : '#94c6a044');
    }
    ctx.save(); ctx.translate(-view.x * 0.7, -view.y * 0.6);
    for (let i = Math.floor(view.x * 0.7 / 360); i < Math.ceil((view.x * 0.7 + w) / 360) + 1; i++) {
      const x = i * 360;
      ctx.fillStyle = '#0b292ddd'; ctx.beginPath(); ctx.moveTo(x - 80, -70); ctx.quadraticCurveTo(x + 70, 100, x + 270, -20); ctx.lineTo(x + 300, -100); ctx.fill();
      for (let j = 0; j < 5; j++) leaf(x + j * 53, 12 + Math.sin(j) * 15, 45, j % 2 ? 0.2 : 2.8, '#164039');
    }
    ctx.restore();
  }
  function stone(s: Rect, index: number) {
    const fill = ctx.createLinearGradient(s.x, s.y, s.x, s.y + Math.min(s.h, 250));
    fill.addColorStop(0, palette.stone); fill.addColorStop(1, palette.deep); ctx.fillStyle = fill; ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.fillStyle = '#75836a'; ctx.fillRect(s.x, s.y, s.w, 5);
    ctx.fillStyle = palette.edge; ctx.fillRect(s.x + 4, s.y, s.w - 8, 2);
    ctx.fillStyle = '#0b252b88'; ctx.fillRect(s.x, s.y + 12, s.w, 3);
    for (let row = 0; row < Math.min(s.h / 38, 9); row++) {
      const y = s.y + 23 + row * 38;
      line(s.x + 2, y, s.x + s.w - 2, y, '#132d2e99', 2);
      for (let col = 0; col < s.w / 74; col++) {
        const x = s.x + col * 74 + (row % 2 ? 36 : 0);
        if (x < s.x + s.w) line(x, y - 35, x, y, '#152f3088', 2);
      }
    }
    // Brass joining plates distinguish the thin mechanical stepping ledges.
    if (s.h <= 30) {
      ctx.fillStyle = '#9a7854'; ctx.fillRect(s.x + 7, s.y + 7, s.w - 14, 4);
      for (const x of [s.x + 13, s.x + s.w - 13]) circle(x, s.y + 20, 3, '#a99b6d');
      line(s.x + s.w / 2, s.y + s.h, s.x + s.w / 2, s.y + s.h + 70, '#47746a55', 3);
      gear(s.x + s.w / 2, s.y + s.h + 78, 16, 0, '#5b7660');
    }
    for (let i = 0; i < s.w / 23; i++) {
      const x = s.x + i * 23 + 5;
      leaf(x, s.y + 2, 12 + i % 4 * 4, -0.5, i % 3 ? '#5b8860' : '#83a46a');
      leaf(x, s.y + 1, 10, -2.3, '#416d51');
    }
    if (index % 3 === 0) vine(s.x + s.w - 12, s.y + 5, Math.min(110, s.h + 60), index);
    if (s.h > 80) {
      const x = s.x + Math.min(s.w * 0.6, 230), y = s.y + 90;
      gear(x, y, 31, index, '#5c6650'); circle(x, y, 7, '#d6bb7d'); glow(x, y, 40, '#f3cb7930');
    }
  }
  function keeper(p: Pick<Player, 'x' | 'y' | 'vx' | 'vy' | 'facing' | 'grounded'>, time: number, defeated: boolean) {
    const walk = p.grounded ? Math.sin(time * 22) * Math.min(1, Math.abs(p.vx) / 120) : 0;
    ctx.save(); ctx.translate(p.x + m.width / 2, p.y + m.height);
    const squash = reducedMotion ? 0 : landing * 0.17;
    ctx.scale(p.facing * (1 + squash), 1 - squash);
    if (defeated) ctx.rotate(-0.35);
    // Feet and articulated legs retain distinct silhouettes while running and falling.
    const spread = p.grounded ? walk * 7 : p.vy < 0 ? 7 : -4;
    line(-6, -14, -7 + spread, -3, '#866649', 5); line(6, -14, 7 - spread, -3, '#b39b67', 5);
    line(-10 + spread, -2, -4 + spread, -2, '#d8ba7d', 5); line(4 - spread, -2, 10 - spread, -2, '#ecd299', 5);
    // A teal scarf makes direction and speed readable against warm brass.
    ctx.fillStyle = '#71c4b1'; ctx.beginPath(); ctx.moveTo(-6, -30); ctx.quadraticCurveTo(-18, -30, -24 - Math.abs(p.vx) * 0.02, -22 + Math.sin(time * 12) * 3); ctx.lineTo(-19, -32); ctx.lineTo(-6, -35); ctx.fill();
    ctx.fillStyle = '#b7915f'; ctx.beginPath(); ctx.roundRect(-11, -31 + walk, 22, 20, 6); ctx.fill();
    line(-8, -29 + walk, 8, -29 + walk, '#edd093', 2);
    circle(0, -21 + walk, 6, '#514d3d'); circle(0, -21 + walk, 3, '#afe6c9');
    line(-11, -26, -16, -17 + walk * 3, '#b29a6b', 4); line(11, -26, 15, -19 - walk * 3, '#d4b77c', 4);
    ctx.fillStyle = '#e0bf7d'; ctx.beginPath(); ctx.roundRect(-14, -50 + Math.abs(walk), 29, 22, 9); ctx.fill();
    ctx.fillStyle = '#f0d69c'; ctx.fillRect(-9, -50 + Math.abs(walk), 18, 3);
    ctx.fillStyle = '#233f40'; ctx.beginPath(); ctx.roundRect(-8, -43 + Math.abs(walk), 21, 10, 4); ctx.fill();
    circle(1, -39 + Math.abs(walk), 2, '#d0ffdb'); circle(9, -39 + Math.abs(walk), 2, '#d0ffdb');
    line(-3, -51, -5, -58, '#b0a57c', 2); leaf(-5, -57, 10, -0.4, '#9fc98b');
    ctx.fillStyle = '#76bea1'; ctx.fillRect(-11, -31, 24, 4);
    ctx.restore();
  }
  function sign(x: number, y: number, title: string, detail: string) {
    line(x, y, x, y + 72, '#7d7860', 5);
    ctx.fillStyle = '#1d3b3b'; ctx.beginPath(); ctx.roundRect(x - 9, y - 33, 166, 52, 4); ctx.fill();
    line(x - 8, y - 33, x + 156, y - 33, '#a6ad7d', 2);
    ctx.font = '10px monospace'; ctx.fillStyle = '#e6cd93'; ctx.fillText(title, x + 3, y - 12);
    ctx.font = '8px monospace'; ctx.fillStyle = '#a7c6ab'; ctx.fillText(detail, x + 3, y + 5);
  }
  return {
    reset() { particles = []; lastFrame = undefined; landing = 0; camera = undefined; },
    consume(events: readonly HollowEvent[]) {
      for (const event of events) {
        if (camera && (event.x < camera.x - 100 || event.x > camera.x + camera.width + 100)) continue;
        if (event.type === 'land') landing = event.strength;
        const count = reducedMotion ? 0 : ['complete', 'level', 'checkpoint'].includes(event.type) ? 40 : event.type === 'interaction' ? 12 : 9;
        for (let i = 0; i < count && particles.length < 128; i++) {
          const angle = i * 2.4, speed = event.type === 'complete' ? 180 : 70;
          particles.push({ x: event.x, y: event.y, vx: Math.cos(angle) * speed, vy: -30 - Math.abs(Math.sin(angle)) * speed,
            life: 0.6 + i % 4 * 0.1, max: 0.9, color: ['interaction', 'complete', 'level', 'checkpoint'].includes(event.type) ? '#ffe1a0' : '#a6ccae' });
        }
      }
    },
    draw(run: Run, size: { width: number; height: number; ratio: number }, screen: Screen, now: number) {
      if (disposed) return;
      const w = Math.max(1, Math.round(size.width * size.ratio)), h = Math.max(1, Math.round(size.height * size.ratio));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; camera = undefined; }
      palette = run.level.palette;
      const target = hollowView(size.width, size.height, run.level, run.player);
      // Cosmetic tails keep moving after an outcome; pause and hidden-page gaps never advance them.
      const dt = screen === 'paused' || screen === 'title' || lastFrame === undefined ? 0 : clamp(now - lastFrame, 0, 0.05);
      lastFrame = now;
      const follow = reducedMotion ? 1 : 1 - Math.exp(-8 * dt);
      if (!camera) camera = { ...target };
      camera = { ...target, x: camera.x + (target.x - camera.x) * follow, y: reducedMotion ? target.y : camera.y + (Math.abs(target.y - camera.y) > 45 ? (target.y - camera.y - Math.sign(target.y - camera.y) * 45) * follow * 0.55 : 0) };
      const view = camera;
      ctx.setTransform(size.ratio * view.scale, 0, 0, size.ratio * view.scale, 0, 0);
      scenery(view, run.elapsed, run.level);
      ctx.save(); ctx.translate(-view.x, -view.y);
      // Abandoned flywheels are scenery only, safely behind physical platforms.
      for (let i = Math.max(0, Math.floor((view.x - 760) / 610)); i < Math.ceil((view.x + view.width) / 610); i++) {
        const x = 560 + i * 610, y = 560 + i % 2 * 150;
        if (x < view.x - 200 || x > view.x + view.width + 200) continue;
        gear(x, y, 110, reducedMotion ? 0 : run.elapsed * 0.06 * (i % 2 ? -1 : 1), '#4a665166');
        circle(x, y, 12, '#b7dca188'); glow(x, y, 130, '#a2ddb315');
      }
      run.level.solids.forEach((s, i) => { if (s.x + s.w >= view.x - 20 && s.x <= view.x + view.width + 20) stone(s, i); });
      for (const item of run.level.signs) if (item.x > view.x - 180 && item.x < view.x + view.width) sign(item.x, item.y, item.title, item.detail);
      run.level.checkpoints.forEach((point, i) => {
        const x = point.x + 13, y = point.y, lit = run.checkpoint >= i;
        line(x, y + m.height, x, y - 35, '#b9a576', 5);
        glow(x, y - 25, lit ? 105 : 45, lit ? '#a6ffcc55' : '#f4d8a922');
        ctx.fillStyle = lit ? '#b9ffcf' : '#a28c6c'; ctx.fillRect(x - 9, y - 42, 18, 26);
        line(x - 13, y - 44, x + 13, y - 44, '#edd9a4', 3);
        ctx.font = '10px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = lit ? '#b9ffcf' : '#edd9a4';
        ctx.fillText(lit ? 'SAVED' : 'CHECKPOINT', x, y - 62); ctx.textAlign = 'left';
      });
      run.level.vents.forEach((vent, i) => {
        if (vent.x < view.x - 100 || vent.x > view.x + view.width + 100) return;
        const phase = run.vents[i], active = phase === 'active', warning = phase === 'warning';
        const color = active ? '#ffb294' : warning ? '#ffdb83' : '#9cddd6';
        ctx.fillStyle = '#172c37'; ctx.fillRect(vent.x - 6, vent.y + vent.h - 8, vent.w + 12, 14);
        for (let x = vent.x; x < vent.x + vent.w; x += 12) line(x, vent.y + vent.h - 7, x + 5, vent.y + vent.h + 3, color, 3);
        if (active) {
          const plume = ctx.createLinearGradient(0, vent.y, 0, vent.y + vent.h);
          plume.addColorStop(0, '#ffb29499'); plume.addColorStop(1, '#fff1bbee');
          ctx.fillStyle = plume; ctx.fillRect(vent.x, vent.y, vent.w, vent.h);
          for (let j = 0; j < 4; j++) {
            const y = vent.y + ((j * 37 - (reducedMotion ? 0 : now * 160)) % vent.h + vent.h) % vent.h;
            line(vent.x + 7, y, vent.x + vent.w - 7, y - 9, '#fff0cabb', 3);
          }
        } else if (warning) {
          glow(vent.x + vent.w / 2, vent.y + vent.h, 90, '#ffd98244');
          ctx.setLineDash([4, 7]); ctx.strokeStyle = color; ctx.lineWidth = 2;
          ctx.strokeRect(vent.x, vent.y, vent.w, vent.h); ctx.setLineDash([]);
        }
        ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = color;
        ctx.fillText(active ? 'PRESSURE' : warning ? '!' : 'CLEAR', vent.x + vent.w / 2, vent.y + vent.h + 25); ctx.textAlign = 'left';
      });
      run.enemies.forEach(enemy => {
        if (enemy.x < view.x - 60 || enemy.x > view.x + view.width + 60) return;
        const x = enemy.x + enemy.w / 2, y = enemy.y + enemy.h;
        ctx.save(); ctx.translate(x, y); ctx.scale(enemy.direction, enemy.alive ? 1 : 0.25);
        const stride = reducedMotion || !enemy.alive ? 0 : Math.sin(run.levelTime * 18) * 3;
        for (let j = -1; j <= 1; j++) { line(j * 11 - 3, -9, j * 11 - 7, -1 + stride, '#edb47e', 3); }
        ctx.fillStyle = enemy.alive ? '#da9272' : '#766462'; ctx.beginPath(); ctx.roundRect(-18, -25, 36, 20, 9); ctx.fill();
        line(-12, -23, 10, -23, '#ffe2b0', 3); gear(-5, -15, 8, reducedMotion ? 0 : run.levelTime * 3, '#86513e');
        circle(12, -17, 3, '#241e31'); circle(13, -18, 1, '#fff5cf');
        line(-2, -24, -2, -32, '#c7af85', 2); line(-7, -32, 3, -32, '#c7af85', 2); ctx.restore();
      });
      for (const s of run.level.hazards) {
        glow(s.x + s.w / 2, s.y + 8, 65, '#df916d20');
        ctx.fillStyle = '#f3a18b'; ctx.beginPath();
        for (let x = s.x; x < s.x + s.w; x += 15) { ctx.moveTo(x, s.y + s.h); ctx.lineTo(x + 7, s.y); ctx.lineTo(x + 15, s.y + s.h); }
        ctx.fill(); line(s.x, s.y + s.h, s.x + s.w, s.y + s.h, '#6b4944', 3);
      }
      const goal = run.level.goal, gx = goal.x + goal.w / 2;
      line(gx - 58, goal.y + goal.h, gx - 58, goal.y - 62, '#809476', 12);
      line(gx + 58, goal.y + goal.h, gx + 58, goal.y - 62, '#809476', 12);
      line(gx - 64, goal.y - 62, gx + 64, goal.y - 62, '#c8b57e', 12);
      vine(gx + 59, goal.y - 65, 155, 2);
      glow(gx, goal.y + 22, ['victory', 'interlude'].includes(run.status) ? 220 : 120, '#f6ce7f44');
      ctx.save(); ctx.translate(gx, goal.y + 10); if (['victory', 'interlude'].includes(run.status) && !reducedMotion) ctx.rotate(Math.sin(now * 5) * 0.18);
      line(0, -68, 0, -23, '#bdb480', 3); ctx.fillStyle = '#e3bb78'; ctx.beginPath();
      ctx.moveTo(-25, 15); ctx.quadraticCurveTo(-13, 0, -15, -18); ctx.quadraticCurveTo(0, -38, 15, -18); ctx.quadraticCurveTo(13, 0, 25, 15); ctx.closePath(); ctx.fill();
      circle(0, 18, 6, '#f4de9b'); line(-22, 12, 22, 12, '#776342', 2); ctx.restore();
      ctx.font = '10px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#ead7a6'; ctx.fillText('WAKE THE BELL', gx, goal.y + 95); ctx.textAlign = 'left';
      run.level.motes.forEach((mote, i) => {
        if (run.collected[i] || mote.x < view.x - 30 || mote.x > view.x + view.width + 30) return;
        const y = mote.y + (reducedMotion ? 0 : Math.sin(run.elapsed * 2.5 + i) * 4);
        glow(mote.x, y, 33, '#f6ce7f40');
        ctx.save(); ctx.translate(mote.x, y); ctx.rotate(Math.PI / 4); ctx.fillStyle = '#edc582'; ctx.fillRect(-6, -6, 12, 12); ctx.fillStyle = '#fff3c2'; ctx.fillRect(-2, -2, 4, 4); ctx.restore();
      });
      const p = run.player;
      const ground = run.level.solids.filter(s => p.x + m.width > s.x && p.x < s.x + s.w && s.y >= p.y + m.height - 1).sort((a, b) => a.y - b.y)[0];
      if (ground) {
        ctx.fillStyle = '#061e2577'; ctx.beginPath(); ctx.ellipse(p.x + m.width / 2, ground.y - 1, Math.max(6, 18 - (ground.y - p.y - m.height) * 0.05), 4, 0, 0, Math.PI * 2); ctx.fill();
      }
      glow(p.x + m.width / 2, p.y + 20, 50, '#b4edce12'); keeper(p, run.elapsed, run.status === 'defeat');
      for (const particle of particles) {
        particle.life -= dt; particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.vy += 240 * dt;
        ctx.globalAlpha = Math.max(0, particle.life / particle.max); circle(particle.x, particle.y, 2.5, particle.color);
      }
      ctx.globalAlpha = 1; particles = particles.filter(particle => particle.life > 0); landing = Math.max(0, landing - dt * 5);
      ctx.restore();
      // An enlarged keeper illustration shares the same original vector drawing on the title.
      if (screen === 'title' && size.width > 850) {
        ctx.save(); ctx.translate(view.width * 0.77, view.height * 0.62); ctx.scale(2.6, 2.6);
        gear(0, -25, 65, -0.2, '#8eae7a35'); glow(0, -25, 100, '#c7e6ad22');
        keeper({ x: -m.width / 2, y: -m.height, vx: 0, vy: 0, facing: 1, grounded: true }, 0, false);
        leaf(-50, 15, 45, -0.6, '#729666'); leaf(48, 18, 38, -2.4, '#4f8060'); ctx.restore();
      }
    },
    dispose() { if (disposed) return; disposed = true; particles = []; canvas.remove(); canvas.width = canvas.height = 1; },
  };
}
