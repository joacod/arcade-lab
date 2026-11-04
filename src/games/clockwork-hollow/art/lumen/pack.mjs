import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';

// Offline atlas preparation only. Keep complete cels, camera, material shading
// and generated alpha intact; never construct actors from separate body parts.
const specifications = [
  { name: 'keeper', columns: 4, rows: 3, width: 192, height: 240, scale: .55,
    sourceAnchor: [.55, 366 / 418], anchor: [96, 228] },
  { name: 'beetle', columns: 2, rows: 2, width: 192, height: 144, scale: .3,
    sourceAnchor: [.5, 520 / 627], anchor: [96, 132] },
];
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const specification of specifications) {
    const source = await readFile(new URL(`${specification.name}-source.png`, import.meta.url));
    const result = await page.evaluate(async ({ data, spec }) => {
      const image = new Image(); image.src = data; await image.decode();
      const atlas = document.createElement('canvas');
      atlas.width = spec.width * spec.columns * spec.rows; atlas.height = spec.height;
      const ctx = atlas.getContext('2d');
      if (!ctx) throw new Error('Atlas canvas is unavailable.');
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      for (let frame = 0; frame < spec.columns * spec.rows; frame++) {
        const col = frame % spec.columns, row = Math.floor(frame / spec.columns);
        const x = Math.round(col * image.width / spec.columns), y = Math.round(row * image.height / spec.rows);
        const w = Math.round((col + 1) * image.width / spec.columns) - x;
        const h = Math.round((row + 1) * image.height / spec.rows) - y;
        ctx.save(); ctx.beginPath(); ctx.rect(frame * spec.width, 0, spec.width, spec.height); ctx.clip();
        ctx.drawImage(image, x, y, w, h,
          frame * spec.width + spec.anchor[0] - w * spec.sourceAnchor[0] * spec.scale,
          spec.anchor[1] - h * spec.sourceAnchor[1] * spec.scale,
          w * spec.scale, h * spec.scale);
        ctx.restore();
      }
      return atlas.toDataURL('image/png').split(',')[1];
    }, { data: `data:image/png;base64,${source.toString('base64')}`, spec: specification });
    await writeFile(new URL(`${specification.name}.png`, import.meta.url), Buffer.from(result, 'base64'));
  }
} finally { await browser.close(); }
