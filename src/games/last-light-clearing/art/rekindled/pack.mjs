import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { chromium } from '@playwright/test';

// Pack complete authored cels. This only aligns and resamples drawings, never builds anatomy.
const browser = await chromium.launch();
const page = await browser.newPage();
const layout = {};
try {
  for (const name of ['keeper', 'goblins', 'elite', 'props']) {
    const columns = name === 'props' ? 3 : 4;
    const source = readFileSync(new URL(`sources/${name}.png`, import.meta.url));
    const result = await page.evaluate(async ({ data, columns, props }) => {
      const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
      const cw = image.width / columns, ch = image.height / 2;
      if (!Number.isInteger(cw) || !Number.isInteger(ch)) throw new Error('Source grid is not integral');
      const sourceCanvas = document.createElement('canvas'); sourceCanvas.width = image.width; sourceCanvas.height = image.height;
      const sc = sourceCanvas.getContext('2d'); sc.drawImage(image, 0, 0);
      const frames = [];
      for (let row = 0; row < 2; row++) for (let column = 0; column < columns; column++) {
        const pixels = sc.getImageData(column * cw, row * ch, cw, ch).data;
        let left = cw, right = 0, top = ch, bottom = 0;
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (pixels[(y * cw + x) * 4 + 3] > 32) {
          left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
        }
        if (right <= left || bottom <= top) throw new Error('Empty cel');
        frames.push({ row, column, bounds: [left, top, right + 1, bottom + 1] });
      }
      const canvas = document.createElement('canvas'); canvas.width = columns * 256; canvas.height = 512;
      const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      const sharedScale = Math.min(220 / Math.max(...frames.map(f => f.bounds[2] - f.bounds[0])), 216 / Math.max(...frames.map(f => f.bounds[3] - f.bounds[1])));
      for (const frame of frames) {
        const { column, row, bounds: [left, top, right, bottom] } = frame;
        const scale = props ? Math.min(220 / (right - left), 216 / (bottom - top)) : sharedScale;
        const center = props ? (left + right) / 2 : cw / 2;
        const dy = props && row === 1 ? 128 - (top + bottom) / 2 * scale : 228 - bottom * scale;
        const dx = 128 - center * scale;
        ctx.save(); ctx.beginPath(); ctx.rect(column * 256, row * 256, 256, 256); ctx.clip();
        ctx.drawImage(image, column * cw, row * ch, cw, ch, column * 256 + dx, row * 256 + dy, cw * scale, ch * scale);
        ctx.restore();
        frame.anchor = props && row === 1 ? [.5, .5] : [.5, .89];
        frame.destination = [column * 256, row * 256, 256, 256]; frame.scale = Math.round(scale * 10000) / 10000;
      }
      return { png: canvas.toDataURL('image/png').split(',')[1], frames, sourceSize: [image.width, image.height] };
    }, { data: source.toString('base64'), columns, props: name === 'props' });
    const png = new URL(`${name}.png`, import.meta.url), webp = new URL(`${name}.webp`, import.meta.url);
    writeFileSync(png, Buffer.from(result.png, 'base64'));
    const converted = spawnSync('cwebp', ['-quiet', '-lossless', '-z', '9', png.pathname, '-o', webp.pathname], { stdio: 'inherit' });
    unlinkSync(png);
    if (converted.status !== 0) throw new Error(`Failed to export ${name}`);
    layout[name] = { sourceSize: result.sourceSize, size: [columns * 256, 512], anchor: [.5, .89], frames: result.frames };
    console.log(`Packed ${name}: ${columns * 256} × 512`);
  }
  writeFileSync(new URL('layout.json', import.meta.url), `${JSON.stringify(layout, null, 2)}\n`);
} finally { await browser.close(); }
