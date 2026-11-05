import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';

// Crop and align complete illustrations. No runtime anatomy or image generation.
const specifications = [
  { name: 'operators', columns: 5, rows: 6, anchor: [80, 180], bands: [0, 266, 512, 768, 1032, 1280, 1536] },
  { name: 'nova-run', columns: 6, rows: 5, anchor: [80, 180], running: true, bands: [0, 242, 474, 703, 933, 1145] },
  { name: 'bolt-run', columns: 6, rows: 5, anchor: [80, 180], running: true, bands: [0, 244, 465, 678, 897, 1145] },
  { name: 'enemies', columns: 3, rows: 3, anchor: [96, 180] },
  { name: 'objects', columns: 4, rows: 4 },
  { name: 'backdrop', columns: 1, rows: 2 },
];
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const spec of specifications.filter(spec => !process.argv[2] || spec.name === process.argv[2])) {
    const source = await readFile(new URL(`sources/${spec.name}.png`, import.meta.url));
    const result = await page.evaluate(async ({ data, spec }) => {
      const image = new Image(); image.src = data; await image.decode();
      const atlas = document.createElement('canvas');
      atlas.width = spec.name === 'backdrop' ? 2048 : spec.columns * 192;
      atlas.height = spec.name === 'backdrop' ? 1024 : spec.rows * 192;
      const ctx = atlas.getContext('2d');
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      const source = document.createElement('canvas'); source.width = image.width; source.height = image.height;
      const sourceContext = source.getContext('2d'); sourceContext.drawImage(image, 0, 0);
      if (spec.name !== 'backdrop') {
        const rgba = sourceContext.getImageData(0, 0, image.width, image.height).data;
        let transparent = 0;
        for (let i = 3; i < rgba.length; i += 4) if (rgba[i] === 0) transparent++;
        if (transparent < image.width * image.height * .1) throw new Error(`${spec.name} needs a transparent background`);
      }
      const sw = image.width / spec.columns, sh = image.height / spec.rows;
      const rowEdges = spec.bands?.map(y => y * image.height / spec.bands.at(-1));
      function bounds(col, row) {
        const top = rowEdges ? rowEdges[row] : row * sh;
        const bottom = rowEdges ? rowEdges[row + 1] : (row + 1) * sh;
        const pixels = sourceContext.getImageData(Math.round(col * sw), Math.round(top), Math.floor(sw), Math.floor(bottom - top));
        let minY = pixels.height, maxY = 0, minX = pixels.width, maxX = 0;
        for (let y = 0; y < pixels.height; y++) {
          let opaque = 0;
          for (let x = 0; x < pixels.width; x++) if (pixels.data[(y * pixels.width + x) * 4 + 3] >= 240) {
            opaque++; minX = Math.min(minX, x); maxX = Math.max(maxX, x);
          }
          if (opaque >= 5) { minY = Math.min(minY, y); maxY = y; }
        }
        return { top, height: bottom - top, foot: maxY + 1, opaqueHeight: maxY + 1 - minY, centerX: (minX + maxX) / 2, opaqueWidth: maxX + 1 - minX };
      }
      // Match full-body height across differently shaped source sheets without resizing individual gait cels.
      const runHeight = spec.running ? Math.max(...Array.from({ length: 6 }, (_, col) => bounds(col, 2).opaqueHeight)) : 0;
      for (let row = 0; row < spec.rows; row++) for (let col = 0; col < spec.columns; col++) {
        const dx = col * 192, dy = row * 192;
        if (spec.name === 'backdrop') {
          ctx.drawImage(image, 0, row * sh, image.width, sh, 0, row * 512, 2048, 512);
        } else if (spec.anchor) {
          const cel = bounds(col, row);
          const actorHeight = spec.name === 'operators' ? bounds(2, row < 3 ? 0 : 3).opaqueHeight : runHeight;
          const enemy = spec.name === 'enemies';
          const reference = enemy ? bounds(0, row) : cel;
          const factor = actorHeight ? 140 / actorHeight : 180 / Math.max(reference.opaqueHeight, reference.opaqueWidth);
          // Neutral airborne drawings retain their raised boot placement; grounded cels share a sole baseline.
          const airborne = spec.name === 'operators' && row % 3 === 2;
          const foot = airborne ? sh * .98 : cel.foot;
          ctx.save(); ctx.beginPath(); ctx.rect(dx, dy, 192, 192); ctx.clip();
          ctx.drawImage(image, col * sw, cel.top, sw, cel.height,
            dx + spec.anchor[0] - (enemy ? cel.centerX : sw * .5) * factor, dy + spec.anchor[1] - foot * factor, sw * factor, cel.height * factor);
          ctx.restore();
        } else {
          // Inspected 1254-square source crops keep the helicopter wide and tile edges flush.
          const crops = [
            [67, 0, 197, 309], [378, 0, 204, 309], [687, 25, 194, 285], [968, 101, 264, 199],
            [37, 314, 251, 306], [357, 315, 229, 307], [611, 385, 342, 177], [1014, 349, 184, 265],
            [5, 628, 301, 303], [318, 630, 303, 299], [638, 629, 297, 300], [949, 628, 305, 302],
            [3, 944, 304, 300], [326, 1008, 301, 185], [626, 944, 321, 307], [947, 947, 307, 300],
          ];
          const [x, y, w, h] = crops[row * 4 + col], k = image.width / 1254;
          ctx.drawImage(image, x * k, y * k, w * k, h * k, dx, dy, 192, 192);
        }
      }
      return atlas.toDataURL(spec.name === 'backdrop' ? 'image/webp' : 'image/png', .94).split(',')[1];
    }, { data: `data:image/png;base64,${source.toString('base64')}`, spec });
    await writeFile(new URL(`${spec.name}.${spec.name === 'backdrop' ? 'webp' : 'png'}`, import.meta.url), Buffer.from(result, 'base64'));
    console.log(`Packed ${spec.name}`);
  }
} finally { await browser.close(); }
