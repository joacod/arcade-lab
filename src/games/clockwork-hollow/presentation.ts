import { illustratedSpriteLayout, lumenSpriteLayout } from './asset-art.ts';
import { themes, type HollowTheme } from './themes.ts';
import { movement as m, type Level, type Rect } from './content.ts';
import { ventCycle, type Run, type HollowEvent, type Player } from './game.ts';
import type { Screen } from './ui.ts';
import { createKeeperAnimation } from './animation.ts';
import type { ImageBundle } from '../../engine/browser/images.ts';
import { createBellgardenDrawing } from './asset-presentation.ts';
import type { LumenDrawing, LumenDrawingFactory } from './deluxe-presentation.ts';

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
  const sprites = () => art;
  let theme = themes.arcade;
  let art: ReturnType<typeof createBellgardenDrawing> | undefined;
  let deluxe: LumenDrawing | undefined, deluxeFactory: LumenDrawingFactory | undefined;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const animation = createKeeperAnimation();
  let cosmeticTime = 0;
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
  function scenery(view: HollowView, time: number, level: Level) {
    if (deluxe) { deluxe.scenery(view, level.environment, time, motion.matches); return; }
    if (art && theme === themes.arcade) { art.scenery(view, level.environment, theme); return; }
  }
  function stone(s: Rect, index: number, level: Level, view: HollowView) {
    if (deluxe) { deluxe.stone(s, level.environment, index, view); return; }
    if (art && theme === themes.arcade) { art.stone(s, level.environment, index, view); return; }
  }
  function sign(x: number, groundY: number, title: string, detail: string) {
    const top = groundY - 96;
    // A narrow, grounded post and recessed plaque read as scenery, not a ledge.
    line(x, top + 40, x, groundY, '#344a46', 7);
    line(x - 1, top + 40, x - 1, groundY, '#a39267', 3);
    ctx.fillStyle = '#344a46'; ctx.fillRect(x - 6, groundY - 5, 12, 5);
    const fill = theme === themes.arcade ? '#fff0cf' : '#1d3b3bf0';
    ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x - 14, top, 182, 52, 4); ctx.fill();
    line(x - 9, top + 2, x + 163, top + 2, '#a6ad7d', 1);
    for (const pin of [x - 8, x + 162]) circle(pin, top + 26, 1.5, '#a39267');
    ctx.font = '10px monospace'; ctx.fillStyle = theme === themes.arcade ? '#233d55' : '#e6cd93'; ctx.fillText(title, x + 1, top + 22);
    ctx.font = '8px monospace'; ctx.fillStyle = theme === themes.arcade ? '#79535b' : '#a7c6ab'; ctx.fillText(detail, x + 1, top + 39);
  }
  return {
    replaceTheme(next: HollowTheme, images?: ImageBundle, factory?: LumenDrawingFactory) {
      const previous = { theme, art, deluxe, deluxeFactory };
      const replacement = factory === deluxeFactory ? deluxe : factory?.(ctx);
      const nextArt = images ? createBellgardenDrawing(ctx, images, next === themes.deluxe ? lumenSpriteLayout : illustratedSpriteLayout) : undefined;
      theme = next; art = nextArt; deluxe = replacement; deluxeFactory = factory;
      // A failed candidate may have interrupted a saved drawing scope. Keep the
      // camera/cosmetics, but start the replacement with a clean Canvas state.
      ctx.reset();
      let finished = false;
      return {
        commit() {
          if (finished) return; finished = true;
          if (previous.deluxe !== replacement) previous.deluxe?.dispose();
        },
        rollback() {
          if (finished) return; finished = true;
          if (previous.deluxe !== replacement) replacement?.dispose();
          ({ theme, art, deluxe, deluxeFactory } = previous); ctx.reset();
        },
      };
    },
    reset() { particles = []; lastFrame = undefined; landing = 0; camera = undefined; cosmeticTime = 0; animation.reset(); },
    consume(events: readonly HollowEvent[]) {
      for (const event of events) {
        if (camera && (event.x < camera.x - 100 || event.x > camera.x + camera.width + 100)) continue;
        if (event.type === 'land') landing = event.strength;
        const count = motion.matches ? 0 : ['complete', 'level', 'checkpoint'].includes(event.type) ? 40 : event.type === 'interaction' ? 12 : 9;
        for (let i = 0; i < count && particles.length < 128; i++) {
          const angle = i * 2.4, speed = event.type === 'complete' ? 180 : 70;
          particles.push({ x: event.x, y: event.y, vx: Math.cos(angle) * speed, vy: -30 - Math.abs(Math.sin(angle)) * speed,
            life: 0.6 + i % 4 * 0.1, max: 0.9, color: ['interaction', 'complete', 'level', 'checkpoint'].includes(event.type) ? '#ffe1a0' : '#a6ccae' });
        }
      }
    },
    draw(run: Run, size: { width: number; height: number; ratio: number }, screen: Screen, now: number) {
      if (disposed || !art) return;
      const w = Math.max(1, Math.round(size.width * size.ratio)), h = Math.max(1, Math.round(size.height * size.ratio));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; camera = undefined; }
      const target = hollowView(size.width, size.height, run.level, run.player);
      // Cosmetic tails keep moving after an outcome; pause and hidden-page gaps never advance them.
      const dt = screen === 'paused' || screen === 'title' || lastFrame === undefined ? 0 : clamp(now - lastFrame, 0, 0.05);
      lastFrame = now;
      cosmeticTime += dt;
      const pose = animation.observe(run.player, dt);
      const follow = motion.matches ? 1 : 1 - Math.exp(-8 * dt);
      if (!camera) camera = { ...target };
      camera = { ...target, x: camera.x + (target.x - camera.x) * follow, y: motion.matches ? target.y : camera.y + (Math.abs(target.y - camera.y) > 45 ? (target.y - camera.y - Math.sign(target.y - camera.y) * 45) * follow * 0.55 : 0) };
      const view = camera;
      ctx.setTransform(size.ratio * view.scale, 0, 0, size.ratio * view.scale, 0, 0);
      scenery(view, run.elapsed, run.level);
      ctx.save(); ctx.translate(-view.x, -view.y);
      for (const item of run.level.signs) if (item.x > view.x - 180 && item.x < view.x + view.width + 14) sign(item.x, item.groundY, item.title, item.detail);
      run.level.solids.forEach((s, i) => { if (s.x + s.w >= view.x - 20 && s.x <= view.x + view.width + 20) stone(s, i, run.level, view); });
      run.level.checkpoints.forEach((point, i) => {
        const x = point.x + 13, y = point.y, lit = run.checkpoint >= i;
        glow(x, y - 25, lit ? 105 : 45, lit ? '#a6ffcc55' : '#f4d8a922');
        // All lantern sheets have their visible sole at source y=156 of 160.
        sprites()?.object(lit ? 'savedLantern' : 'lantern', x - 40, y + m.height - 97.5, 80, 100);
        ctx.font = '10px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = lit ? '#b9ffcf' : '#edd9a4';
        ctx.fillText(lit ? 'SAVED' : 'CHECKPOINT', x, y - 62); ctx.textAlign = 'left';
      });
      run.level.vents.forEach((vent, i) => {
        if (vent.x < view.x - 100 || vent.x > view.x + view.width + 100) return;
        const cycle = ventCycle(vent, run.levelTime);
        const phase = run.vents[i], active = phase === 'active', warning = phase === 'warning';
        const color = active ? '#ffb294' : warning ? '#ffdb83' : '#9cddd6';
        ctx.fillStyle = '#172c37'; ctx.fillRect(vent.x - 6, vent.y + vent.h - 8, vent.w + 12, 14);
        for (let x = vent.x; x < vent.x + vent.w; x += 12) line(x, vent.y + vent.h - 7, x + 5, vent.y + vent.h + 3, color, 3);
        sprites()?.object('vent', vent.x - 6, vent.y + vent.h - 7, vent.w + 12, 22);
        if (active) {
          const plume = ctx.createLinearGradient(0, vent.y, 0, vent.y + vent.h);
          plume.addColorStop(0, '#ffb29499'); plume.addColorStop(1, '#fff1bbee');
          ctx.fillStyle = plume; ctx.fillRect(vent.x, vent.y, vent.w, vent.h);
          for (let j = 0; j < 4; j++) {
            const y = vent.y + ((j * 37 - (motion.matches ? 0 : cosmeticTime * 160)) % vent.h + vent.h) % vent.h;
            line(vent.x + 7, y, vent.x + vent.w - 7, y - 9, '#fff0cabb', 3);
          }
        } else if (warning) {
          glow(vent.x + vent.w / 2, vent.y + vent.h, 90, '#ffd98244');
          ctx.setLineDash([4, 7]); ctx.strokeStyle = color; ctx.lineWidth = 2;
          ctx.strokeRect(vent.x, vent.y, vent.w, vent.h); ctx.setLineDash([]);
        }
        // Keep timing readable at phone scale, below the mouth so upper routes stay visible.
        // This is gameplay information, so reduced motion retains the draining bar.
        const labelScale = Math.max(1, 0.85 / view.scale), meterWidth = 100 * labelScale;
        const center = vent.x + vent.w / 2, left = center - meterWidth / 2, top = vent.y + vent.h + 12 * labelScale;
        ctx.fillStyle = '#10262fee'; ctx.fillRect(left - 5, top, meterWidth + 10, 32 * labelScale);
        ctx.font = `bold ${11 * labelScale}px monospace`; ctx.textAlign = 'center'; ctx.fillStyle = color;
        const seconds = (Math.ceil(cycle.remaining * 10) / 10).toFixed(1);
        ctx.fillText(`${active ? 'PRESSURE' : warning ? 'FIRE IN' : 'CLEAR'} ${seconds}s`, center, top + 14 * labelScale);
        ctx.fillStyle = '#536367'; ctx.fillRect(left, top + 22 * labelScale, meterWidth, 5 * labelScale);
        ctx.fillStyle = color; ctx.fillRect(left, top + 22 * labelScale, meterWidth * cycle.fraction, 5 * labelScale);
        ctx.textAlign = 'left';
      });
      run.enemies.forEach(enemy => {
        if (enemy.x < view.x - 60 || enemy.x > view.x + view.width + 60) return;
        const x = enemy.x + enemy.w / 2, y = enemy.y + enemy.h;
        sprites()?.beetle(x, y, enemy.direction, enemy.alive, motion.matches);
      });
      for (const s of run.level.hazards) {
        if (s.x + s.w < view.x || s.x > view.x + view.width) continue;
        sprites()?.thorns(s);
      }
      const goal = run.level.goal, gx = goal.x + goal.w / 2;
      const objectArt = sprites();
      if (objectArt) {
        objectArt.object('gate', gx - 76, goal.y + goal.h - 190, 152, 190);
        glow(gx, goal.y + 22, ['victory', 'interlude'].includes(run.status) ? 220 : 120, '#f6ce7f44');
        // Hang from the arch's crown instead of leaving a gap above the chain.
        ctx.save(); ctx.translate(gx, goal.y + goal.h - 181);
        if (['victory', 'interlude'].includes(run.status) && !motion.matches) ctx.rotate(Math.sin(cosmeticTime * 5) * .18);
        objectArt.object('bell', -41, 0, 82, 102); ctx.restore();
      }
      ctx.font = '10px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#ead7a6'; ctx.fillText('WAKE THE BELL', gx, goal.y + 95); ctx.textAlign = 'left';
      run.level.motes.forEach((mote, i) => {
        if (run.collected[i] || mote.x < view.x - 30 || mote.x > view.x + view.width + 30) return;
        const y = mote.y + (motion.matches ? 0 : Math.sin(run.elapsed * 2.5 + i) * 4);
        glow(mote.x, y, 33, '#f6ce7f40');
        sprites()?.object('mote', mote.x - 9, y - 11, 18, 22);
      });
      const p = run.player;
      const ground = run.level.solids.filter(s => p.x + m.width > s.x && p.x < s.x + s.w && s.y >= p.y + m.height - 1).sort((a, b) => a.y - b.y)[0];
      if (ground) {
        ctx.fillStyle = '#061e2577'; ctx.beginPath(); ctx.ellipse(p.x + m.width / 2, ground.y - 1, Math.max(6, 18 - (ground.y - p.y - m.height) * 0.05), 4, 0, 0, Math.PI * 2); ctx.fill();
      }
      glow(p.x + m.width / 2, p.y + 20, 50, '#b4edce12'); sprites()?.keeper(p, pose, run.status === 'defeat', motion.matches, landing);
      for (const particle of particles) {
        particle.life -= dt; particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.vy += 240 * dt;
        ctx.globalAlpha = Math.max(0, particle.life / particle.max); circle(particle.x, particle.y, 2.5, particle.color);
      }
      ctx.globalAlpha = 1; particles = particles.filter(particle => particle.life > 0); landing = Math.max(0, landing - dt * 5);
      ctx.restore();
    },
    dispose() { if (disposed) return; disposed = true; particles = []; art = undefined; deluxe?.dispose(); deluxe = undefined; canvas.remove(); canvas.width = canvas.height = 1; },
  };
}
