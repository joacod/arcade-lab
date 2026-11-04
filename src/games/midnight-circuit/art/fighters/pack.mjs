import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
// Mechanical packing only: retain each complete connected drawing and align its ground pivot.
const source = 'data:image/png;base64,' + readFileSync(new URL('source.png', import.meta.url)).toString('base64');
const layout = JSON.parse(readFileSync(new URL('layout.json', import.meta.url), 'utf8'));
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const result = await page.evaluate(async ({ source, layout }) => {
    const image = new Image(); image.src = source; await image.decode();
    if (image.width !== 1536 || image.height !== 1024) throw new Error('Invalid source atlas');
    const width = image.width, height = image.height;
    const original = document.createElement('canvas'); original.width = width; original.height = height;
    const sourceContext = original.getContext('2d'); sourceContext.drawImage(image, 0, 0);
    const sourcePixels = sourceContext.getImageData(0, 0, width, height), pixels = sourcePixels.data;
    const labels = new Uint32Array(width * height), figures = [];
    let label = 0;
    for (let start = 0; start < labels.length; start++) {
      if (labels[start] || pixels[start * 4 + 3] < 12) continue;
      const id = ++label, queue = [start]; labels[start] = id;
      let left = width, top = height, right = 0, bottom = 0;
      for (let k = 0; k < queue.length; k++) {
        const index = queue[k], x = index % width, y = Math.floor(index / width);
        left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
        for (let yy = Math.max(0, y - 1); yy <= Math.min(height - 1, y + 1); yy++) {
          for (let xx = Math.max(0, x - 1); xx <= Math.min(width - 1, x + 1); xx++) {
            const next = yy * width + xx;
            if (!labels[next] && pixels[next * 4 + 3] >= 12) { labels[next] = id; queue.push(next); }
          }
        }
      }
      if (queue.length > 1000) figures.push({ id, rect: [left, top, right - left + 1, bottom - top + 1] });
    }
    figures.sort((a, b) => Math.floor((a.rect[1] + a.rect[3] / 2) / 256) - Math.floor((b.rect[1] + b.rect[3] / 2) / 256) || a.rect[0] - b.rect[0]);
    if (figures.length !== 32) throw new Error(`Expected 32 complete figures, got ${figures.length}`);
    const canvas = document.createElement('canvas'); canvas.width = 2048; canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    for (let row = 0; row < 4; row++) for (let col = 0; col < 8; col++) {
      const figure = figures[row * 8 + col], [x, y, w, h] = figure.rect;
      if (JSON.stringify(figure.rect) !== JSON.stringify(layout.sourceRects[row][col])) throw new Error(`Update source rectangle ${row}/${col}`);
      const left = Math.max(0, x - 2), top = Math.max(0, y - 2);
      const cut = document.createElement('canvas'); cut.width = Math.min(width, x + w + 2) - left; cut.height = Math.min(height, y + h + 2) - top;
      const drawing = cut.getContext('2d'), data = drawing.createImageData(cut.width, cut.height);
      for (let yy = 0; yy < cut.height; yy++) for (let xx = 0; xx < cut.width; xx++) {
        const sx = left + xx, sy = top + yy, index = sy * width + sx;
        let retain = labels[index] === figure.id;
        // Preserve antialiased edge color/alpha without admitting a neighboring silhouette.
        if (!retain && pixels[index * 4 + 3] > 0 && pixels[index * 4 + 3] < 12) {
          for (let dy = -2; dy <= 2 && !retain; dy++) for (let dx = -2; dx <= 2 && !retain; dx++) {
            const ax = sx + dx, ay = sy + dy;
            if (ax >= 0 && ay >= 0 && ax < width && ay < height && labels[ay * width + ax] === figure.id) retain = true;
          }
        }
        if (retain) data.data.set(pixels.subarray(index * 4, index * 4 + 4), (yy * cut.width + xx) * 4);
      }
      drawing.putImageData(data, 0, 0);
      const [px, py] = layout.pivots[row][col], dx = 128 + left - (col * 192 + px), dy = 240 + top - (row * 256 + py);
      if (dx < 0 || dy < 0 || dx + cut.width > 256 || dy + cut.height > 256) throw new Error(`Clipped complete figure ${row}/${col}`);
      ctx.drawImage(cut, col * 256 + dx, row * 256 + dy);
    }
    return canvas.toDataURL('image/png').split(',')[1];
  }, { source, layout });
  writeFileSync(new URL('fighters.png', import.meta.url), Buffer.from(result, 'base64'));
  process.stdout.write('Packed 32 complete figures without clipping or neighboring fragments.\n');
} finally { await browser.close(); }
