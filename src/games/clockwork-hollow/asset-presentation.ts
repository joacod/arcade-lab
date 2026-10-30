import type { ImageBundle } from '../../engine/browser/images.ts';
import type { LevelId, Rect } from './content.ts';
import { movement } from './content.ts';
import { keeperFrame, objectFrames, type BellgardenSheet } from './asset-art.ts';
import type { Player } from './game.ts';
import type { KeeperPose } from './animation.ts';
import type { HollowView } from './presentation.ts';
import type { HollowTheme } from './themes.ts';

/** Image footprints are cosmetic and share the Normal renderer's world transform. */
export function createBellgardenDrawing(ctx: CanvasRenderingContext2D, images: ImageBundle) {
  function image(sheet: BellgardenSheet, rect: readonly [number, number, number, number], x: number, y: number, w: number, h: number) {
    ctx.drawImage(images[sheet]!, ...rect, x, y, w, h);
  }
  function object(role: keyof typeof objectFrames, x: number, y: number, w: number, h: number) {
    image('objects', objectFrames[role], x, y, w, h);
  }
  return {
    object,
    scenery(view: HollowView, level: LevelId, theme: HollowTheme) {
      const palette = theme.districts[level];
      const sky = ctx.createLinearGradient(0, 0, 0, view.height);
      sky.addColorStop(0, palette.sky); sky.addColorStop(.62, palette.middle); sky.addColorStop(1, palette.deep);
      ctx.fillStyle = sky; ctx.fillRect(0, 0, view.width, view.height);
      // Small, static celestial marks leave the traversable layer quiet.
      if (level === 'belfry') {
        ctx.fillStyle = '#f8e8c7'; ctx.beginPath(); ctx.arc(view.width * .79 - view.x * .012, 130, 36, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = palette.sky; ctx.beginPath(); ctx.arc(view.width * .79 - view.x * .012 + 15, 120, 33, 0, Math.PI * 2); ctx.fill();
        for (let i = 0; i < 45; i++) { ctx.fillStyle = '#d7dded88'; ctx.fillRect(((i * 139 - view.x * .04) % view.width + view.width) % view.width, (i * 71) % 370, 2, 2); }
      }
      for (const [layer, factor, base] of [['far', .16, 40], ['near', .38, 100]] as const) {
        const offset = view.x * factor;
        ctx.globalAlpha = layer === 'far' ? .62 : .66;
        for (let i = Math.floor(offset / 960); i <= Math.ceil((offset + view.width) / 960); i++) {
          image(`${level}-${layer}`, [0, 0, 960, 640], i * 960 - offset, base - view.y * factor, 960, 640);
        }
      }
      ctx.globalAlpha = 1;
      const haze = ctx.createLinearGradient(0, view.height * .66, 0, view.height);
      haze.addColorStop(0, `${palette.deep}00`); haze.addColorStop(1, `${palette.deep}cc`);
      ctx.fillStyle = haze; ctx.fillRect(0, 0, view.width, view.height);
    },
    stone(s: Rect, level: LevelId, index: number, view: HollowView) {
      const column = level === 'aqueduct' ? 0 : level === 'emberworks' ? 128 : 256;
      ctx.save(); ctx.beginPath(); ctx.rect(s.x, s.y, s.w, s.h); ctx.clip();
      // Cull tile ranges as well as platforms so wide ground stays cheap on phones.
      const left = Math.max(s.x, view.x), right = Math.min(s.x + s.w, view.x + view.width);
      for (let x = s.x + Math.max(0, Math.floor((left - s.x) / 96)) * 96; x < right; x += 96) {
        for (let y = s.y + Math.max(0, Math.floor((view.y - s.y) / 96)) * 96; y < Math.min(s.y + s.h, view.y + view.height); y += 96) {
          image('terrain', [column, 0, 128, 128], x, y, 96, 96);
        }
        image('terrain', [column, 128, 128, 32], x, s.y, 96, Math.min(24, s.h));
      }
      ctx.restore();
      ctx.strokeStyle = '#223b55'; ctx.lineWidth = 2; ctx.strokeRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
      // Reassert the true landing edge over every decorative tile.
      ctx.fillStyle = '#fff0cf'; ctx.fillRect(s.x, s.y, s.w, 3);
      if (index % 3 === 0 && s.h > 50) object('foliage', s.x + s.w - 46, s.y + 12, 44, 55);
    },
    keeper(p: Pick<Player, 'x' | 'y' | 'vx' | 'vy' | 'facing' | 'grounded'>, pose: KeeperPose, defeated: boolean, reduced: boolean, landing: number) {
      const frame = keeperFrame(p, pose, defeated, reduced);
      ctx.save(); ctx.translate(p.x + movement.width / 2, p.y + movement.height);
      const squash = reduced ? 0 : landing * .12;
      ctx.scale(p.facing * (1 + squash), 1 - squash);
      if (defeated) ctx.rotate(-.32);
      image('keeper', [frame * 64, 0, 64, 80], -25.6, -60.8 - (reduced ? 0 : pose.bob), 51.2, 64);
      ctx.restore();
    },
    beetle(x: number, y: number, direction: number, alive: boolean, time: number, reduced: boolean) {
      ctx.save(); ctx.translate(x, y); ctx.scale(direction, alive ? 1 : .28);
      const frame = !alive ? 3 : reduced ? 0 : Math.floor(time * 10) % 3;
      image('beetle', [frame * 64, 0, 64, 48], -25, -34.4, 51.2, 38.4);
      ctx.restore();
    },
  };
}
