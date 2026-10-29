import { encounters, enemies } from './content.ts';
import { chargeDestination } from './encounters.ts';
import type { GameEvent, RunState } from './game-state.ts';
import { MAX_EFFECTS, type Theme } from './themes.ts';
import type { Stick } from './input.ts';
import { edgeCue, type Viewport } from './view.ts';
import type { DisplaySize } from './world-presentation.ts';

/** One small CSS-space layer survives world presentation replacement. */
export function createScreenOverlay(surface: HTMLElement) {
  const canvas = document.createElement('canvas');
  canvas.className = 'screen-overlay'; canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is required to draw the overlay.');
  surface.append(canvas);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let effects: GameEvent[] = [];
  let outcomeAt: number | undefined;
  return {
    reset() { effects = []; outcomeAt = undefined; },
    consume(events: readonly GameEvent[]) {
      effects.push(...events.filter(event => event.type === 'evolution' || event.type === 'upgrade' || event.type === 'player-hit'));
      if (effects.length > MAX_EFFECTS) effects.splice(0, effects.length - MAX_EFFECTS);
    },
    draw(run: Readonly<RunState>, view: Viewport, size: DisplaySize, theme: Theme, stick?: Stick, now = 0) {
      const { width, height, ratio } = size;
      if (canvas.width !== Math.round(width * ratio)) canvas.width = Math.round(width * ratio);
      if (canvas.height !== Math.round(height * ratio)) canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, width, height);
      const p = theme.palette;
      const dawn = Math.max(0, 1 - (run.round.duration - run.elapsed) / 30);
      if (dawn > 0) {
        const light = ctx.createLinearGradient(0, 0, 0, height);
        light.addColorStop(0, `rgba(255,211,137,${dawn * 0.2})`); light.addColorStop(0.65, 'rgba(255,211,137,0)');
        ctx.fillStyle = light; ctx.fillRect(0, 0, width, height);
      }
      ctx.save(); ctx.translate(view.x, view.y); ctx.scale(view.scale, view.scale);
      function ring(x: number, y: number, radius: number, color: string, lineWidth = 2) {
        ctx!.strokeStyle = color; ctx!.lineWidth = lineWidth;
        ctx!.beginPath(); ctx!.arc(x, y, radius, 0, Math.PI * 2); ctx!.stroke();
      }
      for (const enemy of run.enemies) {
        if (enemy.entryDelay > 0) continue;
        const attack = enemy.attack;
        if (enemy.kind === 'charger') {
          // A forked crest identifies the lane attacker even when its sprite is at rest.
          const angle = attack && attack.phase !== 'approach' ? Math.atan2(attack.direction.y, attack.direction.x)
            : Math.atan2(run.player.y - enemy.y, run.player.x - enemy.x);
          ctx.save(); ctx.translate(enemy.x, enemy.y); ctx.rotate(angle);
          ctx.strokeStyle = p.damage; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(-8, -9); ctx.lineTo(13, 0); ctx.lineTo(-8, 9); ctx.stroke(); ctx.restore();
        }
        if (!attack || attack.phase === 'approach') continue;
        if (attack.phase === 'recover') {
          ring(enemy.x, enemy.y, enemies[enemy.kind].radius + 5, p.ground);
          continue;
        }
        const winding = attack.phase === 'windup';
        ctx.save();
        ctx.strokeStyle = p.damage; ctx.fillStyle = p.damage;
        if (enemy.kind === 'charger') {
          const radius = enemies.charger.radius;
          const { x, y } = chargeDestination(attack.origin, attack.direction);
          ctx.globalAlpha = winding ? 0.18 : 0.28; ctx.lineWidth = radius * 2; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(attack.origin.x, attack.origin.y); ctx.lineTo(x, y); ctx.stroke();
          ctx.globalAlpha = 1; ctx.lineWidth = 2; ctx.setLineDash(winding ? [7, 5] : []);
          ctx.beginPath(); ctx.moveTo(attack.origin.x, attack.origin.y); ctx.lineTo(x, y); ctx.stroke();
        } else {
          ctx.globalAlpha = winding ? 0.1 : 0.28;
          ctx.beginPath(); ctx.arc(attack.origin.x, attack.origin.y, encounters.elite.radius, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1; ctx.setLineDash(winding ? [7, 5] : []);
          ring(attack.origin.x, attack.origin.y, encounters.elite.radius, p.damage, winding ? 2 : 4);
          if (winding) {
            ctx.setLineDash([]);
            ring(attack.origin.x, attack.origin.y, encounters.elite.radius * (1 - attack.remaining / encounters.elite.windup), p.damage, 1);
          }
        }
        ctx.setLineDash([]); ctx.globalAlpha = 1; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(winding ? enemy.kind === 'charger' ? 'LOCKED LANE' : 'SLAM — LEAVE THE RING' : 'DANGER', enemy.x, enemy.y - enemies[enemy.kind].radius - 16);
        ctx.restore();
      }
      if (run.progression.level === 1 && run.status === 'active' && run.gems.length) {
        const gem = run.gems.reduce((a, b) => Math.hypot(a.x - run.player.x, a.y - run.player.y) < Math.hypot(b.x - run.player.x, b.y - run.player.y) ? a : b);
        ctx.save(); ctx.setLineDash([3, 7]); ctx.strokeStyle = p.gem; ctx.globalAlpha = 0.6; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(run.player.x, run.player.y); ctx.lineTo(gem.x, gem.y); ctx.stroke(); ctx.setLineDash([]);
        ring(gem.x, gem.y, 11, p.gem, 1.5); ctx.restore();
      }
      effects = effects.filter(event => run.elapsed - event.at < 3);
      for (const event of effects) {
        const age = run.elapsed - event.at;
        if (event.type === 'player-hit' && age < 0.35) {
          const color = event.damage === 0 ? p.shard : p.damage;
          ring(event.x, event.y, 25, color, 3);
          ctx.fillStyle = color; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText(event.damage === 0 ? `SHIELD −${event.absorbed}` : `−${event.damage} HP`, event.x, event.y - 35);
        } else if (event.type === 'evolution' && age < 2) {
          ctx.save(); ctx.globalAlpha = Math.max(0, 1 - age / 2);
          ring(run.player.x, run.player.y, reducedMotion.matches ? 35 : 25 + age * 55, p.shard, 3); ctx.restore();
        } else if (event.type === 'upgrade' && age < 0.6 && !reducedMotion.matches) {
          ctx.save(); ctx.globalAlpha = 1 - age / 0.6; ring(run.player.x, run.player.y, 22 + age * 30, p.halo); ctx.restore();
        }
      }
      if (run.player.invulnerability > 0) {
        ctx.save(); ctx.setLineDash([3, 4]); ring(run.player.x, run.player.y, 27, p.light, 1.5); ctx.restore();
      }
      if (run.outcome === 'victory') {
        outcomeAt ??= now;
        const progress = Math.min(1, Math.max(0, (now - outcomeAt) / 1.8));
        ctx.save(); ctx.globalAlpha = reducedMotion.matches ? 0.5 : 1 - progress;
        ring(run.player.x, run.player.y, reducedMotion.matches ? 50 : 30 + progress * 230, '#ffdf9d', 5); ctx.restore();
      }
      ctx.restore();
      const warnings = [...run.entries, ...run.enemies.filter(enemy => enemy.entryDelay > 0 || enemies[enemy.kind].elite)];
      for (const warning of warnings) {
        const cue = edgeCue(view, size, warning);
        if (!cue) continue;
        const elite = enemies[warning.kind].elite;
        ctx.save(); ctx.translate(cue.x, cue.y); ctx.rotate(cue.angle);
        ctx.fillStyle = elite ? '#ffb4ac' : '#f1b37d';
        ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-5, -5); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill();
        ctx.restore();
        if (elite) {
          ctx.fillStyle = '#ffcfbf'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText('ELITE', Math.max(36, Math.min(width - 36, cue.x)), cue.y + 20);
        }
      }
      if (stick) {
        const dx = stick.tip.x - stick.origin.x, dy = stick.tip.y - stick.origin.y;
        const divisor = Math.max(1, Math.hypot(dx, dy) / stick.radius);
        ctx.strokeStyle = '#f5d58b88'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(stick.origin.x, stick.origin.y, stick.radius, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#f5d58b99'; ctx.beginPath();
        ctx.arc(stick.origin.x + dx / divisor, stick.origin.y + dy / divisor, stick.radius * 2 / 7, 0, Math.PI * 2); ctx.fill();
      }
    },
    dispose() { effects = []; canvas.remove(); canvas.width = canvas.height = 1; },
  };
}
