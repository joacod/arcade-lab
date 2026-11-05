import type { ImageBundle } from '../../engine/browser/images.ts';
import type { Fighter } from './game.ts';
import type { AnimationSample } from './animation.ts';
import { arena } from './content.ts';
import { drawFoundryFighter } from './asset-presentation.ts';
import { sanctumEffects } from './quality-art.ts';

export type SanctumDrawing = ReturnType<typeof createSanctumDrawing>;
export type SanctumDrawingFactory = typeof createSanctumDrawing;

/** The artwork supplies depth and anatomy. This owner adds atmosphere around whole sprites. */
export function createSanctumDrawing(ctx: CanvasRenderingContext2D, art: ImageBundle) {
  function glow(x: number, y: number, radius: number, color: string, flatten = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(1, flatten);
    const light = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    light.addColorStop(0, color); light.addColorStop(1, '#98cbd000');
    ctx.fillStyle = light; ctx.fillRect(-radius, -radius, radius * 2, radius * 2); ctx.restore();
  }
  return {
    scenery(time: number, reduced: boolean) {
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(art.stage!, 0, 0, arena.width, arena.height);
      const t = reduced ? 0 : time;
      // Layered low mist lives behind the actors and follows active match time.
      for (let i = 0; i < 3; i++) {
        glow(170 + i * 330 + Math.sin(t * .09 + i) * 38, 410 + i % 2 * 12, 260, '#b3d3d012', .12);
      }
      const pulse = reduced ? 0 : Math.sin(t * 1.8) * .008;
      ctx.save(); ctx.globalAlpha = .85 + pulse;
      glow(118, 110, 62, '#ffd39225'); glow(881, 110, 62, '#ffd39225'); ctx.restore();
      if (!reduced) for (let i = 0; i < 18; i++) {
        const x = (i * 67.7 + time * (1.5 + i % 3)) % 1000;
        const y = 175 + i * 29 % 230 + Math.sin(time * .3 + i) * 7;
        ctx.fillStyle = i % 3 ? '#b5e7dd40' : '#e6c38d66';
        ctx.fillRect(x, y, i % 3 ? .7 : 1.2, .7);
      }
    },
    reflection(f: Fighter, sample: AnimationSample) {
      ctx.save(); ctx.beginPath(); ctx.rect(0, arena.floor + 3, arena.width, arena.height - arena.floor); ctx.clip();
      ctx.globalAlpha = .10 * (1 - Math.min(.55, f.z / 400));
      ctx.translate(f.x, arena.floor + 5 + f.z * .35); ctx.scale(f.facing, -.35);
      drawFoundryFighter(ctx, art, f.kind, sample); ctx.restore();
    },
    effect(cell: number, x: number, y: number, width: number, height = width) {
      const frame = sanctumEffects[cell]!;
      ctx.drawImage(art.effects!, frame.x, frame.y, 384, 384,
        x - frame.pivotX / 384 * width, y - frame.pivotY / 384 * height, width, height);
    },
  };
}
