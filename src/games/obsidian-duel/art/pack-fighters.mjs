import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { duelClips } from '../animation.ts';
import { fighters } from '../content.ts';
import { foundryCell, foundryFrame } from '../asset-art.ts';

// Whole drawings only: crop transparent gutters, normalize scale/support pivots, pack timed holds.
// Source sheets contain 36 inspected drawings in six rows of six. No body reconstruction.
export const clips = {
  idle: [0, 1, 0, 1], walk: [2, 3, 4, 5, 2, 3, 4, 5], jump: [6, 7, 8],
  crouch: [9], guard: [10], crouchGuard: [11],
  light: [0, 12, 12, 13, 13, 14, 33, 0],
  heavy: [0, 15, 15, 16, 16, 17, 34, 0],
  sweep: [9, 18, 18, 19, 19, 20, 9, 0],
  air: [6, 21, 21, 22, 22, 23, 8, 8],
  special: [0, 24, 24, 25, 25, 26, 35, 0],
  hurt: [27, 27, 0], block: [28, 10], down: [27, 29, 30, 30],
  rise: [30, 31, 32, 0], land: [32, 9, 0],
};
const slots = Object.fromEntries(Object.entries(duelClips).map(([clip, count]) => [clip,
  Array.from({ length: count }, (_, frame) => foundryFrame({ clip, frame }))]));
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const [folder, sourceFolder] of [['moonfall-sanctum', 'fighters']]) {
    const layout = { columns: 6, rows: 6, clips, fighters: {} };
    for (const kind of ['nera', 'kael']) {
      const source = readFileSync(new URL(`${folder}/${sourceFolder}/${kind}.png`, import.meta.url)).toString('base64');
      const result = await page.evaluate(async ({ source, slots, clips, cell, kind, rows, reach }) => {
        const image = new Image(); image.src = `data:image/png;base64,${source}`; await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = 2560; canvas.height = 2240;
        const ctx = canvas.getContext('2d'); ctx.imageSmoothingQuality = 'high';
        const frames = [], drawings = [];
        for (let index = 0; index < 36; index++) {
          const sx = Math.round(index % 6 * image.width / 6), sy = rows[Math.floor(index / 6)];
          const sw = Math.round((index % 6 + 1) * image.width / 6) - sx, sh = rows[Math.floor(index / 6) + 1] - sy;
          const cut = document.createElement('canvas'); cut.width = sw; cut.height = sh;
          const drawing = cut.getContext('2d'); drawing.drawImage(image, -sx, -sy);
          const pixels = drawing.getImageData(0, 0, sw, sh), data = pixels.data;
          const alive = new Uint8Array(sw * sh);
          for (let i = 0; i < alive.length; i++) alive[i] = data[i * 4 + 3] >= 40 ? 1 : 0;
          let largest = [];
          for (let i = 0; i < alive.length; i++) {
            if (!alive[i]) continue;
            const component = [i]; alive[i] = 0;
            for (let q = 0; q < component.length; q++) {
              const p = component[q], x = p % sw, y = Math.floor(p / sw);
              for (let yy = Math.max(0, y - 1); yy <= Math.min(sh - 1, y + 1); yy++) for (let xx = Math.max(0, x - 1); xx <= Math.min(sw - 1, x + 1); xx++) {
                const next = yy * sw + xx;
                if (alive[next]) { alive[next] = 0; component.push(next); }
              }
            }
            if (component.length > largest.length) largest = component;
          }
          const retained = new Uint8Array(sw * sh);
          let left = sw, top = sh, right = 0, bottom = 0;
          for (const p of largest) {
            const x = p % sw, y = Math.floor(p / sw);
            left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
            for (let yy = Math.max(0, y - 2); yy <= Math.min(sh - 1, y + 2); yy++) for (let xx = Math.max(0, x - 2); xx <= Math.min(sw - 1, x + 2); xx++) retained[yy * sw + xx] = 1;
          }
          // Retain antialiased outlines, discard disconnected export noise/neighboring drawings.
          for (let i = 0; i < retained.length; i++) if (!retained[i] || data[i * 4 + 3] < 8) data[i * 4 + 3] = 0;
          drawing.putImageData(pixels, 0, 0);
          if (right <= left || bottom <= top) throw new Error(`Empty ${kind}:${index}`);
          let footLeft = sw, footRight = 0;
          for (let y = bottom - 5; y <= bottom; y++) for (let x = left; x <= right; x++) {
            if (data[(y * sw + x) * 4 + 3] >= 96) { footLeft = Math.min(footLeft, x); footRight = Math.max(footRight, x); }
          }
          let pivotX = index === 30 ? (left + right) / 2 : (footLeft + footRight) / 2;
          // A bounded whole-cel contact shift lets the hand/heel agree with authored reach.
          // Artwork never changes the move geometry; preserve proportions and grounded support.
          const contactMove = { 13: 'light', 16: 'heavy', 19: 'sweep', 22: 'air', 25: 'special' }[index];
          if (contactMove && reach[contactMove] > 0) {
            const scale = (kind === 'nera' ? 160 : 170) / frames[0].rect[3];
            const difference = reach[contactMove] - (right - pivotX) * scale;
            pivotX -= Math.max(-30, Math.min(30, difference)) / scale;
          }
          frames.push({ rect: [sx + left, sy + top, right - left + 1, bottom - top + 1], pivot: [sx + pivotX, sy + bottom] });
          drawings.push({ image: cut, left, top, right, bottom, pivotX });
        }
        const scale = (kind === 'nera' ? 160 : 170) / frames[0].rect[3];
        for (const [clip, cells] of Object.entries(slots)) for (let frame = 0; frame < cells.length; frame++) {
          const index = clips[clip][frame], d = drawings[index];
          const [x, y, w, h] = cells[frame];
          const airborne = [6, 7, 8, 21, 22, 23].includes(index);
          const dx = cell.pivotX + (d.left - d.pivotX) * scale;
          const dy = cell.pivotY + (d.top - d.bottom) * scale - (airborne ? 16 : 0);
          const width = (d.right - d.left + 1) * scale, height = (d.bottom - d.top + 1) * scale;
          if (dx < 0 || dy < 0 || dx + width > w || dy + height > h) throw new Error(`Clipped ${kind} ${clip}:${frame} (${dx},${dy},${width},${height})`);
          ctx.drawImage(d.image, d.left, d.top, d.right - d.left + 1, d.bottom - d.top + 1, x + dx, y + dy, width, height);
        }
        return { png: canvas.toDataURL('image/png').split(',')[1], size: [image.width, image.height], scale, rows, frames };
      }, { source, slots, clips, cell: foundryCell, kind, reach: Object.fromEntries(Object.entries(fighters[kind].attacks).map(([key, value]) => [key, value.reach])), rows: [0, 209, 418, 627, 836, 1045, 1254] });
      writeFileSync(new URL(`${folder}/${kind}.png`, import.meta.url), Buffer.from(result.png, 'base64'));
      layout.fighters[kind] = { size: result.size, scale: result.scale, rows: result.rows, frames: result.frames };
      console.log(`${folder}/${kind}: 36 complete drawings, ${Object.values(slots).flat().length} timed cels`);
    }
    writeFileSync(new URL(`${folder}/layout.json`, import.meta.url), JSON.stringify(layout, null, 2) + '\n');
  }
} finally { await browser.close(); }
