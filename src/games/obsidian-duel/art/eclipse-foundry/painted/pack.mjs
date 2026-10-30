import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { duelClips } from '../../../animation.ts';
import { foundryCell, foundryFrame, foundrySheets } from '../../../asset-art.ts';

// Mechanical atlas preparation only. Painted anatomy, faces, clothing and lighting come from
// the committed source drawings; this pipeline never draws limbs or reconstructs a skeleton.
const layout = JSON.parse(readFileSync(new URL('layout.json', import.meta.url), 'utf8'));
const sources = Object.fromEntries(Object.entries(layout.sources).map(([name, spec]) => [name, {
  ...spec, url: `data:image/png;base64,${readFileSync(new URL(`${name}.png`, import.meta.url)).toString('base64')}`,
}]));
const cells = Object.fromEntries(Object.entries(duelClips).map(([clip, count]) => [clip,
  Array.from({ length: count }, (_, frame) => foundryFrame({ clip, frame }))]));
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const kind of ['nera', 'kael']) {
    const result = await page.evaluate(async ({ kind, sources, clips, cells, cell, size }) => {
      const images = {};
      for (const [name, source] of Object.entries(sources)) {
        if (!name.startsWith(kind)) continue;
        images[name] = await new Promise((resolve, reject) => {
          const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = source.url;
        });
        if (images[name].naturalWidth !== source.size[0] || images[name].naturalHeight !== source.size[1]) throw new Error(`Wrong source size: ${name}`);
      }
      const canvas = document.createElement('canvas'); [canvas.width, canvas.height] = size;
      const ctx = canvas.getContext('2d'), extracted = new Map(), report = [];
      function extract(name, index) {
        const key = `${name}:${index}`;
        if (extracted.has(key)) return extracted.get(key);
        const source = sources[name], frame = source.frames[index];
        if (!frame) throw new Error(`Missing painted drawing: ${key}`);
        const [sx, sy, sw, sh] = frame.rect, pad = 3;
        const x = Math.max(0, sx - pad), y = Math.max(0, sy - pad), width = Math.min(source.size[0], sx + sw + pad) - x, height = Math.min(source.size[1], sy + sh + pad) - y;
        const cutout = document.createElement('canvas'); cutout.width = width; cutout.height = height;
        const drawing = cutout.getContext('2d'); drawing.drawImage(images[name], -x, -y);
        const pixels = drawing.getImageData(0, 0, width, height), alive = new Uint8Array(width * height);
        for (let i = 0; i < alive.length; i++) alive[i] = pixels.data[i * 4 + 3] >= 12 ? 1 : 0;
        // Source sheets have transparent gaps but some bounding rectangles overlap. Select
        // this cel's connected silhouette, retaining its original RGB and antialiased alpha.
        let largest = [];
        for (let i = 0; i < alive.length; i++) {
          if (!alive[i]) continue;
          const queue = [i]; alive[i] = 0;
          for (let q = 0; q < queue.length; q++) {
            const p = queue[q], px = p % width, py = Math.floor(p / width);
            for (let ny = Math.max(0, py - 1); ny <= Math.min(height - 1, py + 1); ny++) for (let nx = Math.max(0, px - 1); nx <= Math.min(width - 1, px + 1); nx++) {
              const next = ny * width + nx; if (alive[next]) { alive[next] = 0; queue.push(next); }
            }
          }
          if (queue.length > largest.length) largest = queue;
        }
        if (largest.length < 1000) throw new Error(`Empty painted drawing: ${key}`);
        const retained = new Uint8Array(width * height);
        for (const p of largest) {
          const px = p % width, py = Math.floor(p / width);
          for (let ny = Math.max(0, py - 2); ny <= Math.min(height - 1, py + 2); ny++) for (let nx = Math.max(0, px - 2); nx <= Math.min(width - 1, px + 2); nx++) retained[ny * width + nx] = 1;
        }
        let footLeft = width, footRight = 0;
        for (let i = 0; i < retained.length; i++) {
          if (!retained[i]) pixels.data[i * 4 + 3] = 0;
          else if (Math.floor(i / width) >= sy + sh - y - 7 && pixels.data[i * 4 + 3] > 64) { footLeft = Math.min(footLeft, i % width); footRight = Math.max(footRight, i % width); }
        }
        drawing.putImageData(pixels, 0, 0);
        const scale = source.worldHeight / (frame.standingHeight ?? source.standingHeight);
        const pivot = frame.pivot ?? [x + (footLeft + footRight) / 2, sy + sh];
        const value = { image: cutout, x: (x - pivot[0]) * scale, y: (y - pivot[1]) * scale, width: width * scale, height: height * scale };
        extracted.set(key, value); return value;
      }
      for (const [clip, slots] of Object.entries(cells)) {
        if (clips[clip]?.length !== slots.length) throw new Error(`Wrong ${kind} ${clip} slot count`);
        for (let frame = 0; frame < slots.length; frame++) {
          const [sheet, index, offsetX = 0, offsetY = 0] = clips[clip][frame], sprite = extract(`${kind}-${sheet}`, index);
          const [x, y, width, height] = slots[frame], left = cell.pivotX + sprite.x + offsetX, top = cell.pivotY + sprite.y + offsetY;
          if (left < 1 || top < 1 || left + sprite.width > width - 1 || top + sprite.height > height - 1) throw new Error(`Clipped ${kind} ${clip}:${frame}`);
          ctx.drawImage(sprite.image, x + left, y + top, sprite.width, sprite.height);
          report.push({ clip, frame, source: `${kind}-${sheet}`, index });
        }
      }
      return { png: canvas.toDataURL('image/png').split(',')[1], report, uniqueDrawings: extracted.size };
    }, { kind, sources, clips: layout.clips[kind], cells, cell: foundryCell, size: foundrySheets[kind] });
    writeFileSync(new URL(`../${kind}.png`, import.meta.url), Buffer.from(result.png, 'base64'));
    console.log(`${kind}: ${result.report.length} timed slots from ${result.uniqueDrawings} painted drawings`);
  }
} finally { await browser.close(); }
