import { enemies } from './content.ts';
import type { RunState } from './game-state.ts';
import type { Stick } from './browser/input.ts';
import { edgeCue, type Viewport } from './view.ts';
import type { DisplaySize } from './world-presentation.ts';

/** One small CSS-space layer survives world presentation replacement. */
export function createScreenOverlay(surface: HTMLElement) {
  const canvas = document.createElement('canvas');
  canvas.className = 'screen-overlay'; canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d')!;
  surface.append(canvas);
  return {
    draw(run: Readonly<RunState>, view: Viewport, size: DisplaySize, stick?: Stick) {
      const { width, height, ratio } = size;
      if (canvas.width !== Math.round(width * ratio)) canvas.width = Math.round(width * ratio);
      if (canvas.height !== Math.round(height * ratio)) canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, width, height);
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
    dispose() { canvas.remove(); canvas.width = canvas.height = 1; },
  };
}
